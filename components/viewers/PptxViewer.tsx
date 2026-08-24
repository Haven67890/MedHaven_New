"use client"

import { useEffect, useState } from "react"
import { Loader2, Presentation, Download } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PptxViewerProps {
  storagePath: string
}

export function PptxViewer({ storagePath }: PptxViewerProps) {
  const [presignedUrl, setPresignedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<boolean>(false)

  useEffect(() => {
    let active = true

    async function fetchPresignedUrl() {
      setLoading(true)
      setError(false)

      try {
        const response = await fetch(`/api/materials/preview-url?path=${encodeURIComponent(storagePath)}`)
        if (!response.ok) {
          throw new Error("Failed to obtain preview URL")
        }
        const data = await response.json()
        if (data.url && active) {
          setPresignedUrl(data.url)
        } else if (active) {
          setError(true)
        }
      } catch (err) {
        console.error("PptxViewer error fetching preview-url:", err)
        if (active) setError(true)
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchPresignedUrl()

    return () => {
      active = false
    }
  }, [storagePath])

  const downloadUrl = `/api/materials/signed-url?path=${encodeURIComponent(storagePath)}`

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-400 gap-3">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Generating presentation preview...</p>
      </div>
    )
  }

  if (error || !presignedUrl) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-100 p-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500 mb-4 border border-orange-500/20">
          <Presentation className="size-8" />
        </div>
        <h4 className="text-base font-semibold text-foreground mb-1">Presentation Preview Unavailable</h4>
        <p className="text-sm text-zinc-400 max-w-md mb-6 leading-relaxed">
          Preview unavailable — click Download to open this file in PowerPoint.
        </p>
        <Button asChild variant="default" size="default" className="bg-orange-600 hover:bg-orange-700 text-white font-medium">
          <a href={downloadUrl} download className="flex items-center gap-2">
            <Download className="size-4" /> Download PowerPoint File
          </a>
        </Button>
      </div>
    )
  }

  const officeOnlineSrc = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(presignedUrl)}`

  return (
    <div className="relative w-full h-full bg-zinc-950 overflow-hidden">
      <iframe
        src={officeOnlineSrc}
        className="w-full h-full border-0 bg-zinc-950"
        title="PowerPoint Presentation Preview"
        onError={() => setError(true)}
      />
    </div>
  )
}
