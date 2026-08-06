"use client"

import { useRouter } from "next/navigation"
import { FormEvent, useState, useEffect, Suspense } from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"

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

function ProfileCompleteContent() {
  const supabase = createClient()
  const router = useRouter()

  const [universities, setUniversities] = useState<University[]>([])
  const [faculties, setFaculties] = useState<Faculty[]>([])

  const [selectedUniversityId, setSelectedUniversityId] = useState("")
  const [selectedFacultyId, setSelectedFacultyId] = useState("")
  const [department, setDepartment] = useState("Medicine & Surgery")
  const [level, setLevel] = useState("400L")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadingMetadata, setLoadingMetadata] = useState(true)
  const [error, setError] = useState("")
  const [userId, setUserId] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then((response: any) => {
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

        setUniversities(unis)
        setFaculties(facs)

        if (unis.length > 0) {
          setSelectedUniversityId(unis[0].id)
        }
        if (facs.length > 0) {
          setSelectedFacultyId(facs[0].id)
        }
      } catch (err) {
        console.error("Error loading onboarding metadata:", err)
        setError("Could not load university metadata. Please try again.")
      } finally {
        setLoadingMetadata(false)
      }
    }

    void fetchMetadata()
  }, [supabase])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

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
      const { error: updateError } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          full_name: fullName,
          university_id: selectedUniversityId || null,
          faculty_id: selectedFacultyId || null,
          department: department,
          current_level: level,
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
                <FieldLabel htmlFor="onboard-university">University</FieldLabel>
                <select
                  id="onboard-university"
                  value={selectedUniversityId}
                  onChange={(event) => setSelectedUniversityId(event.target.value)}
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
                  onChange={(event) => setSelectedFacultyId(event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                >
                  {faculties
                    .filter((fac) => !selectedUniversityId || fac.university_id === selectedUniversityId)
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
