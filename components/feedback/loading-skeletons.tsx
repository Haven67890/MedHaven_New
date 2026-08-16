import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function StatCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <section className={`grid gap-4 sm:grid-cols-${count}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-4 flex items-center justify-between border-border/60">
          <div className="space-y-2 flex-1 pr-4">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-7 w-16" />
          </div>
          <Skeleton className="size-11 rounded-xl shrink-0" />
        </Card>
      ))}
    </section>
  )
}

export function CollectionsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col items-start gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-xs">
          <Skeleton className="size-10 rounded-xl" />
          <div className="space-y-1.5 w-full">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function MaterialGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="overflow-hidden border border-border/60 p-4 flex flex-col sm:flex-row gap-4 bg-card">
          {/* Thumbnail Skeleton */}
          <Skeleton className="w-full sm:w-40 md:w-44 aspect-video sm:aspect-[4/3] rounded-lg shrink-0" />

          {/* Details Skeleton */}
          <div className="flex-1 flex flex-col justify-between space-y-3 min-w-0 py-0.5">
            <div className="space-y-2">
              <Skeleton className="h-5 w-5/6" />
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-3 w-full" />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

export function MarketplaceGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="overflow-hidden flex flex-col h-full border border-border/60">
          {/* Image skeleton */}
          <Skeleton className="aspect-video w-full" />

          <CardHeader className="flex-1 pb-2 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </CardHeader>

          <CardContent className="pt-2 border-t border-border/50 flex items-center justify-between text-xs mt-auto">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function AdminTableSkeleton({ columns = 6, rows = 5 }: { columns?: number; rows?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {Array.from({ length: columns }).map((_, colIdx) => (
              <th key={colIdx} className="p-4">
                <Skeleton className="h-4 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx} className="hover:bg-muted/30">
              {Array.from({ length: columns }).map((_, colIdx) => (
                <td key={colIdx} className="p-4">
                  <Skeleton className="h-4 w-full max-w-[120px]" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
