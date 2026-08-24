import { NextRequest, NextResponse } from "next/server"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { b2Client, DEFAULT_B2_BUCKET } from "@/lib/b2"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const path = searchParams.get("path")

    if (!path) {
      return NextResponse.json({ error: "Missing path parameter" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decodedPath = decodeURIComponent(path)
    const bucket = process.env.B2_BUCKET_NAME || DEFAULT_B2_BUCKET

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: decodedPath,
      ResponseContentDisposition: "inline",
    })

    const presignedUrl = await getSignedUrl(b2Client, command, { expiresIn: 3600 })

    return NextResponse.json({ url: presignedUrl })
  } catch (err: any) {
    console.error("Error generating preview presigned URL:", err)
    return NextResponse.json({ error: "Preview unavailable" }, { status: 404 })
  }
}
