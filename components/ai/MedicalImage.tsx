"use client"

import React, { useState, useEffect, useRef } from "react"

interface MedicalImageProps {
  query: string
  alt: string
}

export default function MedicalImage({ query, alt }: MedicalImageProps) {
  const [candidates, setCandidates] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const [isFetching, setIsFetching] = useState<boolean>(true)
  const [allFailed, setAllFailed] = useState<boolean>(false)

  const hasFetched = useRef(false)

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true

    if (!query) {
      setIsFetching(false)
      setAllFailed(true)
      return
    }

    const decodedQuery = query.replace(/_/g, " ")
    fetch(`/api/assistant/medical-image?query=${encodeURIComponent(decodedQuery)}`)
      .then((res) => res.json())
      .then((data) => {
        let candidateList: string[] = []
        if (Array.isArray(data?.candidates) && data.candidates.length > 0) {
          candidateList = data.candidates.filter(
            (c: unknown): c is string => typeof c === "string" && Boolean(c)
          )
        } else if (typeof data?.url === "string" && data.url) {
          candidateList = [data.url]
        }

        if (candidateList.length > 0) {
          setCandidates(candidateList)
          setCurrentIndex(0)
        } else {
          setAllFailed(true)
        }
        setIsFetching(false)
      })
      .catch((err) => {
        console.error("[MedicalImage] API fetch error:", err)
        setAllFailed(true)
        setIsFetching(false)
      })
  }, [])

  const handleError = () => {
    setCurrentIndex((prevIndex) => {
      const nextIndex = prevIndex + 1
      if (nextIndex >= candidates.length) {
        setAllFailed(true)
      }
      return nextIndex
    })
  }

  const handleLoad = () => {
    // Loaded successfully
  }

  if (isFetching) {
    return <div className="my-4 bg-zinc-800 animate-pulse rounded-lg h-48 w-full" />
  }

  if (allFailed || candidates.length === 0 || currentIndex >= candidates.length) {
    return (
      <div className="my-4 flex items-center justify-center bg-zinc-800 border border-zinc-700 rounded-lg p-4">
        <div className="text-center">
          <p className="text-zinc-400 text-sm font-medium">
            Image unavailable
          </p>
          <p className="text-zinc-500 text-xs mt-1 italic">
            {alt}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="my-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={candidates[currentIndex]}
        alt={alt}
        className="rounded-lg max-w-full max-h-80 object-contain border border-zinc-700 mx-auto block"
        onError={handleError}
        onLoad={handleLoad}
      />
      <p className="text-xs text-zinc-500 mt-1 text-center italic">{alt}</p>
    </div>
  )
}
