import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Mail, MapPin, Phone, Search, Users } from "lucide-react"

import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { StatCard } from "@/components/dashboard/stat-card"

export const metadata: Metadata = {
  title: "Staff Directory",
  description: "Find lecturers and staff.",
}

const departments = [
  { id: "d1", name: "Pharmacology", count: 6 },
  { id: "d2", name: "Pathology", count: 8 },
  { id: "d3", name: "Physiology", count: 5 },
  { id: "d4", name: "Anatomy", count: 7 },
  { id: "d5", name: "Community Medicine", count: 4 },
  { id: "d6", name: "Clinical Skills", count: 6 },
] as const

const staff = [
  { id: "s1", name: "Prof. Kofi Boateng", role: "Professor of Physiology", department: "Physiology", initials: "KB", office: "Block A, Room 12", email: "kboateng@medhaven.edu", phone: "+233 20 111 2222" },
  { id: "s2", name: "Dr. Ama Mensah", role: "Senior Lecturer, Pathology", department: "Pathology", initials: "AM", office: "Block B, Room 08", email: "amensah@medhaven.edu", phone: "+233 20 333 4444" },
  { id: "s3", name: "Dr. Tunde Adeyemi", role: "Lecturer, Pharmacology", department: "Pharmacology", initials: "TA", office: "Block C, Room 04", email: "tadeyemi@medhaven.edu", phone: "+233 20 555 6666" },
  { id: "s4", name: "Dr. Nana Owusu", role: "Lecturer, Anatomy", department: "Anatomy", initials: "NO", office: "Block A, Room 20", email: "nowusu@medhaven.edu", phone: "+233 20 777 8888" },
  { id: "s5", name: "Dr. Akosua Larbi", role: "Lecturer, Community Medicine", department: "Community Medicine", initials: "AL", office: "Block D, Room 02", email: "alarbi@medhaven.edu", phone: "+233 20 999 0000" },
  { id: "s6", name: "Prof. Yaa Asantewa", role: "Head of Clinical Skills", department: "Clinical Skills", initials: "YA", office: "Skills Centre, Office 1", email: "yasantewa@medhaven.edu", phone: "+233 20 121 3434" },
] as const

export default function StaffDirectoryPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Staff Directory" description="Find and reach out to lecturers and academic staff.">
        <Button variant="outline" asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </PageHeader>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total staff" value="36" icon={Users} accent="primary" />
        <StatCard label="Departments" value="6" icon={Users} accent="secondary" />
        <StatCard label="Available today" value="22" icon={Users} accent="accent" />
      </section>

      <section>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input type="search" placeholder="Search staff by name or department…" className="pl-9" aria-label="Search staff directory" />
        </div>
      </section>

      <section>
        <SectionHeading title="Departments" description="Filter by department." />
        <div className="mt-4 flex flex-wrap gap-2">
          {departments.map((dept) => (
            <Badge key={dept.id} variant="outline" className="cursor-default px-3 py-1.5 text-sm">
              {dept.name}
              <span className="ml-1.5 text-muted-foreground">{dept.count}</span>
            </Badge>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading title="Staff members" description="Contact details and office locations." />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((member) => (
            <Card key={member.id} className="gap-3">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Avatar initials={member.initials} className="size-12 text-base" />
                  <div className="flex flex-col gap-0.5">
                    <CardTitle className="text-base">{member.name}</CardTitle>
                    <CardDescription>{member.role}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Badge variant="accent" className="w-fit">{member.department}</Badge>
                <p className="flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="size-3" aria-hidden="true" /> {member.office}</p>
                <p className="flex items-center gap-2 text-xs text-muted-foreground"><Mail className="size-3" aria-hidden="true" /> {member.email}</p>
                <p className="flex items-center gap-2 text-xs text-muted-foreground"><Phone className="size-3" aria-hidden="true" /> {member.phone}</p>
                <Button variant="outline" size="sm" asChild className="mt-2">
                  <Link href="/directory">Contact <ArrowRight data-icon="inline-end" /></Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
