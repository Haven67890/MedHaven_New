import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

// Helper to check admin access
async function checkAdminAccess(supabase: any, serviceSupabase: any) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null }
  }

  const { data: profile } = await serviceSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  const callerRole = String(profile?.role || "").toLowerCase()
  const isAdmin = callerRole === "admin" || callerRole === "super_admin" || callerRole === "moderator"

  if (!isAdmin) {
    return { errorResponse: NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 }), user: null }
  }

  return { errorResponse: null, user }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const serviceSupabase = createServiceClient()
    const { errorResponse } = await checkAdminAccess(supabase, serviceSupabase)
    if (errorResponse) return errorResponse

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fexsfbdvewlmvzfnwqul.supabase.co"

    // Fetch all rows where image_url contains the broken signed-url pattern
    const { data: rows, error: fetchError } = await serviceSupabase
      .from("quiz_image_bank")
      .select("id, image_url, source, status")
      .ilike("image_url", "%/api/materials/signed-url%")

    if (fetchError) {
      console.error("[TEMP ERROR LOG - fix-quiz-bank-urls GET]:", fetchError)
      return NextResponse.json({ error: "Failed to fetch broken quiz_image_bank rows: " + fetchError.message }, { status: 500 })
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({ message: "No broken image_url rows found in quiz_image_bank", count: 0, updated: 0 })
    }

    let updatedCount = 0
    const updatedSample: { id: string; old_url: string; new_url: string }[] = []

    for (const row of rows) {
      // Parse the path parameter from old image_url
      let rawPath: string | null = null;
      try {
        const urlObj = new URL(row.image_url, "https://dummy.local")
        rawPath = urlObj.searchParams.get("path")
      } catch {
        const match = row.image_url.match(/[?&]path=([^&]+)/)
        if (match) rawPath = decodeURIComponent(match[1])
      }

      if (!rawPath) {
        console.warn(`Could not parse storage path from image_url for row ${row.id}: ${row.image_url}`)
        continue
      }

      const storagePath = rawPath

      // Confirm path in Storage (e.g. check directory / list object to confirm exact object name)
      const pathParts = storagePath.split("/")
      const fileName = pathParts.pop() || ""
      const folderPath = pathParts.join("/")

      const { data: objectList } = await serviceSupabase.storage
        .from("quiz-bank")
        .list(folderPath)

      let confirmedPath = storagePath
      if (objectList && objectList.length > 0) {
        const matchedObj = objectList.find((obj: any) => obj.name === fileName)
        if (matchedObj) {
          confirmedPath = folderPath ? `${folderPath}/${matchedObj.name}` : matchedObj.name
        }
      }

      const newPublicUrl = `${supabaseUrl}/storage/v1/object/public/quiz-bank/${confirmedPath}`

      const { error: updateError } = await serviceSupabase
        .from("quiz_image_bank")
        .update({ image_url: newPublicUrl })
        .eq("id", row.id)

      if (updateError) {
        console.error(`Failed to update row ${row.id}:`, updateError)
      } else {
        updatedCount++
        if (updatedSample.length < 5) {
          updatedSample.push({
            id: row.id,
            old_url: row.image_url,
            new_url: newPublicUrl,
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      total_found: rows.length,
      updated_count: updatedCount,
      sample_updates: updatedSample,
    })
  } catch (err: any) {
    console.error("Unexpected error in fix-quiz-bank-urls route:", err)
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 })
  }
}
