"use client"

import * as React from "react"
import { Search, Loader2, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface SearchInputProps {
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  onSearch: (query: string) => void
  onClear?: () => void
  placeholder?: string
  className?: string
  ariaLabel?: string
  disabled?: boolean
}

export function SearchInput({
  value,
  defaultValue = "",
  onChange,
  onSearch,
  onClear,
  placeholder = "Search...",
  className,
  ariaLabel = "Search input",
  disabled = false,
}: SearchInputProps) {
  const [term, setTerm] = React.useState<string>(value ?? defaultValue)
  const [isSearching, setIsSearching] = React.useState(false)

  // Sync internal input state when controlled value prop changes externally (e.g. on Reset)
  React.useEffect(() => {
    if (value !== undefined) {
      setTerm(value)
    }
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setTerm(val)
    if (onChange) {
      onChange(val)
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (disabled || isSearching) return

    setIsSearching(true)
    onSearch(term.trim())

    // Brief feedback timer for visible loading state transitions
    setTimeout(() => {
      setIsSearching(false)
    }, 350)
  }

  const handleClear = () => {
    setTerm("")
    if (onChange) {
      onChange("")
    }
    if (onClear) {
      onClear()
    } else {
      setIsSearching(true)
      onSearch("")
      setTimeout(() => {
        setIsSearching(false)
      }, 350)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn("relative flex w-full items-center", className)}>
      <Input
        type="text"
        value={term}
        onChange={handleInputChange}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        className="w-full pr-20 pl-3.5 h-10 text-sm rounded-xl border border-input bg-background/80 dark:bg-background/40 backdrop-blur-xs transition-colors focus-visible:ring-2 focus-visible:ring-primary/50"
      />

      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {term.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            disabled={disabled}
            className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            title="Clear search"
          >
            <X className="size-3.5" />
            <span className="sr-only">Clear search</span>
          </Button>
        )}

        <Button
          type="submit"
          size="icon"
          disabled={disabled || isSearching}
          className="size-7 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs cursor-pointer"
          title="Submit search"
        >
          {isSearching ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Search className="size-3.5" />
          )}
          <span className="sr-only">Search</span>
        </Button>
      </div>
    </form>
  )
}
