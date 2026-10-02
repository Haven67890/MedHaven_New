import Link from "next/link"
import { cn } from "@/lib/utils"

type JositeXLogoProps = {
  compact?: boolean
  className?: string
  href?: string
  inverse?: boolean
}

export function JositeXLogo({ compact = false, className, href = "/", inverse = false }: JositeXLogoProps) {
  return (
    <Link
      href={href}
      aria-label="JositeX home"
      className={cn("inline-flex w-fit items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)}
    >
      <span aria-hidden="true" className={cn("flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 to-blue-500 font-black text-slate-950 shadow-sm", compact ? "size-8 text-sm" : "size-10 text-base")}>
        JX
      </span>
      <span className={cn("leading-none", inverse ? "text-primary-foreground" : "text-foreground")}>
        <span className={cn("block font-black tracking-tight", compact ? "text-lg" : "text-xl")}>JositeX</span>
        {!compact ? <span className={cn("mt-1 block text-[9px] font-semibold uppercase tracking-[0.2em]", inverse ? "text-primary-foreground/65" : "text-muted-foreground")}>University ecosystem</span> : null}
      </span>
    </Link>
  )
}
