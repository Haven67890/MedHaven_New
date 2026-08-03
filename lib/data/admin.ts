export const adminStats = [
  { id: "as1", label: "Total students", value: "2,840", trend: "up", trendLabel: "+124 this month", icon: "Users" },
  { id: "as2", label: "Active today", value: "1,420", trend: "up", trendLabel: "+8% vs avg", icon: "Activity" },
  { id: "as3", label: "Materials published", value: "3,300", trend: "up", trendLabel: "+86 this week", icon: "FileText" },
  { id: "as4", label: "Pending reports", value: "7", trend: "down", trendLabel: "-2 vs last week", icon: "ClipboardList" },
] as const

export const adminWeekly = [
  { id: "aw1", label: "Mon", value: 980 },
  { id: "aw2", label: "Tue", value: 1120 },
  { id: "aw3", label: "Wed", value: 1420 },
  { id: "aw4", label: "Thu", value: 1180 },
  { id: "aw5", label: "Fri", value: 1340 },
  { id: "aw6", label: "Sat", value: 760 },
  { id: "aw7", label: "Sun", value: 620 },
] as const

export const adminDepartments = [
  { id: "ad1", name: "Pharmacology", students: 480, materials: 412, color: "primary" },
  { id: "ad2", name: "Pathology", students: 520, materials: 388, color: "secondary" },
  { id: "ad3", name: "Physiology", students: 460, materials: 356, color: "accent" },
  { id: "ad4", name: "Anatomy", students: 540, materials: 356, color: "primary" },
  { id: "ad5", name: "Community Medicine", students: 420, materials: 224, color: "secondary" },
  { id: "ad6", name: "Clinical Skills", students: 420, materials: 288, color: "accent" },
] as const

export const adminUsers: Array<{
  id: string
  name: string
  role: string
  level: string
  status: "Active" | "Suspended"
  initials: string
}> = []

export const adminReports: Array<{
  id: string
  title: string
  reporter: string
  status: "Open" | "In review" | "Resolved"
  time: string
}> = []
