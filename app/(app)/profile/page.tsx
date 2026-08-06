"use client"

import Link from "next/link"
import { Mail, MapPin, GraduationCap, CalendarDays, BookOpen, Settings, Pencil } from "lucide-react"

import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/dashboard/page-header"
import useAuth from "@/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"

type Profile = {
  full_name?: string | null
  email?: string | null
  current_level?: string | null
  department?: string | null
  faculty_id?: string | number | null
  university_id?: string | number | null
  avatar_url?: string | null
}

function useProfile(userId: string | undefined) {
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [departmentName, setDepartmentName] = useState("")
  const [facultyName, setFacultyName] = useState("")
  const [universityName, setUniversityName] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const loadProfile = async () => {
      if (!userId) {
        if (mounted) setLoading(false)
        return
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, email, current_level, department, faculty_id, university_id, avatar_url")
        .eq("id", userId)
        .maybeSingle()

      if (!mounted) return

      if (profileData) {
        setProfile(profileData as Profile)

        // Fetch related names
        const requests = [
          profileData.faculty_id
            ? supabase.from("faculties").select("name").eq("id", profileData.faculty_id).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          profileData.university_id
            ? supabase.from("universities").select("name").eq("id", profileData.university_id).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        ]

        const [facResult, uniResult] = await Promise.allSettled(requests)

        if (!mounted) return

        const deptName = profileData.department || ""
        const facName = facResult.status === "fulfilled" && facResult.value.data
          ? String((facResult.value.data as { name?: string | null }).name ?? "")
          : ""
        const uniName = uniResult.status === "fulfilled" && uniResult.value.data
          ? String((uniResult.value.data as { name?: string | null }).name ?? "")
          : ""

        setDepartmentName(deptName)
        setFacultyName(facName)
        setUniversityName(uniName)
      }

      if (mounted) setLoading(false)
    }

    void loadProfile()

    return () => {
      mounted = false
    }
  }, [userId])

  return { profile, departmentName, facultyName, universityName, loading }
}

export default function ProfilePage() {
  const { user } = useAuth()
  const { profile, departmentName, facultyName, universityName, loading } = useProfile(user?.id)

  const displayName = profile?.full_name ?? user?.email ?? "Your Account"
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Profile" description="Your academic identity on MedHaven.">
        <Button variant="outline" asChild>
          <Link href="/settings"><Settings className="mr-2 size-4" />Settings</Link>
        </Button>
      </PageHeader>

      <Card className="overflow-hidden">
        <div className="h-28 bg-gradient-to-br from-primary/20 via-primary/10 to-accent" />
        <CardContent className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <Avatar initials={initials} className="size-24 border-4 border-card text-3xl shadow-sm" />
            <div className="flex flex-col gap-1 pb-2">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">{displayName}</h2>
              <p className="text-sm text-muted-foreground">
                {profile?.current_level ? `Level ${profile.current_level}` : "Academic level not set"}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {departmentName && (
                  <Badge variant="muted">{departmentName}</Badge>
                )}
                {facultyName && (
                  <Badge variant="muted">{facultyName}</Badge>
                )}
                {universityName && (
                  <Badge variant="muted">{universityName}</Badge>
                )}
              </div>
            </div>
          </div>
          <Button variant="outline" className="shrink-0"><Pencil className="mr-2 size-4" />Edit profile</Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="size-4" aria-hidden="true" />
              {profile?.email ?? user?.email ?? "Not available"}
            </div>
            {departmentName && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <BookOpen className="size-4" aria-hidden="true" />
                {departmentName}
              </div>
            )}
            {facultyName && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <GraduationCap className="size-4" aria-hidden="true" />
                {facultyName}
              </div>
            )}
            {universityName && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="size-4" aria-hidden="true" />
                {universityName}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account info</CardTitle>
            <CardDescription>Basic account details.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="size-4" aria-hidden="true" />
              Account created for MedHaven
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <BookOpen className="size-4" aria-hidden="true" />
              Role: Student
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
