"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { FormEvent, useState, useEffect, Suspense } from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

type University = {
  id: string
  name: string
  short_name: string
}

type Faculty = {
  id: string
  name: string
  university_id: string
}

function RegisterContent() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorQuery = searchParams ? searchParams.get("error") : null

  const [universities, setUniversities] = useState<University[]>([])
  const [faculties, setFaculties] = useState<Faculty[]>([])
  const [selectedUniversityId, setSelectedUniversityId] = useState("")
  const [selectedFacultyId, setSelectedFacultyId] = useState("")
  const [loadingMetadata, setLoadingMetadata] = useState(true)

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [department, setDepartment] = useState("Medicine & Surgery")
  const [level, setLevel] = useState("400L")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [showOtpStep, setShowOtpStep] = useState(false)
  const [otpCode, setOtpCode] = useState("")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [uniRes, facRes] = await Promise.all([
          supabase.from("universities").select("id, name, short_name"),
          supabase.from("faculties").select("id, name, university_id")
        ])

        if (uniRes.error) throw uniRes.error
        if (facRes.error) throw facRes.error

        const unis = (uniRes.data || []) as University[]
        const facs = (facRes.data || []) as Faculty[]

        if (unis.length === 0 || facs.length === 0) {
          throw new Error("No metadata rows returned from database")
        }

        setUniversities(unis)
        setFaculties(facs)

        if (unis.length > 0) {
          setSelectedUniversityId(unis[0].id)
        }
        if (facs.length > 0) {
          setSelectedFacultyId(facs[0].id)
        }
      } catch (err) {
        console.warn("Error loading register metadata dynamically, applying grace fallbacks:", err)
        const mockUnis: University[] = [
          { id: "mock-uni-id", name: "Jos University Teaching Hospital", short_name: "JUTH" }
        ]
        const mockFacs: Faculty[] = [
          { id: "mock-fac-id", name: "Clinical Sciences", university_id: "mock-uni-id" }
        ]
        setUniversities(mockUnis)
        setFaculties(mockFacs)
        setSelectedUniversityId("mock-uni-id")
        setSelectedFacultyId("mock-fac-id")
      } finally {
        setLoadingMetadata(false)
      }
    }

    void fetchMetadata()
  }, [supabase])

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
      // Step 1: Create Supabase auth user with user metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/api/auth/callback`,
          data: {
            full_name: fullName.trim(),
            department: department,
            level: level,
            university_id: selectedUniversityId,
            faculty_id: selectedFacultyId,
          },
        },
      })

      if (authError) {
        setError(authError.message || (typeof authError === 'string' ? authError : JSON.stringify(authError)))
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
            university_id: selectedUniversityId || null,
            faculty_id: selectedFacultyId || null,
            department: department,
            current_level: level,
          }, { onConflict: "id" })

        if (profileError) {
          console.warn("Profile upsert result warning:", profileError.message)
        }
      } catch (dbErr) {
        console.warn("Failed to create profile row gracefully:", dbErr)
      }

      // Check if session is established (meaning email confirmation is disabled)
      if (authData.session) {
        router.replace("/dashboard")
      } else {
        // Show OTP Step instead of hiding form or resetting
        setShowOtpStep(true)
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (submitError: any) {
      setError(submitError?.message || (typeof submitError === 'string' ? submitError : JSON.stringify(submitError)))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOtpSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      const { error: otpError } = await supabase.auth.verifyOtp({
        email,
        token: otpCode.trim(),
        type: 'signup',
      })

      if (otpError) {
        setError(otpError.message || (typeof otpError === 'string' ? otpError : JSON.stringify(otpError)))
        return
      }

      router.replace("/dashboard")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (verifyError: any) {
      setError(verifyError?.message || (typeof verifyError === 'string' ? verifyError : JSON.stringify(verifyError)))
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
        setError(oauthError.message || (typeof oauthError === 'string' ? oauthError : JSON.stringify(oauthError)))
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (oauthErr: any) {
      setError(oauthErr?.message || (typeof oauthErr === 'string' ? oauthErr : JSON.stringify(oauthErr)))
    }
  }

  // OTP Verification Step UX
  if (showOtpStep) {
    return (
      <Card className="border-border shadow-xl shadow-primary/5">
        <CardHeader>
          <CardTitle className="text-2xl">Verify Your Email</CardTitle>
          <CardDescription>
            Enter the 6-digit verification code sent to your email. You can either type the 6-digit code below OR click the confirmation link in your email to verify.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form aria-label="Verify OTP" className="flex flex-col gap-6" onSubmit={handleOtpSubmit}>
            {/* LOUD ERROR ALERT BANNER */}
            {(error || errorQuery) ? (
              <div className="bg-destructive/15 border border-destructive/30 text-destructive text-sm rounded-lg p-4 flex flex-col gap-1 shadow-sm font-medium">
                <span className="font-extrabold uppercase text-xs tracking-wider">Verification Error:</span>
                <p>{error || errorQuery}</p>
              </div>
            ) : null}

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="register-otp">Verification Code</FieldLabel>
                <Input id="register-otp" type="text" maxLength={6} placeholder="Enter 6-digit OTP code" value={otpCode} onChange={(event) => setOtpCode(event.target.value)} required />
              </Field>
            </FieldGroup>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Verifying..." : "Verify Code"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center border-t border-border pt-6 text-sm text-muted-foreground">
          Didn&apos;t get a code?&nbsp;<button type="button" onClick={() => setShowOtpStep(false)} className="font-medium text-primary underline-offset-4 hover:underline">Go back to signup</button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="border-border shadow-xl shadow-primary/5">
      <CardHeader>
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <CardDescription>Register for access to MedHaven and your academic workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        <form aria-label="Register account" className="flex flex-col gap-6" onSubmit={handleSubmit}>
          {/* LOUD ERROR ALERT BANNER */}
          {(error || errorQuery) ? (
            <div className="bg-destructive/15 border border-destructive/30 text-destructive text-sm rounded-lg p-4 flex flex-col gap-1 shadow-sm font-medium">
              <span className="font-extrabold uppercase text-xs tracking-wider">Registration Error:</span>
              <p>{error || errorQuery}</p>
            </div>
          ) : null}

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
              <FieldLabel htmlFor="register-university">University</FieldLabel>
              <select
                id="register-university"
                value={selectedUniversityId}
                onChange={(event) => {
                  const val = event.target.value
                  setSelectedUniversityId(val)
                  const relatedFacs = faculties.filter((f) => f.university_id === val)
                  if (relatedFacs.length > 0) {
                    setSelectedFacultyId(relatedFacs[0].id)
                  } else {
                    setSelectedFacultyId("")
                  }
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
                disabled={loadingMetadata}
              >
                {loadingMetadata ? (
                  <option value="">Loading universities...</option>
                ) : (
                  universities.map((uni) => (
                    <option key={uni.id} value={uni.id}>
                      {uni.name} ({uni.short_name})
                    </option>
                  ))
                )}
              </select>
            </Field>

            <Field>
              <FieldLabel htmlFor="register-faculty">Faculty</FieldLabel>
              <select
                id="register-faculty"
                value={selectedFacultyId}
                onChange={(event) => setSelectedFacultyId(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
                disabled={loadingMetadata}
              >
                {loadingMetadata ? (
                  <option value="">Loading faculties...</option>
                ) : (
                  faculties
                    .filter((fac) => !selectedUniversityId || fac.university_id === selectedUniversityId)
                    .map((fac) => (
                      <option key={fac.id} value={fac.id}>
                        {fac.name}
                      </option>
                    ))
                )}
              </select>
            </Field>

            <Field>
              <FieldLabel htmlFor="register-department">Department</FieldLabel>
              <select
                id="register-department"
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="Medicine & Surgery">Medicine & Surgery</option>
                <option value="Nursing">Nursing</option>
                <option value="Medical Laboratory Science">Medical Laboratory Science</option>
                <option value="Physiology">Physiology</option>
                <option value="Anatomy">Anatomy</option>
              </select>
            </Field>

            <Field>
              <FieldLabel htmlFor="register-level">Level / Academic Year</FieldLabel>
              <select
                id="register-level"
                value={level}
                onChange={(event) => setLevel(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="100L">100L</option>
                <option value="200L">200L</option>
                <option value="300L">300L</option>
                <option value="400L">400L</option>
                <option value="500L">500L</option>
                <option value="600L">600L</option>
              </select>
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

          <Button type="submit" className="w-full" disabled={isSubmitting || loadingMetadata}>
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

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <Card className="border-border shadow-xl shadow-primary/5">
        <CardHeader>
          <CardTitle className="text-2xl">Loading...</CardTitle>
        </CardHeader>
      </Card>
    }>
      <RegisterContent />
    </Suspense>
  )
}
