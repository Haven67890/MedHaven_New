"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

function Avatar({
  className,
  src,
  initials,
  alt = "Avatar",
  ...props
}: React.ComponentProps<"div"> & {
  initials: string
  src?: string | null
  alt?: string
}) {
  const [imgError, setImgError] = React.useState(false)

  React.useEffect(() => {
    setImgError(false)
  }, [src])

  if (src && !imgError) {
    return (
      <div
        data-slot="avatar"
        className={cn(
          "relative flex shrink-0 overflow-hidden rounded-full bg-primary/10 select-none",
          className
        )}
        {...props}
      >
        <img
          src={src}
          alt={alt}
          className="size-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    )
  }

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
