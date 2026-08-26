import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { processMaterialImageExtraction } from "@/lib/image-extraction"

async function checkAdminAccess(supabase: any, serviceSupabase: any) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null }
  }

  const { data: profile, error: profileError } = await serviceSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile) {
    return { errorResponse: NextResponse.json({ error: "Forbidden" }, { status: 403 }), user: null }
  }

  const role = String(profile.role || "").toLowerCase()
  if (role !== "admin" && role !== "super_admin" && role !== "moderator") {
    return { errorResponse: NextResponse.json({ error: "Forbidden: Admin required" }, { status: 403 }), user: null }
  }

  return { errorResponse: null, user }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const serviceSupabase = createServiceClient()
    const { errorResponse } = await checkAdminAccess(supabase, serviceSupabase)
    if (errorResponse) return errorResponse

    const body = await request.json().catch(() => ({}))
    const { material_id } = body

    let materialsToProcess: any[] = []

    if (material_id) {
      const { data: mat, error: fetchErr } = await serviceSupabase
        .from("materials")
        .select("id, title, course_id, type, storage_path, source_url, uploaded_by")
        .eq("id", material_id)
        .maybeSingle()

      if (fetchErr || !mat) {
        return NextResponse.json({ error: "Material not found" }, { status: 404 })
      }
      materialsToProcess.push(mat)
    } else {
      // Query materials suitable for extraction
      const { data: mats, error: matsErr } = await serviceSupabase
        .from("materials")
        .select("id, title, course_id, type, storage_path, source_url, uploaded_by")

      if (matsErr) {
        return NextResponse.json({ error: "Failed to fetch materials for batch job" }, { status: 500 })
      }

      materialsToProcess = (mats || []).filter((m) => {
        const typeStr = (m.type || "").toLowerCase()
        const pathStr = (m.storage_path || m.source_url || "").toLowerCase()
        return (
          typeStr === "pdf" ||
          typeStr === "pptx" ||
          typeStr === "docx" ||
          pathStr.endsWith(".pdf") ||
          pathStr.endsWith(".pptx") ||
          pathStr.endsWith(".docx")
        )
      })
    }

    let totalExtracted = 0
    let totalFiltered = 0
    let totalSaved = 0
    let materialsProcessedCount = 0

    for (const mat of materialsToProcess) {
      const res = await processMaterialImageExtraction(mat)
      totalExtracted += res.totalExtracted
      totalFiltered += res.totalFiltered
      totalSaved += res.totalSaved
      materialsProcessedCount++
    }

    return NextResponse.json({
      success: true,
      message: `Batch extraction completed. Processed ${materialsProcessedCount} material(s).`,
      stats: {
        materialsProcessed: materialsProcessedCount,
        totalExtracted,
        totalFiltered,
        totalSaved,
      },
    })
  } catch (err: any) {
    console.error("Error in extract-images API route:", err)
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 })
  }
}
