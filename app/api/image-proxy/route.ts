import { NextRequest, NextResponse } from "next/server"

const ALLOWED_EXACT_DOMAINS = new Set([
  "upload.wikimedia.org",
  "commons.wikimedia.org",
  "live.staticflickr.com",
  "api.openverse.engineering",
  "api.openverse.org",
])

function isAllowedDomain(hostname: string): boolean {
  const lowerHost = hostname.toLowerCase()
  if (ALLOWED_EXACT_DOMAINS.has(lowerHost)) {
    return true
  }
  // Allow farm*.staticflickr.com (e.g., farm1.staticflickr.com, farm66.staticflickr.com)
  if (/^farm\d+\.staticflickr\.com$/.test(lowerHost)) {
    return true
  }
  return false
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const targetUrlParam = searchParams.get("url")

    if (!targetUrlParam) {
      return NextResponse.json({ error: "Missing url parameter" }, { status: 400 })
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(targetUrlParam)
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return NextResponse.json({ error: "Invalid URL protocol" }, { status: 400 })
    }

    if (!isAllowedDomain(parsedUrl.hostname)) {
      return NextResponse.json({ error: "Domain not allowed" }, { status: 400 })
    }

    const upstreamResponse = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent": "MedHaven/1.0 (contact@medhaven.org)",
      },
    })

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        { error: `Upstream request failed with status ${upstreamResponse.status}` },
        { status: upstreamResponse.status >= 500 ? 502 : upstreamResponse.status }
      )
    }

    const contentType = upstreamResponse.headers.get("content-type") || "image/jpeg"
    const imageBuffer = await upstreamResponse.arrayBuffer()

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600",
      },
    })
  } catch (err: any) {
    console.error("[Image Proxy] Error fetching image:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
