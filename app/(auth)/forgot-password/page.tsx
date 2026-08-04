"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { FormEvent, useState, Suspense } from "react"

import { supabase } from "@/lib/auth/supabaseClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

function ForgotPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorQuery = searchParams ? searchParams.get("error") : null

  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/reset-password`,
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

  if (success) {
    return (
      <Card className="border-border shadow-xl shadow-primary/5">
        <CardHeader>
          <CardTitle className="text-2xl text-primary">Check Your Email</CardTitle>
          <CardDescription>We sent you a password reset link.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Check your email for the password reset link to confirm your account and configure a new password.
          </p>
          <Button asChild className="w-full">
            <Link href="/login">Go back to Sign In</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border shadow-xl shadow-primary/5">
      <CardHeader>
        <CardTitle className="text-2xl">Reset Password</CardTitle>
        <CardDescription>Enter your email address to receive a password reset link.</CardDescription>
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
