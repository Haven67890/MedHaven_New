"use client"

import { useState, useEffect } from "react"
import {
  Video,
  FileText,
  ExternalLink,
  Play,
  Eye,
  Download,
  BookOpen,
  FileSpreadsheet,
  Presentation,
  FilePenLine,
  Image as ImageIcon,
  Copy,
  Check,
  CheckCircle2
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import useAuth from "@/hooks/useAuth"
import { logMaterialActivity } from "@/utils/activity"
import { getSlideDeckProvider, getSlideEmbedApiUrl } from "@/lib/embed"

// Memory cache for PDF thumbnails
const pdfThumbnailCache: Record<string, string> = {}
const failedPdfCache: Record<string, boolean> = {}

// Memory cache for Slide deck thumbnails
const slideDeckThumbnailCache: Record<string, string> = {}
const failedSlideDeckCache: Record<string, boolean> = {}

// Memory cache for YouTube embed checks
const youtubeEmbedCheckCache: Record<string, boolean> = {}

export interface Faculty {
  id: string
  name: string
}

export interface Course {
  id: string
  code?: string | null
  title?: string | null
  level?: string | number | null
  parent_id?: string | null
  faculties?: Faculty | null
}

export interface Material {
  id: string
  course_id: string | null
  title: string
  type: string
  tier: string
  source_url?: string | null
  storage_path?: string | null
  description?: string | null
  uploaded_by?: string | null
  created_at: string
  courses?: Course | null
  status?: "draft" | "published" | "archived" | string | null
  featured?: boolean | null
}

interface MaterialCardProps {
  material: Material
  onPreview: (
    material: Material,
    type: "pdf" | "office" | "image" | "video" | "slideshare" | null,
    isEmbeddable: boolean
  ) => void
}

function getYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
  const match = url.match(regExp)
  return match && match[1] ? match[1] : null
}

function getMaterialUrl(material: Material): string {
  if (!material.storage_path) {
    return material.source_url || "#"
  }
  if (material.storage_path.startsWith("http://") || material.storage_path.startsWith("https://")) {
    return material.storage_path
  }
  return `/api/materials/signed-url?path=${encodeURIComponent(material.storage_path)}`
}

function getFileExtension(url: string | null | undefined): string {
  if (!url) return ""
  try {
    const path = url.split("?")[0]
    const parts = path.split(".")
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ""
  } catch (e) {
    return ""
  }
}

function formatTypeName(type: string): string {
  if (!type) return "Material"
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function MaterialCard({ material, onPreview }: MaterialCardProps) {
  const { user } = useAuth()
  const fileUrl = getMaterialUrl(material)
  const ext = getFileExtension(fileUrl)
  const isPdf = ext === "pdf" || material.type?.toLowerCase() === "pdf"
  const isVideo = material.type?.toLowerCase() === "video"

  const slideDeckProvider = getSlideDeckProvider(material.source_url)
  const isSlideDeck = Boolean(slideDeckProvider)

  const youtubeId = isVideo ? getYouTubeId(material.source_url) : null

  // Thumbnail states
  const [pdfThumbnail, setPdfThumbnail] = useState<string | null>(null)
  const [isGeneratingPdfThumb, setIsGeneratingPdfThumb] = useState(false)
  const [slideDeckThumbnail, setSlideDeckThumbnail] = useState<string | null>(null)
  const [isSlideDeckLoading, setIsSlideDeckLoading] = useState(false)

  // YouTube embedding state
  const [isYoutubeEmbeddable, setIsYoutubeEmbeddable] = useState<boolean>(true)

  // UX Improvement states
  const [copied, setCopied] = useState(false)
  const [isViewed, setIsViewed] = useState(false)

  // Check reading progress from localStorage
  useEffect(() => {
    const checkViewed = () => {
      try {
        const val = localStorage.getItem(`medhaven_viewed_${material.id}`)
        setIsViewed(Boolean(val))
      } catch (e) {
        // Ignore
      }
    }

    checkViewed()

    if (typeof window !== "undefined") {
      window.addEventListener("material-viewed", checkViewed)
      return () => window.removeEventListener("material-viewed", checkViewed)
    }
  }, [material.id])

  // PDF thumbnail generator
  useEffect(() => {
    if (isPdf) {
      const cacheKey = `medhaven_pdf_thumb_${material.id}`
      if (failedPdfCache[cacheKey]) return
      if (pdfThumbnailCache[cacheKey]) {
        setPdfThumbnail(pdfThumbnailCache[cacheKey])
        return
      }
      try {
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          pdfThumbnailCache[cacheKey] = cached
          setPdfThumbnail(cached)
          return
        }
      } catch (e) {
        // Ignore
      }

      generatePdfThumbnail()
    }
  }, [material.id, material.type, isPdf])

  // Slide Deck thumbnail generator
  useEffect(() => {
    if (isSlideDeck && material.source_url) {
      const cacheKey = material.source_url
      if (failedSlideDeckCache[cacheKey]) return
      if (slideDeckThumbnailCache[cacheKey]) {
        setSlideDeckThumbnail(slideDeckThumbnailCache[cacheKey])
        return
      }

      let active = true
      const fetchSlideDeckThumb = async () => {
        setIsSlideDeckLoading(true)
        try {
          const provider = slideDeckProvider || "slideshare"
          const res = await fetch(getSlideEmbedApiUrl(provider, material.source_url!))
          if (!res.ok) throw new Error("Slide deck fetch failed")
          const data = await res.json()

          if (data.thumbnail_url && active) {
            setSlideDeckThumbnail(data.thumbnail_url)
            slideDeckThumbnailCache[cacheKey] = data.thumbnail_url
          }
        } catch (err) {
          if (active) failedSlideDeckCache[cacheKey] = true
        } finally {
          if (active) setIsSlideDeckLoading(false)
        }
      }
      void fetchSlideDeckThumb()
      return () => {
        active = false
      }
    }
  }, [isSlideDeck, slideDeckProvider, material.source_url])

  // YouTube embeddable check
  useEffect(() => {
    if (isVideo && material.source_url) {
      if (!youtubeId) {
        setIsYoutubeEmbeddable(false)
        return
      }

      const cacheKey = material.source_url
      if (youtubeEmbedCheckCache[cacheKey] !== undefined) {
        setIsYoutubeEmbeddable(youtubeEmbedCheckCache[cacheKey])
        return
      }

      let active = true
      const checkEmbeddable = async () => {
        try {
          const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(material.source_url!)}&format=json`
          const response = await fetch(oembedUrl)
          if (active) {
            const isOk = response.ok
            setIsYoutubeEmbeddable(isOk)
            youtubeEmbedCheckCache[cacheKey] = isOk
          }
        } catch (error) {
          if (active) {
            setIsYoutubeEmbeddable(false)
            youtubeEmbedCheckCache[cacheKey] = false
          }
        }
      }
      void checkEmbeddable()
      return () => {
        active = false
      }
    }
  }, [isVideo, material.source_url, youtubeId])

  const generatePdfThumbnail = async () => {
    if (!fileUrl || fileUrl === "#") return
    const cacheKey = `medhaven_pdf_thumb_${material.id}`
    setIsGeneratingPdfThumb(true)
    try {
      const pdfjs = await import("pdfjs-dist")
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`

      const loadingTask = pdfjs.getDocument(fileUrl)
      const pdf = await loadingTask.promise
      const page = await pdf.getPage(1)

      const viewport = page.getViewport({ scale: 0.5 })
      const canvas = document.createElement("canvas")
      const context = canvas.getContext("2d")

      if (context) {
        canvas.width = viewport.width
        canvas.height = viewport.height

        await page.render({ canvasContext: context, viewport }).promise
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8)

        setPdfThumbnail(dataUrl)
        pdfThumbnailCache[cacheKey] = dataUrl
        try {
          localStorage.setItem(cacheKey, dataUrl)
        } catch (e) {
          // Ignore
        }
      } else {
        failedPdfCache[cacheKey] = true
      }
    } catch (err) {
      failedPdfCache[cacheKey] = true
    } finally {
      setIsGeneratingPdfThumb(false)
    }
  }

  const isWord =
    ["docx", "doc"].includes(ext) ||
    (material.type?.toLowerCase() === "doc" && ext !== "pdf" && !["pptx", "ppt"].includes(ext))
  const isPowerPoint =
    ["pptx", "ppt", "pps", "ppsx"].includes(ext) ||
    (material.type?.toLowerCase() === "lecture_slide" && !isSlideDeck && ext !== "pdf" && !isWord)
  const isOffice = isWord || isPowerPoint || ["xlsx", "xls"].includes(ext) || (material.type?.toLowerCase() === "office" && ext !== "pdf")
  const isImage = ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext)
  const isStoredFile = fileUrl.startsWith("/api/materials/signed-url") || Boolean(material.storage_path) || fileUrl.includes("supabase.co/storage")

  const showViewButton = isPdf || isOffice || isImage || isVideo || isSlideDeck
  const showDownloadButton = isStoredFile

  const handlePreviewClick = () => {
    if (user?.id) {
      logMaterialActivity(user.id, material.id, "view")
    }

    try {
      const existing = JSON.parse(localStorage.getItem("medhaven_recently_viewed") || "[]")
      const filtered = existing.filter((item: any) => item.id !== material.id)
      const updated = [
        {
          id: material.id,
          title: material.title,
          course: material.courses?.code || material.courses?.title || "General",
          type: material.type,
          storage_path: material.storage_path,
          source_url: material.source_url,
        },
        ...filtered,
      ].slice(0, 5)
      localStorage.setItem("medhaven_recently_viewed", JSON.stringify(updated))
      window.dispatchEvent(new Event("recently-viewed-updated"))
    } catch (e) {
      // Ignore
    }

    if (isPdf) {
      try {
        localStorage.setItem(`medhaven_viewed_${material.id}`, "true")
        setIsViewed(true)
        window.dispatchEvent(new Event("material-viewed"))
      } catch (e) {
        // Ignore
      }
    }

    if (!material.storage_path) {
      if (material.source_url) {
        window.open(material.source_url, "_blank")
      }
      return
    }

    if (isVideo) {
      onPreview(material, "video", isYoutubeEmbeddable)
    } else if (isSlideDeck) {
      onPreview(material, "slideshare", true)
    } else if (isImage) {
      onPreview(material, "image", true)
    } else if (isPdf) {
      onPreview(material, "pdf", true)
    } else if (isOffice) {
      onPreview(material, "office", true)
    } else {
      onPreview(material, "pdf", true)
    }
  }

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation()
    const fullUrl =
      fileUrl.startsWith("http://") || fileUrl.startsWith("https://")
        ? fileUrl
        : `${window.location.origin}${fileUrl}`

    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // Type icon mapping
  const renderTypeIcon = () => {
    if (isPdf) return <FileText className="size-6 text-red-500" />
    if (isPowerPoint) return <Presentation className="size-6 text-orange-500" />
    if (isWord) return <FilePenLine className="size-6 text-blue-500" />
    if (ext === "xlsx" || ext === "xls") return <FileSpreadsheet className="size-6 text-emerald-500" />
    if (isVideo) return <Video className="size-6 text-red-500" />
    if (isSlideDeck) return <ExternalLink className="size-6 text-amber-500" />
    if (isImage) return <ImageIcon className="size-6 text-teal-500" />
    return <FileText className="size-6 text-primary" />
  }

  return (
    <Card className="overflow-hidden border border-border/60 hover:border-primary/45 shadow-xs hover:shadow-md active:scale-[0.995] transition-all duration-200 flex flex-col sm:flex-row gap-4 p-4 bg-card group">
      {/* Thumbnail / Icon Section */}
      <div className="relative w-full sm:w-40 md:w-44 aspect-video sm:aspect-[4/3] rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0 border border-border/40 select-none">
        {isVideo && youtubeId ? (
          <div className="absolute inset-0 w-full h-full cursor-pointer group/thumb" onClick={handlePreviewClick}>
            <img
              src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
              alt={material.title}
              className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover/thumb:bg-black/45 transition-colors duration-200">
              <span className="flex size-11 items-center justify-center rounded-full bg-white/90 text-red-600 shadow-md transform group-hover/thumb:scale-110 transition-transform duration-200">
                <Play className="size-6 fill-red-600" />
              </span>
            </div>
          </div>
        ) : isSlideDeck && slideDeckThumbnail ? (
          <div className="absolute inset-0 w-full h-full cursor-pointer group/thumb" onClick={handlePreviewClick}>
            <img
              src={slideDeckThumbnail}
              alt={material.title}
              className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/10 flex items-center justify-center group-hover/thumb:bg-black/25 transition-colors duration-200">
              <span className="flex size-10 items-center justify-center rounded-full bg-white/90 text-primary shadow-md transform group-hover/thumb:scale-110 transition-transform duration-200">
                <Eye className="size-5" />
              </span>
            </div>
          </div>
        ) : isPdf && pdfThumbnail ? (
          <div className="absolute inset-0 w-full h-full cursor-pointer group/thumb" onClick={handlePreviewClick}>
            <img
              src={pdfThumbnail}
              alt={material.title}
              className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/5 flex items-center justify-center group-hover/thumb:bg-black/15 transition-colors duration-200">
              <span className="flex size-9 items-center justify-center rounded-full bg-white/90 text-primary shadow-md transform group-hover/thumb:scale-110 transition-transform duration-200">
                <Eye className="size-4" />
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground p-3">
            {isGeneratingPdfThumb || isSlideDeckLoading ? (
              <div className="size-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            ) : (
              renderTypeIcon()
            )}
            <span className="text-[10px] font-medium tracking-wide uppercase text-muted-foreground/85">
              {formatTypeName(material.type)}
            </span>
          </div>
        )}

        {/* Floating Tier & Viewed Badges */}
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 pointer-events-none">
          <Badge
            variant={material.tier?.toLowerCase() === "recommended" ? "success" : "muted"}
            className="shadow-sm text-[10px] px-1.5 py-0"
          >
            {material.tier?.toUpperCase() || "STUDY"}
          </Badge>
          {isViewed && (
            <Badge className="bg-emerald-600/90 hover:bg-emerald-600 text-white shadow-sm text-[10px] px-1.5 py-0 flex items-center gap-1">
              <CheckCircle2 className="size-2.5" /> Viewed
            </Badge>
          )}
        </div>
      </div>

      {/* Details & Actions Section */}
      <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5 gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <h4
              className="font-semibold text-base leading-snug text-foreground group-hover:text-primary transition-colors cursor-pointer line-clamp-2 min-w-0"
              onClick={handlePreviewClick}
              title={material.title}
            >
              {material.title}
            </h4>

            {/* Copy Link Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopyLink}
              title={copied ? "Copied!" : "Copy link"}
              className="size-7 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
            </Button>
          </div>

          {material.courses && (
            <div className="text-xs font-semibold text-primary flex items-center gap-1.5">
              <BookOpen className="size-3 shrink-0" />
              <span>
                {material.courses.code ? `${material.courses.code} · ` : ""}
                {material.courses.title}
              </span>
            </div>
          )}

          {material.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{material.description}</p>
          )}
        </div>

        {/* Footer badges and actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-2 mt-auto">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-medium tracking-wider uppercase bg-muted/30">
              {formatTypeName(material.type)}
            </Badge>
            {ext && (
              <Badge variant="outline" className="text-[10px] font-mono bg-muted/10 uppercase">
                .{ext}
              </Badge>
            )}
            {copied && (
              <span className="text-[10px] font-medium text-emerald-500 animate-in fade-in">Copied!</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {showViewButton && (
              <Button
                size="sm"
                variant={isVideo ? "destructive" : "default"}
                className="h-8 text-xs font-medium px-3 flex items-center gap-1 shadow-sm"
                onClick={handlePreviewClick}
              >
                {isVideo ? (
                  <>
                    <Play className="size-3.5 fill-current shrink-0" /> Play
                  </>
                ) : (
                  <>
                    <Eye className="size-3.5 shrink-0" /> View
                  </>
                )}
              </Button>
            )}

            {showDownloadButton && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs font-medium px-3 flex items-center gap-1"
                asChild
              >
                <a
                  href={fileUrl}
                  download
                  onClick={() => {
                    if (user?.id) {
                      logMaterialActivity(user.id, material.id, "download")
                    }
                  }}
                >
                  <Download className="size-3.5 shrink-0" /> Download
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
