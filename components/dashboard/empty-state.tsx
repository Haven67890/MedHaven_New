import type { LucideIcon } from "lucide-react"
import Image from "next/image"

import { Card, CardContent } from "@/components/ui/card"

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  imageSrc,
  imageAlt,
}: {
  icon?: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
  imageSrc?: string
  imageAlt?: string
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        {imageSrc ? (
          <div className="relative w-full max-w-xs h-36 rounded-xl overflow-hidden border border-border/40 shadow-sm bg-muted/30 mb-1">
            <Image
              src={imageSrc}
              alt={imageAlt || title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 320px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent pointer-events-none" />
          </div>
        ) : Icon ? (
          <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Icon className="size-6" aria-hidden="true" />
          </div>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <p className="text-base font-medium text-foreground">{title}</p>
          <p className="max-w-sm text-pretty text-sm text-muted-foreground">{description}</p>
        </div>
        {action ? <div className="mt-1">{action}</div> : null}
      </CardContent>
    </Card>
  )
}
