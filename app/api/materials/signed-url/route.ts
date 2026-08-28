import { NextRequest, NextResponse } from "next/server"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { b2Client, DEFAULT_B2_BUCKET } from "@/lib/b2"
import { createClient } from "@/lib/supabase/server"

function getContentTypeByExt(ext: string): string {
  const mimeTypes: Record<string, string> = {
    pdf: "application/pdf",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ppt: "application/vnd.ms-powerpoint",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xls: "application/vnd.ms-excel",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    mp4: "video/mp4",
    webm: "video/webm",
    txt: "text/plain",
  }
  return mimeTypes[ext] || "application/octet-stream"
}

export async function GET(request: NextRequest) {
  console.log('B2 config loaded:', {
    bucket: !!process.env.B2_BUCKET_NAME,
    keyId: !!process.env.B2_KEY_ID,
    appKey: !!process.env.B2_APP_KEY,
    endpoint: !!process.env.B2_ENDPOINT
  })

  try {
    const { searchParams } = new URL(request.url)
    const path = searchParams.get("path")
    const decodedPath = decodeURIComponent(path || "")
    const bucket = searchParams.get("bucket") || "materials"

    if (!path) {
      return new Response('Missing path parameter', { status: 400 })
    }

    // Allow branding assets without authentication check
    const isBranding = path.startsWith("branding/")
    if (!isBranding) {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return new Response('Unauthorized', { status: 401 })
      }
    }

    const targetB2Bucket =
      bucket === "quiz-bank" ? DEFAULT_B2_BUCKET : process.env.B2_BUCKET_NAME || DEFAULT_B2_BUCKET

    const filename = path.split("/").pop() || "file"
    const ext = filename.split(".").pop()?.toLowerCase() || ""

    const attachmentExtensions = ["pptx", "ppt", "docx", "doc", "xlsx", "xls"]
    const disposition = attachmentExtensions.includes(ext) ? "attachment" : "inline"
    const contentDisposition = `${disposition}; filename="${encodeURIComponent(filename)}"`
    const contentType = getContentTypeByExt(ext)

    const command = new GetObjectCommand({
      Bucket: targetB2Bucket,
      Key: decodedPath,
      ResponseContentDisposition: contentDisposition,
      ResponseContentType: contentType,
    })

    const presignedUrl = await getSignedUrl(b2Client, command, {
      expiresIn: 3600,
    })

    return Response.redirect(presignedUrl, 302)
  } catch (err: any) {
    console.error("Error generating presigned URL from B2:", err)
    return new Response('File not found', { status: 404 })
  }
}
