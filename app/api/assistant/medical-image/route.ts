import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

function toProxyUrl(rawUrl: string): string {
  if (rawUrl.startsWith("/api/image-proxy")) {
    return rawUrl
  }
  return `/api/image-proxy?url=${encodeURIComponent(rawUrl)}`
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("query")?.trim()

    if (!query) {
      return NextResponse.json({ url: null, candidates: [] })
    }

    const sanitizedQuery =
      query.replace(/\b(picture|photo|image|diagram|illustration|drawing|figure)s?\s+(of\s+)?/gi, "").trim() || query
    console.log("Medical image search query:", query, "| Sanitized:", sanitizedQuery)

    const rawCandidates: string[] = []
    const addCandidate = (rawUrl: string) => {
      if (rawUrl && typeof rawUrl === "string" && !rawCandidates.includes(rawUrl)) {
        rawCandidates.push(rawUrl)
      }
    }

    // STEP 1 — Search Wikimedia Commons (Primary Source)
    try {
      const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(
        sanitizedQuery
      )}&prop=imageinfo&iiprop=url&iiurlwidth=600&format=json&origin=*`
      const commonsRes = await fetch(commonsUrl, {
        headers: { "User-Agent": "MedHaven/1.0 (contact@medhaven.org)" },
        next: { revalidate: 86400 },
      })

      if (commonsRes.ok) {
        const commonsData = await commonsRes.json()
        const pages = commonsData?.query?.pages
        if (pages) {
          for (const page of Object.values(pages) as any[]) {
            const imgUrl = page?.imageinfo?.[0]?.thumburl || page?.imageinfo?.[0]?.url
            if (imgUrl) {
              addCandidate(imgUrl)
            }
          }
        }
      }
    } catch (commonsErr) {
      console.error("Wikimedia Commons API fetch error:", commonsErr)
    }

    // STEP 2 — Search Wikipedia Pageimages (Search generator)
    try {
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        sanitizedQuery
      )}&prop=pageimages&piprop=thumbnail&pithumbsize=600&format=json&origin=*`
      const wikiRes = await fetch(wikiUrl, {
        headers: { "User-Agent": "MedHaven/1.0 (contact@medhaven.org)" },
        next: { revalidate: 86400 },
      })

      if (wikiRes.ok) {
        const wikiData = await wikiRes.json()
        const pages = wikiData?.query?.pages
        if (pages) {
          for (const page of Object.values(pages) as any[]) {
            if (page.thumbnail?.source) {
              addCandidate(page.thumbnail.source)
            }
          }
        }
      }
    } catch (wikiErr) {
      console.error("Wikipedia API fetch error:", wikiErr)
    }

    // STEP 3 — Search Openverse API
    try {
      const openverseUrl = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(sanitizedQuery)}&page_size=5`
      const ovRes = await fetch(openverseUrl, {
        headers: { "User-Agent": "MedHaven/1.0 (contact@medhaven.org)" },
        next: { revalidate: 86400 },
      })

      if (ovRes.ok) {
        const ovData = await ovRes.json()
        if (ovData?.results?.length > 0) {
          for (const item of ovData.results) {
            if (item.url && (item.url.startsWith("http://") || item.url.startsWith("https://"))) {
              addCandidate(item.url)
            }
          }
        }
      }
    } catch (ovErr) {
      console.error("Openverse API fetch error:", ovErr)
    }

    // STEP 4 — Search quiz_image_bank table
    try {
      const supabaseAdmin = createServiceClient()
      const { data } = await supabaseAdmin
        .from("quiz_image_bank")
        .select("image_url, title")
        .ilike("title", `%${query}%`)
        .eq("status", "active")
        .limit(5)

      if (data && Array.isArray(data)) {
        for (const item of data) {
          if (item.image_url && !item.image_url.includes("MEDICAL_IMAGE")) {
            addCandidate(item.image_url)
          }
        }
      }
    } catch (dbErr) {
      console.error("quiz_image_bank query error:", dbErr)
    }

    const candidateProxyUrls = rawCandidates.slice(0, 5).map(toProxyUrl)

    console.log(`Medical image search for "${query}" returning ${candidateProxyUrls.length} candidates.`)

    return NextResponse.json({
      url: candidateProxyUrls[0] || null,
      candidates: candidateProxyUrls,
    })
  } catch (err: any) {
    console.error("Medical image API route error:", err)
    return NextResponse.json({ url: null, candidates: [] })
  }
}
