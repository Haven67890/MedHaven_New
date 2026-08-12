"use client"

import { useEffect, useState, useTransition } from "react"
import { ShieldAlert, Users as UsersIcon, ShieldCheck, UserCheck, AlertTriangle, RefreshCw, Search, SlidersHorizontal, Edit2 } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/dashboard/page-header"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { createClient } from "@/lib/supabase/client"

type Profile = {
  id: string
  full_name: string | null
  email?: string | null
  role: string | null
  current_level: string | null
  department: string | null
  university_id: string | null
  faculty_id: string | null
  account_status: string | null
  suspended_reason: string | null
  suspended_until: string | null
  admin_permissions: Record<string, boolean> | null
}

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

export default function AdminDashboard() {
  const supabase = createClient()

  // Tabs: 'overview' | 'users'
  const [activeTab, setActiveTab] = useState<"overview" | "users">("overview")

  // Caller authorization info
  const [caller, setCaller] = useState<{
    id: string
    role: string
    isSuperAdmin: boolean
    hasUsersPermission: boolean
  } | null>(null)

  const [callerLoading, setCallerLoading] = useState(true)

  // Overview stats
  const [stats, setStats] = useState<{ totalStudents: number; totalAdmins: number } | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState("")

  // Users list, search, pagination, and filters
  const [users, setUsers] = useState<Profile[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState("")

  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [levelFilter, setLevelFilter] = useState("all")
  const [deptFilter, setDeptFilter] = useState("all")
  const [uniFilter, setUniFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Metadata for select options
  const [universities, setUniversities] = useState<University[]>([])
  const [faculties, setFaculties] = useState<Faculty[]>([])

  // Edit Sheet State
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState("")
  const [editSuccess, setEditSuccess] = useState("")

  // Editable fields state
  const [formName, setFormName] = useState("")
  const [formDepartment, setFormDepartment] = useState("")
  const [formLevel, setFormLevel] = useState("")
  const [formUniversity, setFormUniversity] = useState("")
  const [formFaculty, setFormFaculty] = useState("")
  const [formRole, setFormRole] = useState("")
  const [formStatus, setFormStatus] = useState("")
  const [formReason, setFormReason] = useState("")
  const [formUntil, setFormUntil] = useState("")
  const [formPermissions, setFormPermissions] = useState<Record<string, boolean>>({
    users: false,
    materials: false,
    marketplace: false,
  })

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Get current caller session/role info
  useEffect(() => {
    async function loadCaller() {
      try {
        setCallerLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setCallerLoading(false)
          return
        }

        const { data: profileData } = await supabase
          .from("profiles")
          .select("role, admin_permissions, is_admin")
          .eq("id", user.id)
          .maybeSingle()

        if (profileData) {
          const role = String(profileData.role || "").toLowerCase()
          const isSuperAdmin = role === "super_admin"
          const perms = (profileData.admin_permissions as Record<string, boolean>) || {}
          const hasUsersPermission = isSuperAdmin || perms.users === true

          setCaller({
            id: user.id,
            role,
            isSuperAdmin,
            hasUsersPermission,
          })
        }
      } catch (err) {
        console.error("Error loading caller profile details:", err)
      } finally {
        setCallerLoading(false)
      }
    }
    void loadCaller()
  }, [])

  // Load universities and faculties metadata
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [uniRes, facRes] = await Promise.all([
          supabase.from("universities").select("id, name, short_name"),
          supabase.from("faculties").select("id, name, university_id")
        ])
        if (uniRes.data) setUniversities(uniRes.data)
        if (facRes.data) setFaculties(facRes.data)
      } catch (err) {
        console.error("Error loading metadata directories:", err)
      }
    }
    void loadMetadata()
  }, [])

  // Fetch overview counts
  const fetchOverviewStats = async () => {
    setStatsLoading(true)
    setStatsError("")
    try {
      const res = await fetch("/api/admin/overview")
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to load stats")
      }
      setStats(data)
    } catch (err: any) {
      setStatsError(err.message || "An error occurred fetching overview stats.")
    } finally {
      setStatsLoading(false)
    }
  }

  // Fetch users list
  const fetchUsers = async () => {
    setUsersLoading(true)
    setUsersError("")
    try {
      const params = new URLSearchParams({
        query: debouncedSearch,
        role: roleFilter,
        level: levelFilter,
        department: deptFilter,
        university_id: uniFilter,
        page: String(currentPage),
        limit: String(itemsPerPage),
      })

      const res = await fetch(`/api/admin/users?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to load users")
      }
      setUsers(data.users || [])
      setTotalCount(data.count || 0)
    } catch (err: any) {
      setUsersError(err.message || "An error occurred loading users.")
    } finally {
      setUsersLoading(false)
    }
  }

  // Reload lists when active tab changes, or filters change
  useEffect(() => {
    if (activeTab === "overview") {
      void fetchOverviewStats()
    } else {
      void fetchUsers()
    }
  }, [activeTab, debouncedSearch, roleFilter, levelFilter, deptFilter, uniFilter, currentPage])

  // Open Edit User view & prefill values
  const handleEditClick = (userToEdit: Profile) => {
    setSelectedUser(userToEdit)
    setFormName(userToEdit.full_name || "")
    setFormDepartment(userToEdit.department || "")
    setFormLevel(userToEdit.current_level || "")
    setFormUniversity(userToEdit.university_id || "")
    setFormFaculty(userToEdit.faculty_id || "")
    setFormRole(userToEdit.role || "")
    setFormStatus(userToEdit.account_status || "active")
    setFormReason(userToEdit.suspended_reason || "")

    // Format ISO string to datetime-local friendly format (YYYY-MM-DDThh:mm)
    if (userToEdit.suspended_until) {
      try {
        const dateObj = new Date(userToEdit.suspended_until)
        const tzoffset = dateObj.getTimezoneOffset() * 60000
        const localISOTime = (new Date(dateObj.getTime() - tzoffset)).toISOString().slice(0, 16)
        setFormUntil(localISOTime)
      } catch {
        setFormUntil("")
      }
    } else {
      setFormUntil("")
    }

    const defaultPerms = { users: false, materials: false, marketplace: false }
    setFormPermissions({
      ...defaultPerms,
      ...(userToEdit.admin_permissions || {})
    })

    setEditError("")
    setEditSuccess("")
    setEditOpen(true)
  }

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    if ((formStatus === "suspended" || formStatus === "banned") && !formReason.trim()) {
      setEditError("A reason is strictly required when suspending or banning an account.")
      return
    }

    setEditLoading(true)
    setEditError("")
    setEditSuccess("")

    try {
      const payload: Record<string, any> = {
        userId: selectedUser.id,
        full_name: formName,
        department: formDepartment,
        current_level: formLevel,
        university_id: formUniversity,
        faculty_id: formFaculty,
        account_status: formStatus,
        suspended_reason: (formStatus === "suspended" || formStatus === "banned") ? formReason : null,
        suspended_until: (formUntil && (formStatus === "suspended" || formStatus === "banned")) ? new Date(formUntil).toISOString() : null,
      }

      if (caller?.isSuperAdmin) {
        payload.role = formRole
        payload.admin_permissions = formPermissions
      }

      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to save profile changes")
      }

      setEditSuccess("Account changes applied and logged successfully.")

      // Refresh current list and overview
      void fetchUsers()
      if (activeTab === "overview") void fetchOverviewStats()

      // Wait a bit then close
      setTimeout(() => {
        setEditOpen(false)
        setSelectedUser(null)
      }, 1000)
    } catch (err: any) {
      setEditError(err.message || "An unexpected error occurred while saving changes.")
    } finally {
      setEditLoading(false)
    }
  }

  if (callerLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Checking administration credentials...</p>
        </div>
      </div>
    )
  }

  if (!caller) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md border-destructive/20 bg-destructive/5 text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <ShieldAlert className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              We could not find an administrator profile for your current account session. Please verify your credentials or log in.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Platform Administration" description="Manage platform users, permissions, and monitor system activity.">
        <div className="flex items-center gap-2 border-b pb-1">
          <Button
            variant={activeTab === "overview" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </Button>
          <Button
            variant={activeTab === "users" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("users")}
          >
            Users
          </Button>
        </div>
      </PageHeader>

      {activeTab === "overview" && (
        <div className="flex flex-col gap-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Registered Students</CardTitle>
                <UsersIcon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="h-9 w-24 animate-pulse rounded bg-muted" />
                ) : statsError ? (
                  <span className="text-sm text-destructive font-semibold">Error loading</span>
                ) : (
                  <div className="text-3xl font-bold tracking-tight text-foreground">{stats?.totalStudents ?? 0}</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">Students enrolled in MedHaven</p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Admins & Moderators</CardTitle>
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="h-9 w-24 animate-pulse rounded bg-muted" />
                ) : statsError ? (
                  <span className="text-sm text-destructive font-semibold">Error loading</span>
                ) : (
                  <div className="text-3xl font-bold tracking-tight text-foreground">{stats?.totalAdmins ?? 0}</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">Privileged administrative staff</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Welcome to MedHaven Admin Workspace</CardTitle>
              <CardDescription>You are authenticated as a {caller.role.toUpperCase()}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This administrative console provides secure oversight of user directories, authorization parameters, and access status. Every single write and privilege adjustment triggers an automatic system-wide cryptographic logging sequence to ensure full audit traceability.
              </p>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex gap-3 items-start">
                <UserCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-foreground">Your Active Workspace Scope:</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-normal">
                    {caller.isSuperAdmin
                      ? "Super Administrator — You have implicit unrestricted rights over all profile scopes, role promotions, and platform permissions."
                      : caller.hasUsersPermission
                        ? "Administrator — You have user directory read and modification rights (excluding role assignments or administrative privilege changes)."
                        : "Moderator — Limited workspace access. You cannot perform user modifications unless explicit permissions are assigned."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "users" && (
        <div className="flex flex-col gap-6">
          {/* SEARCH & FILTERS PANEL */}
          <Card className="border-border">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Filter Directory</CardTitle>
                <CardDescription>Locate and filter platform users</CardDescription>
              </div>
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search name/email..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="all">All Roles</option>
                  <option value="student">Student</option>
                  <option value="tutor">Tutor</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              <div>
                <select
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="all">All Levels</option>
                  <option value="100L">100L</option>
                  <option value="200L">200L</option>
                  <option value="300L">300L</option>
                  <option value="400L">400L</option>
                  <option value="500L">500L</option>
                  <option value="600L">600L</option>
                </select>
              </div>

              <div>
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="all">All Departments</option>
                  <option value="Medicine & Surgery">Medicine & Surgery</option>
                  <option value="Nursing">Nursing</option>
                  <option value="Medical Laboratory Science">Medical Laboratory Science</option>
                  <option value="Physiology">Physiology</option>
                  <option value="Anatomy">Anatomy</option>
                </select>
              </div>

              <div>
                <select
                  value={uniFilter}
                  onChange={(e) => setUniFilter(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="all">All Universities</option>
                  {universities.map((uni) => (
                    <option key={uni.id} value={uni.id}>
                      {uni.short_name || uni.name}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* USER DIRECTORY TABLE */}
          <Card className="border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="p-4">Name / ID</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Level / Dept</th>
                      <th className="p-4">University</th>
                      <th className="p-4">Account Status</th>
                      {caller.hasUsersPermission && <th className="p-4 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm">
                    {usersLoading ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          <RefreshCw className="mx-auto h-5 w-5 animate-spin text-primary" />
                          <p className="mt-2">Fetching user directory...</p>
                        </td>
                      </tr>
                    ) : usersError ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-destructive font-medium">
                          {usersError}
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          No matching profiles found. Try altering your filters.
                        </td>
                      </tr>
                    ) : (
                      users.map((item) => {
                        const uni = universities.find(u => u.id === item.university_id)
                        const isSuspendedOrBanned = item.account_status === "suspended" || item.account_status === "banned"
                        return (
                          <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-4">
                              <div className="font-medium text-foreground">{item.full_name || "Scholar"}</div>
                              <div className="text-xs text-muted-foreground font-mono">{item.email || item.id}</div>
                            </td>
                            <td className="p-4 capitalize">
                              <Badge
                                variant={
                                  item.role === "super_admin"
                                    ? "default"
                                    : item.role === "admin"
                                      ? "secondary"
                                      : item.role === "moderator"
                                        ? "outline"
                                        : "muted"
                                }
                              >
                                {item.role || "Student"}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <div className="text-foreground">{item.current_level || "No Level"}</div>
                              <div className="text-xs text-muted-foreground">{item.department || "No Department"}</div>
                            </td>
                            <td className="p-4">
                              <span className="text-xs font-medium bg-muted px-2 py-1 rounded">
                                {uni ? (uni.short_name || uni.name) : "MedHaven Global"}
                              </span>
                            </td>
                            <td className="p-4">
                              <Badge
                                variant={
                                  item.account_status === "suspended"
                                    ? "warning"
                                    : item.account_status === "banned"
                                      ? "destructive"
                                      : "outline"
                                }
                              >
                                {item.account_status || "Active"}
                              </Badge>
                              {isSuspendedOrBanned && item.suspended_reason && (
                                <p className="text-[11px] text-destructive italic mt-0.5 max-w-[150px] truncate">
                                  &quot;{item.suspended_reason}&quot;
                                </p>
                              )}
                            </td>
                            {caller.hasUsersPermission && (
                              <td className="p-4 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditClick(item)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              </td>
                            )}
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION PANEL */}
              {totalCount > itemsPerPage && (
                <div className="flex items-center justify-between p-4 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} profiles
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1 || usersLoading}
                      onClick={() => setCurrentPage((c) => c - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage * itemsPerPage >= totalCount || usersLoading}
                      onClick={() => setCurrentPage((c) => c + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* SECURE USER EDIT DRAWER (SHEET) */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="right" className="sm:max-w-md overflow-y-auto w-full">
          <SheetHeader>
            <SheetTitle>Secure Account Manager</SheetTitle>
            <SheetDescription>
              Modify academic details, suspension status, and user privileges. Every transaction is authenticated and logged.
            </SheetDescription>
          </SheetHeader>

          {selectedUser && (
            <form onSubmit={handleEditSubmit} className="space-y-6 p-4">
              {/* ALERTS */}
              {editError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/15 p-3 text-sm text-destructive font-medium">
                  {editError}
                </div>
              )}
              {editSuccess && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-500 font-medium animate-pulse">
                  {editSuccess}
                </div>
              )}

              {/* READONLY DETAILS */}
              <div className="bg-muted/40 p-3 rounded-lg border text-xs space-y-1">
                <div><span className="font-semibold text-muted-foreground">User ID:</span> <span className="font-mono">{selectedUser.id}</span></div>
                {selectedUser.email && (
                  <div><span className="font-semibold text-muted-foreground">Primary Email:</span> <span className="font-mono">{selectedUser.email}</span></div>
                )}
              </div>

              {/* ACADEMIC PROFILE DETAILS */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">Academic Identity</h3>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="edit-name" className="text-xs font-medium text-foreground">Full Name</label>
                  <Input
                    id="edit-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="edit-dept" className="text-xs font-medium text-foreground">Department</label>
                  <select
                    id="edit-dept"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                  >
                    <option value="Medicine & Surgery">Medicine & Surgery</option>
                    <option value="Nursing">Nursing</option>
                    <option value="Medical Laboratory Science">Medical Laboratory Science</option>
                    <option value="Physiology">Physiology</option>
                    <option value="Anatomy">Anatomy</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="edit-level" className="text-xs font-medium text-foreground">Academic Level</label>
                  <select
                    id="edit-level"
                    value={formLevel}
                    onChange={(e) => setFormLevel(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                  >
                    <option value="100L">100L</option>
                    <option value="200L">200L</option>
                    <option value="300L">300L</option>
                    <option value="400L">400L</option>
                    <option value="500L">500L</option>
                    <option value="600L">600L</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="edit-uni" className="text-xs font-medium text-foreground">University</label>
                  <select
                    id="edit-uni"
                    value={formUniversity}
                    onChange={(e) => {
                      setFormUniversity(e.target.value)
                      setFormFaculty("") // reset faculty when uni changes
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">MedHaven Global Fallback</option>
                    {universities.map((uni) => (
                      <option key={uni.id} value={uni.id}>
                        {uni.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="edit-fac" className="text-xs font-medium text-foreground">Faculty</label>
                  <select
                    id="edit-fac"
                    value={formFaculty}
                    onChange={(e) => setFormFaculty(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={!formUniversity}
                  >
                    <option value="">No Faculty</option>
                    {faculties
                      .filter((f) => f.university_id === formUniversity)
                      .map((fac) => (
                        <option key={fac.id} value={fac.id}>
                          {fac.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* ACCOUNT GATEWAY / SUSPENSIONS */}
              <div className="space-y-4 pt-2 border-t">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-500" /> Account Status
                </h3>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="edit-status" className="text-xs font-medium text-foreground">Access Status</label>
                  <select
                    id="edit-status"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="active">Active (Full Access)</option>
                    <option value="suspended">Suspended (Temporary Lockout)</option>
                    <option value="banned">Banned (Permanent Lockout)</option>
                  </select>
                </div>

                {(formStatus === "suspended" || formStatus === "banned") && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="edit-reason" className="text-xs font-medium text-foreground">Reason for Lockout <span className="text-destructive">*</span></label>
                      <Input
                        id="edit-reason"
                        placeholder="e.g., Honor code infraction"
                        value={formReason}
                        onChange={(e) => setFormReason(e.target.value)}
                        required
                      />
                    </div>

                    {formStatus === "suspended" && (
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="edit-until" className="text-xs font-medium text-foreground">Suspended Until (Optional)</label>
                        <input
                          id="edit-until"
                          type="datetime-local"
                          value={formUntil}
                          onChange={(e) => setFormUntil(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* CRITICAL SUPER ADMIN GATEWAYS (ROLES & PERMISSIONS) */}
              {caller.isSuperAdmin && (
                <div className="space-y-4 pt-2 border-t">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Super Admin Security Parameters
                  </h3>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="edit-role" className="text-xs font-medium text-foreground">Assigned Role</label>
                    <select
                      id="edit-role"
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="student">Student</option>
                      <option value="tutor">Tutor</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </div>

                  {(formRole === "admin" || formRole === "moderator") && (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-foreground">Admin Scope Permissions</span>
                      <div className="space-y-2 pl-1">
                        <label className="flex items-center gap-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formPermissions.users === true}
                            onChange={(e) => setFormPermissions((p) => ({ ...p, users: e.target.checked }))}
                            className="rounded border-input text-primary focus:ring-primary size-4"
                          />
                          <span>Users & Authorizations Management</span>
                        </label>

                        <label className="flex items-center gap-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formPermissions.materials === true}
                            onChange={(e) => setFormPermissions((p) => ({ ...p, materials: e.target.checked }))}
                            className="rounded border-input text-primary focus:ring-primary size-4"
                          />
                          <span>Library Materials Management</span>
                        </label>

                        <label className="flex items-center gap-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formPermissions.marketplace === true}
                            onChange={(e) => setFormPermissions((p) => ({ ...p, marketplace: e.target.checked }))}
                            className="rounded border-input text-primary focus:ring-primary size-4"
                          />
                          <span>Marketplace Moderation Scope</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SAVE / FOOTER BUTTONS */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={editLoading}
                >
                  {editLoading ? "Writing changes..." : "Commit Authorization Changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditOpen(false)
                    setSelectedUser(null)
                  }}
                  disabled={editLoading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
