"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { FormEvent, useState, useEffect, useRef, Suspense, KeyboardEvent, ClipboardEvent } from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

function ResetPasswordContent() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorQuery = searchParams ? searchParams.get("error") : null
  const emailQuery = searchParams ? searchParams.get("email") : null

  const [hasSession, setHasSession] = useState<boolean | null>(null)
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  // Password reset form state (when session is verified)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  // OTP verification state (when session is not established)
  const [emailInput, setEmailInput] = useState(emailQuery || "")
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""])
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [otpError, setOtpError] = useState("")
  const [resendStatus, setResendStatus] = useState<string | null>(null)
  const [isResending, setIsResending] = useState(false)

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (emailQuery && !emailInput) {
      setEmailInput(emailQuery)
    }
  }, [emailQuery, emailInput])

  useEffect(() => {
    let isMounted = true

    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (isMounted) {
          setHasSession(!!session)
          setIsCheckingSession(false)
        }
      } catch (err) {
        if (isMounted) {
          setHasSession(false)
          setIsCheckingSession(false)
        }
      }
    }

    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: unknown) => {
      if (isMounted) {
        setHasSession(!!session)
        setIsCheckingSession(false)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  const handleOtpChange = (index: number, value: string) => {
    // Only take the last character typed if multiple entered
    const digit = value.slice(-1)
    const newOtp = [...otp]
    newOtp[index] = digit
    setOtp(newOtp)

    if (digit && index < 5) {
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

    const digits = pastedData.slice(0, 6).split("")
    const newOtp = [...otp]
    digits.forEach((d, i) => {
      newOtp[i] = d
    })
    setOtp(newOtp)

    const nextIndex = Math.min(digits.length, 5)
    otpInputRefs.current[nextIndex]?.focus()
  }

  const handleVerifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setOtpError("")
    setResendStatus(null)

    const formattedEmail = emailInput.trim()
    const otpString = otp.join("").trim()

    if (!formattedEmail) {
      setOtpError("Please enter your email address.")
      return
    }

    if (otpString.length < 6) {
      setOtpError("Please enter the complete 6-digit verification code.")
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
        setOtpError(verifyError?.message || "Invalid or expired code. Please request a new reset link.")
        return
      }

      setHasSession(true)
    } catch (err) {
      setOtpError("Invalid or expired code. Please request a new reset link.")
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  const handleResendCode = async () => {
    const formattedEmail = emailInput.trim()
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
        setResendStatus("A new 6-digit code has been sent to your email address.")
      }
    } catch (err) {
      setOtpError("Failed to resend verification code. Please try again.")
    } finally {
      setIsResending(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setIsSubmitting(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password.trim(),
      })

      if (updateError) {
        setError(updateError.message)
        return
      }

      setSuccess(true)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to reset password.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isCheckingSession) {
    return (
      <Card className="border-border shadow-xl shadow-primary/5">
        <CardHeader>
          <CardTitle className="text-2xl">Verifying Link...</CardTitle>
          <CardDescription>Please wait while we verify your password recovery session.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (success) {
    return (
      <Card className="border-border shadow-xl shadow-primary/5">
        <CardHeader>
          <CardTitle className="text-2xl text-primary font-black">Password Updated</CardTitle>
          <CardDescription>Your password has been successfully reset.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You can now log in to MedHaven using your newly configured password.
          </p>
          <Button asChild className="w-full">
            <Link href="/login">Go back to Sign In</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!hasSession) {
    return (
      <Card className="border-border shadow-xl shadow-primary/5">
        <CardHeader>
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>
            Didn&apos;t click the link? Enter the 6-digit code from your email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form aria-label="Verify OTP Code" className="flex flex-col gap-6" onSubmit={handleVerifyOtp}>
            {(otpError || errorQuery) ? (
              <div className="bg-destructive/15 border border-destructive/30 text-destructive text-sm rounded-lg p-4 flex flex-col gap-1 shadow-sm font-medium">
                <span className="font-extrabold uppercase text-xs tracking-wider">Error Details:</span>
                <p>{otpError || errorQuery}</p>
              </div>
            ) : null}

            {resendStatus ? (
              <div className="bg-primary/15 border border-primary/30 text-primary text-sm rounded-lg p-4 font-medium shadow-sm">
                <p>{resendStatus}</p>
              </div>
            ) : null}

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="otp-email">Email address</FieldLabel>
                <Input
                  id="otp-email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="otp-box-0">6-Digit Verification Code</FieldLabel>
                <div className="flex items-center justify-between gap-2 sm:gap-3">
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
                      aria-label={`Digit ${idx + 1} of 6`}
                      className="w-11 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-md border border-input bg-background text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
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
                  {isResending ? "Resending..." : "Didn't receive a code? Resend code"}
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
        <CardTitle className="text-2xl">Set New Password</CardTitle>
        <CardDescription>Enter a strong new password for your MedHaven account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form aria-label="Set new password" className="flex flex-col gap-6" onSubmit={handleSubmit}>
          {/* LOUD ERROR ALERT BANNER */}
          {(error || errorQuery) ? (
            <div className="bg-destructive/15 border border-destructive/30 text-destructive text-sm rounded-lg p-4 flex flex-col gap-1 shadow-sm font-medium">
              <span className="font-extrabold uppercase text-xs tracking-wider">Reset Error:</span>
              <p>{error || errorQuery}</p>
            </div>
          ) : null}

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="new-password">New Password</FieldLabel>
              <Input id="new-password" type="password" autoComplete="new-password" placeholder="Min 8 characters" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </Field>

            <Field>
              <FieldLabel htmlFor="confirm-new-password">Confirm New Password</FieldLabel>
              <Input id="confirm-new-password" type="password" autoComplete="new-password" placeholder="Confirm your new password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
            </Field>
          </FieldGroup>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <Card className="border-border shadow-xl shadow-primary/5">
        <CardHeader>
          <CardTitle className="text-2xl">Loading...</CardTitle>
        </CardHeader>
      </Card>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
