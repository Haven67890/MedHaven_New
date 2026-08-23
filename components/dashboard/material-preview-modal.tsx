"use client"

import { useEffect, useState } from "react"
import {
  X,
  Download,
  ExternalLink,
  Video,
  Presentation,
  FilePenLine,
  FileSpreadsheet,
  FileText
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PDFViewer } from "@/components/viewers/PDFViewer"
import { DocxViewer } from "@/components/viewers/DocxViewer"

export interface PreviewModalData {
  isOpen: boolean
  title: string
  url: string
  type: "pdf" | "office" | "image" | "video" | "slideshare" | null
  isEmbeddable?: boolean
  materialId?: string
  storagePath?: string
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

function getFileExtension(pathOrUrl: string): string {
  if (!pathOrUrl) return ""
  try {
    const cleanPath = pathOrUrl.split("?")[0]
    const parts = cleanPath.split(".")
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ""
  } catch (e) {
    return ""
  }
}

export function MaterialPreviewModal({ modal, onClose }: MaterialPreviewModalProps) {
  if (!modal || !modal.isOpen) return null

  const { title, url, type, isEmbeddable, materialId, storagePath } = modal

  // Record reading progress in localStorage for PDFs when opened in modal
  if (materialId && type === "pdf" && typeof window !== "undefined") {
    try {
      localStorage.setItem(`medhaven_viewed_${materialId}`, "true")
      window.dispatchEvent(new Event("material-viewed"))
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  const effectivePath = storagePath || url
  const ext = getFileExtension(effectivePath)

  // Determine renderer type based on extension / modal type
  const isPdf = ext === "pdf" || type === "pdf"
  const isDocx = ext === "docx"
  const isImage = type === "image" || ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext)
  const isVideo = type === "video"

  const renderDownloadCard = () => {
    let icon = <FileText className="size-10 text-primary" />
    let appText = "PowerPoint / Word"

    if (["pptx", "ppt", "pps", "ppsx"].includes(ext)) {
      icon = <Presentation className="size-10 text-orange-500" />
      appText = "Microsoft PowerPoint"
    } else if (["doc", "docx"].includes(ext)) {
      icon = <FilePenLine className="size-10 text-blue-500" />
      appText = "Microsoft Word"
    } else if (["xls", "xlsx"].includes(ext)) {
      icon = <FileSpreadsheet className="size-10 text-emerald-500" />
      appText = "Microsoft Excel"
    }

    return (
      <div className="flex flex-col items-center justify-center text-center p-6 sm:p-10 max-w-lg bg-card rounded-2xl border border-border shadow-2xl mx-4 my-auto">
        <div className="flex size-20 items-center justify-center rounded-2xl bg-muted/80 mb-5 border border-border/60 shadow-inner">
          {icon}
        </div>
        <h4 className="font-bold text-foreground text-lg sm:text-xl mb-2 line-clamp-2" title={title}>
          {title}
        </h4>
        <p className="text-xs sm:text-sm text-muted-foreground mb-6 leading-relaxed max-w-md">
          This file type cannot be previewed in the browser. Click below to download and open in {appText}.
        </p>
        <Button asChild variant="default" size="lg" className="w-full sm:w-auto px-8 font-semibold shadow-md gap-2">
          <a href={url} download target="_blank" rel="noopener noreferrer">
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
            {url && url !== "#" && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs font-medium flex items-center gap-1.5 border-border/80 hover:bg-accent"
                asChild
              >
                <a href={url} download target="_blank" rel="noopener noreferrer">
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
          {isPdf && storagePath ? (
            <PDFViewer storagePath={storagePath} />
          ) : isDocx && storagePath ? (
            <DocxViewer storagePath={storagePath} />
          ) : isImage ? (
            <div className="w-full h-full p-4 flex items-center justify-center">
              <img src={url} alt={title} className="max-w-full max-h-full object-contain rounded-md" />
            </div>
          ) : isVideo ? (
            (() => {
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
            })()
          ) : (
            renderDownloadCard()
          )}
        </div>
      </div>
    </div>
  )
}
