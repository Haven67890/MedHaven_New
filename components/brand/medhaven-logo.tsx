import Link from "next/link"
import { PlusIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type MedHavenLogoProps = {
  compact?: boolean
  className?: string
}

export function MedHavenLogo({ compact = false, className }: MedHavenLogoProps) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
      aria-label="MedHaven home"
    >
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <PlusIcon aria-hidden="true" />
      </span>
      {!compact && <span className="text-lg font-semibold tracking-tight">MedHaven</span>}
    </Link>
  )
}
