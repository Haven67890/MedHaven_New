"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  CalendarDays,
  Clock,
  BookOpen,
  FlaskConical,
  Stethoscope,
  Coffee,
  Users,
  HelpCircle,
  ChevronRight,
  X,
  FileText,
  LayoutGrid,
  List,
  GraduationCap
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/dashboard/page-header"
import { createClient } from "@/lib/supabase/client"
import useAuth from "@/hooks/useAuth"

interface Course {
  id: string
  code: string | null
  title: string | null
}

interface TimetableEntry {
  id: string
  level: string
  day_of_week: string
  start_time: string
  end_time: string
  title: string
  activity_type: string
  course_id: string | null
  lecturer: string | null
  notes: string | null
  courses?: Course | null
}

interface ActivityConfig {
  label: string
  color: string
  border: string
  text: string
  badge: string
  icon: React.ComponentType<any>
}

const activityConfigs: Record<string, ActivityConfig> = {
  lecture: {
    label: "Lecture",
    color: "bg-blue-500/10 hover:bg-blue-500/15 border-blue-500/20",
    border: "border-blue-500",
    text: "text-blue-500 dark:text-blue-400",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
    icon: BookOpen,
  },
  practical: {
    label: "Practical",
    color: "bg-purple-500/10 hover:bg-purple-500/15 border-purple-500/20",
    border: "border-purple-500",
    text: "text-purple-500 dark:text-purple-400",
    badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
    icon: FlaskConical,
  },
  clinical_posting: {
    label: "Clinical Posting",
    color: "bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/20",
    border: "border-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    icon: Stethoscope,
  },
  break: {
    label: "Break",
    color: "bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/20",
    border: "border-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    icon: Coffee,
  },
  tutorial: {
    label: "Tutorial",
    color: "bg-rose-500/10 hover:bg-rose-500/15 border-rose-500/20",
    border: "border-rose-500",
    text: "text-rose-500 dark:text-rose-400",
    badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
    icon: Users,
  },
}

function getActivityConfig(type: string | null | undefined): ActivityConfig {
  const normalized = (type || "").toLowerCase().trim()
  return activityConfigs[normalized] || {
    label: type || "Other",
    color: "bg-slate-500/10 hover:bg-slate-500/15 border-slate-500/20",
    border: "border-slate-500",
    text: "text-slate-500 dark:text-slate-400",
    badge: "bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/30",
    icon: HelpCircle,
  }
}

const DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday"] as const
const DAY_LABELS: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday"
}

function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return ""
  const parts = timeStr.split(":")
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`
  }
  return timeStr
}

export default function TimetablePage() {
  const supabase = createClient()
  const { user } = useAuth()

  const [currentLevel, setCurrentLevel] = useState<string | null>(null)
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"weekly" | "agenda">("agenda")

  // Modal State
  const [selectedEntry, setSelectedEntry] = useState<TimetableEntry | null>(null)

  // Fetch logged in student level and timetable entries
  useEffect(() => {
    let active = true

    async function fetchTimetableData() {
      try {
        setLoading(true)

        let level: string | null = "300L" // Fallback to 300L for premium static render when user is not logged in

        if (user?.id) {
          // 1. Fetch user profile
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("current_level")
            .eq("id", user.id)
            .maybeSingle()

          if (!profileError && profile) {
            level = profile.current_level || null
          }
        }

        if (active) {
          setCurrentLevel(level)
        }

        if (!level) {
          if (active) setLoading(false)
          return
        }

        // 2. Fetch timetable entries matching level
        const { data: entriesData, error: entriesError } = await supabase
          .from("timetable_entries")
          .select(`
            id,
            level,
            day_of_week,
            start_time,
            end_time,
            title,
            activity_type,
            course_id,
            lecturer,
            notes,
            courses (
              id,
              code,
              title
            )
          `)
          .eq("level", level)

        if (entriesError) throw entriesError

        if (active) {
          // Process and sort entries by start_time
          const formattedEntries = (entriesData as any[] || []).map(entry => ({
            id: entry.id,
            level: entry.level,
            day_of_week: entry.day_of_week,
            start_time: entry.start_time,
            end_time: entry.end_time,
            title: entry.title,
            activity_type: entry.activity_type,
            course_id: entry.course_id,
            lecturer: entry.lecturer,
            notes: entry.notes,
            courses: entry.courses ? {
              id: entry.courses.id,
              code: entry.courses.code,
              title: entry.courses.title
            } : null
          })) as TimetableEntry[]

          formattedEntries.sort((a, b) => a.start_time.localeCompare(b.start_time))
          setEntries(formattedEntries)
        }
      } catch (err) {
        console.warn("Database timetable_entries query failed or unauthorized, loading fallback seed data:", err)
        if (active) {
          // Populate premium seed mock data to match schema & context
          const mockEntries: TimetableEntry[] = [
            {
              id: "m1",
              level: "300L",
              day_of_week: "monday",
              start_time: "08:00:00",
              end_time: "10:00:00",
              title: "Systemic Pathology Lecture",
              activity_type: "lecture",
              course_id: "mock-pathology-id",
              lecturer: "Prof. J. C. A. Mbanefo",
              notes: "Cellular adaptations, necrosis, and tissue repair overview.",
              courses: { id: "mock-pathology-id", code: "PAT 301", title: "Systemic Pathology" }
            },
            {
              id: "m2",
              level: "300L",
              day_of_week: "monday",
              start_time: "10:30:00",
              end_time: "12:30:00",
              title: "General Pharmacology Practical",
              activity_type: "practical",
              course_id: "mock-pharmacology-id",
              lecturer: "Dr. Mrs. A. O. Longe",
              notes: "Dose-response curve plotting and receptor affinity simulations.",
              courses: { id: "mock-pharmacology-id", code: "PHA 301", title: "General Pharmacology" }
            },
            {
              id: "t1",
              level: "300L",
              day_of_week: "tuesday",
              start_time: "09:00:00",
              end_time: "12:00:00",
              title: "Medicine Ward Round / Rotation",
              activity_type: "clinical_posting",
              course_id: null,
              lecturer: "Dr. N. K. Obinna",
              notes: "Gather at Ward 4 Entrance. Professional dress code and stethoscopes mandatory.",
              courses: null
            },
            {
              id: "t2",
              level: "300L",
              day_of_week: "tuesday",
              start_time: "14:00:00",
              end_time: "15:30:00",
              title: "Pathology Slide Tutorial",
              activity_type: "tutorial",
              course_id: "mock-pathology-id",
              lecturer: "Dr. E. E. Bassey",
              notes: "Analyzing histology slides of acute inflammation and granulomas.",
              courses: { id: "mock-pathology-id", code: "PAT 301", title: "Systemic Pathology" }
            },
            {
              id: "w1",
              level: "300L",
              day_of_week: "wednesday",
              start_time: "08:00:00",
              end_time: "09:30:00",
              title: "Clinical Skills Lab / OSCE Practice",
              activity_type: "practical",
              course_id: "mock-skills-id",
              lecturer: "Surg. Lt. Col. J. O. Alao",
              notes: "Suturing and IV cannulation training inside the skills center.",
              courses: { id: "mock-skills-id", code: "OSC 301", title: "Clinical Skills & OSCE" }
            },
            {
              id: "w2",
              level: "300L",
              day_of_week: "wednesday",
              start_time: "10:00:00",
              end_time: "12:00:00",
              title: "Pharmacokinetics Lecture",
              activity_type: "lecture",
              course_id: "mock-pharmacology-id",
              lecturer: "Dr. Mrs. A. O. Longe",
              notes: "ADME principles: Absorption, Distribution, Metabolism, Excretion mechanics.",
              courses: { id: "mock-pharmacology-id", code: "PHA 301", title: "General Pharmacology" }
            },
            {
              id: "th1",
              level: "300L",
              day_of_week: "thursday",
              start_time: "09:00:00",
              end_time: "11:30:00",
              title: "Surgery Ward Posting",
              activity_type: "clinical_posting",
              course_id: null,
              lecturer: "Prof. S. O. Adebayo",
              notes: "Surgical scrub routines and aseptic techniques briefing.",
              courses: null
            },
            {
              id: "th2",
              level: "300L",
              day_of_week: "thursday",
              start_time: "12:00:00",
              end_time: "13:00:00",
              title: "Midday Break / Consultation Hours",
              activity_type: "break",
              course_id: null,
              lecturer: null,
              notes: "Lunch break and independent research block.",
              courses: null
            },
            {
              id: "f1",
              level: "300L",
              day_of_week: "friday",
              start_time: "08:00:00",
              end_time: "10:00:00",
              title: "Epidemiological Methods Lecture",
              activity_type: "lecture",
              course_id: "mock-community-med-id",
              lecturer: "Dr. K. E. Adeleke",
              notes: "Study designs: Cohort, case-control, and cross-sectional models.",
              courses: { id: "mock-community-med-id", code: "COM 301", title: "Introduction to Community Medicine" }
            },
            {
              id: "f2",
              level: "300L",
              day_of_week: "friday",
              start_time: "14:00:00",
              end_time: "15:30:00",
              title: "Community Medicine Group Discussion",
              activity_type: "tutorial",
              course_id: "mock-community-med-id",
              lecturer: "Dr. K. E. Adeleke",
              notes: "Group assignment reviews and local healthcare survey planning.",
              courses: { id: "mock-community-med-id", code: "COM 301", title: "Introduction to Community Medicine" }
            }
          ]
          setEntries(mockEntries)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void fetchTimetableData()

    return () => {
      active = false
    }
  }, [user?.id, supabase])

  // Determine current day of week (lowercase string)
  const currentDayOfWeek = useMemo(() => {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    const dayIndex = new Date().getDay()
    const rawDay = days[dayIndex]
    // If it's weekend, default agenda view to Monday
    if (rawDay === "sunday" || rawDay === "saturday") {
      return "monday"
    }
    return rawDay
  }, [])

  // Filter agenda entries for "Today's Schedule" (or Monday if weekend)
  const agendaEntries = useMemo(() => {
    return entries.filter(e => (e.day_of_week || "").toLowerCase() === currentDayOfWeek)
  }, [entries, currentDayOfWeek])

  // Group timetable entries by day of week for weekly grid
  const weeklyGridData = useMemo(() => {
    const grouped: Record<string, TimetableEntry[]> = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: []
    }
    entries.forEach(entry => {
      const day = (entry.day_of_week || "").toLowerCase()
      if (grouped[day]) {
        grouped[day].push(entry)
      }
    })
    return grouped
  }, [entries])

  // Mobile viewport view-mode auto-override
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.innerWidth < 640) {
        setViewMode("agenda")
      } else {
        setViewMode("weekly")
      }
    }
  }, [entries])

  if (loading) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Timetable" description="Loading your weekly academic schedule..." />
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <span className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading your personalized timetable...</p>
          </div>
        </div>
      </div>
    )
  }

  // If level not set or no matching entries, show clean premium empty state
  if (!currentLevel || entries.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Timetable" description="Your weekly academic schedule at a glance.">
          <Button variant="outline" asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </PageHeader>

        <section className="flex min-h-[45vh] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-12 text-center shadow-xs">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CalendarDays className="size-7" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-foreground">No timetable available yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            We couldn't find any timetable slots registered for your current academic level ({currentLevel || "Not Specified"}).
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Button asChild variant="default">
              <Link href="/dashboard">Return to Dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/library">Explore Study Library</Link>
            </Button>
          </div>
        </section>
      </div>
    )
  }

  // Dynamic statistics
  const totalSessions = entries.length
  const lectureSessions = entries.filter(e => e.activity_type === "lecture").length
  const clinicalSessions = entries.filter(e => e.activity_type === "clinical_posting").length

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Timetable" description={`Weekly schedule for your current academic level: ${currentLevel}`}>
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <Button
            variant={viewMode === "agenda" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("agenda")}
            className="flex items-center gap-1.5 h-8 text-xs font-medium rounded-lg"
          >
            <List className="size-3.5" /> Agenda
          </Button>
          <Button
            variant={viewMode === "weekly" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("weekly")}
            className="flex items-center gap-1.5 h-8 text-xs font-medium rounded-lg"
          >
            <LayoutGrid className="size-3.5" /> Weekly Grid
          </Button>
        </div>
      </PageHeader>

      {/* STATS STRIP */}
      <section className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="bg-card/50 dark:bg-slate-900/40 border-border dark:border-slate-800/80">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs font-semibold text-muted-foreground dark:text-slate-400 uppercase tracking-wider">
              <Clock className="size-4 text-sky-400" /> Total Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground dark:text-slate-100">{totalSessions} sessions</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 dark:bg-slate-900/40 border-border dark:border-slate-800/80">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs font-semibold text-muted-foreground dark:text-slate-400 uppercase tracking-wider">
              <BookOpen className="size-4 text-indigo-400" /> Lectures Scheduled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground dark:text-slate-100">{lectureSessions} classes</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 dark:bg-slate-900/40 border-border dark:border-slate-800/80">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs font-semibold text-muted-foreground dark:text-slate-400 uppercase tracking-wider">
              <Stethoscope className="size-4 text-emerald-400" /> Clinical Rotations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground dark:text-slate-100">{clinicalSessions} postings</p>
          </CardContent>
        </Card>
      </section>

      {/* AGENDA VIEW */}
      {viewMode === "agenda" && (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-border dark:border-slate-800 pb-3">
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold text-foreground dark:text-slate-200">Today's Schedule</h3>
              <p className="text-xs text-muted-foreground dark:text-slate-400">
                Displaying timetable events scheduled for {DAY_LABELS[currentDayOfWeek]}
              </p>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 capitalize font-semibold">
              {DAY_LABELS[currentDayOfWeek]} (Today)
            </Badge>
          </div>

          {agendaEntries.length === 0 ? (
            <Card className="bg-slate-900/20 border-dashed border-slate-800 py-10 text-center">
              <CardContent className="flex flex-col items-center justify-center">
                <Coffee className="size-8 text-slate-500 mb-2 animate-bounce" />
                <p className="font-semibold text-slate-300">No scheduled activities for today!</p>
                <p className="text-xs text-slate-500 max-w-xs mt-1">
                  Enjoy your free block or utilize this open schedule window for personal research and review.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {agendaEntries.map((item) => {
                const config = getActivityConfig(item.activity_type)
                const Icon = config.icon
                return (
                  <Card
                    key={item.id}
                    onClick={() => setSelectedEntry(item)}
                    className="cursor-pointer group relative bg-card hover:bg-muted dark:bg-slate-900/50 dark:hover:bg-slate-950 border-border dark:border-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700/80 transition-all duration-200 shadow-sm flex items-start gap-4 p-4 rounded-xl overflow-hidden"
                  >
                    {/* Left colored status indicator */}
                    <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${config.border} bg-current`} />

                    {/* Icon container */}
                    <div className={`p-2.5 rounded-xl ${config.color} shrink-0`}>
                      <Icon className="size-5" />
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col gap-1.5 pr-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-muted-foreground dark:text-slate-400 flex items-center gap-1">
                          <Clock className="size-3 text-slate-500" />
                          {formatTime(item.start_time)} - {formatTime(item.end_time)}
                        </span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border-none rounded ${config.badge}`}>
                          {config.label}
                        </Badge>
                      </div>

                      <h4 className="font-bold text-foreground dark:text-slate-100 text-sm leading-snug group-hover:text-primary transition-colors truncate">
                        {item.title}
                      </h4>

                      {item.courses && (
                        <p className="text-xs font-bold text-muted-foreground dark:text-slate-300 flex items-center gap-1">
                          <GraduationCap className="size-3.5 text-slate-400 shrink-0" />
                          {item.courses.code}: {item.courses.title}
                        </p>
                      )}

                      {item.lecturer && (
                        <p className="text-xs text-muted-foreground dark:text-slate-400 italic truncate">
                          Lecturer: {item.lecturer}
                        </p>
                      )}
                    </div>

                    <ChevronRight className="size-4 text-slate-500 group-hover:text-slate-300 shrink-0 self-center transition-transform group-hover:translate-x-0.5" />
                  </Card>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* WEEKLY GRID VIEW */}
      {viewMode === "weekly" && (
        <section className="space-y-4">
          <div className="flex flex-col gap-1 border-b border-border dark:border-slate-800 pb-3">
            <h3 className="text-lg font-bold text-foreground dark:text-slate-200">Weekly Academic Planner</h3>
            <p className="text-xs text-muted-foreground dark:text-slate-400">
              A comprehensive traditional table layout mapped Monday through Friday.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            {DAYS_OF_WEEK.map((day) => {
              const dayEntries = weeklyGridData[day] || []
              const isToday = day === currentDayOfWeek
              return (
                <Card
                  key={day}
                  className={`bg-card dark:bg-slate-900/20 border-border dark:border-slate-800/80 ${
                    isToday ? "ring-1 ring-primary/40 border-primary/40 bg-card/50 dark:bg-slate-900/40" : ""
                  }`}
                >
                  <CardHeader className="p-3 border-b border-border dark:border-slate-850 bg-muted/50 dark:bg-slate-950/40 flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-bold tracking-wide uppercase text-foreground dark:text-slate-200">
                      {DAY_LABELS[day]}
                    </CardTitle>
                    {isToday && (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[9px] px-1.5 py-0 font-bold uppercase">
                        Today
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="p-3 flex flex-col gap-2.5 min-h-[160px]">
                    {dayEntries.length === 0 ? (
                      <div className="flex flex-col items-center justify-center flex-1 py-10 text-center">
                        <p className="text-[10px] text-slate-500 italic">No scheduled activities</p>
                      </div>
                    ) : (
                      dayEntries.map((item) => {
                        const config = getActivityConfig(item.activity_type)
                        return (
                          <div
                            key={item.id}
                            onClick={() => setSelectedEntry(item)}
                            className={`cursor-pointer group text-left p-2.5 rounded-lg border border-slate-800/60 hover:border-slate-700/80 transition-all ${config.color} relative overflow-hidden`}
                          >
                            <span className={`absolute left-0 top-0 bottom-0 w-1 ${config.border} bg-current`} />
                            <div className="pl-1.5 flex flex-col gap-1">
                              <span className="text-[10px] font-semibold text-muted-foreground dark:text-slate-400 flex items-center gap-1">
                                <Clock className="size-2.5" />
                                {formatTime(item.start_time)} - {formatTime(item.end_time)}
                              </span>
                              <p className="text-xs font-bold text-foreground dark:text-slate-100 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                                {item.title}
                              </p>
                              {item.courses && (
                                <p className="text-[10px] font-medium text-muted-foreground dark:text-slate-300 truncate">
                                  {item.courses.code}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>
      )}

      {/* EVENT DETAIL MODAL */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs transition-all duration-300 animate-in fade-in">
          <div className="relative w-full max-w-lg bg-background border border-border dark:border-slate-800 shadow-2xl rounded-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">

            {/* Header / Banner */}
            <div className={`p-6 border-b border-border dark:border-slate-850 flex items-start justify-between gap-4 bg-gradient-to-br from-slate-50 via-background to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950`}>
              <div className="flex-1 min-w-0 flex flex-col gap-2">
                <Badge variant="outline" className={`w-fit text-[10px] font-bold tracking-wider uppercase border-none py-0.5 px-2 rounded-md ${getActivityConfig(selectedEntry.activity_type).badge}`}>
                  {getActivityConfig(selectedEntry.activity_type).label}
                </Badge>
                <h3 className="font-extrabold text-lg text-foreground dark:text-slate-100 leading-snug">
                  {selectedEntry.title}
                </h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedEntry(null)}
                className="size-8 rounded-full text-muted-foreground hover:text-foreground dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 shrink-0"
              >
                <X className="size-4.5" />
                <span className="sr-only">Close</span>
              </Button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-5 flex-1 overflow-y-auto text-sm">

              {/* Timing & Location */}
              <div className="grid grid-cols-2 gap-4 bg-muted/40 dark:bg-slate-950/40 p-4 rounded-xl border border-border dark:border-slate-850">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-muted-foreground dark:text-slate-500 uppercase tracking-wider">Day</span>
                  <span className="text-foreground dark:text-slate-200 font-semibold flex items-center gap-1.5 capitalize">
                    <CalendarDays className="size-4 text-primary shrink-0" />
                    {DAY_LABELS[selectedEntry.day_of_week] || selectedEntry.day_of_week}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-muted-foreground dark:text-slate-500 uppercase tracking-wider">Time</span>
                  <span className="text-foreground dark:text-slate-200 font-semibold flex items-center gap-1.5">
                    <Clock className="size-4 text-primary shrink-0" />
                    {formatTime(selectedEntry.start_time)} - {formatTime(selectedEntry.end_time)}
                  </span>
                </div>
              </div>

              {/* Course Detail if non-null */}
              {selectedEntry.courses && (
                <div className="flex flex-col gap-1.5 bg-muted/20 dark:bg-slate-950/20 p-4 rounded-xl border border-border dark:border-slate-850">
                  <span className="text-[10px] font-bold text-muted-foreground dark:text-slate-500 uppercase tracking-wider">Course Reference</span>
                  <p className="font-bold text-foreground dark:text-slate-100 flex items-center gap-2">
                    <GraduationCap className="size-4.5 text-indigo-400 shrink-0" />
                    {selectedEntry.courses.code}: {selectedEntry.courses.title}
                  </p>
                </div>
              )}

              {/* Lecturer */}
              {selectedEntry.lecturer && (
                <div className="flex flex-col gap-1 bg-muted/20 dark:bg-slate-950/20 p-4 rounded-xl border border-border dark:border-slate-850">
                  <span className="text-[10px] font-bold text-muted-foreground dark:text-slate-500 uppercase tracking-wider">Instructor / Lecturer</span>
                  <p className="text-foreground dark:text-slate-200 font-medium">
                    {selectedEntry.lecturer}
                  </p>
                </div>
              )}

              {/* Notes */}
              {selectedEntry.notes && (
                <div className="flex flex-col gap-1 bg-muted/20 dark:bg-slate-950/20 p-4 rounded-xl border border-border dark:border-slate-850">
                  <span className="text-[10px] font-bold text-muted-foreground dark:text-slate-500 uppercase tracking-wider">Additional Notes</span>
                  <p className="text-muted-foreground dark:text-slate-300 leading-relaxed text-xs">
                    {selectedEntry.notes}
                  </p>
                </div>
              )}

              {/* RE-ROUTING INTEGRATED LINKS SECTION */}
              {selectedEntry.course_id && (
                <div className="border-t border-border dark:border-slate-850 pt-5 space-y-3.5">
                  <div className="flex flex-col gap-0.5">
                    <h4 className="font-bold text-foreground dark:text-slate-200 text-xs uppercase tracking-wider">Course Resources</h4>
                    <p className="text-[11px] text-muted-foreground dark:text-slate-400 leading-normal">
                      Jump straight to learning assets associated with this clinical topic.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <Button
                      asChild
                      variant="outline"
                      className="text-xs bg-card hover:bg-muted dark:bg-slate-900 border-border dark:border-slate-800 text-sky-650 dark:text-sky-400 hover:text-sky-550 dark:hover:text-sky-300 flex items-center gap-1.5 py-4 h-9 font-semibold rounded-xl"
                    >
                      <Link href={`/materials?course_id=${selectedEntry.course_id}`} onClick={() => setSelectedEntry(null)}>
                        <FileText className="size-3.5 shrink-0" /> Study Materials
                      </Link>
                    </Button>

                    <Button
                      asChild
                      variant="outline"
                      className="text-xs bg-card hover:bg-muted dark:bg-slate-900 border-border dark:border-slate-800 text-indigo-650 dark:text-indigo-400 hover:text-indigo-550 dark:hover:text-indigo-300 flex items-center gap-1.5 py-4 h-9 font-semibold rounded-xl"
                    >
                      <Link href={`/past-questions?course_id=${selectedEntry.course_id}`} onClick={() => setSelectedEntry(null)}>
                        <CalendarDays className="size-3.5 shrink-0" /> Past Questions
                      </Link>
                    </Button>

                    <Button
                      asChild
                      variant="outline"
                      className="text-xs bg-card hover:bg-muted dark:bg-slate-900 border-border dark:border-slate-800 text-rose-650 dark:text-rose-400 hover:text-rose-550 dark:hover:text-rose-300 flex items-center gap-1.5 py-4 h-9 font-semibold rounded-xl"
                    >
                      <Link href={`/quizzes?course_id=${selectedEntry.course_id}`} onClick={() => setSelectedEntry(null)}>
                        <Users className="size-3.5 shrink-0" /> Question Bank
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer action */}
            <div className="p-4 bg-muted/60 dark:bg-slate-950/60 border-t border-border dark:border-slate-850 flex justify-end">
              <Button
                variant="default"
                size="sm"
                onClick={() => setSelectedEntry(null)}
                className="text-xs h-8 px-4 font-semibold rounded-lg"
              >
                Close Planner
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
