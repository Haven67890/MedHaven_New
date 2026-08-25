import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("query")?.trim()

    if (!query) {
      return NextResponse.json({ url: null })
    }

    console.log("Medical image search:", query)

    const supabaseAdmin = createServiceClient()

    // 1. Search quiz_image_bank table first
    const { data: dbImages, error: dbError } = await supabaseAdmin
      .from("quiz_image_bank")
      .select("image_url, title, correct_findings")
      .or(`title.ilike.%${query}%,correct_findings.ilike.%${query}%`)
      .limit(1)

    if (!dbError && dbImages && dbImages.length > 0 && dbImages[0].image_url) {
      return NextResponse.json({ url: dbImages[0].image_url })
    }

    // 2. Fallback: Wikimedia Commons / Wikipedia API
    try {
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=thumbnail&pithumbsize=400&titles=${encodeURIComponent(query)}`
      const wikiRes = await fetch(wikiUrl, { next: { revalidate: 86400 } })

      if (wikiRes.ok) {
        const wikiData = await wikiRes.json()
        const pages = wikiData.query?.pages
        if (pages) {
          const pageId = Object.keys(pages)[0]
          if (pageId && pageId !== "-1") {
            const thumbnail = pages[pageId]?.thumbnail?.source
            if (thumbnail) {
              return NextResponse.json({ url: thumbnail })
            }
          }
        }
      }
    } catch (wikiErr) {
      console.error("Wikimedia Commons API fetch error:", wikiErr)
      return NextResponse.json({ url: null })
    }

    // 3. Fallback: return null
    return NextResponse.json({ url: null })
  } catch (err: any) {
    console.error("Medical image API route error:", err)
    return NextResponse.json({ url: null }, { status: 500 })
  }
}
