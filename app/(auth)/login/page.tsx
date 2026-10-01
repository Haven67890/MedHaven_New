"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { FormEvent, Suspense, useState } from "react"

import { createClient } from "@/lib/supabase/client"
import { safeNextPath } from "@/lib/auth/redirects"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

function LoginContent() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorQuery = searchParams.get("error")
  const next = safeNextPath(searchParams.get("next"), "/dashboard")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)
    try {
      const formattedEmail = email.trim().toLowerCase()
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: formattedEmail, password })
      if (signInError) {
        const message = signInError.message || "Unable to sign in."
        if (/not confirmed|not verified|unverified/i.test(message)) {
          router.replace(`/verify-email?email=${encodeURIComponent(formattedEmail)}&next=${encodeURIComponent(next)}`)
          return
        }
        setError(message)
        return
      }
      if (!data.user?.email_confirmed_at) {
        await supabase.auth.signOut()
        router.replace(`/verify-email?email=${encodeURIComponent(formattedEmail)}&next=${encodeURIComponent(next)}`)
        return
      }
      router.replace(next)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to sign in.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError("")
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/api/auth/callback?next=/dashboard` },
    })
    if (oauthError) setError(oauthError.message)
  }

  return (
    <Card className="border-border shadow-xl shadow-primary/5">
      <CardHeader>
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Use your JositeX email and password to continue to your department workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        <form aria-label="Sign in" className="flex flex-col gap-6" onSubmit={handleSubmit}>
          {(error || errorQuery) ? <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/15 p-4 text-sm text-destructive"><p>{error || errorQuery}</p></div> : null}
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="login-email">Email address</FieldLabel>
              <Input id="login-email" type="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </Field>
            <Field>
              <div className="flex items-center justify-between"><FieldLabel htmlFor="login-password">Password</FieldLabel><Link href="/forgot-password" className="text-xs text-primary underline-offset-4 hover:underline">Forgot Password?</Link></div>
              <Input id="login-password" type="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </Field>
          </FieldGroup>
          <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? "Signing in..." : "Sign in"}</Button>
          <div className="flex items-center gap-3"><Separator className="flex-1" /><span className="text-xs uppercase tracking-wider text-muted-foreground">or</span><Separator className="flex-1" /></div>
          <Button type="button" variant="outline" className="w-full" onClick={handleGoogleSignIn}>Continue with Google</Button>
          <FieldDescription className="text-center">Unverified accounts are sent to email verification before app access is granted.</FieldDescription>
        </form>
      </CardContent>
      <CardFooter className="justify-center border-t border-border pt-6 text-sm text-muted-foreground">New to JositeX?&nbsp;<Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">Create an account</Link></CardFooter>
    </Card>
  )
}

export default function LoginPage() {
  return <Suspense fallback={<Card><CardHeader><CardTitle>Loading...</CardTitle></CardHeader></Card>}><LoginContent /></Suspense>
}
