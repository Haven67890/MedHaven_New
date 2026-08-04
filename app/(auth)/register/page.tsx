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

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    if (!fullName.trim()) {
      setError("Full name is required.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.")
      return
    }

    setIsSubmitting(true)

    try {
      // Step 1: Create Supabase auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/api/auth/callback`,
          data: {
            full_name: fullName.trim(),
          },
        },
      })

      if (authError) {
        setError(authError.message)
        return
      }

      if (!authData.user) {
        setError("Unable to create account. Please try again.")
        return
      }

      // Step 2: Create the profile row in the profiles table safely via upsert
      try {
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({
            id: authData.user.id,
            email: email.trim().toLowerCase(),
            full_name: fullName.trim(),
          }, { onConflict: "id" })

        if (profileError) {
          console.warn("Profile upsert result warning:", profileError.message)
        }
      } catch (dbErr) {
        console.warn("Failed to create profile row gracefully:", dbErr)
      }

      // Step 3: Sign in automatically after registration
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        // If sign-in fails (e.g. email confirmation required), redirect to login
        router.push("/login")
        return
      }

      // Step 4: Redirect to dashboard after successful registration + sign-in
      router.replace("/dashboard")
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create account.")
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
        setError("Google sign-in is not yet configured. Please use the registration form.")
      }
    } catch {
      setError("Google sign-in is not available. Please use the registration form.")
    }
  }

  return (
    <Card className="border-border shadow-xl shadow-primary/5">
      <CardHeader>
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <CardDescription>Register for access to MedHaven and your academic workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        <form aria-label="Register account" className="flex flex-col gap-6" onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="register-name">Full name</FieldLabel>
              <Input id="register-name" autoComplete="name" placeholder="Your full name" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="register-email">Email address</FieldLabel>
              <Input id="register-email" type="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="register-password">Password</FieldLabel>
              <Input id="register-password" type="password" autoComplete="new-password" placeholder="Create a password (min 8 characters)" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="register-confirm-password">Confirm password</FieldLabel>
              <Input id="register-confirm-password" type="password" autoComplete="new-password" placeholder="Re-enter your password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
            </Field>
          </FieldGroup>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Create account"}
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
            Sign up with Google
          </Button>

          <FieldDescription className="text-center">Your account will be created and you can sign in immediately.</FieldDescription>
        </form>
      </CardContent>
      <CardFooter className="justify-center border-t border-border pt-6 text-sm text-muted-foreground">
        Already have an account?&nbsp;<Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">Sign in</Link>
      </CardFooter>
    </Card>
  )
}
