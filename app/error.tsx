"use client"

import { AlertTriangle, RotateCcw } from "lucide-react"
import { useEffect } from "react"

import { MedHavenLogo } from "@/components/brand/medhaven-logo"
import { Button } from "@/components/ui/button"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[MedHaven] Application boundary error", error)
  }, [error])

  return (
    <main id="main-content" className="flex min-h-svh items-center justify-center bg-background px-4 py-16">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <MedHavenLogo href="/" />
        <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="size-6" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-balance text-3xl font-semibold tracking-tight">Something went wrong</h1>
          <p className="text-pretty leading-relaxed text-muted-foreground">The page encountered an unexpected problem. Try again to continue.</p>
        </div>
        <Button onClick={reset}>
          <RotateCcw data-icon="inline-start" />
          Try again
        </Button>
      </div>
    </main>
  )
}
