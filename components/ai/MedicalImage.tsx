"use client"

import React, { useState, useEffect } from "react"

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
          candidateList = data.candidates.filter(
            (c: unknown): c is string => typeof c === "string" && Boolean(c)
          )
        } else if (typeof data.url === "string" && data.url) {
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
      <div className="my-4 flex items-center justify-center bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="text-center">
          <p className="text-gray-400 text-sm">
            Image unavailable
          </p>
          <p className="text-gray-500 text-xs mt-1">
            {alt}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="my-4 flex flex-col items-center w-full relative">
      {showSkeleton && (
        <div className="my-4 bg-gray-800 animate-pulse rounded-lg h-48 w-full" />
      )}

      {currentSrc && (
        <div className={showSkeleton ? "hidden" : "flex flex-col items-center w-full"}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentSrc}
            alt={alt}
            referrerPolicy="no-referrer"
            className="rounded-lg max-w-full max-h-80 object-contain border border-zinc-700 mx-auto block"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
          <p className="text-xs text-zinc-400 mt-1.5 text-center italic font-medium">{alt}</p>
        </div>
      )}
    </div>
  )
}
