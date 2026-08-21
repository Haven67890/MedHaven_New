"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { FormEvent, useState, useRef, Suspense, KeyboardEvent, ClipboardEvent } from "react"

import { createBrowserClient } from "@supabase/ssr"
import { getSupabaseConfig } from "@/lib/supabase/config"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()
const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

function ForgotPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorQuery = searchParams ? searchParams.get("error") : null

  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  // OTP verification state (after email sent)
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", "", "", ""])
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [otpError, setOtpError] = useState("")
  const [resendStatus, setResendStatus] = useState<string | null>(null)
  const [isResending, setIsResending] = useState(false)

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/api/auth/callback?next=/reset-password`,
      })

      if (resetError) {
        setError(resetError.message)
        return
      }

      setSuccess(true)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to request password reset.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.slice(-1)
    const newOtp = [...otp]
    newOtp[index] = digit
    setOtp(newOtp)

    if (digit && index < 7) {
      otpInputRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").trim().replace(/\D/g, "")
    if (!pastedData) return

    const digits = pastedData.slice(0, 8).split("")
    const newOtp = [...otp]
    digits.forEach((d, i) => {
      newOtp[i] = d
    })
    setOtp(newOtp)

    const nextIndex = Math.min(digits.length, 7)
    otpInputRefs.current[nextIndex]?.focus()
  }

  const handleVerifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setOtpError("")
    setResendStatus(null)

    const formattedEmail = email.trim()
    const otpString = otp.join("").trim()

    if (!formattedEmail) {
      setOtpError("Please enter your email address.")
      return
    }

    if (otpString.length < 8) {
      setOtpError("Please enter the complete 8-digit verification code.")
      return
    }

    setIsVerifyingOtp(true)

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: formattedEmail,
        token: otpString,
        type: "recovery",
      })

      if (verifyError || !data.session) {
        setOtpError("Invalid or expired code — check your email or request a new link")
        return
      }

      router.push("/reset-password")
    } catch (err) {
      setOtpError("Invalid or expired code — check your email or request a new link")
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  const handleResendCode = async () => {
    const formattedEmail = email.trim()
    if (!formattedEmail) {
      setOtpError("Please enter your email address to resend the code.")
      return
    }

    setIsResending(true)
    setOtpError("")
    setResendStatus(null)

    try {
      const redirectTo = `${typeof window !== "undefined" ? window.location.origin : ""}/api/auth/callback?next=/reset-password`
      const { error: resendError } = await supabase.auth.resetPasswordForEmail(formattedEmail, {
        redirectTo,
      })

      if (resendError) {
        setOtpError(resendError.message)
      } else {
        setResendStatus("A new 8-digit code has been sent to your email address.")
      }
    } catch (err) {
      setOtpError("Failed to resend verification code. Please try again.")
    } finally {
      setIsResending(false)
    }
  }

  if (success) {
    return (
      <Card className="border-border shadow-xl shadow-primary/5">
        <CardHeader>
          <CardTitle className="text-2xl text-primary">Check Your Email</CardTitle>
          <CardDescription>
            Check your email — we sent a reset link and an 8-digit code to <span className="font-semibold text-foreground">{email}</span>. Click the link in the email, or enter the 8-digit code below to reset your password here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form aria-label="Verify OTP Code" className="flex flex-col gap-6" onSubmit={handleVerifyOtp}>
            {otpError ? (
              <div className="bg-destructive/15 border border-destructive/30 text-destructive text-sm rounded-lg p-4 flex flex-col gap-1 shadow-sm font-medium">
                <span className="font-extrabold uppercase text-xs tracking-wider">Error Details:</span>
                <p>{otpError}</p>
              </div>
            ) : null}

            {resendStatus ? (
              <div className="bg-primary/15 border border-primary/30 text-primary text-sm rounded-lg p-4 font-medium shadow-sm">
                <p>{resendStatus}</p>
              </div>
            ) : null}

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="otp-box-0">8-Digit Verification Code</FieldLabel>
                <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-box-${idx}`}
                      ref={(el) => {
                        otpInputRefs.current[idx] = el
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      aria-label={`Digit ${idx + 1} of 8`}
                      className="w-8 h-10 sm:w-10 sm:h-12 text-center text-lg sm:text-xl font-bold rounded-md border border-input bg-background text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
                    />
                  ))}
                </div>
              </Field>
            </FieldGroup>

            <div className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={isVerifyingOtp}>
                {isVerifyingOtp ? "Verifying..." : "Verify Code"}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isResending}
                  className="text-xs text-primary underline-offset-4 hover:underline disabled:opacity-50 font-medium"
                >
                  {isResending ? "Resending..." : "Didn't receive a code? Resend email"}
                </button>
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="justify-center border-t border-border pt-6 text-sm text-muted-foreground">
          Remember your password?&nbsp;<Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">Sign in</Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="border-border shadow-xl shadow-primary/5">
      <CardHeader>
        <CardTitle className="text-2xl">Reset Password</CardTitle>
        <CardDescription>Enter your email address to receive a password reset link and 8-digit verification code.</CardDescription>
      </CardHeader>
      <CardContent>
        <form aria-label="Request password reset" className="flex flex-col gap-6" onSubmit={handleSubmit}>
          {/* LOUD ERROR ALERT BANNER */}
          {(error || errorQuery) ? (
            <div className="bg-destructive/15 border border-destructive/30 text-destructive text-sm rounded-lg p-4 flex flex-col gap-1 shadow-sm font-medium">
              <span className="font-extrabold uppercase text-xs tracking-wider">Reset Error:</span>
              <p>{error || errorQuery}</p>
            </div>
          ) : null}

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="forgot-email">Email address</FieldLabel>
              <Input id="forgot-email" type="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </Field>
          </FieldGroup>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Requesting..." : "Send Password Reset Link"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center border-t border-border pt-6 text-sm text-muted-foreground">
        Remember your password?&nbsp;<Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">Sign in</Link>
      </CardFooter>
    </Card>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <Card className="border-border shadow-xl shadow-primary/5">
        <CardHeader>
          <CardTitle className="text-2xl">Loading...</CardTitle>
        </CardHeader>
      </Card>
    }>
      <ForgotPasswordContent />
    </Suspense>
  )
}
