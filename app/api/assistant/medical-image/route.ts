import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("query")?.trim()

    if (!query) {
      return Response.json({ url: null })
    }

    console.log('Medical image search query:', query)

    const supabaseAdmin = createServiceClient()

    // STEP 1 — Search quiz_image_bank table first
    const { data } = await supabaseAdmin
      .from('quiz_image_bank')
      .select('image_url, title')
      .ilike('title', `%${query}%`)
      .eq('status', 'active')
      .limit(1)
      .single()

    console.log('Step 1 quiz_image_bank result:', data?.image_url || 'none')

    if (data?.image_url && !data.image_url.includes('MEDICAL_IMAGE')) {
      return Response.json({ url: data.image_url })
    }

    // STEP 2 — Search Wikimedia Commons (not Wikipedia)
    let imageUrl: string | undefined = undefined
    try {
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}&prop=imageinfo&iiprop=url&iiurlwidth=500&format=json&origin=*`
      const commonsRes = await fetch(searchUrl, { next: { revalidate: 86400 } })

      if (commonsRes.ok) {
        const commonsData = await commonsRes.json()
        const pages = commonsData?.query?.pages
        if (pages) {
          const firstPage = Object.values(pages)[0] as any
          imageUrl = firstPage?.imageinfo?.[0]?.thumburl
        }
      }
    } catch (commonsErr) {
      console.error("Wikimedia Commons API fetch error:", commonsErr)
    }

    console.log('Step 2 Wikimedia Commons result:', imageUrl || 'none')

    if (imageUrl) {
      return Response.json({ url: imageUrl })
    }

    // STEP 3 — Search Wikipedia for the topic and get its main image as fallback
    let thumbUrl: string | undefined = undefined
    try {
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=thumbnail&pithumbsize=500&titles=${encodeURIComponent(query)}&origin=*`
      const wikiRes = await fetch(wikiUrl, { next: { revalidate: 86400 } })

      if (wikiRes.ok) {
        const wikiData = await wikiRes.json()
        const pages = wikiData?.query?.pages
        if (pages) {
          const firstPage = Object.values(pages)[0] as any
          thumbUrl = firstPage?.thumbnail?.source
        }
      }
    } catch (wikiErr) {
      console.error("Wikipedia API fetch error:", wikiErr)
    }

    console.log('Step 3 Wikipedia fallback:', thumbUrl || 'none')

    if (thumbUrl) {
      return Response.json({ url: thumbUrl })
    }

    // STEP 4 — Return null if all fail
    return Response.json({ url: null })
  } catch (err: any) {
    console.error("Medical image API route error:", err)
    return Response.json({ url: null })
  }
}
