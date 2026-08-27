import { getB2SignedUrl } from "@/lib/b2"

export function constructStorageProxyUrl(path: string, bucket?: string): string {
  if (!path) return "#"
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path
  }
  const params = new URLSearchParams({ path })
  if (bucket) params.set("bucket", bucket)
  return `/api/materials/signed-url?${params.toString()}`
}

export async function resolveStorageUrlServer(path: string | null | undefined, bucket?: string): Promise<string | null> {
  if (!path) return null
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path
  }
  try {
    return await getB2SignedUrl(path, 3600, bucket)
  } catch (err) {
    console.error("Failed to generate B2 signed URL on server:", err)
    return null
  }
}

export function resolveQuizImageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.includes("supabase")) {
    if (url.includes("/materials/")) {
      const path = url.split("/materials/")[1]
      if (path) return `/api/materials/signed-url?path=${encodeURIComponent(path)}`
    }
  }
  return url
}
