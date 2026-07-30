import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
  accent = "primary",
  className,
}: {
  label: string
  value: string
  icon: LucideIcon
  trend?: "up" | "down"
  trendLabel?: string
  accent?: "primary" | "secondary" | "accent" | "warning"
  className?: string
}) {
  const accentClasses: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    secondary: "bg-secondary/15 text-secondary dark:text-secondary/90",
    accent: "bg-accent text-accent-foreground",
    warning: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  }

  return (
    <Card className={cn("gap-3", className)}>
      <CardContent className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
          {trend ? (
            <p
              className={cn(
                "flex items-center gap-1 text-xs font-medium",
                trend === "up" ? "text-secondary" : "text-destructive"
              )}
            >
              {trend === "up" ? <ArrowUpRight className="size-3" aria-hidden="true" /> : <ArrowDownRight className="size-3" aria-hidden="true" />}
              {trendLabel}
            </p>
          ) : null}
        </div>
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", accentClasses[accent])}>
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </CardContent>
    </Card>
  )
}
