import { NextRequest, NextResponse } from "next/server"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { b2Client, DEFAULT_B2_BUCKET } from "@/lib/b2"
import { createClient } from "@/lib/supabase/server"

function getContentTypeByExt(ext: string): string {
  const mimeTypes: Record<string, string> = {
    pdf: "application/pdf",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ppt: "application/vnd.ms-powerpoint",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
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
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const path = searchParams.get("path")
    const bucket = searchParams.get("bucket") || "materials"

    if (!path) {
      return NextResponse.json({ error: "Missing path parameter" }, { status: 400 })
    }

    const targetB2Bucket =
      bucket === "quiz-bank" ? DEFAULT_B2_BUCKET : process.env.B2_BUCKET_NAME || DEFAULT_B2_BUCKET

    const command = new GetObjectCommand({
      Bucket: targetB2Bucket,
      Key: path,
    })

    const response = await b2Client.send(command)

    const filename = path.split("/").pop() || "file"
    const ext = filename.split(".").pop()?.toLowerCase() || ""

    const attachmentExtensions = ["pptx", "ppt", "docx", "doc", "xlsx", "xls"]
    const disposition = attachmentExtensions.includes(ext) ? "attachment" : "inline"

    let contentType = response.ContentType
    if (!contentType || contentType === "application/octet-stream") {
      contentType = getContentTypeByExt(ext)
    }

    const stream = (response.Body as any)?.transformToWebStream?.() || (response.Body as ReadableStream)

    return new Response(stream, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `${disposition}; filename="${filename}"`,
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch (err: any) {
    if (err?.name === "NotFound" || err?.name === "NoSuchKey" || err?.$metadata?.httpStatusCode === 404) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }
    console.error("Error streaming file from B2:", err)
    return NextResponse.json({ error: "Failed to retrieve file" }, { status: 500 })
  }
}
