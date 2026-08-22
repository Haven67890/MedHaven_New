import { NextRequest, NextResponse } from "next/server"
import { b2Client, getB2SignedUrl, DEFAULT_B2_BUCKET } from "@/lib/b2"
import { HeadObjectCommand } from "@aws-sdk/client-s3"
import { createServiceClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const path = searchParams.get("path")
    const bucket = searchParams.get("bucket") || "materials"

    if (!path) {
      return NextResponse.json({ error: "Missing path parameter" }, { status: 400 })
    }

    const targetB2Bucket = bucket === "quiz-bank" ? DEFAULT_B2_BUCKET : (process.env.B2_BUCKET_NAME || DEFAULT_B2_BUCKET)

    // 1. Check if key exists in B2
    let existsInB2 = false
    try {
      await b2Client.send(new HeadObjectCommand({ Bucket: targetB2Bucket, Key: path }))
      existsInB2 = true
    } catch (err: any) {
      // NoSuchKey or NotFound or 404
      if (err.name === "NotFound" || err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
        existsInB2 = false
      } else {
        // Log unexpected error but fallback gracefully
        console.warn(`HeadObject check failed for ${path} in B2:`, err?.message || err)
        existsInB2 = false
      }
    }

    if (existsInB2) {
      const signedUrl = await getB2SignedUrl(path, 3600, targetB2Bucket)
      return NextResponse.json({ url: signedUrl })
    }

    // 2. Fallback to Supabase Storage signed URL
    const serviceSupabase = createServiceClient()
    const { data: signedData, error: signedError } = await serviceSupabase
      .storage
      .from(bucket)
      .createSignedUrl(path, 3600)

    if (signedError || !signedData?.signedUrl) {
      // Final fallback to public URL format if signedUrl generation fails
      const { data: publicData } = serviceSupabase.storage.from(bucket).getPublicUrl(path)
      return NextResponse.json({ url: publicData.publicUrl })
    }

    return NextResponse.json({ url: signedData.signedUrl })
  } catch (err: any) {
    console.error("Error generating signed URL:", err)
    return NextResponse.json({ error: "Failed to generate signed URL" }, { status: 500 })
  }
}
