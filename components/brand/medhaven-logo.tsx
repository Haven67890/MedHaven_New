import Link from "next/link"
import { HeartPulse } from "lucide-react"

import { cn } from "@/lib/utils"

type MedHavenLogoProps = {
  compact?: boolean
  className?: string
  href?: string
  inverse?: boolean
}

export function MedHavenLogo({ compact = false, className, href = "/", inverse = false }: MedHavenLogoProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        inverse && "text-primary-foreground",
        className
      )}
      aria-label="MedHaven home"
    >
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <HeartPulse className="size-5" aria-hidden="true" />
      </span>
      {!compact && <span className="text-lg font-semibold tracking-tight">MedHaven</span>}
    </Link>
  )
}
