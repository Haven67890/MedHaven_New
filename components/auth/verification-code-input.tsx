"use client"

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react"

const CODE_LENGTH = 8

export function VerificationCodeInput({
  value,
  onChange,
  disabled = false,
}: {
  value: string[]
  onChange: (value: string[]) => void
  disabled?: boolean
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const updateAt = (index: number, raw: string) => {
    const digits = raw.replace(/[^0-9]/g, "")
    const next = [...value]
    next[index] = digits.slice(-1)
    onChange(next)
    if (digits && index < CODE_LENGTH - 1) refs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      if (value[index]) {
        const next = [...value]
        next[index] = ""
        onChange(next)
      } else if (index > 0) {
        refs.current[index - 1]?.focus()
      }
    }
    if (event.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus()
    if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) refs.current[index + 1]?.focus()
  }

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    const pasted = event.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, CODE_LENGTH)
    if (!pasted) return
    const next = Array.from({ length: CODE_LENGTH }, (_, index) => pasted[index] ?? "")
    onChange(next)
    refs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus()
  }

  return (
    <div role="group" aria-label="8-digit verification code" className="flex w-full items-center justify-between gap-1.5 sm:gap-2">
      {Array.from({ length: CODE_LENGTH }, (_, index) => (
        <input
          key={index}
          ref={(element) => { refs.current[index] = element }}
          id={`verification-code-${index + 1}`}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={value[index] ?? ""}
          disabled={disabled}
          onChange={(event) => updateAt(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          aria-label={`Verification code digit ${index + 1} of ${CODE_LENGTH}`}
          className="h-10 w-8 rounded-md border border-input bg-background text-center text-lg font-bold text-foreground shadow-sm transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-12 sm:w-10 sm:text-xl"
        />
      ))}
    </div>
  )
}

export const VERIFICATION_CODE_LENGTH = CODE_LENGTH
