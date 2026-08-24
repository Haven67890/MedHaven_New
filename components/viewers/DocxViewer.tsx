"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, AlertCircle } from "lucide-react"

interface DocxViewerProps {
  storagePath: string
}

export function DocxViewer({ storagePath }: DocxViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function renderDocx() {
      setLoading(true)
      setError(null)

      try {
        const signedUrl = `/api/materials/signed-url?path=${encodeURIComponent(storagePath)}`
        const response = await fetch(signedUrl)
        if (!response.ok) {
          throw new Error(`Failed to fetch document (${response.status})`)
        }
        const blob = await response.blob()

        if (!active) return

        const { renderAsync } = await import("docx-preview")

        if (containerRef.current && active) {
          containerRef.current.innerHTML = ""
          await renderAsync(blob, containerRef.current, undefined, {
            className: "docx",
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false,
            breakPages: true,
            experimental: false,
          })
        }
      } catch (err: any) {
        console.error("DocxViewer error:", err)
        if (active) {
          setError(err.message || "Failed to render DOCX document.")
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    renderDocx()

    return () => {
      active = false
    }
  }, [storagePath])

  return (
    <div className="relative w-full h-full flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-start scrollbar-thin scrollbar-thumb-zinc-700">
        {loading && (
          <div className="flex flex-col items-center justify-center my-auto gap-3 text-zinc-400 py-16">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Loading document...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center my-auto gap-3 text-red-400 py-16 max-w-sm text-center">
            <AlertCircle className="size-8 text-red-500" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div
          ref={containerRef}
          className="docx-viewer-wrapper w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl p-4 text-zinc-100 [&_.docx-wrapper]:bg-transparent [&_.docx-wrapper]:p-0 [&_.docx]:bg-zinc-900 [&_.docx]:text-zinc-100 [&_.docx]:shadow-none [&_.docx]:border-none [&_.docx_p]:text-zinc-100 [&_.docx_span]:text-inherit [&_.docx_table]:border-zinc-700 [&_.docx_td]:border-zinc-700 font-sans"
        />
      </div>
    </div>
  )
}
