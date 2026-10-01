"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { FormEvent, Suspense, useCallback, useEffect, useMemo, useState } from "react"

import { createClient } from "@/lib/supabase/client"
import { safeNextPath, isEmailVerified, maskEmail } from "@/lib/auth/redirects"
import { VerificationCodeInput, VERIFICATION_CODE_LENGTH } from "@/components/auth/verification-code-input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const COOLDOWN_MS = 60_000
const cooldownKey = (email: string) => `jositex:verification-resend:${email.trim().toLowerCase()}`

function getSafeMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : String(error ?? "")
  const lower = message.toLowerCase()
  if (lower.includes("expired")) return "This verification code or link has expired. Request a new code and try again."
  if (lower.includes("already") || lower.includes("used")) return "This verification link or code has already been used. Sign in to continue."
  if (lower.includes("rate") || lower.includes("too many") || lower.includes("limit")) return "Too many requests. Please wait before requesting another verification email."
  if (lower.includes("invalid") || lower.includes("token")) return "The verification code is invalid. Check the code and try again."
  return message || fallback
}

function VerifyEmailContent() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryEmail = searchParams.get("email") ?? ""
  const next = safeNextPath(searchParams.get("next"), "/")
  const status = searchParams.get("status")

  const [email, setEmail] = useState(queryEmail)
  const [code, setCode] = useState<string[]>(Array.from({ length: VERIFICATION_CODE_LENGTH }, () => ""))
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const [now, setNow] = useState(0)

  const remainingSeconds = Math.max(0, Math.ceil((cooldownUntil - now) / 1000))
  const isCoolingDown = remainingSeconds > 0
  const maskedEmail = useMemo(() => maskEmail(email), [email])

  const goToLogin = useCallback(() => router.replace(`/login?next=${encodeURIComponent(next)}&error=${encodeURIComponent("Your email was not verified in an active session. Please sign in and try again.")}`), [next, router])

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""))
    const accessToken = hash.get("access_token")
    const refreshToken = hash.get("refresh_token")

    void (async () => {
      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        if (sessionError) {
          setError(getSafeMessage(sessionError, "This verification link is invalid or expired."))
          return
        }
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search)
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user && isEmailVerified(session.user)) {
        setSuccess(true)
      } else if (status === "success" || accessToken || refreshToken) {
        goToLogin()
      }
    })()
  }, [goToLogin, status, supabase])

  useEffect(() => {
    if (!email.trim() || success) return
    const key = cooldownKey(email)
    const stored = Number(window.localStorage.getItem(key) ?? "0")
    const initial = stored > Date.now() ? stored : Date.now() + COOLDOWN_MS
    if (stored <= Date.now()) window.localStorage.setItem(key, String(initial))
    const timer = window.setTimeout(() => setCooldownUntil(initial), 0)
    return () => window.clearTimeout(timer)
  }, [email, success])

  useEffect(() => {
    if (!cooldownUntil) return
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [cooldownUntil])

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    const formattedEmail = email.trim().toLowerCase()
    const token = code.join("")
    if (!formattedEmail) return setError("Enter the email address used to create your account.")
    if (token.length !== VERIFICATION_CODE_LENGTH) return setError(`Enter all ${VERIFICATION_CODE_LENGTH} digits before submitting.`)

    setIsSubmitting(true)
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({ email: formattedEmail, token, type: "signup" })
      if (verifyError) throw verifyError
      const session = data.session ?? (await supabase.auth.getSession()).data.session
      if (!session?.user || !isEmailVerified(session.user)) {
        goToLogin()
        return
      }
      setSuccess(true)
      setCode(Array.from({ length: VERIFICATION_CODE_LENGTH }, () => ""))
    } catch (verifyError) {
      setError(getSafeMessage(verifyError, "Unable to verify this code."))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResend = async () => {
    const formattedEmail = email.trim().toLowerCase()
    if (!formattedEmail) return setError("Enter the email address used to create your account first.")
    if (isCoolingDown || isResending) return

    setError("")
    setIsResending(true)
    try {
      const { error: resendError } = await supabase.auth.resend({ type: "signup", email: formattedEmail })
      if (resendError) throw resendError
      const expiresAt = Date.now() + COOLDOWN_MS
      window.localStorage.setItem(cooldownKey(formattedEmail), String(expiresAt))
      setCooldownUntil(expiresAt)
    } catch (resendError) {
      setError(getSafeMessage(resendError, "The verification email could not be sent. Please try again later."))
    } finally {
      setIsResending(false)
    }
  }

  if (success) {
    return (
      <Card className="border-border shadow-xl shadow-primary/5">
        <CardHeader>
          <CardTitle className="text-2xl text-primary">Email verified</CardTitle>
          <CardDescription>Your Supabase Auth email confirmation succeeded and your session is active.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Continue to your intended JositeX workspace.</p>
          <Button className="w-full" onClick={() => router.replace(next)}>Continue to JositeX</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border shadow-xl shadow-primary/5">
      <CardHeader>
        <CardTitle className="text-2xl">Verify your email</CardTitle>
        <CardDescription>Enter the 8-digit code sent to {maskedEmail}, or use the verification link in that email.</CardDescription>
      </CardHeader>
      <CardContent>
        <form aria-label="Verify email" className="flex flex-col gap-6" onSubmit={handleVerify}>
          {error ? <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/15 p-4 text-sm text-destructive"><p>{error}</p></div> : null}
          <FieldGroup>
            <Field><FieldLabel htmlFor="verification-email">Email address</FieldLabel><Input id="verification-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></Field>
            <Field><FieldLabel htmlFor="verification-code-1">8-digit verification code</FieldLabel><VerificationCodeInput value={code} onChange={setCode} disabled={isSubmitting} /></Field>
          </FieldGroup>
          <Button type="submit" className="w-full" disabled={isSubmitting || code.join("").length !== VERIFICATION_CODE_LENGTH}>{isSubmitting ? "Verifying..." : "Verify email"}</Button>
          <div className="text-center text-sm text-muted-foreground"><button type="button" onClick={handleResend} disabled={isCoolingDown || isResending} className="font-medium text-primary underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-50">{isResending ? "Sending..." : isCoolingDown ? `Resend available in ${remainingSeconds}s` : "Resend verification email"}</button></div>
        </form>
      </CardContent>
      <CardFooter className="justify-center border-t border-border pt-6 text-sm text-muted-foreground"><Link href={`/login?next=${encodeURIComponent(next)}`} className="font-medium text-primary underline-offset-4 hover:underline">Return to sign in</Link></CardFooter>
    </Card>
  )
}

export default function VerifyEmailPage() {
  return <Suspense fallback={<Card><CardHeader><CardTitle>Loading verification...</CardTitle></CardHeader></Card>}><VerifyEmailContent /></Suspense>
}
