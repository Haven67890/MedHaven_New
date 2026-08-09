import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const urlParam = searchParams.get("url")

    if (!urlParam) {
      return NextResponse.json({ error: "Missing 'url' parameter" }, { status: 400 })
    }

    // Call SlideShare's official oEmbed endpoint server-side
    const oembedUrl = `https://www.slideshare.net/api/oembed/2?url=${encodeURIComponent(urlParam)}&format=json`

    const response = await fetch(oembedUrl)
    if (!response.ok) {
      return NextResponse.json({ error: `SlideShare oEmbed failed with status: ${response.status}` }, { status: response.status })
    }

    const data = await response.json()
    if (!data.html) {
      return NextResponse.json({ error: "No embed HTML returned from SlideShare" }, { status: 404 })
    }

    return NextResponse.json({ html: data.html })
  } catch (error: any) {
    console.error("Error in slideshare-embed API route:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
