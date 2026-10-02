"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { FormEvent, Suspense, useState } from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

function RegisterContent() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorQuery = searchParams.get("error")
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    if (!fullName.trim()) return setError("Full name is required.")
    if (password !== confirmPassword) return setError("Passwords do not match.")
    if (password.length < 8) return setError("Password must be at least 8 characters long.")

    setIsSubmitting(true)
    try {
      const formattedEmail = email.trim().toLowerCase()
      const { data, error: signupError } = await supabase.auth.signUp({
        email: formattedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
          data: {
            full_name: fullName.trim(),
          },
        },
      })
      if (signupError) throw signupError
      if (!data.user) throw new Error("Unable to create account. Please try again.")

      router.replace(`/verify-email?email=${encodeURIComponent(formattedEmail)}`)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create account.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError("")
    const { error: oauthError } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/api/auth/callback` } })
    if (oauthError) setError(oauthError.message)
  }

  return (
    <Card className="border-border shadow-xl shadow-primary/5">
      <CardHeader><CardTitle className="text-2xl">Create your account</CardTitle><CardDescription>Register for JositeX and your department academic workspace.</CardDescription></CardHeader>
      <CardContent>
        <form aria-label="Register account" className="flex flex-col gap-6" onSubmit={handleSubmit}>
          {(error || errorQuery) ? <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/15 p-4 text-sm text-destructive"><p>{error || errorQuery}</p></div> : null}
          <FieldGroup>
            <Field><FieldLabel htmlFor="register-name">Full name</FieldLabel><Input id="register-name" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} required /></Field>
            <Field><FieldLabel htmlFor="register-email">Email address</FieldLabel><Input id="register-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></Field>
            <Field><FieldLabel htmlFor="register-password">Password</FieldLabel><Input id="register-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></Field>
            <Field><FieldLabel htmlFor="register-confirm-password">Confirm password</FieldLabel><Input id="register-confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></Field>
          </FieldGroup>
          <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? "Creating account..." : "Create account"}</Button>
          <div className="flex items-center gap-3"><Separator className="flex-1" /><span className="text-xs uppercase tracking-wider text-muted-foreground">or</span><Separator className="flex-1" /></div>
          <Button type="button" variant="outline" className="w-full" onClick={handleGoogleSignIn}>Sign up with Google</Button>
          <FieldDescription className="text-center">A verification email is required before JositeX app access is granted.</FieldDescription>
        </form>
      </CardContent>
      <CardFooter className="justify-center border-t border-border pt-6 text-sm text-muted-foreground">Already have an account?&nbsp;<Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">Sign in</Link></CardFooter>
    </Card>
  )
}

export default function RegisterPage() {
  return <Suspense fallback={<Card><CardHeader><CardTitle>Loading...</CardTitle></CardHeader></Card>}><RegisterContent /></Suspense>
}
