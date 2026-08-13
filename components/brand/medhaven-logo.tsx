import Link from "next/link"
import { cn } from "@/lib/utils"

type MedHavenLogoProps = {
  compact?: boolean
  className?: string
  href?: string
  inverse?: boolean
}

export function MedHavenLogo({ compact = false, className, href = "/", inverse = false }: MedHavenLogoProps) {
  const logoUrl = "https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/branding/Untitled%20design.png"

  // Sizing of the logo that respects location and does not distort:
  const imageSizeClass = compact
    ? "h-8 w-auto max-w-full object-contain"
    : "h-10 w-auto max-w-full object-contain"

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      aria-label="MedHaven home"
    >
      <img
        src={logoUrl}
        alt="MedHaven Logo"
        className={cn(imageSizeClass)}
      />
    </Link>
  )
}
