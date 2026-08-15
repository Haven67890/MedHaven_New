import type { LucideIcon } from "lucide-react"

import { LayoutDashboard, Library, FileQuestionMark as FileQuestion, FileText, Clapperboard, BrainCircuit, ListChecks, CalendarDays, TrendingUp, Store, Stethoscope, GraduationCap, Users, Bell, CircleUser as UserCircle, Settings, ShieldCheck, Heart } from "lucide-react"

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  description: string
}

export const primaryNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, description: "Your study overview" },
  { label: "Smart Library", href: "/library", icon: Library, description: "Browse the digital library" },
  { label: "Past Questions", href: "/past-questions", icon: FileQuestion, description: "Practice with past papers" },
  { label: "Study Materials", href: "/materials", icon: FileText, description: "Notes and handouts" },
  { label: "Lecture Videos", href: "/lectures", icon: Clapperboard, description: "Recorded lectures" },
  { label: "Flashcards", href: "/flashcards", icon: BrainCircuit, description: "Active recall decks" },
  { label: "AI Quizzes", href: "/quizzes", icon: ListChecks, description: "Adaptive practice" },
  { label: "Timetable", href: "/timetable", icon: CalendarDays, description: "Your weekly schedule" },
  { label: "Progress Tracker", href: "/progress", icon: TrendingUp, description: "Track your goals" },
]

export const communityNav: NavItem[] = [
  { label: "Marketplace", href: "/marketplace", icon: Store, description: "Buy and sell materials" },
  { label: "Clinical Posting Guides", href: "/clinical-guides", icon: Stethoscope, description: "Posting references" },
  { label: "Tutorials", href: "/tutorials", icon: GraduationCap, description: "Group and peer sessions" },
  { label: "Staff Directory", href: "/directory", icon: Users, description: "Find lecturers and staff" },
  { label: "Donate", href: "/donate", icon: Heart, description: "Support MedHaven" },
]

export const accountNav: NavItem[] = [
  { label: "Notifications", href: "/notifications", icon: Bell, description: "Recent updates" },
  { label: "Profile", href: "/profile", icon: UserCircle, description: "Your account details" },
  { label: "Settings", href: "/settings", icon: Settings, description: "Preferences" },
]

export const adminNav: NavItem[] = [
  { label: "Admin Dashboard", href: "/admin", icon: ShieldCheck, description: "Platform administration" },
]

export const allNav: NavItem[] = [...primaryNav, ...communityNav, ...accountNav, ...adminNav]
