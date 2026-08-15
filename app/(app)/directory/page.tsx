"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useDebounce } from "@/hooks/useDebounce"
import { ArrowRight, Mail, MapPin, Phone, Search, Users, RefreshCw } from "lucide-react"

import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { StatCard } from "@/components/dashboard/stat-card"
import { createClient } from "@/lib/supabase/client"

interface StaffMember {
  id: string
  full_name: string
  photo_url: string | null
  title: string
  department: string
  specialty: string | null
  courses: string[] | null
  status: string
  created_at: string
}

// Function to generate initials fallback
function getInitials(name: string): string {
  if (!name) return "ST"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export default function StaffDirectoryPage() {
  const supabase = createClient()

  // State
  const [allStaff, setAllStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [selectedDept, setSelectedDept] = useState<string>("all")

  // Load staff on mount
  useEffect(() => {
    async function loadStaff() {
      try {
        setLoading(true)
        setError(null)
        // Query the staff table - RLS naturally restricts non-admin reads to status = 'active'
        const { data, error: fetchError } = await supabase
          .from("staff")
          .select("*")
          .order("full_name", { ascending: true })

        if (fetchError) {
          throw fetchError
        }

        setAllStaff(data || [])
      } catch (err: any) {
        console.error("Error loading staff directory:", err)
        setError(err.message || "Failed to load staff directory")
      } finally {
        setLoading(false)
      }
    }
    void loadStaff()
  }, [])

  // Filter logic
  const filteredStaff = allStaff.filter((member) => {
    // Search bar filters by name, department, or specialty
    if (debouncedSearchQuery.trim()) {
      const q = debouncedSearchQuery.toLowerCase().trim()
      const nameMatch = member.full_name?.toLowerCase().includes(q)
      const deptMatch = member.department?.toLowerCase().includes(q)
      const specialtyMatch = member.specialty?.toLowerCase().includes(q)

      if (!nameMatch && !deptMatch && !specialtyMatch) {
        return false
      }
    }

    // Department filter dropdown
    if (selectedDept !== "all" && member.department !== selectedDept) {
      return false
    }

    return true
  })

  // Group departments dynamically with count
  const departmentsWithCount = allStaff.reduce<Record<string, number>>((acc, member) => {
    const dept = member.department || "General"
    acc[dept] = (acc[dept] || 0) + 1
    return acc
  }, {})

  const departmentList = Object.entries(departmentsWithCount).map(([name, count]) => ({
    name,
    count,
  }))

  const totalStaffCount = allStaff.length
  const uniqueDeptsCount = departmentList.length

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Staff Directory" description="Find and reach out to lecturers and academic staff.">
        <Button variant="outline" asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </PageHeader>

      {/* Stats section */}
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total active staff" value={String(totalStaffCount)} icon={Users} accent="primary" />
        <StatCard label="Departments" value={String(uniqueDeptsCount)} icon={Users} accent="secondary" />
        <StatCard label="Available today" value={String(totalStaffCount)} icon={Users} accent="accent" />
      </section>

      {/* Filters & search */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            placeholder="Search staff by name, department, or specialty…"
            className="pl-9"
            aria-label="Search staff directory"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="flex h-10 w-full sm:w-56 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Filter by department"
          >
            <option value="all">All Departments</option>
            {departmentList.map((dept) => (
              <option key={dept.name} value={dept.name}>
                {dept.name} ({dept.count})
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Departments list with badges */}
      {departmentList.length > 0 && (
        <section>
          <SectionHeading title="Departments" description="Quick filter by clicking on a department option." />
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge
              variant={selectedDept === "all" ? "default" : "outline"}
              className="cursor-pointer px-3 py-1.5 text-sm"
              onClick={() => setSelectedDept("all")}
            >
              All Departments
            </Badge>
            {departmentList.map((dept) => (
              <Badge
                key={dept.name}
                variant={selectedDept === dept.name ? "default" : "outline"}
                className="cursor-pointer px-3 py-1.5 text-sm"
                onClick={() => setSelectedDept(dept.name)}
              >
                {dept.name}
                <span className="ml-1.5 text-muted-foreground">{dept.count}</span>
              </Badge>
            ))}
          </div>
        </section>
      )}

      {/* Staff members list */}
      <section>
        <SectionHeading title="Staff members" description="Contact details, academic titles, and courses taught." />
        {loading ? (
          <div className="flex min-h-[20vh] items-center justify-center">
            <div className="text-center">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 text-sm text-muted-foreground">Fetching directory...</p>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/15 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No matching staff members found.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredStaff.map((member) => (
              <Card key={member.id} className="gap-3">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    {member.photo_url ? (
                      <img
                        src={member.photo_url}
                        alt={member.full_name}
                        className="size-12 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <Avatar initials={getInitials(member.full_name)} className="size-12 text-base" />
                    )}
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                      <CardTitle className="text-base truncate" title={member.full_name}>
                        {member.full_name}
                      </CardTitle>
                      <CardDescription className="truncate" title={member.title}>
                        {member.title}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="accent" className="w-fit">{member.department}</Badge>
                    {member.specialty && (
                      <Badge variant="outline" className="w-fit text-[11px]">{member.specialty}</Badge>
                    )}
                  </div>

                  {Array.isArray(member.courses) && member.courses.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Courses Taught</p>
                      <div className="flex flex-wrap gap-1">
                        {member.courses.map((course, idx) => (
                          <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0.5">
                            {course}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 border-t pt-3 flex flex-col gap-1.5 text-xs text-muted-foreground">
                    <p className="flex items-center gap-2"><MapPin className="size-3" aria-hidden="true" /> Main Campus Office</p>
                    <p className="flex items-center gap-2"><Mail className="size-3" aria-hidden="true" /> {member.full_name.toLowerCase().replace(/\s+/g, "")}@medhaven.edu</p>
                    <p className="flex items-center gap-2"><Phone className="size-3" aria-hidden="true" /> +233 20 111 2222</p>
                  </div>

                  <Button variant="outline" size="sm" asChild className="mt-4">
                    <Link href={`mailto:${member.full_name.toLowerCase().replace(/\s+/g, "")}@medhaven.edu`}>
                      Contact <ArrowRight data-icon="inline-end" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
