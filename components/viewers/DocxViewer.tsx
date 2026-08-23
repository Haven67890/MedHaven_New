"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, AlertCircle } from "lucide-react"

interface DocxViewerProps {
  storagePath: string
}

export function DocxViewer({ storagePath }: DocxViewerProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true

    async function loadAndRenderDocx() {
      setLoading(true)
      setError(null)

      if (containerRef.current) {
        containerRef.current.innerHTML = ""
      }

      try {
        const signedUrl = `/api/materials/signed-url?path=${encodeURIComponent(storagePath)}`
        const response = await fetch(signedUrl)
        if (!response.ok) {
          throw new Error(`Failed to load document (${response.status})`)
        }

        const blob = await response.blob()
        if (!active) return

        const { renderAsync } = await import("docx-preview")

        if (containerRef.current) {
          containerRef.current.innerHTML = ""
          await renderAsync(blob, containerRef.current, undefined, {
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            experimental: false,
          })
        }
      } catch (err: any) {
        if (active) {
          console.error("DOCX preview error:", err)
          setError(err?.message || "Failed to render Word document preview.")
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    if (storagePath) {
      void loadAndRenderDocx()
    }

    return () => {
      active = false
    }
  }, [storagePath])

  return (
    <div className="relative w-full h-full flex flex-col items-center bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Top Bar */}
      <div className="w-full flex items-center justify-between px-4 py-2 border-b border-zinc-800/80 bg-zinc-900/90 text-xs text-zinc-400 shrink-0 select-none">
        <span className="font-medium text-zinc-300">Word Document Viewer</span>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full overflow-y-auto p-4 sm:p-6 flex flex-col items-center">
        {loading && (
          <div className="flex flex-col items-center justify-center my-auto py-12 text-zinc-400 gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Loading Word document...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center my-auto py-12 text-red-400 text-center gap-3 max-w-md p-6 bg-red-950/20 border border-red-900/50 rounded-xl">
            <AlertCircle className="size-8 text-red-400" />
            <p className="text-sm font-semibold">Unable to display document</p>
            <p className="text-xs text-zinc-400">{error}</p>
          </div>
        )}

        {/* DOCX Container with Dark Theme Overrides */}
        <div
          ref={containerRef}
          className="w-full max-w-4xl font-sans [&_.docx-wrapper]:bg-zinc-900 [&_.docx-wrapper]:p-4 sm:[&_.docx-wrapper]:p-8 [&_.docx-wrapper]:rounded-xl [&_.docx-wrapper]:border [&_.docx-wrapper]:border-zinc-800 [&_.docx-wrapper]:shadow-xl [&_section.docx]:bg-zinc-900 [&_section.docx]:text-zinc-100 [&_section.docx]:shadow-none [&_section.docx]:m-0 [&_p]:text-zinc-200 [&_span]:text-inherit [&_h1]:text-zinc-100 [&_h2]:text-zinc-100 [&_h3]:text-zinc-100 [&_table]:border-zinc-700 [&_td]:border-zinc-700 [&_th]:border-zinc-700 [&_tr]:border-zinc-700 text-zinc-100"
        />
      </div>
    </div>
  )
}
