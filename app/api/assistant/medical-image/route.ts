import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("query")?.trim()

    if (!query) {
      return NextResponse.json({ url: null })
    }

    console.log("Medical image search query:", query)

    const supabaseAdmin = createServiceClient()

    // STEP 1 — Search quiz_image_bank table first
    try {
      const { data } = await supabaseAdmin
        .from("quiz_image_bank")
        .select("image_url, title")
        .ilike("title", `%${query}%`)
        .eq("status", "active")
        .limit(1)
        .maybeSingle()

      if (data?.image_url && !data.image_url.includes("MEDICAL_IMAGE")) {
        console.log("Step 1 quiz_image_bank hit:", data.image_url)
        return NextResponse.json({ url: data.image_url })
      }
    } catch (dbErr) {
      console.error("quiz_image_bank query error:", dbErr)
    }

    // STEP 2 — Search Openverse API (searches CC / open license medical images reliably)
    try {
      const openverseUrl = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=5`
      const ovRes = await fetch(openverseUrl, {
        headers: { "User-Agent": "MedHaven/1.0 (contact@medhaven.org)" },
        next: { revalidate: 86400 }
      })

      if (ovRes.ok) {
        const ovData = await ovRes.json()
        if (ovData?.results?.length > 0) {
          for (const item of ovData.results) {
            if (item.url && (item.url.startsWith("http://") || item.url.startsWith("https://"))) {
              console.log("Step 2 Openverse hit:", item.url)
              return NextResponse.json({ url: item.url })
            }
          }
        }
      }
    } catch (ovErr) {
      console.error("Openverse API fetch error:", ovErr)
    }

    // STEP 3 — Search Wikipedia Pageimages (Search generator)
    try {
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&prop=pageimages&piprop=thumbnail&pithumbsize=600&format=json&origin=*`
      const wikiRes = await fetch(wikiUrl, {
        headers: { "User-Agent": "MedHaven/1.0 (contact@medhaven.org)" },
        next: { revalidate: 86400 }
      })

      if (wikiRes.ok) {
        const wikiData = await wikiRes.json()
        const pages = wikiData?.query?.pages
        if (pages) {
          for (const page of Object.values(pages) as any[]) {
            if (page.thumbnail?.source) {
              console.log("Step 3 Wikipedia pageimages hit:", page.thumbnail.source)
              return NextResponse.json({ url: page.thumbnail.source })
            }
          }
        }
      }
    } catch (wikiErr) {
      console.error("Wikipedia API fetch error:", wikiErr)
    }

    // STEP 4 — Search Wikimedia Commons generator search fallback
    try {
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}&prop=imageinfo&iiprop=url&iiurlwidth=600&format=json&origin=*`
      const commonsRes = await fetch(searchUrl, {
        headers: { "User-Agent": "MedHaven/1.0 (contact@medhaven.org)" },
        next: { revalidate: 86400 }
      })

      if (commonsRes.ok) {
        const commonsData = await commonsRes.json()
        const pages = commonsData?.query?.pages
        if (pages) {
          const firstPage = Object.values(pages)[0] as any
          const imageUrl = firstPage?.imageinfo?.[0]?.thumburl || firstPage?.imageinfo?.[0]?.url
          if (imageUrl) {
            console.log("Step 4 Wikimedia Commons hit:", imageUrl)
            return NextResponse.json({ url: imageUrl })
          }
        }
      }
    } catch (commonsErr) {
      console.error("Wikimedia Commons API fetch error:", commonsErr)
    }

    // STEP 5 — Return null if all fail
    console.log("Medical image search no results for:", query)
    return NextResponse.json({ url: null })
  } catch (err: any) {
    console.error("Medical image API route error:", err)
    return NextResponse.json({ url: null })
  }
}
