import { NextRequest, NextResponse } from "next/server"

function getSlideShareEmbedUrl(url: string): string {
  if (url.includes("/slideshow/embed_code/")) {
    return url.startsWith("//") ? `https:${url}` : url
  }

  // Extract numeric ID if present (e.g. .../title-142278470 or .../142278470)
  const idMatch = url.match(/(?:slideshow\/embed_code\/|[\/-])(\d+)(?:[?#]|$)/) || url.match(/(\d{6,})/)
  if (idMatch && idMatch[1]) {
    return `https://www.slideshare.net/slideshow/embed_code/${idMatch[1]}`
  }

  return url
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const urlParam = searchParams.get("url")

    if (!urlParam) {
      return NextResponse.json({ error: "Missing 'url' parameter" }, { status: 400 })
    }

    const embedUrl = getSlideShareEmbedUrl(urlParam)
    const fallbackHtml = `<iframe src="${embedUrl}" width="595" height="485" frameborder="0" marginwidth="0" marginheight="0" scrolling="no" style="border:1px solid #CCC; border-width:1px; margin-bottom:5px; max-width: 100%;" allowfullscreen></iframe>`

    // Attempt calling SlideShare's official oEmbed endpoint server-side
    const oembedUrl = `https://www.slideshare.net/api/oembed/2?url=${encodeURIComponent(urlParam)}&format=json`

    try {
      const response = await fetch(oembedUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json"
        }
      })

      if (response.ok) {
        const contentType = response.headers.get("content-type") || ""
        if (contentType.includes("application/json")) {
          const data = await response.json()
          const html = data.html || fallbackHtml
          const thumbnailUrl = data.thumbnail_url || data.thumbnail || data.thumbnail_link || null

          return NextResponse.json({
            html,
            thumbnail_url: thumbnailUrl
          })
        }
      }
    } catch (e) {
      console.warn("SlideShare oEmbed fetch failed, using fallback embed:", e)
    }

    // Fallback response when SlideShare oEmbed blocks server requests
    return NextResponse.json({
      html: fallbackHtml,
      thumbnail_url: null
    })
  } catch (error: any) {
    console.error("Error in slideshare-embed API route:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
