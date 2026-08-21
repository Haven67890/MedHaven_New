"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { FormEvent, useState, useEffect, Suspense } from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

function ResetPasswordContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const errorQuery = searchParams ? searchParams.get("error") : null

  const [hasSession, setHasSession] = useState<boolean | null>(null)
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  // Password reset form state (when session is verified)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

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
          <CardTitle className="text-2xl">Invalid or Expired Link</CardTitle>
          <CardDescription>
            Your password reset session could not be verified or has expired.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorQuery ? (
            <div className="bg-destructive/15 border border-destructive/30 text-destructive text-sm rounded-lg p-4 flex flex-col gap-1 shadow-sm font-medium">
              <span className="font-extrabold uppercase text-xs tracking-wider">Error Details:</span>
              <p>{errorQuery}</p>
            </div>
          ) : null}
          <p className="text-sm text-muted-foreground">
            Please request a new password reset link or enter your 8-digit verification code on the forgot password page.
          </p>
          <Button asChild className="w-full">
            <Link href="/forgot-password">Go Back to Forgot Password</Link>
          </Button>
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
