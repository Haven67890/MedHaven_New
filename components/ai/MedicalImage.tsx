"use client"

import React, { useState, useEffect } from "react"
import { Loader2, ImageIcon } from "lucide-react"

interface MedicalImageProps {
  query: string
  alt: string
}

export default function MedicalImage({ query, alt }: MedicalImageProps) {
  const [candidates, setCandidates] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const [isFetchingCandidates, setIsFetchingCandidates] = useState<boolean>(true)
  const [isImgLoading, setIsImgLoading] = useState<boolean>(true)
  const [hasError, setHasError] = useState<boolean>(false)

  useEffect(() => {
    let isMounted = true
    if (!query) {
      setCandidates([])
      setCurrentIndex(0)
      setIsFetchingCandidates(false)
      setIsImgLoading(false)
      return
    }

    setIsFetchingCandidates(true)
    setIsImgLoading(true)
    setHasError(false)
    setCandidates([])
    setCurrentIndex(0)

    const decodedQuery = query.replace(/_/g, " ")
    fetch(`/api/assistant/medical-image?query=${encodeURIComponent(decodedQuery)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return

        let candidateList: string[] = []
        if (Array.isArray(data.candidates) && data.candidates.length > 0) {
          candidateList = data.candidates
        } else if (data.url) {
          candidateList = [data.url]
        }

        if (candidateList.length > 0) {
          setCandidates(candidateList)
          setCurrentIndex(0)
        } else {
          console.warn("[MedicalImage] No candidate URLs found for query:", query, "(decoded:", decodedQuery, ")")
          setHasError(true)
        }
        setIsFetchingCandidates(false)
      })
      .catch((err) => {
        if (!isMounted) return
        console.error("[MedicalImage] API fetch error for query:", query, err)
        setHasError(true)
        setIsFetchingCandidates(false)
        setIsImgLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [query])

  const handleImageError = () => {
    console.warn(
      `[MedicalImage] Candidate at index ${currentIndex} failed to load:`,
      candidates[currentIndex],
      "query:",
      query
    )

    if (currentIndex + 1 < candidates.length) {
      setIsImgLoading(true)
      setCurrentIndex((prevIndex) => prevIndex + 1)
    } else {
      console.warn("[MedicalImage] All candidate image URLs failed for query:", query)
      setHasError(true)
      setIsImgLoading(false)
    }
  }

  const handleImageLoad = () => {
    setIsImgLoading(false)
  }

  const currentSrc = candidates[currentIndex] || null
  const showSkeleton = isFetchingCandidates || (isImgLoading && !hasError && Boolean(currentSrc))

  if (hasError || (!isFetchingCandidates && candidates.length === 0)) {
    return (
      <div className="my-3 p-3 border border-zinc-800 bg-zinc-900/30 rounded-lg flex items-center justify-center gap-2 text-xs text-zinc-500 italic">
        <ImageIcon className="h-4 w-4 shrink-0 text-zinc-600" />
        <span>Medical illustration unavailable: {alt}</span>
      </div>
    )
  }

  return (
    <div className="my-4 flex flex-col items-center w-full relative">
      {showSkeleton && (
        <div className="w-full p-4 border border-zinc-800 bg-zinc-900/50 rounded-lg flex flex-col items-center justify-center gap-2 min-h-[140px] text-zinc-400 text-xs">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-500" />
          <span className="font-semibold text-zinc-400">Loading medical illustration...</span>
        </div>
      )}

      {currentSrc && (
        <div className={showSkeleton ? "hidden" : "flex flex-col items-center w-full"}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentSrc}
            alt={alt}
            referrerPolicy="no-referrer"
            className="rounded-lg max-w-full max-h-80 object-contain border border-zinc-800 bg-black/40 shadow-sm mx-auto block"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
          <p className="text-xs text-zinc-400 mt-1.5 text-center italic font-medium">{alt}</p>
        </div>
      )}
    </div>
  )
}
