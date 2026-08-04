"use client"

import { useRouter } from "next/navigation"
import { FormEvent, useState, useEffect, Suspense } from "react"

import { supabase } from "@/lib/auth/supabaseClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"

function ProfileCompleteContent() {
  const router = useRouter()
  const [department, setDepartment] = useState("Medicine & Surgery")
  const [level, setLevel] = useState("400L")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id)
      } else {
        router.replace("/login")
      }
    })
  }, [router])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    if (!userId) {
      setError("User session not found. Please log in.")
      return
    }

    setIsSubmitting(true)

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          department: department,
          level: level,
        }, { onConflict: "id" })

      if (updateError) {
        setError(updateError.message)
        return
      }

      router.replace("/dashboard")
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save profile details.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-md border-border shadow-xl shadow-primary/5">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Complete Your Profile</CardTitle>
          <CardDescription>Configure your academic workspace details on MedHaven to access your student dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <form aria-label="Complete profile onboarding" className="flex flex-col gap-6" onSubmit={handleSubmit}>
            {error ? (
              <div className="bg-destructive/15 border border-destructive/30 text-destructive text-sm rounded-lg p-4 font-medium">
                <span className="font-extrabold uppercase text-xs tracking-wider block">Error:</span>
                <p>{error}</p>
              </div>
            ) : null}

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="onboard-department">Department</FieldLabel>
                <select
                  id="onboard-department"
                  value={department}
                  onChange={(event) => setDepartment(event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                <FieldLabel htmlFor="onboard-level">Level / Academic Year</FieldLabel>
                <select
                  id="onboard-level"
                  value={level}
                  onChange={(event) => setLevel(event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                >
                  <option value="100L">100L</option>
                  <option value="200L">200L</option>
                  <option value="300L">300L</option>
                  <option value="400L">400L</option>
                  <option value="500L">500L</option>
                  <option value="600L / Clinicals">600L / Clinicals</option>
                </select>
              </Field>
            </FieldGroup>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save and Access Workspace"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ProfileCompletePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading onboarding...</p>
      </div>
    }>
      <ProfileCompleteContent />
    </Suspense>
  )
}
