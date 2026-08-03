export const quickActions = [
  { label: "New Quiz", href: "/quizzes", icon: "ListChecks" },
  { label: "Review Cards", href: "/flashcards", icon: "BrainCircuit" },
  { label: "Open Library", href: "/library", icon: "Library" },
  { label: "Watch Lectures", href: "/lectures", icon: "Clapperboard" },
  { label: "Timetable", href: "/timetable", icon: "CalendarDays" },
  { label: "Marketplace", href: "/marketplace", icon: "Store" },
] as const

export const announcements = [
  {
    id: "a1",
    title: "Anatomy spot test rescheduled",
    body: "The spot test originally planned for Friday has been moved to Monday at 10:00 in Hall B.",
    time: "2h ago",
    tag: "Academics",
  },
  {
    id: "a2",
    title: "New clinical posting rota published",
    body: "The rotation schedule for the next four weeks is now available under Clinical Posting Guides.",
    time: "5h ago",
    tag: "Clinical",
  },
  {
    id: "a3",
    title: "Library maintenance window",
    body: "The Smart Library will be briefly unavailable Saturday 2:00–2:30 AM for scheduled maintenance.",
    time: "1d ago",
    tag: "System",
  },
] as const

export const todayTimetable = [
  { id: "t1", time: "08:00", title: "Pharmacology Lecture", room: "Hall A", color: "primary" },
  { id: "t2", time: "10:00", title: "Pathology Tutorial", room: "Lab 3", color: "secondary" },
  { id: "t3", time: "12:00", title: "Clinical Skills Lab", room: "Skills Centre", color: "accent" },
  { id: "t4", time: "14:00", title: "Community Medicine", room: "Hall C", color: "primary" },
  { id: "t5", time: "16:00", title: "Self-study block", room: "Library", color: "muted" },
] as const

export const continueReading = [
  { id: "r1", title: "Principles of Pharmacokinetics", type: "Material", progress: 72, href: "/materials" },
  { id: "r2", title: "Cardiac Cycle — Lecture 04", type: "Video", progress: 45, href: "/lectures" },
  { id: "r3", title: "Inflammation & Repair — Deck", type: "Flashcards", progress: 88, href: "/flashcards" },
] as const

export const recentMaterials = [
  { id: "m1", title: "Antibiotic Classification Chart", type: "PDF", size: "1.2 MB", time: "Added today", href: "/materials" },
  { id: "m2", title: "Pathology — Neoplasia Notes", type: "PDF", size: "3.4 MB", time: "Added today", href: "/materials" },
  { id: "m3", title: "Physiology MCQ Bank 2026", type: "Past Questions", size: "860 KB", time: "Yesterday", href: "/past-questions" },
  { id: "m4", title: "Clinical Skills Checklist", type: "Guide", size: "420 KB", time: "Yesterday", href: "/clinical-guides" },
] as const

export const aiAssistantPreview = {
  greeting: "Ask MedHaven AI anything about your coursework.",
  suggestions: [
    "Explain first-pass metabolism",
    "Generate 5 MCQs on inflammation",
    "Summarize the cardiac cycle",
    "What's on today's timetable?",
  ],
}

export const activityTimeline = [
  { id: "ac1", title: "Completed Pharmacology Quiz", detail: "Scored 86% · 24 questions", time: "Today, 09:20", icon: "ListChecks" },
  { id: "ac2", title: "Reviewed Inflammation deck", detail: "18 cards · 12 min", time: "Today, 08:05", icon: "BrainCircuit" },
  { id: "ac3", title: "Watched Cardiac Cycle lecture", detail: "Lecture 04 · 42 min", time: "Yesterday, 19:40", icon: "Clapperboard" },
  { id: "ac4", title: "Downloaded Antibiotic chart", detail: "From Study Materials", time: "Yesterday, 14:10", icon: "Download" },
  { id: "ac5", title: "Joined Pathology tutorial", detail: "Group B · 10:00", time: "2 days ago", icon: "GraduationCap" },
] as const

export const upcomingTutorials = [
  { id: "u1", title: "Pathology — Neoplasia", tutor: "Dr. Mensah", time: "Tomorrow · 10:00", seats: "6 / 12 left", subject: "Pathology" },
  { id: "u2", title: "Pharmacology Drug Reactions", tutor: "Dr. Adeyemi", time: "Thu · 14:00", seats: "3 / 15 left", subject: "Pharmacology" },
  { id: "u3", title: "Clinical Skills Refresher", tutor: "Prof. Boateng", time: "Fri · 09:00", seats: "9 / 20 left", subject: "Clinical" },
] as const

export const studyAnalytics = {
  weeklyHours: 23.5,
  weeklyGoal: 30,
  weeklyChange: "+3.2h",
  quizzesTaken: 18,
  quizAccuracy: 84,
  cardsReviewed: 142,
  materialsOpened: 27,
  weeklyData: [12, 18, 9, 22, 16, 28, 24],
  weeklyLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
}

export const progressWidgets = [
  { id: "p1", label: "Pharmacology", value: 78, color: "primary" },
  { id: "p2", label: "Pathology", value: 64, color: "secondary" },
  { id: "p3", label: "Physiology", value: 91, color: "accent" },
  { id: "p4", label: "Anatomy", value: 55, color: "warning" },
] as const
