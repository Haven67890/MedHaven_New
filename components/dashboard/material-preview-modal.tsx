"use client"

import { useEffect, useState } from "react"
import { X, Download, ExternalLink, Video, FileText, FilePenLine, FileSpreadsheet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PDFViewer } from "@/components/viewers/PDFViewer"
import { DocxViewer } from "@/components/viewers/DocxViewer"
import { PptxViewer } from "@/components/viewers/PptxViewer"

export interface PreviewModalData {
  isOpen: boolean
  title: string
  url: string
  type: "pdf" | "office" | "image" | "video" | "slideshare" | null
  isEmbeddable?: boolean
  materialId?: string
  storagePath?: string | null
}

interface MaterialPreviewModalProps {
  modal: PreviewModalData | null
  onClose: () => void
}

function getYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
  const match = url.match(regExp)
  return match && match[1] ? match[1] : null
}

function getYouTubeEmbedUrl(url: string | null | undefined): string | null {
  const id = getYouTubeId(url)
  return id ? `https://www.youtube.com/embed/${id}` : null
}

function extractStoragePath(modal: PreviewModalData): string | null {
  if (modal.storagePath) return modal.storagePath
  if (modal.url) {
    try {
      const urlObj = new URL(modal.url, "http://localhost")
      const p = urlObj.searchParams.get("path")
      if (p) return p
    } catch (e) {
      // Ignore
    }
  }
  return null
}

export function MaterialPreviewModal({ modal, onClose }: MaterialPreviewModalProps) {
  const [origin, setOrigin] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin)
    }
  }, [])

  if (!modal || !modal.isOpen) return null

  const { title, url, type, isEmbeddable, materialId } = modal
  const storagePath = extractStoragePath(modal)

  // Record reading progress in localStorage for PDFs when opened in modal
  if (materialId && type === "pdf" && typeof window !== "undefined") {
    try {
      localStorage.setItem(`medhaven_viewed_${materialId}`, "true")
      window.dispatchEvent(new Event("material-viewed"))
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  const targetPath = storagePath || url
  const ext = targetPath.split("?")[0].split(".").pop()?.toLowerCase() || ""

  const downloadUrl = storagePath
    ? `/api/materials/signed-url?path=${encodeURIComponent(storagePath)}`
    : url

  const renderContent = () => {
    if (type === "image") {
      return (
        <div className="w-full h-full p-4 flex items-center justify-center">
          <img src={url} alt={title} className="max-w-full max-h-full object-contain rounded-md" />
        </div>
      )
    }

    if (type === "video") {
      const ytId = getYouTubeId(url)
      const ytEmbedUrl = getYouTubeEmbedUrl(url)

      if (ytEmbedUrl && isEmbeddable !== false) {
        return (
          <iframe
            src={ytEmbedUrl}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full border-0"
          />
        )
      }

      if (ytId) {
        return (
          <div className="flex flex-col items-center justify-center text-center p-6 max-w-md bg-card rounded-xl border border-border shadow-md">
            <div className="relative aspect-video w-64 overflow-hidden rounded-lg border bg-muted mb-4 shadow-sm">
              <img
                src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                alt={title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Video className="size-10 text-white/90" />
              </div>
            </div>
            <h4 className="font-semibold text-foreground text-base mb-1">
              Embedding restricted by uploader
            </h4>
            <p className="text-xs text-muted-foreground mb-4">
              This video is restricted and can only be watched directly on YouTube.
            </p>
            <Button asChild variant="destructive" size="sm">
              <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                Watch on YouTube <ExternalLink className="size-3.5" />
              </a>
            </Button>
          </div>
        )
      }

      return (
        <div className="flex flex-col items-center justify-center text-center p-6 max-w-md bg-card rounded-xl border border-border shadow-md">
          <div className="flex size-14 items-center justify-center rounded-full bg-red-500/10 text-red-500 mb-4">
            <Video className="size-7" />
          </div>
          <h4 className="font-semibold text-foreground text-base mb-1">External Video Stream</h4>
          <p className="text-xs text-muted-foreground mb-4">
            This video material is hosted externally and cannot be embedded inline.
          </p>
          <Button asChild variant="default" size="sm">
            <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
              Open Video Stream <ExternalLink className="size-3.5" />
            </a>
          </Button>
        </div>
      )
    }

    if (type === "slideshare") {
      return (
        <iframe
          src={url}
          className="absolute inset-0 w-full h-full border-0 bg-black"
          title={title}
          allowFullScreen
        />
      )
    }

    // PDF Documents
    if (ext === "pdf" && storagePath) {
      return <PDFViewer storagePath={storagePath} />
    }

    // DOCX Documents
    if (ext === "docx" && storagePath) {
      return <DocxViewer storagePath={storagePath} />
    }

    // PPTX / PPT Presentations
    if ((ext === "pptx" || ext === "ppt") && storagePath) {
      return <PptxViewer storagePath={storagePath} />
    }

    // Fallback card for legacy .doc, .xls, .xlsx, or unknown formats
    const isDoc = ext === "doc"
    const isSheet = ext === "xls" || ext === "xlsx"

    let IconComponent = FileText
    let appName = "Office"

    if (isDoc) {
      IconComponent = FilePenLine
      appName = "Word"
    } else if (isSheet) {
      IconComponent = FileSpreadsheet
      appName = "Excel"
    }

    return (
      <div className="flex flex-col items-center justify-center text-center p-8 max-w-md bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl my-auto">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 border border-primary/20">
          <IconComponent className="size-8" />
        </div>
        <h4 className="font-semibold text-zinc-100 text-lg mb-2">{title}</h4>
        <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
          This file type cannot be previewed in the browser. Click below to download and open in {appName}.
        </p>
        <Button asChild variant="default" size="lg" className="w-full font-medium">
          <a href={downloadUrl} download className="flex items-center justify-center gap-2">
            <Download className="size-4" /> Download File
          </a>
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full h-full sm:w-[90vw] sm:h-[90vh] sm:max-w-7xl bg-card text-card-foreground sm:rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur-xs shrink-0 gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-base sm:text-lg text-foreground truncate" title={title}>
              {title}
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Download Button Top Right */}
            {downloadUrl && downloadUrl !== "#" && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs font-medium flex items-center gap-1.5 border-border/80 hover:bg-accent"
                asChild
              >
                <a href={downloadUrl} download target="_blank" rel="noopener noreferrer">
                  <Download className="size-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </a>
              </Button>
            )}

            {/* Close Button Top Right */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="size-8 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 bg-black/90 relative flex items-center justify-center overflow-hidden">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}
