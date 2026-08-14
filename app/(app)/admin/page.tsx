"use client"

import { useEffect, useState, useTransition } from "react"
import { ShieldAlert, Users as UsersIcon, ShieldCheck, UserCheck, AlertTriangle, RefreshCw, Search, SlidersHorizontal, Edit2, Plus, Trash2, CheckCircle, Ban, Archive, ExternalLink, Sparkles, FileText, Upload, ChevronUp, ChevronDown, Stethoscope } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/dashboard/page-header"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { createClient } from "@/lib/supabase/client"
import type { Course, Material } from "@/components/dashboard/material-card"

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

function normalizeRole(value: unknown): string {
  if (typeof value !== "string") return ""
  return value.trim().toLowerCase()
}

export default function AdminDashboard() {
  const supabase = createClient()

  // Tabs: 'overview' | 'users' | 'materials' | 'staff' | 'guides' | 'tutorials'
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "materials" | "staff" | "guides" | "tutorials">("overview")

  // Caller authorization info
  const [caller, setCaller] = useState<{
    id: string
    role: string
    isSuperAdmin: boolean
    hasUsersPermission: boolean
    hasMaterialsPermission: boolean
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
  const [courses, setCourses] = useState<Course[]>([])

  // Edit User Sheet State
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState("")
  const [editSuccess, setEditSuccess] = useState("")

  // Editable fields state (User)
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

  // --- MATERIALS STATE ---
  const [materials, setMaterials] = useState<Material[]>([])
  const [materialsCount, setMaterialsCount] = useState(0)
  const [materialsLoading, setMaterialsLoading] = useState(false)
  const [materialsError, setMaterialsError] = useState("")

  const [materialSearch, setMaterialSearch] = useState("")
  const [materialDebouncedSearch, setMaterialDebouncedSearch] = useState("")
  const [materialCourseFilter, setMaterialCourseFilter] = useState("all")
  const [materialTypeFilter, setMaterialTypeFilter] = useState("all")
  const [materialTierFilter, setMaterialTierFilter] = useState("all")
  const [materialStatusFilter, setMaterialStatusFilter] = useState("all")
  const [materialPage, setMaterialPage] = useState(1)

  // Material Form Sheet State
  const [materialFormOpen, setMaterialFormOpen] = useState(false)
  const [materialFormMode, setMaterialFormMode] = useState<"create" | "edit">("create")
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [materialFormLoading, setMaterialFormLoading] = useState(false)
  const [materialFormError, setMaterialFormError] = useState("")
  const [materialFormSuccess, setMaterialFormSuccess] = useState("")

  // Material Editable Form Fields
  const [formMaterialTitle, setFormMaterialTitle] = useState("")
  const [formMaterialDescription, setFormMaterialDescription] = useState("")
  const [formMaterialType, setFormMaterialType] = useState("")
  const [formMaterialTier, setFormMaterialTier] = useState("")
  const [formMaterialCourseId, setFormMaterialCourseId] = useState("")
  const [formMaterialStatus, setFormMaterialStatus] = useState<"draft" | "published" | "archived">("draft")
  const [formMaterialFeatured, setFormMaterialFeatured] = useState(false)
  const [formMaterialSourceUrl, setFormMaterialSourceUrl] = useState("")
  const [formMaterialFile, setFormMaterialFile] = useState<File | null>(null)
  const [fileUploadProgress, setFileUploadProgress] = useState<string | null>(null)

  // Material Delete Confirmation State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState("")

  // --- STAFF STATE ---
  const [staffList, setStaffList] = useState<any[]>([])
  const [staffCount, setStaffCount] = useState(0)
  const [staffLoading, setStaffLoading] = useState(false)
  const [staffError, setStaffError] = useState("")

  const [staffSearch, setStaffSearch] = useState("")
  const [staffDebouncedSearch, setStaffDebouncedSearch] = useState("")
  const [staffDeptFilter, setStaffDeptFilter] = useState("all")
  const [staffPage, setStaffPage] = useState(1)

  // Staff Form Sheet State
  const [staffFormOpen, setStaffFormOpen] = useState(false)
  const [staffFormMode, setStaffFormMode] = useState<"create" | "edit">("create")
  const [editingStaff, setEditingStaff] = useState<any | null>(null)
  const [staffFormLoading, setStaffFormLoading] = useState(false)
  const [staffFormError, setStaffFormError] = useState("")
  const [staffFormSuccess, setStaffFormSuccess] = useState("")

  // Staff Editable Form Fields
  const [formStaffName, setFormStaffName] = useState("")
  const [formStaffPhotoUrl, setFormStaffPhotoUrl] = useState("")
  const [formStaffTitle, setFormStaffTitle] = useState("")
  const [formStaffDepartment, setFormStaffDepartment] = useState("")
  const [formStaffSpecialty, setFormStaffSpecialty] = useState("")
  const [formStaffCoursesText, setFormStaffCoursesText] = useState("") // comma-separated strings
  const [formStaffStatus, setFormStaffStatus] = useState<"active" | "inactive">("active")

  // Staff Delete Confirmation State
  const [staffDeleteConfirmOpen, setStaffDeleteConfirmOpen] = useState(false)
  const [staffToDelete, setStaffToDelete] = useState<any | null>(null)
  const [staffDeleteLoading, setStaffDeleteLoading] = useState(false)
  const [staffDeleteError, setStaffDeleteError] = useState("")

  // --- CLINICAL GUIDES STATE ---
  const [guides, setGuides] = useState<any[]>([])
  const [guidesCount, setGuidesCount] = useState(0)
  const [guidesLoading, setGuidesLoading] = useState(false)
  const [guidesError, setGuidesError] = useState("")

  const [guidesSearch, setGuidesSearch] = useState("")
  const [guidesDebouncedSearch, setGuidesDebouncedSearch] = useState("")
  const [guidesStatusFilter, setGuidesStatusFilter] = useState("all")
  const [guidesPage, setGuidesPage] = useState(1)

  // Guides Form Sheet State
  const [guideFormOpen, setGuideFormOpen] = useState(false)
  const [guideFormMode, setGuideFormMode] = useState<"create" | "edit">("create")
  const [editingGuide, setEditingGuide] = useState<any | null>(null)
  const [guideFormLoading, setGuideFormLoading] = useState(false)
  const [guideFormError, setGuideFormError] = useState("")
  const [guideFormSuccess, setGuideFormSuccess] = useState("")

  // Guide Editable Form Fields
  const [formGuideTitle, setFormGuideTitle] = useState("")
  const [formGuideSpecialty, setFormGuideSpecialty] = useState("")
  const [formGuideLevel, setFormGuideLevel] = useState("")
  const [formGuideStatus, setFormGuideStatus] = useState<"draft" | "published">("draft")
  const [formGuideSections, setFormGuideSections] = useState<{ heading: string; content: string }[]>([])

  // Guide Delete Confirmation State
  const [guideDeleteConfirmOpen, setGuideDeleteConfirmOpen] = useState(false)
  const [guideToDelete, setGuideToDelete] = useState<any | null>(null)
  const [guideDeleteLoading, setGuideDeleteLoading] = useState(false)
  const [guideDeleteError, setGuideDeleteError] = useState("")

  // --- TUTORIALS STATE ---
  const [tutorialsList, setTutorialsList] = useState<any[]>([])
  const [tutorialsCount, setTutorialsCount] = useState(0)
  const [tutorialsLoading, setTutorialsLoading] = useState(false)
  const [tutorialsError, setTutorialsError] = useState("")

  const [tutorialsSearch, setTutorialsSearch] = useState("")
  const [tutorialsDebouncedSearch, setTutorialsDebouncedSearch] = useState("")
  const [tutorialsStatusFilter, setTutorialsStatusFilter] = useState("all")
  const [tutorialsCourseFilter, setTutorialsCourseFilter] = useState("all")
  const [tutorialsPage, setTutorialsPage] = useState(1)

  // Tutorials Form Sheet State
  const [tutorialFormOpen, setTutorialFormOpen] = useState(false)
  const [tutorialFormMode, setTutorialFormMode] = useState<"create" | "edit">("create")
  const [editingTutorial, setEditingTutorial] = useState<any | null>(null)
  const [tutorialFormLoading, setTutorialFormLoading] = useState(false)
  const [tutorialFormError, setTutorialFormError] = useState("")
  const [tutorialFormSuccess, setTutorialFormSuccess] = useState("")

  // Tutorial Editable Form Fields
  const [formTutorialTitle, setFormTutorialTitle] = useState("")
  const [formTutorialCourseId, setFormTutorialCourseId] = useState("")
  const [formTutorialOverview, setFormTutorialOverview] = useState("")
  const [formTutorialStatus, setFormTutorialStatus] = useState<"draft" | "published">("draft")
  const [formTutorialSections, setFormTutorialSections] = useState<{ heading: string; content: string }[]>([])
  const [formTutorialLinkedQuizId, setFormTutorialLinkedQuizId] = useState("")

  // Dynamic Quiz list for picking existing quizzes
  const [quizzesList, setQuizzesList] = useState<any[]>([])
  const [quizzesLoading, setQuizzesLoading] = useState(false)

  // AI Quiz Generation within admin form
  const [formQuizTopic, setFormQuizTopic] = useState("")
  const [formQuizGenerating, setFormQuizGenerating] = useState(false)

  // Tutorial Delete Confirmation State
  const [tutorialDeleteConfirmOpen, setTutorialDeleteConfirmOpen] = useState(false)
  const [tutorialToDelete, setTutorialToDelete] = useState<any | null>(null)
  const [tutorialDeleteLoading, setTutorialDeleteLoading] = useState(false)
  const [tutorialDeleteError, setTutorialDeleteError] = useState("")

  // Debounce search query (Users)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Debounce search query (Materials)
  useEffect(() => {
    const timer = setTimeout(() => {
      setMaterialDebouncedSearch(materialSearch)
    }, 400)
    return () => clearTimeout(timer)
  }, [materialSearch])

  // Debounce search query (Staff)
  useEffect(() => {
    const timer = setTimeout(() => {
      setStaffDebouncedSearch(staffSearch)
    }, 400)
    return () => clearTimeout(timer)
  }, [staffSearch])

  // Debounce search query (Guides)
  useEffect(() => {
    const timer = setTimeout(() => {
      setGuidesDebouncedSearch(guidesSearch)
    }, 400)
    return () => clearTimeout(timer)
  }, [guidesSearch])

  // Debounce search query (Tutorials)
  useEffect(() => {
    const timer = setTimeout(() => {
      setTutorialsDebouncedSearch(tutorialsSearch)
    }, 400)
    return () => clearTimeout(timer)
  }, [tutorialsSearch])

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
          .select("role, admin_permissions")
          .eq("id", user.id)
          .maybeSingle()

        if (profileData) {
          const role = normalizeRole(profileData.role)
          const isAdmin = role === "admin" || role === "super_admin" || role === "moderator"

          if (isAdmin) {
            const isSuperAdmin = role === "super_admin"
            const perms = (profileData.admin_permissions as Record<string, boolean>) || {}
            const hasUsersPermission = isSuperAdmin || perms.users === true
            const hasMaterialsPermission = isSuperAdmin || perms.materials === true

            setCaller({
              id: user.id,
              role,
              isSuperAdmin,
              hasUsersPermission,
              hasMaterialsPermission,
            })
          }
        }
      } catch (err) {
        console.error("Error loading caller profile details:", err)
      } finally {
        setCallerLoading(false)
      }
    }
    void loadCaller()
  }, [])

  // Load universities, faculties, and courses metadata
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [uniRes, facRes, courseRes] = await Promise.all([
          supabase.from("universities").select("id, name, short_name"),
          supabase.from("faculties").select("id, name, university_id"),
          supabase.from("courses").select("id, code, title").order("code", { ascending: true })
        ])
        if (uniRes.data) setUniversities(uniRes.data)
        if (facRes.data) setFaculties(facRes.data)
        if (courseRes.data) setCourses(courseRes.data)
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

  // Fetch materials list
  const fetchMaterials = async () => {
    setMaterialsLoading(true)
    setMaterialsError("")
    try {
      const params = new URLSearchParams({
        query: materialDebouncedSearch,
        course_id: materialCourseFilter,
        type: materialTypeFilter,
        tier: materialTierFilter,
        status: materialStatusFilter,
        page: String(materialPage),
        limit: String(itemsPerPage),
      })

      const res = await fetch(`/api/admin/materials?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to load materials")
      }
      setMaterials(data.materials || [])
      setMaterialsCount(data.count || 0)
    } catch (err: any) {
      setMaterialsError(err.message || "An error occurred loading materials.")
    } finally {
      setMaterialsLoading(false)
    }
  }

  // Fetch staff list
  const fetchStaff = async () => {
    setStaffLoading(true)
    setStaffError("")
    try {
      const params = new URLSearchParams({
        query: staffDebouncedSearch,
        department: staffDeptFilter,
        page: String(staffPage),
        limit: String(itemsPerPage),
      })

      const res = await fetch(`/api/admin/staff?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to load staff")
      }
      setStaffList(data.staff || [])
      setStaffCount(data.count || 0)
    } catch (err: any) {
      setStaffError(err.message || "An error occurred loading staff directory.")
    } finally {
      setStaffLoading(false)
    }
  }

  // Fetch clinical guides list
  const fetchGuides = async () => {
    setGuidesLoading(true)
    setGuidesError("")
    try {
      const params = new URLSearchParams({
        query: guidesDebouncedSearch,
        status: guidesStatusFilter,
        page: String(guidesPage),
        limit: String(itemsPerPage),
      })

      const res = await fetch(`/api/admin/guides?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to load clinical guides")
      }
      setGuides(data.guides || [])
      setGuidesCount(data.count || 0)
    } catch (err: any) {
      setGuidesError(err.message || "An error occurred loading clinical guides.")
    } finally {
      setGuidesLoading(false)
    }
  }

  // Fetch tutorials list
  const fetchTutorials = async () => {
    setTutorialsLoading(true)
    setTutorialsError("")
    try {
      const params = new URLSearchParams({
        query: tutorialsDebouncedSearch,
        status: tutorialsStatusFilter,
        course_id: tutorialsCourseFilter,
        page: String(tutorialsPage),
        limit: String(itemsPerPage),
      })

      const res = await fetch(`/api/admin/tutorials?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to load tutorials")
      }
      setTutorialsList(data.tutorials || [])
      setTutorialsCount(data.count || 0)
    } catch (err: any) {
      setTutorialsError(err.message || "An error occurred loading tutorials.")
    } finally {
      setTutorialsLoading(false)
    }
  }

  // Fetch quizzes for linking dropdown
  const fetchAllQuizzes = async () => {
    try {
      setQuizzesLoading(true)
      const { data, error } = await supabase
        .from("quizzes")
        .select(`
          id,
          topic,
          format,
          course_id,
          courses (code)
        `)
        .order("topic", { ascending: true })
      if (!error && data) {
        setQuizzesList(data)
      }
    } catch (err) {
      console.error("Failed to load quizzes list:", err)
    } finally {
      setQuizzesLoading(false)
    }
  }

  // Reload lists when active tab changes, or filters change
  useEffect(() => {
    if (activeTab === "overview") {
      void fetchOverviewStats()
    } else if (activeTab === "users") {
      void fetchUsers()
    } else if (activeTab === "materials") {
      void fetchMaterials()
    } else if (activeTab === "staff") {
      void fetchStaff()
    } else if (activeTab === "guides") {
      void fetchGuides()
    } else if (activeTab === "tutorials") {
      void fetchTutorials()
      void fetchAllQuizzes()
    }
  }, [
    activeTab,
    debouncedSearch,
    roleFilter,
    levelFilter,
    deptFilter,
    uniFilter,
    currentPage,
    materialDebouncedSearch,
    materialCourseFilter,
    materialTypeFilter,
    materialTierFilter,
    materialStatusFilter,
    materialPage,
    staffDebouncedSearch,
    staffDeptFilter,
    staffPage,
    guidesDebouncedSearch,
    guidesStatusFilter,
    guidesPage,
    tutorialsDebouncedSearch,
    tutorialsStatusFilter,
    tutorialsCourseFilter,
    tutorialsPage
  ])

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

  // --- MATERIAL MANAGEMENT FUNCTIONS ---

  const handleOpenMaterialCreate = () => {
    setMaterialFormMode("create")
    setEditingMaterial(null)
    setFormMaterialTitle("")
    setFormMaterialDescription("")
    setFormMaterialType("pdf")
    setFormMaterialTier("study")
    setFormMaterialCourseId(courses[0]?.id || "")
    setFormMaterialStatus("draft")
    setFormMaterialFeatured(false)
    setFormMaterialSourceUrl("")
    setFormMaterialFile(null)
    setMaterialFormError("")
    setMaterialFormSuccess("")
    setFileUploadProgress(null)
    setMaterialFormOpen(true)
  }

  const handleOpenMaterialEdit = (material: Material) => {
    setMaterialFormMode("edit")
    setEditingMaterial(material)
    setFormMaterialTitle(material.title || "")
    setFormMaterialDescription(material.description || "")
    setFormMaterialType(material.type || "pdf")
    setFormMaterialTier(material.tier || "study")
    setFormMaterialCourseId(material.course_id || "")
    setFormMaterialStatus((material.status as "draft" | "published" | "archived") || "draft")
    setFormMaterialFeatured(material.featured || false)
    setFormMaterialSourceUrl(material.source_url || "")
    setFormMaterialFile(null)
    setMaterialFormError("")
    setMaterialFormSuccess("")
    setFileUploadProgress(null)
    setMaterialFormOpen(true)
  }

  const uploadFileToStorage = async (file: File): Promise<string> => {
    setFileUploadProgress("Uploading document to materials bucket...")
    const fileExt = file.name.split(".").pop() || "pdf"
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
    const filePath = fileName

    const { error: uploadError } = await supabase.storage
      .from("materials")
      .upload(filePath, file, { cacheControl: "3600", upsert: true })

    if (uploadError) {
      throw new Error("Supabase Storage Upload failed: " + uploadError.message)
    }

    return filePath
  }

  const handleMaterialFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formMaterialTitle.trim()) {
      setMaterialFormError("Title is required")
      return
    }
    if (!formMaterialCourseId) {
      setMaterialFormError("A course selection is required")
      return
    }

    setMaterialFormLoading(true)
    setMaterialFormError("")
    setMaterialFormSuccess("")

    try {
      let finalStoragePath = editingMaterial?.storage_path || null
      let finalSourceUrl = formMaterialSourceUrl.trim() || null

      if (formMaterialFile) {
        const filePath = await uploadFileToStorage(formMaterialFile)
        finalStoragePath = filePath
        // Calculate raw storage public URL to store in source_url as fallback
        finalSourceUrl = `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/${filePath}`
      }

      const payload: Record<string, any> = {
        title: formMaterialTitle.trim(),
        description: formMaterialDescription.trim() || null,
        type: formMaterialType,
        tier: formMaterialTier,
        course_id: formMaterialCourseId,
        status: formMaterialStatus,
        featured: formMaterialFeatured,
        source_url: finalSourceUrl,
        storage_path: finalStoragePath,
      }

      let res
      if (materialFormMode === "create") {
        res = await fetch("/api/admin/materials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
      } else {
        payload.id = editingMaterial?.id
        res = await fetch("/api/admin/materials", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
      }

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to save material changes")
      }

      setMaterialFormSuccess(
        materialFormMode === "create"
          ? "Material created and logged successfully!"
          : "Material updated and logged successfully!"
      )

      void fetchMaterials()

      setTimeout(() => {
        setMaterialFormOpen(false)
        setEditingMaterial(null)
      }, 1000)
    } catch (err: any) {
      setMaterialFormError(err.message || "An unexpected error occurred saving material.")
    } finally {
      setMaterialFormLoading(false)
      setFileUploadProgress(null)
    }
  }

  const handleQuickStatusChange = async (material: Material, newStatus: "draft" | "published" | "archived") => {
    try {
      const res = await fetch("/api/admin/materials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: material.id,
          status: newStatus
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to update status")
      }

      void fetchMaterials()
    } catch (err: any) {
      alert(err.message || "An error occurred updating the status.")
    }
  }

  const handleOpenDeleteConfirm = (material: Material) => {
    setMaterialToDelete(material)
    setDeleteError("")
    setDeleteConfirmOpen(true)
  }

  const handleDeleteMaterial = async () => {
    if (!materialToDelete) return
    setDeleteLoading(true)
    setDeleteError("")

    try {
      const res = await fetch(`/api/admin/materials?id=${materialToDelete.id}`, {
        method: "DELETE"
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete material")
      }

      void fetchMaterials()
      setDeleteConfirmOpen(false)
      setMaterialToDelete(null)
    } catch (err: any) {
      setDeleteError(err.message || "An error occurred deleting material.")
    } finally {
      setDeleteLoading(false)
    }
  }

  // --- STAFF MANAGEMENT FUNCTIONS ---
  const handleOpenStaffCreate = () => {
    setStaffFormMode("create")
    setEditingStaff(null)
    setFormStaffName("")
    setFormStaffPhotoUrl("")
    setFormStaffTitle("")
    setFormStaffDepartment("Physiology") // default
    setFormStaffSpecialty("")
    setFormStaffCoursesText("")
    setFormStaffStatus("active")
    setStaffFormError("")
    setStaffFormSuccess("")
    setStaffFormOpen(true)
  }

  const handleOpenStaffEdit = (staff: any) => {
    setStaffFormMode("edit")
    setEditingStaff(staff)
    setFormStaffName(staff.full_name || "")
    setFormStaffPhotoUrl(staff.photo_url || "")
    setFormStaffTitle(staff.title || "")
    setFormStaffDepartment(staff.department || "Physiology")
    setFormStaffSpecialty(staff.specialty || "")
    setFormStaffCoursesText(Array.isArray(staff.courses) ? staff.courses.join(", ") : "")
    setFormStaffStatus(staff.status === "inactive" ? "inactive" : "active")
    setStaffFormError("")
    setStaffFormSuccess("")
    setStaffFormOpen(true)
  }

  const handleStaffFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formStaffName.trim()) {
      setStaffFormError("Full Name is required")
      return
    }
    if (!formStaffTitle.trim()) {
      setStaffFormError("Title is required")
      return
    }
    if (!formStaffDepartment.trim()) {
      setStaffFormError("Department is required")
      return
    }

    setStaffFormLoading(true)
    setStaffFormError("")
    setStaffFormSuccess("")

    try {
      const coursesArray = formStaffCoursesText
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c.length > 0)

      const payload: Record<string, any> = {
        full_name: formStaffName.trim(),
        photo_url: formStaffPhotoUrl.trim() || null,
        title: formStaffTitle.trim(),
        department: formStaffDepartment.trim(),
        specialty: formStaffSpecialty.trim() || null,
        courses: coursesArray,
        status: formStaffStatus,
      }

      let res
      if (staffFormMode === "create") {
        res = await fetch("/api/admin/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
      } else {
        payload.id = editingStaff?.id
        res = await fetch("/api/admin/staff", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
      }

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to save staff changes")
      }

      setStaffFormSuccess(
        staffFormMode === "create"
          ? "Staff member created and logged successfully!"
          : "Staff member updated and logged successfully!"
      )

      void fetchStaff()

      setTimeout(() => {
        setStaffFormOpen(false)
        setEditingStaff(null)
      }, 1000)
    } catch (err: any) {
      setStaffFormError(err.message || "An unexpected error occurred saving staff.")
    } finally {
      setStaffFormLoading(false)
    }
  }

  const handleOpenStaffDeleteConfirm = (staff: any) => {
    setStaffToDelete(staff)
    setStaffDeleteError("")
    setStaffDeleteConfirmOpen(true)
  }

  const handleDeleteStaff = async () => {
    if (!staffToDelete) return
    setStaffDeleteLoading(true)
    setStaffDeleteError("")

    try {
      const res = await fetch(`/api/admin/staff?id=${staffToDelete.id}`, {
        method: "DELETE"
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete staff member")
      }

      void fetchStaff()
      setStaffDeleteConfirmOpen(false)
      setStaffToDelete(null)
    } catch (err: any) {
      setStaffDeleteError(err.message || "An error occurred deleting staff member.")
    } finally {
      setStaffDeleteLoading(false)
    }
  }

  // --- CLINICAL GUIDES FUNCTIONS ---
  const handleOpenGuideCreate = () => {
    setGuideFormMode("create")
    setEditingGuide(null)
    setFormGuideTitle("")
    setFormGuideSpecialty("")
    setFormGuideLevel("400L")
    setFormGuideStatus("draft")
    setFormGuideSections([{ heading: "", content: "" }])
    setGuideFormError("")
    setGuideFormSuccess("")
    setGuideFormOpen(true)
  }

  const handleOpenGuideEdit = (guide: any) => {
    setGuideFormMode("edit")
    setEditingGuide(guide)
    setFormGuideTitle(guide.title || "")
    setFormGuideSpecialty(guide.specialty || "")
    setFormGuideLevel(guide.level || "400L")
    setFormGuideStatus((guide.status as "draft" | "published") || "draft")
    setFormGuideSections(Array.isArray(guide.sections) ? [...guide.sections] : [{ heading: "", content: "" }])
    setGuideFormError("")
    setGuideFormSuccess("")
    setGuideFormOpen(true)
  }

  const handleAddSection = () => {
    setFormGuideSections((prev) => [...prev, { heading: "", content: "" }])
  }

  const handleRemoveSection = (index: number) => {
    setFormGuideSections((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleUpdateSection = (index: number, field: "heading" | "content", value: string) => {
    setFormGuideSections((prev) =>
      prev.map((sec, idx) => (idx === index ? { ...sec, [field]: value } : sec))
    )
  }

  const handleMoveSection = (index: number, direction: "up" | "down") => {
    setFormGuideSections((prev) => {
      const nextSections = [...prev]
      const targetIndex = direction === "up" ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= nextSections.length) return prev
      const temp = nextSections[index]
      nextSections[index] = nextSections[targetIndex]
      nextSections[targetIndex] = temp
      return nextSections
    })
  }

  const handleGuideFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formGuideTitle.trim()) {
      setGuideFormError("Title is required")
      return
    }
    if (!formGuideSpecialty.trim()) {
      setGuideFormError("Specialty is required")
      return
    }

    // Filter out completely empty sections, but allow non-empty ones
    const cleanSections = formGuideSections
      .map((s) => ({ heading: s.heading.trim(), content: s.content.trim() }))
      .filter((s) => s.heading || s.content)

    setGuideFormLoading(true)
    setGuideFormError("")
    setGuideFormSuccess("")

    try {
      const payload: Record<string, any> = {
        title: formGuideTitle.trim(),
        specialty: formGuideSpecialty.trim(),
        level: formGuideLevel || null,
        status: formGuideStatus,
        sections: cleanSections,
      }

      let res
      if (guideFormMode === "create") {
        res = await fetch("/api/admin/guides", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
      } else {
        payload.id = editingGuide?.id
        res = await fetch("/api/admin/guides", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
      }

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to save clinical guide")
      }

      setGuideFormSuccess(
        guideFormMode === "create"
          ? "Clinical guide created and logged successfully!"
          : "Clinical guide updated and logged successfully!"
      )

      void fetchGuides()

      setTimeout(() => {
        setGuideFormOpen(false)
        setEditingGuide(null)
      }, 1000)
    } catch (err: any) {
      setGuideFormError(err.message || "An unexpected error occurred saving guide.")
    } finally {
      setGuideFormLoading(false)
    }
  }

  const handleGuideQuickStatusChange = async (guide: any, newStatus: "draft" | "published") => {
    try {
      const res = await fetch("/api/admin/guides", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: guide.id,
          status: newStatus
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to update status")
      }

      void fetchGuides()
    } catch (err: any) {
      alert(err.message || "An error occurred updating the status.")
    }
  }

  const handleOpenGuideDeleteConfirm = (guide: any) => {
    setGuideToDelete(guide)
    setGuideDeleteError("")
    setGuideDeleteConfirmOpen(true)
  }

  const handleDeleteGuide = async () => {
    if (!guideToDelete) return
    setGuideDeleteLoading(true)
    setGuideDeleteError("")

    try {
      const res = await fetch(`/api/admin/guides?id=${guideToDelete.id}`, {
        method: "DELETE"
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete clinical guide")
      }

      void fetchGuides()
      setGuideDeleteConfirmOpen(false)
      setGuideToDelete(null)
    } catch (err: any) {
      setGuideDeleteError(err.message || "An error occurred deleting clinical guide.")
    } finally {
      setGuideDeleteLoading(false)
    }
  }

  // --- TUTORIALS ACTION HANDLERS ---
  const handleOpenTutorialCreate = () => {
    setTutorialFormMode("create")
    setEditingTutorial(null)
    setFormTutorialTitle("")
    setFormTutorialOverview("")
    setFormTutorialCourseId(courses[0]?.id || "")
    setFormTutorialStatus("draft")
    setFormTutorialSections([{ heading: "", content: "" }])
    setFormTutorialLinkedQuizId("")
    setFormQuizTopic("")
    setTutorialFormError("")
    setTutorialFormSuccess("")
    setTutorialFormOpen(true)
  }

  const handleOpenTutorialEdit = (tutorial: any) => {
    setTutorialFormMode("edit")
    setEditingTutorial(tutorial)
    setFormTutorialTitle(tutorial.title || "")
    setFormTutorialOverview(tutorial.overview || "")
    setFormTutorialCourseId(tutorial.course_id || "")
    setFormTutorialStatus((tutorial.status as "draft" | "published") || "draft")
    setFormTutorialSections(Array.isArray(tutorial.sections) ? [...tutorial.sections] : [{ heading: "", content: "" }])
    setFormTutorialLinkedQuizId(tutorial.linked_quiz_id || "")
    setFormQuizTopic("")
    setTutorialFormError("")
    setTutorialFormSuccess("")
    setTutorialFormOpen(true)
  }

  const handleAddTutorialSection = () => {
    setFormTutorialSections((prev) => [...prev, { heading: "", content: "" }])
  }

  const handleRemoveTutorialSection = (index: number) => {
    setFormTutorialSections((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleUpdateTutorialSection = (index: number, field: "heading" | "content", value: string) => {
    setFormTutorialSections((prev) =>
      prev.map((sec, idx) => (idx === index ? { ...sec, [field]: value } : sec))
    )
  }

  const handleMoveTutorialSection = (index: number, direction: "up" | "down") => {
    setFormTutorialSections((prev) => {
      const nextSections = [...prev]
      const targetIndex = direction === "up" ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= nextSections.length) return prev
      const temp = nextSections[index]
      nextSections[index] = nextSections[targetIndex]
      nextSections[targetIndex] = temp
      return nextSections
    })
  }

  const handleTutorialQuickStatusChange = async (tutorial: any, newStatus: "draft" | "published") => {
    try {
      const res = await fetch("/api/admin/tutorials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: tutorial.id,
          status: newStatus
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to update status")
      }

      void fetchTutorials()
    } catch (err: any) {
      alert(err.message || "An error occurred updating the status.")
    }
  }

  const handleOpenTutorialDeleteConfirm = (tutorial: any) => {
    setTutorialToDelete(tutorial)
    setTutorialDeleteError("")
    setTutorialDeleteConfirmOpen(true)
  }

  const handleDeleteTutorial = async () => {
    if (!tutorialToDelete) return
    setTutorialDeleteLoading(true)
    setTutorialDeleteError("")

    try {
      const res = await fetch(`/api/admin/tutorials?id=${tutorialToDelete.id}`, {
        method: "DELETE"
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete tutorial")
      }

      void fetchTutorials()
      setTutorialDeleteConfirmOpen(false)
      setTutorialToDelete(null)
    } catch (err: any) {
      setTutorialDeleteError(err.message || "An error occurred deleting tutorial.")
    } finally {
      setTutorialDeleteLoading(false)
    }
  }

  const handleTutorialFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTutorialTitle.trim()) {
      setTutorialFormError("Title is required")
      return
    }
    if (!formTutorialCourseId) {
      setTutorialFormError("A course mapping is required")
      return
    }

    const cleanSections = formTutorialSections
      .map((s) => ({ heading: s.heading.trim(), content: s.content.trim() }))
      .filter((s) => s.heading || s.content)

    setTutorialFormLoading(true)
    setTutorialFormError("")
    setTutorialFormSuccess("")

    try {
      const payload: Record<string, any> = {
        title: formTutorialTitle.trim(),
        course_id: formTutorialCourseId,
        overview: formTutorialOverview.trim(),
        status: formTutorialStatus,
        sections: cleanSections,
        linked_quiz_id: formTutorialLinkedQuizId || null,
      }

      let res
      if (tutorialFormMode === "create") {
        res = await fetch("/api/admin/tutorials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
      } else {
        payload.id = editingTutorial?.id
        res = await fetch("/api/admin/tutorials", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
      }

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to save tutorial")
      }

      setTutorialFormSuccess(
        tutorialFormMode === "create"
          ? "Tutorial created and logged successfully!"
          : "Tutorial updated and logged successfully!"
      )

      void fetchTutorials()

      setTimeout(() => {
        setTutorialFormOpen(false)
        setEditingTutorial(null)
      }, 1000)
    } catch (err: any) {
      setTutorialFormError(err.message || "An unexpected error occurred saving tutorial.")
    } finally {
      setTutorialFormLoading(false)
    }
  }

  const handleGenerateQuizInForm = async () => {
    if (!formQuizTopic.trim()) {
      alert("Please enter a topic to generate quiz questions.")
      return
    }
    if (!formTutorialCourseId) {
      alert("Please select a course for the tutorial first.")
      return
    }

    try {
      setFormQuizGenerating(true)
      const response = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: formTutorialCourseId,
          topic: formQuizTopic.trim(),
          format: "MCQ",
          count: 10
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate quiz.")
      }

      setFormTutorialLinkedQuizId(data.quiz_id)

      const newQuizObj = {
        id: data.quiz_id,
        topic: formQuizTopic.trim(),
        format: "MCQ",
        course_id: formTutorialCourseId
      }
      setQuizzesList((prev) => [newQuizObj, ...prev])

      alert(`Quiz generated successfully on topic "${formQuizTopic.trim()}" and automatically linked!`)
    } catch (err: any) {
      console.error("Error generating quiz in admin form:", err)
      alert(err.message || "An unexpected error occurred while generating quiz.")
    } finally {
      setFormQuizGenerating(false)
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
      <PageHeader title="Platform Administration" description="Manage platform users, permissions, resources, and monitor system activity.">
        <div className="flex items-center gap-2 border-b pb-1">
          <Button
            variant={activeTab === "overview" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </Button>
          {caller.hasUsersPermission && (
            <Button
              variant={activeTab === "users" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("users")}
            >
              Users
            </Button>
          )}
          {caller.hasMaterialsPermission && (
            <Button
              variant={activeTab === "materials" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("materials")}
            >
              Materials
            </Button>
          )}
          <Button
            variant={activeTab === "staff" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("staff")}
          >
            Staff Directory
          </Button>
          <Button
            variant={activeTab === "guides" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("guides")}
          >
            Clinical Guides
          </Button>
          <Button
            variant={activeTab === "tutorials" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("tutorials")}
          >
            Tutorials
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
                This administrative console provides secure oversight of user directories, library materials, authorization parameters, and access status. Every single write, upload, and privilege adjustment triggers an automatic system-wide cryptographic logging sequence to ensure full audit traceability.
              </p>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex gap-3 items-start">
                <UserCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-foreground">Your Active Workspace Scope:</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-normal">
                    {caller.isSuperAdmin
                      ? "Super Administrator — You have implicit unrestricted rights over all profile scopes, role promotions, and platform permissions."
                      : "Administrator / moderator with customized scope. Please check specific tab permissions on upper dashboard navigation."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "users" && caller.hasUsersPermission && (
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
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="all">All Departments</option>
                  <option value="Medicine & Surgery">Medicine & Surgery</option>
                  <option value="Nursing Science">Nursing Science</option>
                  <option value="Medical Laboratory Science">Medical Laboratory Science</option>
                  <option value="Physiology">Physiology</option>
                  <option value="Anatomy">Anatomy</option>
                </select>
              </div>

              <div>
                <select
                  value={uniFilter}
                  onChange={(e) => setUniFilter(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

      {/* --- MATERIALS MANAGEMENT TAB --- */}
      {activeTab === "materials" && caller.hasMaterialsPermission && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          {/* SEARCH & FILTERS PANEL */}
          <Card className="border-border">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="size-5 text-primary" /> Library Content Directory
                </CardTitle>
                <CardDescription>Upload curriculum notes, scanned past papers, lectures, or video recordings.</CardDescription>
              </div>
              <Button onClick={handleOpenMaterialCreate} size="sm" className="flex items-center gap-1">
                <Plus className="size-4" /> Add Material
              </Button>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 md:grid-cols-5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by title..."
                  className="pl-9"
                  value={materialSearch}
                  onChange={(e) => setMaterialSearch(e.target.value)}
                />
              </div>

              <div>
                <select
                  value={materialCourseFilter}
                  onChange={(e) => setMaterialCourseFilter(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="all">All Courses</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code}: {course.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={materialTypeFilter}
                  onChange={(e) => setMaterialTypeFilter(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="all">All Formats</option>
                  <option value="pdf">PDF Document</option>
                  <option value="video">Video Recording</option>
                  <option value="image">Image / Scan</option>
                  <option value="slideshare">SlideShare Deck</option>
                  <option value="doc">Word / PowerPoint / Excel</option>
                  <option value="link">External Link</option>
                </select>
              </div>

              <div>
                <select
                  value={materialTierFilter}
                  onChange={(e) => setMaterialTierFilter(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="all">All Tiers</option>
                  <option value="study">Study handout</option>
                  <option value="past_question">Past Question</option>
                  <option value="slides">Slides</option>
                  <option value="recommendation">External resource</option>
                </select>
              </div>

              <div>
                <select
                  value={materialStatusFilter}
                  onChange={(e) => setMaterialStatusFilter(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* MATERIALS LIST TABLE */}
          <Card className="border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="p-4">Material Details</th>
                      <th className="p-4">Course</th>
                      <th className="p-4">Type / Tier</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Featured</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm">
                    {materialsLoading ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          <RefreshCw className="mx-auto h-5 w-5 animate-spin text-primary" />
                          <p className="mt-2">Retrieving library index...</p>
                        </td>
                      </tr>
                    ) : materialsError ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-destructive font-medium">
                          {materialsError}
                        </td>
                      </tr>
                    ) : materials.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          No matching library materials found.
                        </td>
                      </tr>
                    ) : (
                      materials.map((item) => {
                        return (
                          <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-4">
                              <div className="font-semibold text-foreground flex items-center gap-1.5">
                                <FileText className="size-4 text-primary shrink-0" />
                                {item.title}
                              </div>
                              {item.description && (
                                <div className="text-xs text-muted-foreground mt-0.5 max-w-sm truncate" title={item.description}>
                                  {item.description}
                                </div>
                              )}
                            </td>
                            <td className="p-4">
                              <Badge variant="outline">
                                {item.courses?.code || "GENERAL"}
                              </Badge>
                            </td>
                            <td className="p-4 capitalize">
                              <div className="text-xs text-foreground font-medium">{item.type}</div>
                              <div className="text-[11px] text-muted-foreground">{item.tier}</div>
                            </td>
                            <td className="p-4 capitalize">
                              <Badge
                                variant={
                                  item.status === "published"
                                    ? "default"
                                    : item.status === "archived"
                                      ? "destructive"
                                      : "outline"
                                }
                              >
                                {item.status || "published"}
                              </Badge>
                            </td>
                            <td className="p-4">
                              {item.featured ? (
                                <Badge className="bg-amber-500 hover:bg-amber-600">Featured</Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">No</span>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {item.status !== "published" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    title="Publish material"
                                    onClick={() => handleQuickStatusChange(item, "published")}
                                    className="h-8 px-2 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                                  >
                                    <CheckCircle className="size-4" />
                                  </Button>
                                )}
                                {item.status === "published" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    title="Move to draft"
                                    onClick={() => handleQuickStatusChange(item, "draft")}
                                    className="h-8 px-2 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                                  >
                                    <Ban className="size-4" />
                                  </Button>
                                )}
                                {item.status !== "archived" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    title="Archive material"
                                    onClick={() => handleQuickStatusChange(item, "archived")}
                                    className="h-8 px-2 text-slate-500 hover:text-slate-600 hover:bg-slate-500/10"
                                  >
                                    <Archive className="size-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenMaterialEdit(item)}
                                  className="h-8 px-2 text-primary"
                                >
                                  <Edit2 className="size-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenDeleteConfirm(item)}
                                  className="h-8 px-2 text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION PANEL */}
              {materialsCount > itemsPerPage && (
                <div className="flex items-center justify-between p-4 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    Showing {(materialPage - 1) * itemsPerPage + 1} - {Math.min(materialPage * itemsPerPage, materialsCount)} of {materialsCount} materials
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={materialPage === 1 || materialsLoading}
                      onClick={() => setMaterialPage((c) => c - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={materialPage * itemsPerPage >= materialsCount || materialsLoading}
                      onClick={() => setMaterialPage((c) => c + 1)}
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
                    <option value="Nursing Science">Nursing Science</option>
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

      {/* --- MATERIAL UPLOAD / EDIT DRAWER (SHEET) --- */}
      <Sheet open={materialFormOpen} onOpenChange={setMaterialFormOpen}>
        <SheetContent side="right" className="sm:max-w-md overflow-y-auto w-full">
          <SheetHeader>
            <SheetTitle>
              {materialFormMode === "create" ? "Add New Study Resource" : "Modify Study Resource"}
            </SheetTitle>
            <SheetDescription>
              Provide direct links or upload curriculum documents securely. Changes populate the student workspace dynamically.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleMaterialFormSubmit} className="space-y-5 p-4">
            {materialFormError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/15 p-3 text-sm text-destructive font-medium">
                {materialFormError}
              </div>
            )}
            {materialFormSuccess && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-500 font-medium">
                {materialFormSuccess}
              </div>
            )}

            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="material-title" className="text-xs font-medium text-foreground">Resource Title</label>
              <Input
                id="material-title"
                placeholder="e.g., Physiology of Gastrointestinal Hormones"
                value={formMaterialTitle}
                onChange={(e) => setFormMaterialTitle(e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="material-desc" className="text-xs font-medium text-foreground">Detailed Description</label>
              <textarea
                id="material-desc"
                placeholder="Describe key topics, context, or notes for students."
                value={formMaterialDescription}
                onChange={(e) => setFormMaterialDescription(e.target.value)}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            {/* Course Select */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="material-course" className="text-xs font-medium text-foreground">Academic Course Mapping</label>
              <select
                id="material-course"
                value={formMaterialCourseId}
                onChange={(e) => setFormMaterialCourseId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              >
                <option value="">-- Choose Course --</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code}: {course.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Grid for Type and Tier */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="material-type" className="text-xs font-medium text-foreground">Format Type</label>
                <select
                  id="material-type"
                  value={formMaterialType}
                  onChange={(e) => setFormMaterialType(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="pdf">PDF Document</option>
                  <option value="video">Video Recording</option>
                  <option value="image">Image / Scan</option>
                  <option value="slideshare">SlideShare Deck</option>
                  <option value="doc">Word / PowerPoint / Excel</option>
                  <option value="link">External Link</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="material-tier" className="text-xs font-medium text-foreground">Content Tier</label>
                <select
                  id="material-tier"
                  value={formMaterialTier}
                  onChange={(e) => setFormMaterialTier(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="study">Study handout</option>
                  <option value="past_question">Past Question</option>
                  <option value="slides">Slides</option>
                  <option value="recommendation">External resource</option>
                </select>
              </div>
            </div>

            {/* Document File / URL */}
            <div className="border border-dashed rounded-lg p-4 bg-muted/20 space-y-4">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Upload className="size-4 text-primary" /> Resource Location
              </span>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="material-url" className="text-xs font-medium text-foreground">Source URL (YouTube / SlideShare / Web link)</label>
                <Input
                  id="material-url"
                  placeholder="https://..."
                  value={formMaterialSourceUrl}
                  onChange={(e) => setFormMaterialSourceUrl(e.target.value)}
                />
              </div>

              <div className="text-center py-2">
                <span className="text-xs text-muted-foreground font-semibold">— OR UPLOAD FILE —</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="material-file" className="text-xs font-medium text-foreground">Secure File Upload (Optional / Overrides URL)</label>
                <input
                  id="material-file"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setFormMaterialFile(e.target.files[0])
                    }
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                {formMaterialFile && (
                  <p className="text-[11px] text-emerald-500 font-medium">Selected: {formMaterialFile.name}</p>
                )}
                {fileUploadProgress && (
                  <p className="text-[11px] text-primary animate-pulse">{fileUploadProgress}</p>
                )}
              </div>
            </div>

            {/* Status and Featured Row */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="material-status" className="text-xs font-medium text-foreground">Access Status</label>
                <select
                  id="material-status"
                  value={formMaterialStatus}
                  onChange={(e) => setFormMaterialStatus(e.target.value as "draft" | "published" | "archived")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="draft">Draft (Under Review)</option>
                  <option value="published">Published (Visible to Students)</option>
                  <option value="archived">Archived (Hidden from Students)</option>
                </select>
              </div>

              <div className="flex items-center gap-2.5 pt-6">
                <input
                  id="material-featured"
                  type="checkbox"
                  checked={formMaterialFeatured}
                  onChange={(e) => setFormMaterialFeatured(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary size-4 cursor-pointer"
                />
                <label htmlFor="material-featured" className="text-xs font-semibold text-foreground cursor-pointer select-none">
                  Pin to Featured shelf
                </label>
              </div>
            </div>

            {/* Save Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="submit"
                className="flex-1"
                disabled={materialFormLoading}
              >
                {materialFormLoading ? "Processing transaction..." : "Apply Resource Changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setMaterialFormOpen(false)
                  setEditingMaterial(null)
                }}
                disabled={materialFormLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* --- STAFF MANAGEMENT TAB --- */}
      {activeTab === "staff" && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          {/* SEARCH & FILTERS PANEL */}
          <Card className="border-border">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UsersIcon className="size-5 text-primary" /> Staff Administration Directory
                </CardTitle>
                <CardDescription>Manage academic faculty, specialty badges, and system status configuration.</CardDescription>
              </div>
              <Button onClick={handleOpenStaffCreate} size="sm" className="flex items-center gap-1">
                <Plus className="size-4" /> Add Staff Member
              </Button>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div className="relative col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search staff by name, title, or specialty..."
                  className="pl-9"
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                />
              </div>

              <div>
                <select
                  value={staffDeptFilter}
                  onChange={(e) => setStaffDeptFilter(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="all">All Departments</option>
                  <option value="Physiology">Physiology</option>
                  <option value="Pathology">Pathology</option>
                  <option value="Pharmacology">Pharmacology</option>
                  <option value="Anatomy">Anatomy</option>
                  <option value="Community Medicine">Community Medicine</option>
                  <option value="Clinical Skills">Clinical Skills</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* STAFF LIST TABLE */}
          <Card className="border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="p-4">Staff Member</th>
                      <th className="p-4">Title / Role</th>
                      <th className="p-4">Department</th>
                      <th className="p-4">Specialty</th>
                      <th className="p-4">Courses Taught</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm">
                    {staffLoading ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          <RefreshCw className="mx-auto h-5 w-5 animate-spin text-primary" />
                          <p className="mt-2">Retrieving staff index...</p>
                        </td>
                      </tr>
                    ) : staffError ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-destructive font-medium">
                          {staffError}
                        </td>
                      </tr>
                    ) : staffList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          No matching staff members found.
                        </td>
                      </tr>
                    ) : (
                      staffList.map((item) => {
                        const initials = item.full_name
                          ?.split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase() || "ST";

                        return (
                          <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                {item.photo_url ? (
                                  <img
                                    src={item.photo_url}
                                    alt={item.full_name}
                                    className="size-10 rounded-full object-cover shrink-0"
                                  />
                                ) : (
                                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                    {initials}
                                  </div>
                                )}
                                <div className="font-semibold text-foreground">{item.full_name}</div>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="text-foreground">{item.title}</span>
                            </td>
                            <td className="p-4">
                              <Badge variant="outline">{item.department}</Badge>
                            </td>
                            <td className="p-4">
                              <span className="text-xs text-muted-foreground">{item.specialty || "—"}</span>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-1 max-w-[180px]">
                                {Array.isArray(item.courses) && item.courses.length > 0 ? (
                                  item.courses.map((course: string, idx: number) => (
                                    <Badge key={idx} variant="accent" className="text-[10px] px-1 py-0">
                                      {course}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge
                                variant={item.status === "active" ? "default" : "destructive"}
                              >
                                {item.status || "active"}
                              </Badge>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenStaffEdit(item)}
                                  className="h-8 px-2 text-primary"
                                >
                                  <Edit2 className="size-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenStaffDeleteConfirm(item)}
                                  className="h-8 px-2 text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION PANEL */}
              {staffCount > itemsPerPage && (
                <div className="flex items-center justify-between p-4 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    Showing {(staffPage - 1) * itemsPerPage + 1} - {Math.min(staffPage * itemsPerPage, staffCount)} of {staffCount} staff records
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={staffPage === 1 || staffLoading}
                      onClick={() => setStaffPage((c) => c - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={staffPage * itemsPerPage >= staffCount || staffLoading}
                      onClick={() => setStaffPage((c) => c + 1)}
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

      {/* --- CLINICAL GUIDES TAB --- */}
      {activeTab === "guides" && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          {/* SEARCH & FILTERS PANEL */}
          <Card className="border-border">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Stethoscope className="size-5 text-primary" /> Clinical Posting Guides Directory
                </CardTitle>
                <CardDescription>Manage posting references, checklists, expectations, and rotation sections.</CardDescription>
              </div>
              <Button onClick={handleOpenGuideCreate} size="sm" className="flex items-center gap-1">
                <Plus className="size-4" /> Add Guide
              </Button>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div className="relative col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search guides by title or specialty..."
                  className="pl-9"
                  value={guidesSearch}
                  onChange={(e) => setGuidesSearch(e.target.value)}
                />
              </div>

              <div>
                <select
                  value={guidesStatusFilter}
                  onChange={(e) => setGuidesStatusFilter(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* GUIDES LIST TABLE */}
          <Card className="border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="p-4">Guide Details</th>
                      <th className="p-4">Specialty</th>
                      <th className="p-4">Target Level</th>
                      <th className="p-4">Sections Count</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm">
                    {guidesLoading ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          <RefreshCw className="mx-auto h-5 w-5 animate-spin text-primary" />
                          <p className="mt-2">Retrieving guides index...</p>
                        </td>
                      </tr>
                    ) : guidesError ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-destructive font-medium">
                          {guidesError}
                        </td>
                      </tr>
                    ) : guides.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          No clinical guides found.
                        </td>
                      </tr>
                    ) : (
                      guides.map((item) => {
                        return (
                          <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-4">
                              <div className="font-semibold text-foreground flex items-center gap-1.5">
                                <Stethoscope className="size-4 text-primary shrink-0" />
                                {item.title}
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge variant="outline">{item.specialty}</Badge>
                            </td>
                            <td className="p-4 font-mono text-xs">
                              {item.level || "General (All)"}
                            </td>
                            <td className="p-4">
                              <Badge variant="secondary">
                                {Array.isArray(item.sections) ? item.sections.length : 0} section(s)
                              </Badge>
                            </td>
                            <td className="p-4 capitalize">
                              <Badge
                                variant={
                                  item.status === "published"
                                    ? "default"
                                    : "outline"
                                }
                              >
                                {item.status || "draft"}
                              </Badge>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {item.status !== "published" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    title="Publish guide"
                                    onClick={() => handleGuideQuickStatusChange(item, "published")}
                                    className="h-8 px-2 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                                  >
                                    <CheckCircle className="size-4" />
                                  </Button>
                                )}
                                {item.status === "published" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    title="Move to draft"
                                    onClick={() => handleGuideQuickStatusChange(item, "draft")}
                                    className="h-8 px-2 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                                  >
                                    <Ban className="size-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenGuideEdit(item)}
                                  className="h-8 px-2 text-primary"
                                >
                                  <Edit2 className="size-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenGuideDeleteConfirm(item)}
                                  className="h-8 px-2 text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION PANEL */}
              {guidesCount > itemsPerPage && (
                <div className="flex items-center justify-between p-4 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    Showing {(guidesPage - 1) * itemsPerPage + 1} - {Math.min(guidesPage * itemsPerPage, guidesCount)} of {guidesCount} guides
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={guidesPage === 1 || guidesLoading}
                      onClick={() => setGuidesPage((c) => c - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={guidesPage * itemsPerPage >= guidesCount || guidesLoading}
                      onClick={() => setGuidesPage((c) => c + 1)}
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

      {/* --- TUTORIALS TAB --- */}
      {activeTab === "tutorials" && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          {/* SEARCH & FILTERS PANEL */}
          <Card className="border-border">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="size-5 text-primary" /> Tutorials Administration Directory
                </CardTitle>
                <CardDescription>Manage rich interactive tutorials and map integrated learning assessments.</CardDescription>
              </div>
              <Button onClick={handleOpenTutorialCreate} size="sm" className="flex items-center gap-1">
                <Plus className="size-4" /> Add Tutorial
              </Button>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div className="relative col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search tutorials by title..."
                  className="pl-9"
                  value={tutorialsSearch}
                  onChange={(e) => setTutorialsSearch(e.target.value)}
                />
              </div>

              <div>
                <select
                  value={tutorialsCourseFilter}
                  onChange={(e) => setTutorialsCourseFilter(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="all">All Courses</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code}: {course.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={tutorialsStatusFilter}
                  onChange={(e) => setTutorialsStatusFilter(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* TUTORIALS LIST TABLE */}
          <Card className="border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="p-4">Tutorial Details</th>
                      <th className="p-4">Course</th>
                      <th className="p-4">Sections</th>
                      <th className="p-4">Linked Quiz</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm">
                    {tutorialsLoading ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          <RefreshCw className="mx-auto h-5 w-5 animate-spin text-primary" />
                          <p className="mt-2">Retrieving tutorials list...</p>
                        </td>
                      </tr>
                    ) : tutorialsError ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-destructive font-medium">
                          {tutorialsError}
                        </td>
                      </tr>
                    ) : tutorialsList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          No matching tutorials found.
                        </td>
                      </tr>
                    ) : (
                      tutorialsList.map((item) => {
                        const linkedQuiz = quizzesList.find(q => q.id === item.linked_quiz_id)

                        return (
                          <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-4">
                              <div className="font-semibold text-foreground flex items-center gap-1.5">
                                <FileText className="size-4 text-primary shrink-0" />
                                {item.title}
                              </div>
                              {item.overview && (
                                <div className="text-xs text-muted-foreground mt-0.5 max-w-sm truncate" title={item.overview}>
                                  {item.overview}
                                </div>
                              )}
                            </td>
                            <td className="p-4">
                              <Badge variant="outline">
                                {item.courses?.code || "GENERAL"}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <Badge variant="secondary">
                                {Array.isArray(item.sections) ? item.sections.length : 0} section(s)
                              </Badge>
                            </td>
                            <td className="p-4">
                              {linkedQuiz ? (
                                <div className="flex flex-col gap-0.5 text-xs">
                                  <span className="font-semibold text-foreground max-w-[150px] truncate" title={linkedQuiz.topic}>
                                    {linkedQuiz.topic}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    Format: {linkedQuiz.format || "MCQ"}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">None mapped</span>
                              )}
                            </td>
                            <td className="p-4 capitalize">
                              <Badge variant={item.status === "published" ? "default" : "outline"}>
                                {item.status || "draft"}
                              </Badge>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {item.status !== "published" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    title="Publish tutorial"
                                    onClick={() => handleTutorialQuickStatusChange(item, "published")}
                                    className="h-8 px-2 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                                  >
                                    <CheckCircle className="size-4" />
                                  </Button>
                                )}
                                {item.status === "published" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    title="Move to draft"
                                    onClick={() => handleTutorialQuickStatusChange(item, "draft")}
                                    className="h-8 px-2 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                                  >
                                    <Ban className="size-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenTutorialEdit(item)}
                                  className="h-8 px-2 text-primary"
                                >
                                  <Edit2 className="size-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenTutorialDeleteConfirm(item)}
                                  className="h-8 px-2 text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION PANEL */}
              {tutorialsCount > itemsPerPage && (
                <div className="flex items-center justify-between p-4 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    Showing {(tutorialsPage - 1) * itemsPerPage + 1} - {Math.min(tutorialsPage * itemsPerPage, tutorialsCount)} of {tutorialsCount} tutorials
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={tutorialsPage === 1 || tutorialsLoading}
                      onClick={() => setTutorialsPage((c) => c - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={tutorialsPage * itemsPerPage >= tutorialsCount || tutorialsLoading}
                      onClick={() => setTutorialsPage((c) => c + 1)}
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

      {/* --- STAFF FORM DRAWER (SHEET) --- */}
      <Sheet open={staffFormOpen} onOpenChange={setStaffFormOpen}>
        <SheetContent side="right" className="sm:max-w-md overflow-y-auto w-full">
          <SheetHeader>
            <SheetTitle>
              {staffFormMode === "create" ? "Add Staff Member" : "Modify Staff Member"}
            </SheetTitle>
            <SheetDescription>
              Populate profile fields to maintain an accurate staff directory. All additions and modifications are audited and logged.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleStaffFormSubmit} className="space-y-5 p-4">
            {staffFormError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/15 p-3 text-sm text-destructive font-medium">
                {staffFormError}
              </div>
            )}
            {staffFormSuccess && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-500 font-medium">
                {staffFormSuccess}
              </div>
            )}

            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="staff-name" className="text-xs font-medium text-foreground">Full Name</label>
              <Input
                id="staff-name"
                placeholder="e.g., Prof. Kofi Boateng"
                value={formStaffName}
                onChange={(e) => setFormStaffName(e.target.value)}
                required
              />
            </div>

            {/* Photo URL */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="staff-photo-url" className="text-xs font-medium text-foreground">Photo URL (Optional)</label>
              <Input
                id="staff-photo-url"
                placeholder="https://..."
                value={formStaffPhotoUrl}
                onChange={(e) => setFormStaffPhotoUrl(e.target.value)}
              />
            </div>

            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="staff-title" className="text-xs font-medium text-foreground">Academic Title / Role</label>
              <Input
                id="staff-title"
                placeholder="e.g., Professor of Physiology"
                value={formStaffTitle}
                onChange={(e) => setFormStaffTitle(e.target.value)}
                required
              />
            </div>

            {/* Department */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="staff-dept" className="text-xs font-medium text-foreground">Department</label>
              <select
                id="staff-dept"
                value={formStaffDepartment}
                onChange={(e) => setFormStaffDepartment(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              >
                <option value="Physiology">Physiology</option>
                <option value="Pathology">Pathology</option>
                <option value="Pharmacology">Pharmacology</option>
                <option value="Anatomy">Anatomy</option>
                <option value="Community Medicine">Community Medicine</option>
                <option value="Clinical Skills">Clinical Skills</option>
              </select>
            </div>

            {/* Specialty */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="staff-specialty" className="text-xs font-medium text-foreground">Specialty (Optional)</label>
              <Input
                id="staff-specialty"
                placeholder="e.g., Cardiovascular Physiology"
                value={formStaffSpecialty}
                onChange={(e) => setFormStaffSpecialty(e.target.value)}
              />
            </div>

            {/* Courses text array via comma-separated list */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="staff-courses" className="text-xs font-medium text-foreground">Courses Taught (Comma-separated)</label>
              <Input
                id="staff-courses"
                placeholder="e.g., ANA 201, PIO 201"
                value={formStaffCoursesText}
                onChange={(e) => setFormStaffCoursesText(e.target.value)}
              />
            </div>

            {/* Status (active/inactive toggle) */}
            <div className="flex flex-col gap-1.5 pt-2 border-t">
              <label htmlFor="staff-status" className="text-xs font-medium text-foreground">Status</label>
              <select
                id="staff-status"
                value={formStaffStatus}
                onChange={(e) => setFormStaffStatus(e.target.value as "active" | "inactive")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="active">Active (Visible to Students)</option>
                <option value="inactive">Inactive (Hidden from Students)</option>
              </select>
            </div>

            {/* Save Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="submit"
                className="flex-1"
                disabled={staffFormLoading}
              >
                {staffFormLoading ? "Processing transaction..." : "Apply Staff Changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStaffFormOpen(false)
                  setEditingStaff(null)
                }}
                disabled={staffFormLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* --- STAFF DELETE CONFIRMATION DIALOG --- */}
      {staffDeleteConfirmOpen && staffToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <Card className="w-full max-w-md border-destructive/30 shadow-2xl animate-in zoom-in-95 duration-200">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-1.5">
                <AlertTriangle className="size-5" /> Confirm Staff Deletion
              </CardTitle>
              <CardDescription>
                Are you absolutely sure you want to permanently delete the staff record: <strong className="text-foreground">&quot;{staffToDelete.full_name}&quot;</strong>?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground leading-normal">
                This will completely remove the staff profile, courses taught, and credentials from the system. This action cannot be undone.
              </p>

              {staffDeleteError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/15 p-3 text-sm text-destructive font-medium">
                  {staffDeleteError}
                </div>
              )}

              <div className="flex justify-end gap-3 border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStaffDeleteConfirmOpen(false)
                    setStaffToDelete(null)
                  }}
                  disabled={staffDeleteLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteStaff}
                  disabled={staffDeleteLoading}
                >
                  {staffDeleteLoading ? "Deleting profile..." : "Confirm Deletion"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* --- DELETE CONFIRMATION DIALOG --- */}
      {deleteConfirmOpen && materialToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <Card className="w-full max-w-md border-destructive/30 shadow-2xl animate-in zoom-in-95 duration-200">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-1.5">
                <AlertTriangle className="size-5" /> Confirm Deletion
              </CardTitle>
              <CardDescription>
                Are you absolutely sure you want to permanently delete the study material: <strong className="text-foreground">&quot;{materialToDelete.title}&quot;</strong>?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground leading-normal">
                This will completely remove the resource entry from the academic directories. If no other study resources reference the attached document file ({materialToDelete.storage_path || "None"}), the physical file will also be permanently deleted from the storage servers.
              </p>

              {deleteError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/15 p-3 text-sm text-destructive font-medium">
                  {deleteError}
                </div>
              )}

              <div className="flex justify-end gap-3 border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteConfirmOpen(false)
                    setMaterialToDelete(null)
                  }}
                  disabled={deleteLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteMaterial}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? "Deleting resource..." : "Confirm Deletion"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* --- CLINICAL GUIDE FORM DRAWER (SHEET) --- */}
      <Sheet open={guideFormOpen} onOpenChange={setGuideFormOpen}>
        <SheetContent side="right" className="sm:max-w-xl overflow-y-auto w-full">
          <SheetHeader>
            <SheetTitle>
              {guideFormMode === "create" ? "Add Clinical Posting Guide" : "Modify Clinical Posting Guide"}
            </SheetTitle>
            <SheetDescription>
              Populate rotation guides and sections dynamically. All edits are logged.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleGuideFormSubmit} className="space-y-5 p-4">
            {guideFormError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/15 p-3 text-sm text-destructive font-medium">
                {guideFormError}
              </div>
            )}
            {guideFormSuccess && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-500 font-medium">
                {guideFormSuccess}
              </div>
            )}

            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="guide-title" className="text-xs font-medium text-foreground">Guide Title</label>
              <Input
                id="guide-title"
                placeholder="e.g., Surgery — Theatre Etiquette"
                value={formGuideTitle}
                onChange={(e) => setFormGuideTitle(e.target.value)}
                required
              />
            </div>

            {/* Specialty */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="guide-specialty" className="text-xs font-medium text-foreground">Specialty / Department</label>
              <Input
                id="guide-specialty"
                placeholder="e.g., Surgery, Paediatrics, O&G"
                value={formGuideSpecialty}
                onChange={(e) => setFormGuideSpecialty(e.target.value)}
                required
              />
            </div>

            {/* Target Level */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="guide-level" className="text-xs font-medium text-foreground">Target Academic Level</label>
              <select
                id="guide-level"
                value={formGuideLevel}
                onChange={(e) => setFormGuideLevel(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">General / All Levels</option>
                <option value="100L">100L</option>
                <option value="200L">200L</option>
                <option value="300L">300L</option>
                <option value="400L">400L</option>
                <option value="500L">500L</option>
                <option value="600L">600L</option>
                <option value="Final Year">Final Year</option>
              </select>
            </div>

            {/* Status */}
            <div className="flex flex-col gap-1.5 pt-2 border-t">
              <label htmlFor="guide-status" className="text-xs font-medium text-foreground">Status</label>
              <select
                id="guide-status"
                value={formGuideStatus}
                onChange={(e) => setFormGuideStatus(e.target.value as "draft" | "published")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="draft">Draft (Hidden from Students)</option>
                <option value="published">Published (Visible to Students)</option>
              </select>
            </div>

            {/* Sections JSONB array management */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Dynamic Guide Sections</span>
                <Button type="button" variant="outline" size="sm" onClick={handleAddSection} className="flex items-center gap-1">
                  <Plus className="size-3.5" /> Add Section
                </Button>
              </div>

              <div className="space-y-4">
                {formGuideSections.map((sec, idx) => (
                  <div key={idx} className="p-3 border rounded-lg bg-muted/10 space-y-3 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">Section #{idx + 1}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={idx === 0}
                          onClick={() => handleMoveSection(idx, "up")}
                          className="size-7"
                          title="Move Up"
                        >
                          <ChevronUp className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={idx === formGuideSections.length - 1}
                          onClick={() => handleMoveSection(idx, "down")}
                          className="size-7"
                          title="Move Down"
                        >
                          <ChevronDown className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveSection(idx)}
                          className="size-7 text-destructive hover:bg-destructive/10"
                          title="Remove Section"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <Input
                        placeholder="Section Heading (e.g. Ward Rules)"
                        value={sec.heading}
                        onChange={(e) => handleUpdateSection(idx, "heading", e.target.value)}
                        className="h-8 text-xs font-medium"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <textarea
                        placeholder="Section Content..."
                        value={sec.content}
                        onChange={(e) => handleUpdateSection(idx, "content", e.target.value)}
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Save Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="submit"
                className="flex-1"
                disabled={guideFormLoading}
              >
                {guideFormLoading ? "Processing transaction..." : "Apply Guide Changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setGuideFormOpen(false)
                  setEditingGuide(null)
                }}
                disabled={guideFormLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* --- CLINICAL GUIDE DELETE CONFIRMATION DIALOG --- */}
      {guideDeleteConfirmOpen && guideToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <Card className="w-full max-w-md border-destructive/30 shadow-2xl animate-in zoom-in-95 duration-200">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-1.5">
                <AlertTriangle className="size-5" /> Confirm Guide Deletion
              </CardTitle>
              <CardDescription>
                Are you absolutely sure you want to permanently delete the clinical guide: <strong className="text-foreground">&quot;{guideToDelete.title}&quot;</strong>?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground leading-normal">
                This will completely remove the clinical guide and all of its sections. This action cannot be undone.
              </p>

              {guideDeleteError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/15 p-3 text-sm text-destructive font-medium">
                  {guideDeleteError}
                </div>
              )}

              <div className="flex justify-end gap-3 border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setGuideDeleteConfirmOpen(false)
                    setGuideToDelete(null)
                  }}
                  disabled={guideDeleteLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteGuide}
                  disabled={guideDeleteLoading}
                >
                  {guideDeleteLoading ? "Deleting guide..." : "Confirm Deletion"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* --- TUTORIAL FORM DRAWER (SHEET) --- */}
      <Sheet open={tutorialFormOpen} onOpenChange={setTutorialFormOpen}>
        <SheetContent side="right" className="sm:max-w-xl overflow-y-auto w-full">
          <SheetHeader>
            <SheetTitle>
              {tutorialFormMode === "create" ? "Add Tutorial" : "Modify Tutorial"}
            </SheetTitle>
            <SheetDescription>
              Populate tutorial details, sections, and associate assessment quizzes dynamically. All modifications are logged.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleTutorialFormSubmit} className="space-y-5 p-4">
            {tutorialFormError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/15 p-3 text-sm text-destructive font-medium">
                {tutorialFormError}
              </div>
            )}
            {tutorialFormSuccess && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-500 font-medium">
                {tutorialFormSuccess}
              </div>
            )}

            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="tutorial-title" className="text-xs font-medium text-foreground">Tutorial Title</label>
              <Input
                id="tutorial-title"
                placeholder="e.g., Immunology of Vaccines"
                value={formTutorialTitle}
                onChange={(e) => setFormTutorialTitle(e.target.value)}
                required
              />
            </div>

            {/* Course Mapped */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="tutorial-course" className="text-xs font-medium text-foreground">Academic Course Mapping</label>
              <select
                id="tutorial-course"
                value={formTutorialCourseId}
                onChange={(e) => setFormTutorialCourseId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              >
                <option value="">-- Choose Course --</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code}: {course.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Overview */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="tutorial-overview" className="text-xs font-medium text-foreground">Tutorial Overview</label>
              <textarea
                id="tutorial-overview"
                placeholder="Provide a general summary or overview of the tutorial lesson..."
                value={formTutorialOverview}
                onChange={(e) => setFormTutorialOverview(e.target.value)}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {/* Status */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="tutorial-status" className="text-xs font-medium text-foreground">Status</label>
              <select
                id="tutorial-status"
                value={formTutorialStatus}
                onChange={(e) => setFormTutorialStatus(e.target.value as "draft" | "published")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="draft">Draft (Hidden from Students)</option>
                <option value="published">Published (Visible to Students)</option>
              </select>
            </div>

            {/* Quiz Linking flows */}
            <div className="space-y-4 pt-4 border-t">
              <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="size-4 text-primary" /> Quiz Integration Mapping
              </span>

              {/* Pick existing quiz dropdown */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="tutorial-linked-quiz" className="text-xs font-medium text-foreground">
                  Option A: Pick Existing Mapped Quiz
                </label>
                <select
                  id="tutorial-linked-quiz"
                  value={formTutorialLinkedQuizId}
                  onChange={(e) => setFormTutorialLinkedQuizId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none"
                >
                  <option value="">-- No Quiz Linked --</option>
                  {quizzesList
                    .filter((q) => !formTutorialCourseId || q.course_id === formTutorialCourseId)
                    .map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.courses?.code ? `[${q.courses.code}] ` : ""}{q.topic} ({q.format || "MCQ"})
                      </option>
                    ))}
                </select>
              </div>

              {/* Generate new quiz in form */}
              <div className="space-y-2 p-3 border rounded-lg bg-muted/20">
                <label htmlFor="form-quiz-topic" className="text-xs font-semibold text-foreground block">
                  Option B: AI Generate New Quiz
                </label>
                <p className="text-[10px] text-muted-foreground leading-normal">
                  Generate 10 multiple choice questions dynamically via MedHaven AI, which will be automatically set as the linked quiz ID.
                </p>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="form-quiz-topic"
                    placeholder="Enter topic (e.g. Action potential)"
                    value={formQuizTopic}
                    onChange={(e) => setFormQuizTopic(e.target.value)}
                    className="h-9 text-xs"
                    disabled={formQuizGenerating}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleGenerateQuizInForm}
                    disabled={formQuizGenerating || !formQuizTopic.trim() || !formTutorialCourseId}
                    className="shrink-0 h-9"
                  >
                    {formQuizGenerating ? "Generating..." : "Generate & Link"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Dynamic sections editor pattern */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Dynamic Tutorial Sections</span>
                <Button type="button" variant="outline" size="sm" onClick={handleAddTutorialSection} className="flex items-center gap-1">
                  <Plus className="size-3.5" /> Add Section
                </Button>
              </div>

              <div className="space-y-4">
                {formTutorialSections.map((sec, idx) => (
                  <div key={idx} className="p-3 border rounded-lg bg-muted/10 space-y-3 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">Section #{idx + 1}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={idx === 0}
                          onClick={() => handleMoveTutorialSection(idx, "up")}
                          className="size-7"
                          title="Move Up"
                        >
                          <ChevronUp className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={idx === formTutorialSections.length - 1}
                          onClick={() => handleMoveTutorialSection(idx, "down")}
                          className="size-7"
                          title="Move Down"
                        >
                          <ChevronDown className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveTutorialSection(idx)}
                          className="size-7 text-destructive hover:bg-destructive/10"
                          title="Remove Section"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <Input
                        placeholder="Section Heading (e.g. Core Mechanisms)"
                        value={sec.heading}
                        onChange={(e) => handleUpdateTutorialSection(idx, "heading", e.target.value)}
                        className="h-8 text-xs font-medium"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <textarea
                        placeholder="Section content and detailed descriptions..."
                        value={sec.content}
                        onChange={(e) => handleUpdateTutorialSection(idx, "content", e.target.value)}
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Save Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="submit"
                className="flex-1"
                disabled={tutorialFormLoading}
              >
                {tutorialFormLoading ? "Processing transaction..." : "Apply Tutorial Changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setTutorialFormOpen(false)
                  setEditingTutorial(null)
                }}
                disabled={tutorialFormLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* --- TUTORIAL DELETE CONFIRMATION DIALOG --- */}
      {tutorialDeleteConfirmOpen && tutorialToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <Card className="w-full max-w-md border-destructive/30 shadow-2xl animate-in zoom-in-95 duration-200">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-1.5">
                <AlertTriangle className="size-5" /> Confirm Tutorial Deletion
              </CardTitle>
              <CardDescription>
                Are you absolutely sure you want to permanently delete the tutorial: <strong className="text-foreground">&quot;{tutorialToDelete.title}&quot;</strong>?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground leading-normal">
                This will completely remove the tutorial and all of its sections. This action cannot be undone.
              </p>

              {tutorialDeleteError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/15 p-3 text-sm text-destructive font-medium">
                  {tutorialDeleteError}
                </div>
              )}

              <div className="flex justify-end gap-3 border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setTutorialDeleteConfirmOpen(false)
                    setTutorialToDelete(null)
                  }}
                  disabled={tutorialDeleteLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteTutorial}
                  disabled={tutorialDeleteLoading}
                >
                  {tutorialDeleteLoading ? "Deleting tutorial..." : "Confirm Deletion"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}