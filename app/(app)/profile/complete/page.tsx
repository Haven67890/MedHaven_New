"use client"

import { useRouter } from "next/navigation"
import { FormEvent, useState, useEffect, Suspense } from "react"
import type { User } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/client"
import { appHomePath, getUserEcosystemContext } from "@/lib/jositex"
import { useInstitutionalCatalogue } from "@/components/onboarding/institutional-selector"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"

function ProfileCompleteContent() {
  const supabase = createClient()
  const router = useRouter()

  const { universities, availableFaculties, availableDepartments, selectedUniversityId, selectedFacultyId, selectedDepartmentId, selectedDepartment, loadingMetadata, metadataError, changeUniversity, changeFaculty, changeDepartment } = useInstitutionalCatalogue()
  const [level, setLevel] = useState("400L")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [userId, setUserId] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then((response: { data: { user: User | null } }) => {
      const data = response.data
      if (data && data.user) {
        setUserId(data.user.id)
        setUser(data.user)
      } else {
        router.replace("/login")
      }
    })
  }, [router, supabase])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    if (metadataError) {
      setError(metadataError)
      return
    }

    if (!selectedDepartment) {
      setError("Please select a valid department.")
      return
    }

    if (!userId) {
      setError("User session not found. Please log in.")
      return
    }

    setIsSubmitting(true)

    // Sourced user full name according to specified fallback logic
    const userEmail = user?.email || ""
    const emailPrefix = userEmail ? userEmail.split("@")[0] : "Scholar"
    const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || emailPrefix

    try {
      const { error: onboardingError } = await supabase.rpc("complete_profile_onboarding", {
        p_university_id: selectedUniversityId,
        p_faculty_id: selectedFacultyId,
        p_department_id: selectedDepartment.id,
        p_level: level,
        p_full_name: fullName,
      })
      if (onboardingError) {
        setError("Unable to save your institutional details. Please verify your selections and try again.")
        setIsSubmitting(false)
        return
      }

      const context = await getUserEcosystemContext(supabase, userId)
      router.refresh()
      router.replace(appHomePath(context?.app.slug))
      // Do not reset isSubmitting on success to preserve loading/disabled state during navigation
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save profile details.")
      setIsSubmitting(false)
    }
  }

  if (loadingMetadata) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading university directories...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-md border-border shadow-xl shadow-primary/5">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Complete Your Profile</CardTitle>
          <CardDescription>Configure your university, faculty, department, and academic level for JositeX.</CardDescription>
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
                <FieldLabel htmlFor="onboard-university">University</FieldLabel>
                <select
                  id="onboard-university"
                  value={selectedUniversityId}
                  onChange={(event) => changeUniversity(event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                >
                  {universities.map((uni) => (
                    <option key={uni.id} value={uni.id}>
                      {uni.name} ({uni.short_name})
                    </option>
                  ))}
                </select>
              </Field>

              <Field>
                <FieldLabel htmlFor="onboard-faculty">Faculty</FieldLabel>
                <select
                  id="onboard-faculty"
                  value={selectedFacultyId}
                  onChange={(event) => changeFaculty(event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                >
                  {availableFaculties
                    .map((fac) => (
                      <option key={fac.id} value={fac.id}>
                        {fac.name}
                      </option>
                    ))}
                </select>
              </Field>

              <Field>
                <FieldLabel htmlFor="onboard-department">Department</FieldLabel>
                <select
                  id="onboard-department"
                  value={selectedDepartmentId}
                  onChange={(event) => changeDepartment(event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                >
                  {availableDepartments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
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
                  <option value="600L">600L</option>
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
