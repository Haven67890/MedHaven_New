"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"

import useAuth from "@/hooks/useAuth"
import { supabase } from "@/lib/auth/supabaseClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

function normalizeRole(value: unknown): string {
  if (typeof value !== "string") return ""
  return value.trim().toLowerCase()
}

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      await login(email, password)

      // After login, get user and check role for redirect
      const { data: authUserData } = await supabase.auth.getUser()
      const userId = authUserData?.user?.id ?? null

      let role = "student"
      if (userId) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("role, role_name, is_admin")
          .eq("id", userId)
          .maybeSingle()

        const profile = profileData as Record<string, unknown> | null
        const detectedRole = normalizeRole(profile?.role ?? profile?.role_name ?? "")
        if (detectedRole === "admin" || detectedRole === "super_admin" || Boolean(profile?.is_admin)) {
          role = detectedRole
        }
      }

      router.replace(role === "admin" || role === "super_admin" ? "/admin" : "/dashboard")
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to sign in.")
    } finally {
      setIsSubmitting(false)
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
        // OAuth may not be configured — show gracefully
        setError("Google sign-in is not yet configured. Please use email and password.")
      }
    } catch {
      setError("Google sign-in is not available. Please use email and password.")
    }
  }

  return (
    <Card className="border-border shadow-xl shadow-primary/5">
      <CardHeader>
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Use your MedHaven email and password to continue.</CardDescription>
      </CardHeader>
      <CardContent>
        <form aria-label="Sign in" className="flex flex-col gap-6" onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="login-email">Email address</FieldLabel>
              <Input id="login-email" type="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="login-password">Password</FieldLabel>
              <Input id="login-password" type="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </Field>
          </FieldGroup>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

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
