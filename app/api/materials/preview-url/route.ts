import { NextRequest, NextResponse } from "next/server"
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

    const workerUrl = process.env.CLOUDFLARE_WORKER_URL
    if (!workerUrl) {
      return Response.json({ error: 'Worker URL not configured' },
        { status: 500 })
    }

    const decodedPath = decodeURIComponent(path)
    const encodedPath = decodedPath
      .split('/')
      .map(segment => encodeURIComponent(segment))
      .join('/')

    const workerBase = workerUrl.endsWith('/')
      ? workerUrl.slice(0, -1)
      : workerUrl

    return Response.json({ url: `${workerBase}/${encodedPath}` })
  } catch (err: any) {
    console.error("Error generating preview presigned URL:", err)
    return NextResponse.json({ error: "Preview unavailable" }, { status: 404 })
  }
}
