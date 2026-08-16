import { NextRequest, NextResponse } from "next/server"

// SlideShare embed helper
function getSlideShareEmbedUrl(url: string): string {
  if (url.includes("/slideshow/embed_code/")) {
    return url.startsWith("//") ? `https:${url}` : url
  }
  const idMatch = url.match(/(?:slideshow\/embed_code\/|[\/-])(\d+)(?:[?#]|$)/) || url.match(/(\d{6,})/)
  if (idMatch && idMatch[1]) {
    return `https://www.slideshare.net/slideshow/embed_code/${idMatch[1]}`
  }
  return url
}

async function handleSlideShare(urlParam: string) {
  const embedUrl = getSlideShareEmbedUrl(urlParam)
  const fallbackHtml = `<iframe src="${embedUrl}" width="595" height="485" frameborder="0" marginwidth="0" marginheight="0" scrolling="no" style="border:1px solid #CCC; border-width:1px; margin-bottom:5px; max-width: 100%;" allowfullscreen></iframe>`

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
        return NextResponse.json({ html, thumbnail_url: thumbnailUrl })
      }
    }
  } catch (e) {
    console.warn("SlideShare oEmbed fetch failed, using fallback embed:", e)
  }

  return NextResponse.json({
    html: fallbackHtml,
    thumbnail_url: null
  })
}

// SlideServe embed helper
async function handleSlideServe(urlParam: string) {
  if (urlParam.includes("slideserve.com/embed/")) {
    const embedMatch = urlParam.match(/slideserve\.com\/embed\/(\d+)/i)
    const embedId = embedMatch ? embedMatch[1] : ""
    const embedUrl = embedId ? `https://www.slideserve.com/embed/${embedId}` : urlParam
    const html = `<iframe src="${embedUrl}" width="595" height="485" frameborder="0" marginwidth="0" marginheight="0" scrolling="no" style="border:1px solid #CCC; max-width: 100%;" allowfullscreen></iframe>`
    return NextResponse.json({ html, thumbnail_url: null })
  }

  let numericId = ""
  let thumbnailUrl: string | null = null

  try {
    const response = await fetch(urlParam, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    })
    if (response.ok) {
      const text = await response.text()
      const embedMatch = text.match(/slideserve\.com\/embed\/(\d+)/i) || text.match(/\/embed\/(\d+)/i)
      if (embedMatch && embedMatch[1]) {
        numericId = embedMatch[1]
      }
      const ogMatch =
        text.match(/property="og:image"\s+content="([^"]+)"/i) ||
        text.match(/content="([^"]+)"\s+property="og:image"/i) ||
        text.match(/name="twitter:image"\s+content="([^"]+)"/i)
      if (ogMatch && ogMatch[1]) {
        thumbnailUrl = ogMatch[1]
      }
    }
  } catch (e) {
    console.warn("SlideServe page fetch failed:", e)
  }

  if (!numericId) {
    const idMatch = urlParam.match(/(\d{5,})/)
    if (idMatch && idMatch[1]) {
      numericId = idMatch[1]
    }
  }

  const finalEmbedUrl = numericId
    ? `https://www.slideserve.com/embed/${numericId}`
    : urlParam

  const html = `<iframe src="${finalEmbedUrl}" width="595" height="485" frameborder="0" marginwidth="0" marginheight="0" scrolling="no" style="border:1px solid #CCC; max-width: 100%;" allowfullscreen></iframe>`

  return NextResponse.json({
    html,
    thumbnail_url: thumbnailUrl
  })
}

// Scribd embed helper
async function handleScribd(urlParam: string) {
  const idMatch = urlParam.match(/(?:document|doc|embeds)\/(\d+)/i) || urlParam.match(/(\d{6,})/)
  const docId = idMatch ? idMatch[1] : ""
  const embedUrl = docId ? `https://www.scribd.com/embeds/${docId}/content` : urlParam

  const html = `<iframe class="scribd_iframe_embed" src="${embedUrl}" data-auto-height="true" data-aspect-ratio="0.7729571053456327" scrolling="no" id="doc_${docId || "embed"}" width="100%" height="600" frameborder="0"></iframe>`

  return NextResponse.json({
    html,
    thumbnail_url: null
  })
}

// Slides.com embed helper
async function handleSlidesCom(urlParam: string) {
  const cleanUrl = urlParam.replace(/\/embed\/?$/, "")
  const embedUrl = `${cleanUrl}/embed`

  let thumbnailUrl: string | null = null
  try {
    const response = await fetch(cleanUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    })
    if (response.ok) {
      const text = await response.text()
      const ogMatch =
        text.match(/property="og:image"\s+content="([^"]+)"/i) ||
        text.match(/content="([^"]+)"\s+property="og:image"/i) ||
        text.match(/name="twitter:image"\s+content="([^"]+)"/i)
      if (ogMatch && ogMatch[1]) {
        thumbnailUrl = ogMatch[1]
      }
    }
  } catch (e) {
    console.warn("Slides.com page fetch failed:", e)
  }

  const html = `<iframe src="${embedUrl}" width="576" height="420" scrolling="no" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>`

  return NextResponse.json({
    html,
    thumbnail_url: thumbnailUrl
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params
    const { searchParams } = new URL(request.url)
    const urlParam = searchParams.get("url")

    if (!urlParam) {
      return NextResponse.json({ error: "Missing 'url' parameter" }, { status: 400 })
    }

    const normalizedProvider = provider.toLowerCase()

    if (normalizedProvider === "slideshare") {
      return handleSlideShare(urlParam)
    } else if (normalizedProvider === "slideserve") {
      return handleSlideServe(urlParam)
    } else if (normalizedProvider === "scribd") {
      return handleScribd(urlParam)
    } else if (normalizedProvider === "slides" || normalizedProvider === "slidescom") {
      return handleSlidesCom(urlParam)
    } else {
      return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 })
    }
  } catch (error: any) {
    console.error("Error in embed API route:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
