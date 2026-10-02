"use client"

import { useRouter } from "next/navigation"
import { FormEvent, useState, useEffect, Suspense } from "react"
import type { User } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/client"
import { resolveAuthenticatedDestination } from "@/lib/auth/destination"
import { useInstitutionalCatalogue } from "@/components/onboarding/institutional-selector"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"

function ProfileCompleteContent() {
  const supabase = createClient()
  const router = useRouter()

  const { universities, availableFaculties, availableColleges, availableProgrammes, availableLevels, selectedUniversityId, selectedFacultyId, selectedCollegeId, selectedProgrammeId, selectedProgramme, loadingMetadata, metadataError, changeUniversity, changeFaculty, changeCollege, chooseProgramme, initializeSelection } = useInstitutionalCatalogue()
  const [level, setLevel] = useState("100L")

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

  useEffect(() => {
    if (!userId || loadingMetadata) return
    void supabase
      .from("profiles")
      .select("university_id, faculty_id, undergraduate_programme_id, current_level")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }: { data: { university_id: string | null; faculty_id: string | null; undergraduate_programme_id: string | null; current_level: string | null } | null }) => {
        if (!data) return
        initializeSelection(data.university_id ?? "", data.faculty_id ?? "", data.undergraduate_programme_id ?? "")
        if (data.current_level) setLevel(data.current_level)
      })
  }, [initializeSelection, loadingMetadata, supabase, userId])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    if (metadataError) {
      setError(metadataError)
      return
    }

    if (!selectedProgramme) {
      setError("Please select a valid undergraduate programme.")
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
      const { error: onboardingError } = await supabase.rpc("complete_undergraduate_profile_onboarding", {
        p_university_id: selectedUniversityId,
        p_faculty_id: selectedFacultyId,
        p_undergraduate_programme_id: selectedProgramme.id,
        p_level: level,
        p_full_name: fullName,
      })
      if (onboardingError) {
        setError("Unable to save your institutional details. Please verify your selections and try again.")
        setIsSubmitting(false)
        return
      }

      const destination = await resolveAuthenticatedDestination(supabase, userId)
      router.refresh()
      router.replace(destination)
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
          <CardDescription>Select your university, college where applicable, faculty, undergraduate programme, and current level for JositeX.</CardDescription>
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

              {availableColleges.length ? <Field>
                <FieldLabel htmlFor="onboard-college">College</FieldLabel>
                <select id="onboard-college" value={selectedCollegeId} onChange={(event) => changeCollege(event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                  {availableColleges.map((college) => <option key={college.id} value={college.id}>{college.name}</option>)}
                </select>
              </Field> : null}

              <Field>
                <FieldLabel htmlFor="onboard-programme">Undergraduate programme</FieldLabel>
                <select id="onboard-programme" value={selectedProgrammeId} onChange={(event) => chooseProgramme(event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                  {availableProgrammes.map((programme) => <option key={programme.id} value={programme.id}>{programme.name}{programme.award ? ` · ${programme.award}` : ""}</option>)}
                </select>
              </Field>

              <Field>
                <FieldLabel htmlFor="onboard-level">Current level</FieldLabel>
                <select
                  id="onboard-level"
                  value={level}
                  onChange={(event) => setLevel(event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                >
                  {availableLevels.map((item) => <option key={item.id} value={item.code || item.name}>{item.code || item.name}</option>)}
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
