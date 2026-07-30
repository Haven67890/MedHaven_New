import type { LucideIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Icon className="size-6" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-base font-medium text-foreground">{title}</p>
          <p className="max-w-sm text-pretty text-sm text-muted-foreground">{description}</p>
        </div>
        {action ? <div className="mt-1">{action}</div> : null}
      </CardContent>
    </Card>
  )
}
