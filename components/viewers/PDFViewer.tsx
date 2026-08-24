"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, AlertCircle } from "lucide-react"

interface PDFViewerProps {
  storagePath: string
}

export function PDFViewer({ storagePath }: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([])

  useEffect(() => {
    let active = true

    async function renderPDF() {
      setLoading(true)
      setError(null)
      try {
        const signedUrl = `/api/materials/signed-url?path=${encodeURIComponent(storagePath)}`
        const response = await fetch(signedUrl)
        if (!response.ok) {
          throw new Error(`Failed to fetch document (${response.status})`)
        }
        const arrayBuffer = await response.arrayBuffer()

        if (!active) return

        const pdfjs = await import("pdfjs-dist")
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`

        const loadingTask = pdfjs.getDocument({ data: arrayBuffer })
        const pdf = await loadingTask.promise

        if (!active) return

        setNumPages(pdf.numPages)
        canvasRefs.current = new Array(pdf.numPages).fill(null)

        if (containerRef.current) {
          containerRef.current.innerHTML = ""
        }

        for (let i = 1; i <= pdf.numPages; i++) {
          if (!active) break
          const page = await pdf.getPage(i)
          const viewport = page.getViewport({ scale: 1.25 })

          const canvas = document.createElement("canvas")
          canvas.className = "max-w-full my-3 shadow-lg rounded bg-white"
          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.dataset.pageNumber = String(i)

          const context = canvas.getContext("2d")
          if (context) {
            await page.render({ canvasContext: context, viewport }).promise
          }

          if (containerRef.current && active) {
            containerRef.current.appendChild(canvas)
          }
        }
      } catch (err: any) {
        console.error("PDFViewer error:", err)
        if (active) {
          setError(err.message || "Failed to render PDF document.")
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    renderPDF()

    return () => {
      active = false
    }
  }, [storagePath])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget
    const children = Array.from(container.querySelectorAll("canvas"))
    if (children.length === 0) return

    const containerTop = container.scrollTop
    let current = 1

    for (const child of children) {
      if (child.offsetTop <= containerTop + 100) {
        current = Number(child.dataset.pageNumber) || current
      }
    }
    setCurrentPage(current)
  }

  return (
    <div className="relative w-full h-full flex flex-col bg-zinc-950 text-zinc-100 select-none overflow-hidden">
      {numPages > 0 && !loading && !error && (
        <div className="sticky top-0 z-10 flex items-center justify-center py-2 px-4 bg-zinc-900/90 backdrop-blur-xs border-b border-zinc-800 text-xs font-medium text-zinc-300">
          Page {currentPage} of {numPages}
        </div>
      )}

      <div
        className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-start scrollbar-thin scrollbar-thumb-zinc-700"
        onScroll={handleScroll}
      >
        {loading && (
          <div className="flex flex-col items-center justify-center my-auto gap-3 text-zinc-400 py-16">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Loading document pages...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center my-auto gap-3 text-red-400 py-16 max-w-sm text-center">
            <AlertCircle className="size-8 text-red-500" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div ref={containerRef} className="flex flex-col items-center w-full max-w-4xl" />
      </div>
    </div>
  )
}
