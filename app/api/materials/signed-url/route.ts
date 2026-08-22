import { NextRequest, NextResponse } from "next/server"
import { getB2SignedUrl } from "@/lib/b2"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const path = searchParams.get("path")
    const bucket = searchParams.get("bucket") || undefined

    if (!path) {
      return NextResponse.json({ error: "Missing path parameter" }, { status: 400 })
    }

    // Generate signed URL valid for 1 hour (3600s)
    const signedUrl = await getB2SignedUrl(path, 3600, bucket)
    return NextResponse.json({ url: signedUrl })
  } catch (err: any) {
    console.error("Error generating B2 signed URL:", err)
    return NextResponse.json({ error: "Failed to generate signed URL" }, { status: 500 })
  }
}
