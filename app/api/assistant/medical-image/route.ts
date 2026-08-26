import { createServiceClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const rawQuery = searchParams.get('query') || ''
  const query = decodeURIComponent(
    rawQuery.replace(/_/g, ' ')
  ).trim()

  console.log('Medical image search:', query)

  if (!query) return Response.json({ url: null, candidates: [] })

  const candidates: string[] = []

  // SOURCE 1: quiz_image_bank (our own verified images)
  try {
    const supabaseAdmin = createServiceClient()
    const { data } = await supabaseAdmin
      .from('quiz_image_bank')
      .select('image_url')
      .ilike('title', '%' + query + '%')
      .eq('status', 'active')
      .limit(3)

    if (data) {
      for (const row of data) {
        if (row.image_url &&
            !row.image_url.includes('MEDICAL_IMAGE') &&
            (row.image_url.startsWith('http://') ||
             row.image_url.startsWith('https://'))) {
          candidates.push(row.image_url)
        }
      }
    }
    console.log('quiz_image_bank found:', candidates.length)
  } catch (e) {
    console.log('quiz_image_bank error:', e)
  }

  // SOURCE 2: Wikimedia Commons search
  // (hotlinking explicitly allowed — educational use)
  try {
    const commonsRes = await fetch(
      'https://commons.wikimedia.org/w/api.php?' +
      new URLSearchParams({
        action: 'query',
        generator: 'search',
        gsrnamespace: '6',
        gsrsearch: query + ' medical',
        gsrlimit: '5',
        prop: 'imageinfo',
        iiprop: 'url',
        iiurlwidth: '600',
        format: 'json',
        origin: '*'
      }),
      { signal: AbortSignal.timeout(6000) }
    )
    const commonsData = await commonsRes.json()
    const pages = commonsData?.query?.pages

    if (pages) {
      for (const page of Object.values(pages) as any[]) {
        const url = page?.imageinfo?.[0]?.thumburl ||
                    page?.imageinfo?.[0]?.url
        if (url &&
            url.includes('wikimedia.org') &&
            (url.match(/\.(jpg|jpeg|png|webp)(\?|$)/i))) {
          candidates.push(url)
          if (candidates.length >= 5) break
        }
      }
    }
    console.log('Wikimedia Commons found:', candidates.length)
  } catch (e) {
    console.log('Wikimedia Commons error:', e)
  }

  // SOURCE 3: Wikipedia article thumbnail
  // (simple, reliable, always a real image)
  if (candidates.length < 3) {
    try {
      const wikiRes = await fetch(
        'https://en.wikipedia.org/api/rest_v1/page/summary/' +
        encodeURIComponent(query),
        { signal: AbortSignal.timeout(5000) }
      )
      const wikiData = await wikiRes.json()
      const thumbUrl = wikiData?.originalimage?.source ||
                       wikiData?.thumbnail?.source

      if (thumbUrl && thumbUrl.includes('wikimedia.org')) {
        candidates.push(thumbUrl)
        console.log('Wikipedia thumbnail:', thumbUrl)
      }
    } catch (e) {
      console.log('Wikipedia error:', e)
    }
  }

  console.log('Total candidates:', candidates.length,
    candidates.slice(0, 2))

  return Response.json({
    url: candidates[0] || null,
    candidates
  })
}
