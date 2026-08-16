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

export function getFileExtensionFromUrl(url?: string | null): string {
  if (!url) return ""
  try {
    const path = url.split('?')[0]
    const parts = path.split('.')
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ""
  } catch (e) {
    return ""
  }
}

export function getIframePreviewSrc(url: string, type?: string | null): string {
  const ext = getFileExtensionFromUrl(url)
  const isOfficeExt = ["pptx", "ppt", "pps", "ppsx", "docx", "doc", "xlsx", "xls"].includes(ext)
  const isPdfExt = ext === "pdf"

  // PDF files must ALWAYS use direct fileUrl for inline browser preview
  if (isPdfExt || type === "pdf") {
    return url
  }

  // PowerPoint (.ppt/.pptx) and Word (.doc/.docx) files route through Office Online Viewer
  if (isOfficeExt || type === "office") {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`
  }

  return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`
}
