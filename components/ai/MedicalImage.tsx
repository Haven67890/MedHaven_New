"use client"

import React, { useState, useEffect } from "react"
import { Loader2, ImageIcon } from "lucide-react"

interface MedicalImageProps {
  query: string
  alt: string
}

export default function MedicalImage({ query, alt }: MedicalImageProps) {
  const [src, setSrc] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [hasError, setHasError] = useState<boolean>(false)

  useEffect(() => {
    let isMounted = true
    if (!query) {
      setSrc(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setHasError(false)

    const decodedQuery = query.replace(/_/g, " ")
    fetch(`/api/assistant/medical-image?query=${encodeURIComponent(decodedQuery)}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          if (data.url) {
            setSrc(data.url)
          } else {
            setHasError(true)
          }
          setIsLoading(false)
        }
      })
      .catch(() => {
        if (isMounted) {
          setHasError(true)
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [query])

  if (isLoading) {
    return (
      <div className="my-4 p-4 border border-zinc-800 bg-zinc-900/50 rounded-lg flex flex-col items-center justify-center gap-2 min-h-[140px] text-zinc-400 text-xs">
        <Loader2 className="h-5 w-5 animate-spin text-cyan-500" />
        <span className="font-semibold text-zinc-400">Loading medical illustration...</span>
      </div>
    )
  }

  if (hasError || !src) {
    return (
      <div className="my-3 p-3 border border-zinc-800 bg-zinc-900/30 rounded-lg flex items-center justify-center gap-2 text-xs text-zinc-500 italic">
        <ImageIcon className="h-4 w-4 shrink-0 text-zinc-600" />
        <span>Medical illustration unavailable: {alt}</span>
      </div>
    )
  }

  return (
    <div className="my-4 flex flex-col items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="rounded-lg max-w-full max-h-80 object-contain border border-zinc-800 bg-black/40 shadow-sm mx-auto block"
        onError={() => setHasError(true)}
      />
      <p className="text-xs text-zinc-400 mt-1.5 text-center italic font-medium">{alt}</p>
    </div>
  )
}
