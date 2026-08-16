export type SlideDeckProvider = "slideshare" | "slideserve" | "scribd" | "slides"

export function getSlideDeckProvider(url?: string | null): SlideDeckProvider | null {
  if (!url) return null
  const lowerUrl = url.toLowerCase()
  if (lowerUrl.includes("slideshare.net")) return "slideshare"
  if (lowerUrl.includes("slideserve.com")) return "slideserve"
  if (lowerUrl.includes("scribd.com")) return "scribd"
  if (lowerUrl.includes("slides.com")) return "slides"
  return null
}

export function getSlideDeckProviderName(provider?: SlideDeckProvider | string | null): string {
  if (!provider) return "Slide Deck"
  switch (provider.toLowerCase()) {
    case "slideshare":
      return "SlideShare"
    case "slideserve":
      return "SlideServe"
    case "scribd":
      return "Scribd"
    case "slides":
    case "slidescom":
      return "Slides.com"
    default:
      return "Slide Deck"
  }
}

export function getSlideEmbedApiUrl(provider: SlideDeckProvider | string, url: string): string {
  return `/api/embed/${provider}?url=${encodeURIComponent(url)}`
}
