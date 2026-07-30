import { ArrowLeft } from "lucide-react"
import Link from "next/link"

import { MedHavenLogo } from "@/components/brand/medhaven-logo"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main id="main-content" className="flex min-h-svh items-center justify-center bg-background px-4 py-16">
      <div className="flex max-w-lg flex-col items-center gap-7 text-center">
        <MedHavenLogo href="/" />
        <p className="font-mono text-sm font-semibold tracking-widest text-primary">404</p>
        <div className="flex flex-col gap-3">
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">This page is not here yet.</h1>
          <p className="text-pretty text-lg leading-relaxed text-muted-foreground">The address may have changed, or this part of MedHaven may still be taking shape.</p>
        </div>
        <Button asChild>
          <Link href="/">
            <ArrowLeft data-icon="inline-start" />
            Back to home
          </Link>
        </Button>
      </div>
    </main>
  )
}
