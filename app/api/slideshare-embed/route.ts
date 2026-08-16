import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const urlParam = searchParams.get("url")

  if (!urlParam) {
    return NextResponse.json({ error: "Missing 'url' parameter" }, { status: 400 })
  }

  // Forward request to new parameterized embed API
  const embedApiUrl = new URL(`/api/embed/slideshare`, request.url)
  embedApiUrl.searchParams.set("url", urlParam)

  return NextResponse.rewrite(embedApiUrl)
}
