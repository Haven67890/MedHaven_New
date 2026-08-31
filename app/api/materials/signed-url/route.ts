import { NextRequest, NextResponse } from "next/server"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { b2Client, DEFAULT_B2_BUCKET } from "@/lib/b2"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const path = searchParams.get('path') || ''

  if (!path) {
    return new Response('Missing path', { status: 400 })
  }

  // Check auth for non-branding files
  if (!path.startsWith('branding/')) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response('Unauthorized', { status: 401 })
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
