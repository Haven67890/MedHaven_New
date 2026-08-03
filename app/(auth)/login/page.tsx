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

      const { data: authUserData } = await supabase.auth.getUser()
      const userId = authUserData?.user?.id ?? null
      const userEmail = authUserData?.user?.email ?? email

      let role = "student"
      if (userId || userEmail) {
        let query = supabase.from("profiles").select("role, role_name, is_admin, level").limit(1)
        if (userId) query = query.eq("id", userId)
        else if (userEmail) query = query.eq("email", userEmail)

        const { data } = await query.maybeSingle()
        const profile = data as Record<string, unknown> | null
        const detectedRole = normalizeRole(profile?.role ?? profile?.role_name ?? profile?.user_role ?? profile?.access_role)
        if (detectedRole === "admin" || detectedRole === "super_admin") {
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

          <Button type="button" variant="outline" className="w-full" onClick={() => router.push("/register")}>Create an account</Button>
          <FieldDescription className="text-center">Use the MedHaven credentials assigned to your account.</FieldDescription>
        </form>
      </CardContent>
      <CardFooter className="justify-center border-t border-border pt-6 text-sm text-muted-foreground">
        New to MedHaven?&nbsp;<Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">Create an account</Link>
      </CardFooter>
    </Card>
  )
}
