import * as React from "react"

import { cn } from "@/lib/utils"

function Avatar({
  className,
  initials,
  ...props
}: React.ComponentProps<"div"> & { initials: string }) {
  return (
    <div
      data-slot="avatar"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary select-none",
        className
      )}
      aria-hidden="true"
      {...props}
    >
      {initials}
    </div>
  )
}

export { Avatar }
