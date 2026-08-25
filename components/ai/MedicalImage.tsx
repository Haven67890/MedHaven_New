"use client"

import React, { useState, useEffect } from "react"

interface MedicalImageProps {
  query: string
  alt: string
}

export default function MedicalImage({ query, alt }: MedicalImageProps) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    if (!query) {
      setSrc(null)
      return
    }

    const decodedQuery = query.replace(/_/g, ' ')
    fetch(`/api/assistant/medical-image?query=${encodeURIComponent(decodedQuery)}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          setSrc(data.url || null)
        }
      })
      .catch(() => {
        if (isMounted) {
          setSrc(null)
        }
      })

    return () => {
      isMounted = false
    }
  }, [query])

  if (!src) {
    return null
  }

  return (
    <div className="my-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="rounded-lg max-w-full max-h-80 object-contain border border-zinc-700 mx-auto block"
        onError={() => setSrc(null)}
      />
      <p className="text-xs text-zinc-500 mt-1 text-center italic">{alt}</p>
    </div>
  )
}
