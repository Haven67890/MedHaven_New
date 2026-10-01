import { NextRequest, NextResponse } from "next/server"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { b2Client, DEFAULT_B2_BUCKET } from "@/lib/b2"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const path = searchParams.get('path') || ''
  const bucket = searchParams.get('bucket') || (path.startsWith('branding/') ? '' : 'materials')

  if (!path) {
    return new Response('Missing path', { status: 400 })
  }

  const privateBuckets = new Set(['materials', 'quiz-bank', 'presentations', 'research'])
  const isPrivateSupabaseObject = privateBuckets.has(bucket)

  // Check auth for non-branding files and private Supabase objects.
  if (!path.startsWith('branding/') || isPrivateSupabaseObject) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    if (isPrivateSupabaseObject) {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(decodeURIComponent(path), 3600)

      if (error || !data?.signedUrl) {
        return new Response(error?.message || 'Unable to create signed URL', { status: 404 })
      }

      return Response.redirect(data.signedUrl, 302)
    }
  }

  // Redirect to Cloudflare Worker — zero Render bandwidth used
  const workerUrl = process.env.CLOUDFLARE_WORKER_URL
  const decodedPath = decodeURIComponent(path)
  const encodedPath = decodedPath
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/')

  return Response.redirect(
    `${workerUrl}/${encodedPath}`,
    302
  )
}
