"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, AlertCircle } from "lucide-react"

interface PDFViewerProps {
  storagePath: string
}

export function PDFViewer({ storagePath }: PDFViewerProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalPages, setTotalPages] = useState<number>(0)
  const [renderedPages, setRenderedPages] = useState<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true

    async function loadAndRenderPDF() {
      setLoading(true)
      setError(null)
      setRenderedPages(0)
      setTotalPages(0)

      if (containerRef.current) {
        containerRef.current.innerHTML = ""
      }

      try {
        const signedUrl = `/api/materials/signed-url?path=${encodeURIComponent(storagePath)}`
        const response = await fetch(signedUrl)
        if (!response.ok) {
          throw new Error(`Failed to load PDF file (${response.status})`)
        }

        const arrayBuffer = await response.arrayBuffer()
        if (!active) return

        const pdfjs = await import("pdfjs-dist")
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`

        const loadingTask = pdfjs.getDocument({ data: arrayBuffer })
        const pdf = await loadingTask.promise

        if (!active) return

        setTotalPages(pdf.numPages)

        for (let i = 1; i <= pdf.numPages; i++) {
          if (!active) break

          const page = await pdf.getPage(i)
          if (!active) break

          const viewport = page.getViewport({ scale: 1.5 })

          const canvas = document.createElement("canvas")
          canvas.className = "max-w-full h-auto rounded-lg shadow-lg border border-zinc-800 bg-white dark:bg-zinc-900 my-3 transition-opacity duration-200"
          const context = canvas.getContext("2d")

          if (context) {
            canvas.height = viewport.height
            canvas.width = viewport.width

            await page.render({
              canvasContext: context,
              viewport: viewport,
            }).promise
          }

          if (active && containerRef.current) {
            containerRef.current.appendChild(canvas)
            setRenderedPages(i)
          }
        }
      } catch (err: any) {
        if (active) {
          console.error("PDF preview error:", err)
          setError(err?.message || "Failed to render PDF preview.")
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    if (storagePath) {
      void loadAndRenderPDF()
    }

    return () => {
      active = false
    }
  }, [storagePath])

  return (
    <div className="relative w-full h-full flex flex-col items-center bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Top Status / Page Counter Bar */}
      <div className="w-full flex items-center justify-between px-4 py-2 border-b border-zinc-800/80 bg-zinc-900/90 text-xs text-zinc-400 shrink-0 select-none">
        <span className="font-medium text-zinc-300">PDF Viewer</span>
        {totalPages > 0 && (
          <span className="font-mono bg-zinc-800 px-2 py-0.5 rounded text-zinc-200">
            {renderedPages < totalPages ? `Rendering ${renderedPages} of ${totalPages} pages...` : `Total: ${totalPages} ${totalPages === 1 ? 'page' : 'pages'}`}
          </span>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full overflow-y-auto p-4 sm:p-6 flex flex-col items-center">
        {loading && renderedPages === 0 && (
          <div className="flex flex-col items-center justify-center my-auto py-12 text-zinc-400 gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Fetching and parsing document...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center my-auto py-12 text-red-400 text-center gap-3 max-w-md p-6 bg-red-950/20 border border-red-900/50 rounded-xl">
            <AlertCircle className="size-8 text-red-400" />
            <p className="text-sm font-semibold">Unable to display PDF</p>
            <p className="text-xs text-zinc-400">{error}</p>
          </div>
        )}

        {/* Canvas List Container */}
        <div ref={containerRef} className="flex flex-col items-center w-full max-w-4xl" />
      </div>
    </div>
  )
}
