"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { FormEvent, useState, useRef, Suspense, KeyboardEvent, ClipboardEvent } from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

function LoginContent() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorQuery = searchParams ? searchParams.get("error") : null

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  // Unverified email inline state
  const [isUnverified, setIsUnverified] = useState(false)
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
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        const msg = signInError.message || ""
        if (
          msg.toLowerCase().includes("email not confirmed") ||
          msg.toLowerCase().includes("not verified") ||
          msg.toLowerCase().includes("unverified")
        ) {
          setIsUnverified(true)
        } else {
          setError(msg)
        }
        return
      }

      router.replace("/dashboard")
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to sign in.")
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

  const handleResendVerification = async () => {
    setIsResending(true)
    setOtpError("")
    setResendStatus(null)

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
      })

      if (resendError) {
        setOtpError(resendError.message)
      } else {
        setResendStatus("A new verification code has been sent to your email.")
      }
    } catch (err) {
      setOtpError("Failed to resend verification email. Please try again.")
    } finally {
      setIsResending(false)
    }
  }

  const handleVerifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setOtpError("")
    setResendStatus(null)

    const code = otp.join("").trim()
    if (code.length < 8) {
      setOtpError("Please enter the complete 8-digit verification code.")
      return
    }

    setIsVerifyingOtp(true)

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code,
        type: "signup",
      })

      if (verifyError) {
        setOtpError("Invalid or expired code. Try resending.")
        return
      }

      router.replace("/dashboard")
    } catch (err) {
      setOtpError("Invalid or expired code. Try resending.")
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError("")
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/api/auth/callback`,
        },
      })
      if (oauthError) {
        setError(oauthError.message)
      }
    } catch (oauthErr) {
      setError(oauthErr instanceof Error ? oauthErr.message : "Google sign-in failed.")
    }
  }

  if (isUnverified) {
    return (
      <Card className="border-border shadow-xl shadow-primary/5">
        <CardHeader>
          <CardTitle className="text-2xl text-primary">Email Verification Required</CardTitle>
          <CardDescription className="text-base text-foreground font-medium mt-1">
            Your email hasn&apos;t been verified yet
          </CardDescription>
          <p className="text-xs text-muted-foreground mt-1">
            Enter the 8-digit code sent to <span className="font-semibold text-foreground">{email}</span> or request a new code below.
          </p>
        </CardHeader>
        <CardContent>
          <form aria-label="Verify OTP Code" className="flex flex-col gap-6" onSubmit={handleVerifyOtp}>
            {otpError ? (
              <div className="bg-destructive/15 border border-destructive/30 text-destructive text-sm rounded-lg p-4 flex flex-col gap-1 shadow-sm font-medium">
                <span className="font-extrabold uppercase text-xs tracking-wider">Verification Error:</span>
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
                  onClick={handleResendVerification}
                  disabled={isResending}
                  className="text-xs text-primary underline-offset-4 hover:underline disabled:opacity-50 font-medium"
                >
                  {isResending ? "Resending..." : "Resend verification email"}
                </button>
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="justify-center border-t border-border pt-6 text-sm text-muted-foreground">
          <button
            type="button"
            onClick={() => {
              setIsUnverified(false)
              setOtp(["", "", "", "", "", "", "", ""])
              setOtpError("")
              setResendStatus(null)
              setError("")
            }}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Back to sign in
          </button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="border-border shadow-xl shadow-primary/5">
      <CardHeader>
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Use your MedHaven email and password to continue.</CardDescription>
      </CardHeader>
      <CardContent>
        <form aria-label="Sign in" className="flex flex-col gap-6" onSubmit={handleSubmit}>
          {/* LOUD ERROR ALERT BANNER */}
          {(error || errorQuery) ? (
            <div className="bg-destructive/15 border border-destructive/30 text-destructive text-sm rounded-lg p-4 flex flex-col gap-1 shadow-sm font-medium">
              <span className="font-extrabold uppercase text-xs tracking-wider">Authentication Error:</span>
              <p>{error || errorQuery}</p>
            </div>
          ) : null}

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="login-email">Email address</FieldLabel>
              <Input id="login-email" type="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </Field>
            <Field>
              <div className="flex justify-between items-center">
                <FieldLabel htmlFor="login-password">Password</FieldLabel>
                <Link href="/forgot-password" className="text-xs text-primary underline-offset-4 hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <Input id="login-password" type="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </Field>
          </FieldGroup>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={handleGoogleSignIn}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>

          <FieldDescription className="text-center">Use your MedHaven credentials to access your workspace.</FieldDescription>
        </form>
      </CardContent>
      <CardFooter className="justify-center border-t border-border pt-6 text-sm text-muted-foreground">
        New to MedHaven?&nbsp;<Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">Create an account</Link>
      </CardFooter>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <Card className="border-border shadow-xl shadow-primary/5">
        <CardHeader>
          <CardTitle className="text-2xl">Loading...</CardTitle>
        </CardHeader>
      </Card>
    }>
      <LoginContent />
    </Suspense>
  )
}
