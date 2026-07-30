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

export const adminUsers = [
  { id: "au1", name: "Amara Okafor", role: "Student", level: "MBBS 400", status: "Active", initials: "AO" },
  { id: "au2", name: "Kwame Asante", role: "Student", level: "MBBS 300", status: "Active", initials: "KA" },
  { id: "au3", name: "Dr. Ama Mensah", role: "Staff", level: "Pathology", status: "Active", initials: "AM" },
  { id: "au4", name: "Fatima Bello", role: "Student", level: "MBBS 500", status: "Suspended", initials: "FB" },
  { id: "au5", name: "Prof. Kofi Boateng", role: "Staff", level: "Physiology", status: "Active", initials: "KB" },
] as const

export const adminReports = [
  { id: "ar1", title: "Pharmacology quiz error report", reporter: "Amara Okafor", status: "Open", time: "2h ago" },
  { id: "ar2", title: "Broken lecture video link", reporter: "Kwame Asante", status: "In review", time: "5h ago" },
  { id: "ar3", title: "Marketplace listing dispute", reporter: "Fatima Bello", status: "Open", time: "1d ago" },
  { id: "ar4", title: "Timetable conflict — Anatomy", reporter: "Chinedu Eze", status: "Resolved", time: "2d ago" },
] as const
