"use client"

import Link from "next/link"
import { Mail, MapPin, GraduationCap, CalendarDays, BookOpen, Settings, Pencil, CheckCircle2 } from "lucide-react"
import { useEffect, useState, useCallback } from "react"

import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/dashboard/page-header"
import useAuth from "@/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import { EditProfileDialog } from "@/components/profile/edit-profile-dialog"

type Profile = {
  id: string
  first_name?: string | null
  last_name?: string | null
  full_name?: string | null
  nickname?: string | null
  current_level?: string | null
  avatar_url?: string | null
  department?: string | null
  faculty_id?: string | number | null
  university_id?: string | number | null
  role?: string | null
}

function useProfile(userId: string | undefined) {
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [departmentName, setDepartmentName] = useState("")
  const [facultyName, setFacultyName] = useState("")
  const [universityName, setUniversityName] = useState("")
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        setEmail(authUser.email ?? null)
      }
    } catch (err) {
      console.warn("Failed to fetch user auth session details:", err)
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, full_name, nickname, current_level, avatar_url, role, department, faculty_id, university_id")
      .eq("id", userId)
      .maybeSingle()

    if (profileData) {
      const pData = profileData as Profile
      setProfile(pData)

      // Fetch related faculty and university names
      const requests = [
        pData.faculty_id
          ? supabase.from("faculties").select("name").eq("id", pData.faculty_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        pData.university_id
          ? supabase.from("universities").select("name").eq("id", pData.university_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]

      const [facResult, uniResult] = await Promise.allSettled(requests)

      const deptName = pData.department || ""
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

    setLoading(false)
  }, [userId, supabase])

  useEffect(() => {
    void loadProfile()

    const handleProfileUpdate = () => {
      void loadProfile()
    }

    if (typeof window !== "undefined") {
      window.addEventListener("profile-updated", handleProfileUpdate)
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("profile-updated", handleProfileUpdate)
      }
    }
  }, [loadProfile])

  return { profile, email, departmentName, facultyName, universityName, loading, refresh: loadProfile }
}

export default function ProfilePage() {
  const { user } = useAuth()
  const { profile, email, departmentName, facultyName, universityName, loading, refresh } = useProfile(user?.id)

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [successBanner, setSuccessBanner] = useState<string | null>(null)

  const displayName = profile?.full_name ||
    (profile?.first_name && profile?.last_name ? `${profile.first_name} ${profile.last_name}` : null) ||
    user?.email ||
    "Your Account"

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U"

  const formattedRole = profile?.role
    ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1).replace("_", " ")
    : "Student"

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

      {successBanner && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-5 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="h-28 bg-gradient-to-br from-primary/20 via-primary/10 to-accent" />
        <CardContent className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <Avatar
              initials={initials}
              src={profile?.avatar_url}
              className="size-24 border-4 border-card text-3xl shadow-sm"
            />
            <div className="flex flex-col gap-1 pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold tracking-tight text-foreground">{displayName}</h2>
                {profile?.nickname && profile.nickname.trim() !== "" && (
                  <span className="text-sm font-medium text-muted-foreground">
                    ("{profile.nickname}")
                  </span>
                )}
              </div>
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
          <Button
            variant="outline"
            className="shrink-0"
            onClick={() => setEditDialogOpen(true)}
          >
            <Pencil className="mr-2 size-4" />Edit profile
          </Button>
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
              {email ?? user?.email ?? "Not available"}
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
              Role: {formattedRole}
            </div>
          </CardContent>
        </Card>
      </div>

      {profile && (
        <EditProfileDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          profile={profile}
          onSaveSuccess={() => {
            void refresh()
            setSuccessBanner("Profile updated successfully!")
            setTimeout(() => setSuccessBanner(null), 5000)
          }}
        />
      )}
    </div>
  )
}
