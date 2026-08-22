import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { uploadToB2, DEFAULT_B2_BUCKET } from "@/lib/b2"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const serviceSupabase = createServiceClient()

    // 1. Verify caller is authenticated admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await serviceSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 })
    }

    // 2. Parse FormData
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const bucket = (formData.get("bucket") as string) || "materials"
    const customPath = formData.get("filePath") as string | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const fileExt = file.name.split(".").pop()?.toLowerCase() || ""
    const fileName = customPath || `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`

    const targetB2Bucket = DEFAULT_B2_BUCKET
    const contentType = file.type || "application/octet-stream"

    // 3. Upload file to B2
    await uploadToB2(fileName, buffer, contentType, targetB2Bucket)

    return NextResponse.json({
      success: true,
      filePath: fileName,
      bucket,
    })
  } catch (err: any) {
    console.error("Upload to B2 error:", err)
    return NextResponse.json({ error: err.message || "Failed to upload file to B2" }, { status: 500 })
  }
}
