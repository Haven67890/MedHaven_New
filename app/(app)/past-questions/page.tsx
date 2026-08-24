"use client"

import { getSlideDeckProvider, getSlideEmbedApiUrl, getSlideDeckProviderName, getIframePreviewSrc } from "@/lib/embed"

import { useState, useEffect, useRef, useMemo } from "react"
import useAuth from "@/hooks/useAuth"
import {
  BookMarked,
  BookOpen,
  Library,
  Video,
  ExternalLink,
  FileText,
  X,
  ChevronDown,
  ChevronUp,
  Folder,
  Download,
  Star
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { StatCard } from "@/components/dashboard/stat-card"
import { createClient } from "@/lib/supabase/client"
import { MaterialCard } from "@/components/dashboard/material-card"
import { MaterialPreviewModal, PreviewModalData } from "@/components/dashboard/material-preview-modal"
import { logMaterialActivity } from "@/utils/activity"
import { getCachedData, setCachedData } from "@/lib/cache"
import { CollectionsSkeleton, MaterialGridSkeleton } from "@/components/feedback/loading-skeletons"
import { SearchInput } from "@/components/ui/search-input"

interface Faculty {
  id: string
  name: string
}

interface Course {
  id: string
  code?: string | null
  title?: string | null
  level?: string | number | null
  parent_id?: string | null
  faculties?: Faculty | null
}

interface Material {
  id: string
  course_id: string | null
  title: string
  type: string
  tier: string
  source_url?: string | null
  storage_path?: string | null
  description?: string | null
  uploaded_by?: string | null
  created_at: string
  courses?: Course | null
}

const colorMap: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/15 text-secondary dark:text-secondary/90",
  accent: "bg-accent text-accent-foreground",
}

const collectionIcons = { BookOpen, BookMarked, Library } as const

function getLevelPhase(level: string | number | null | undefined): "pre-clinical" | "clinical" {
  if (!level) return "pre-clinical"
  const lvl = String(level).toUpperCase().trim()
  const clinicalLevels = ["400L", "500L", "600L", "FINAL YEAR"]
  return clinicalLevels.includes(lvl) ? "clinical" : "pre-clinical"
}

// Helper to format type names neatly
function formatTypeName(type: string): string {
  if (!type) return "Material"
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

// Helper to extract YouTube ID and build embed URL
function getYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
  const match = url.match(regExp)
  return match && match[1] ? match[1] : null
}

function getYouTubeEmbedUrl(url: string | null | undefined): string | null {
  const id = getYouTubeId(url)
  return id ? `https://www.youtube.com/embed/${id}` : null
}

// Helper to resolve material URL
function getMaterialUrl(material: Material): string {
  if (!material.storage_path) {
    return material.source_url || "#"
  }
  if (material.storage_path.startsWith("http://") || material.storage_path.startsWith("https://")) {
    return material.storage_path
  }
  return `/api/materials/signed-url?path=${encodeURIComponent(material.storage_path)}`
}

// Helper to get file extension from URL
function getFileExtension(url: string | null | undefined): string {
  if (!url) return ""
  try {
    const path = url.split('?')[0]
    const parts = path.split('.')
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ""
  } catch (e) {
    return ""
  }
}

function isImageMaterial(material: Material): boolean {
  const url = getMaterialUrl(material)
  if (!url || url === "#") return false
  const ext = getFileExtension(url)
  return ["jpg", "jpeg", "png"].includes(ext)
}

interface SlideShareEmbedProps {
  url: string
  title: string
  onError: () => void
}

function SlideShareEmbed({ url, title, onError }: SlideShareEmbedProps) {
  const [embedSrc, setEmbedSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  useEffect(() => {
    let active = true
    async function fetchEmbed() {
      try {
        const provider = getSlideDeckProvider(url) || "slideshare"
        const res = await fetch(getSlideEmbedApiUrl(provider, url))
        if (!res.ok) {
          throw new Error("Failed to fetch")
        }
        const data = await res.json()
        if (!data.html) {
          throw new Error("No HTML field in response")
        }

        const parser = new DOMParser()
        const doc = parser.parseFromString(data.html, "text/html")
        const iframe = doc.querySelector("iframe")
        let src = iframe ? iframe.getAttribute("src") : null

        if (!src && data.html && (data.html.startsWith("http") || data.html.startsWith("//"))) {
          src = data.html
        }

        if (src && active) {
          const normalizedSrc = src.startsWith("//") ? `https:${src}` : src
          setEmbedSrc(normalizedSrc)
        } else {
          throw new Error("Could not extract iframe src")
        }
      } catch (err) {
        console.error("SlideShare embed failed:", err)
        if (active) {
          onErrorRef.current()
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void fetchEmbed()

    return () => {
      active = false
    }
  }, [url])

  if (loading) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted flex items-center justify-center">
        <p className="text-xs text-muted-foreground animate-pulse">Loading slide embed...</p>
      </div>
    )
  }

  if (!embedSrc) {
    return null
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
      <iframe
        src={embedSrc}
        title={title}
        allowFullScreen
        className="absolute inset-0 h-full w-full border-0"
      />
    </div>
  )
}

interface CollapsibleImageGroupCardProps {
  images: Material[]
  onViewImage: (material: Material) => void
}

function CollapsibleImageGroupCard({
  images,
  onViewImage,
}: CollapsibleImageGroupCardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { user } = useAuth()

  if (images.length === 0) return null

  const courseTitle = images[0]?.courses?.title || images[0]?.courses?.code || "General"

  return (
    <Card className="gap-3 flex flex-col justify-between overflow-hidden border-primary/20 hover:border-primary/40 transition-colors duration-200">
      <CardHeader
        className="relative cursor-pointer select-none pb-3"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <Folder className="size-5" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-0.5 overflow-hidden pr-8">
            <CardTitle className="text-base leading-snug truncate">
              {courseTitle} — Scanned Past Questions ({images.length})
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {images.length} scan${images.length > 1 ? "s" : ""} available
            </CardDescription>
          </div>
        </div>
        <CardAction className="flex items-center gap-2">
          <Badge variant="success">IMAGE GROUP</Badge>
          <div className="text-muted-foreground p-1">
            {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </div>
        </CardAction>
      </CardHeader>

      <CardContent className="pt-0 flex flex-col gap-3">
        {isOpen && (
          <div className="border-t pt-3 animate-in fade-in duration-200">
            <div className="grid grid-cols-3 gap-2">
              {images.map((img) => {
                const imgUrl = getMaterialUrl(img)
                return (
                  <button
                    key={img.id}
                    onClick={() => {
                      onViewImage(img)
                      if (user?.id) {
                        logMaterialActivity(user.id, img.id, "view")
                      }
                    }}
                    className="group relative aspect-square overflow-hidden rounded-lg border bg-muted hover:border-primary transition-all duration-200 text-left focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                    title={img.title}
                  >
                    <img
                      src={imgUrl}
                      alt={img.title}
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-1.5">
                      <p className="text-[10px] font-medium text-white line-clamp-2 leading-tight">
                        {img.title}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function PastQuestionsPage() {
  const supabase = createClient()
  const { user } = useAuth()

  const [materials, setMaterials] = useState<Material[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [failedSlideShareEmbeds, setFailedSlideShareEmbeds] = useState<Record<string, boolean>>({})
  const [userLevel, setUserLevel] = useState<string | null>(null)
  const [contentVisibility, setContentVisibility] = useState<string>("all")

  // Preview Modal State
  const [previewModal, setPreviewModal] = useState<PreviewModalData | null>(null)

  // Filters State
  const [searchQuery, setSearchQuery] = useState("")
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("")
  const [isSearchingResults, setIsSearchingResults] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState<string>("all")
  const [selectedTier, setSelectedTier] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("name")

  // Fetch logged in student level and content visibility preferences
  useEffect(() => {
    const userId = user?.id
    if (!userId) return
    let active = true
    async function fetchUserLevelAndPreferences() {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("current_level")
          .eq("id", userId)
          .maybeSingle()
        if (active && !profileError && profileData) {
          setUserLevel(profileData.current_level)
        }

        const { data: prefData, error: prefError } = await supabase
          .from("user_preferences")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle()
        if (active && !prefError && prefData) {
          if (prefData.content_visibility) {
            setContentVisibility(prefData.content_visibility)
          } else if (prefData.show_other_levels === false) {
            setContentVisibility("group")
          } else {
            setContentVisibility("all")
          }
        }
      } catch (err) {
        console.error("Failed to fetch user level or preferences:", err)
      }
    }
    void fetchUserLevelAndPreferences()
    return () => {
      active = false
    }
  }, [user?.id, supabase])

  useEffect(() => {
    let mounted = true

    const fetchData = async () => {
      try {
        const cached = getCachedData<{ courses: Course[]; materials: Material[] }>("past_questions_data")
        if (cached) {
          setCourses(cached.courses)
          setMaterials(cached.materials)
          setIsLoading(false)
        } else {
          setIsLoading(true)
        }
        setError(null)

        // 1. Fetch courses
        const { data: coursesData, error: coursesError } = await supabase
          .from("courses")
          .select("id, code, title, level, parent_id")
          .order("code", { ascending: true })

        if (coursesError) throw coursesError

        // 2. Fetch materials joined with courses and faculties (pre-filtered to type = 'past_question')
        const { data: mData, error: mError } = await supabase
          .from("materials")
          .select(`
            id,
            course_id,
            title,
            type,
            tier,
            source_url,
            storage_path,
            description,
            uploaded_by,
            created_at,
            courses (
              id,
              code,
              title,
              level,
              parent_id,
              faculties (
                id,
                name
              )
            )
          `)
          .eq("type", "past_question")
          .eq("status", "published")
          .order("created_at", { ascending: false })

        if (mError) throw mError

        if (mounted) {
          const finalCourses = (coursesData as Course[]) || []
          const finalMaterials = (mData as unknown as Material[]) || []
          setCourses(finalCourses)
          setMaterials(finalMaterials)
          setCachedData("past_questions_data", { courses: finalCourses, materials: finalMaterials })
        }
      } catch (err: any) {
        console.error("Error loading past questions data:", err)
        if (mounted) {
          setError(err?.message || "Failed to load materials. Please try again.")
          setCourses([])
          setMaterials([])
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    void fetchData()

    return () => {
      mounted = false
    }
  }, [supabase])

  const levelFilteredCourses = useMemo(() => {
    if (contentVisibility === "all" || !userLevel) return courses
    const userPhase = getLevelPhase(userLevel)
    return courses.filter((course) => {
      if (!course.level) return true
      if (contentVisibility === "exact") {
        return String(course.level).toUpperCase().trim() === String(userLevel).toUpperCase().trim()
      }
      return getLevelPhase(course.level) === userPhase
    })
  }, [courses, contentVisibility, userLevel])

  const levelFilteredMaterials = useMemo(() => {
    if (contentVisibility === "all" || !userLevel) return materials
    const userPhase = getLevelPhase(userLevel)
    return materials.filter((material) => {
      const materialLevel = material.courses?.level ?? null
      if (!materialLevel) return true
      if (contentVisibility === "exact") {
        return String(materialLevel).toUpperCase().trim() === String(userLevel).toUpperCase().trim()
      }
      return getLevelPhase(materialLevel) === userPhase
    })
  }, [materials, contentVisibility, userLevel])

  // Get dynamic collection statistics & display subjects
  const subjectData = useMemo(() => {
    const groupsMap = new Map<string, { papers: number; questions: number }>()
    levelFilteredMaterials.forEach((m) => {
      const subj = m.courses?.title || m.courses?.code || "General"
      const prev = groupsMap.get(subj) || { papers: 0, questions: 0 }
      groupsMap.set(subj, {
        papers: prev.papers + 1,
        questions: prev.questions + (isImageMaterial(m) ? 1 : 25), // mock count for questions
      })
    })
    return Array.from(groupsMap.entries()).slice(0, 6).map(([name, stats], index) => ({
      id: `subj-${index}`,
      name,
      papers: stats.papers,
      questions: stats.questions,
    }))
  }, [levelFilteredMaterials])

  // Filtering Logic
  const filteredMaterials = levelFilteredMaterials.filter((material) => {
    // 1. Search Query Filter (using submitted query)
    if (appliedSearchQuery.trim() !== "") {
      const q = appliedSearchQuery.toLowerCase()
      const titleMatch = material.title?.toLowerCase().includes(q)
      const descMatch = material.description?.toLowerCase().includes(q)
      const courseCodeMatch = material.courses?.code?.toLowerCase().includes(q)
      const courseNameMatch = material.courses?.title?.toLowerCase().includes(q)
      const facultyMatch = material.courses?.faculties?.name?.toLowerCase().includes(q)

      if (!titleMatch && !descMatch && !courseCodeMatch && !courseNameMatch && !facultyMatch) {
        return false
      }
    }

    // 2. Course Filter
    if (selectedCourseId !== "all" && material.course_id !== selectedCourseId) {
      return false
    }

    // 3. Tier Filter
    if (selectedTier !== "all" && material.tier?.toLowerCase() !== selectedTier.toLowerCase()) {
      return false
    }

    return true
  })

  // Sort and rank materials
  const rankedMaterials = useMemo(() => {
    const sorted = [...filteredMaterials]

    sorted.sort((a, b) => {
      // 1. Primary sort based on user selection
      if (sortBy === "name") {
        const nameA = a.title || ""
        const nameB = b.title || ""
        const cmp = nameA.localeCompare(nameB)
        if (cmp !== 0) return cmp
      } else if (sortBy === "date") {
        const dateA = new Date(a.created_at || 0).getTime()
        const dateB = new Date(b.created_at || 0).getTime()
        if (dateB !== dateA) return dateB - dateA
      } else if (sortBy === "type") {
        const typeA = formatTypeName(a.type)
        const typeB = formatTypeName(b.type)
        const cmp = typeA.localeCompare(typeB)
        if (cmp !== 0) return cmp
      } else if (sortBy === "course") {
        const courseA = a.courses?.code || a.courses?.title || ""
        const courseB = b.courses?.code || b.courses?.title || ""
        const cmp = courseA.localeCompare(courseB)
        if (cmp !== 0) return cmp
      }

      // 2. Student level preference ranking
      if (userLevel) {
        const aLevel = a.courses?.level ?? null
        const bLevel = b.courses?.level ?? null
        const aMatch = String(aLevel) === String(userLevel)
        const bMatch = String(bLevel) === String(userLevel)
        if (aMatch && !bMatch) return -1
        if (!aMatch && bMatch) return 1
      }

      return 0
    })

    return sorted
  }, [filteredMaterials, userLevel, sortBy])

  // Grouping logic for materials per course
  const courseGroups = useMemo(() => {
    const groupsMap = new Map<string | null, Material[]>()
    rankedMaterials.forEach((material) => {
      const cid = material.course_id || null
      if (!groupsMap.has(cid)) {
        groupsMap.set(cid, [])
      }
      groupsMap.get(cid)!.push(material)
    })

    const groupsList: {
      courseId: string | null
      courseTitle: string
      courseCode?: string | null
      level?: string | number | null
      materials: Material[]
    }[] = []

    courses.forEach((course) => {
      if (groupsMap.has(course.id)) {
        groupsList.push({
          courseId: course.id,
          courseTitle: course.title || "",
          courseCode: course.code,
          level: course.level,
          materials: groupsMap.get(course.id)!,
        })
        groupsMap.delete(course.id)
      }
    })

    groupsMap.forEach((mats, cid) => {
      const firstMatLevel = mats[0]?.courses?.level ?? null
      groupsList.push({
        courseId: cid,
        courseTitle: "General Materials",
        courseCode: null,
        level: firstMatLevel,
        materials: mats,
      })
    })

    // Sort courseGroups so that courses at the student's level appear first!
    if (userLevel) {
      groupsList.sort((a, b) => {
        const aMatch = String(a.level) === String(userLevel)
        const bMatch = String(b.level) === String(userLevel)
        if (aMatch && !bMatch) return -1
        if (!aMatch && bMatch) return 1
        return 0
      })
    }

    return groupsList
  }, [rankedMaterials, courses, userLevel])

  const totalPapers = levelFilteredMaterials.length
  const totalQuestionsMock = useMemo(() => {
    return levelFilteredMaterials.reduce((acc, m) => acc + (isImageMaterial(m) ? 1 : 25), 0)
  }, [levelFilteredMaterials])

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Past Questions" description="Practice with real past papers, track your attempts, and sharpen your exam technique.">
        <div className="flex flex-wrap items-center gap-2">
          {/* Sort Control */}
          <select
            id="sort-filter"
            aria-label="Sort materials"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="flex h-9 w-40 rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="name">Name (A-Z)</option>
            <option value="date">Date Added (Newest)</option>
            <option value="type">Type</option>
            <option value="course">Course</option>
          </select>

          {/* Tier Filter */}
          <select
            id="tier-filter"
            aria-label="Filter by tier"
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="flex h-9 w-36 rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="all">All Tiers</option>
            <option value="recommended">Recommended</option>
            <option value="study">Study</option>
          </select>

          {/* Reset Filters */}
          {(selectedTier !== "all" || selectedCourseId !== "all" || searchQuery !== "" || appliedSearchQuery !== "" || sortBy !== "name") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("")
                setAppliedSearchQuery("")
                setSelectedCourseId("all")
                setSelectedTier("all")
                setSortBy("name")
              }}
            >
              <X className="size-3.5 mr-1" /> Reset
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Past papers" value={String(totalPapers)} icon={Library} accent="primary" />
        <StatCard label="Total questions" value={String(totalQuestionsMock)} icon={BookOpen} accent="secondary" />
        <StatCard label="Your attempts" value="32" icon={Star} accent="accent" />
      </section>

      {/* Modern Submit-on-Action Search Bar */}
      <section>
        <SearchInput
          value={searchQuery}
          onChange={(val) => setSearchQuery(val)}
          onSearch={(query) => {
            setIsSearchingResults(true)
            setAppliedSearchQuery(query)
            setTimeout(() => setIsSearchingResults(false), 300)
          }}
          onClear={() => {
            setSearchQuery("")
            setAppliedSearchQuery("")
          }}
          placeholder="Search past questions by title, description, or subject…"
          ariaLabel="Search past questions"
        />
      </section>

      {/* Browse by subject section */}
      <section>
        <SectionHeading title="Browse by subject" description="Pick a subject to see available papers." />
        {subjectData.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {subjectData.map((subject) => (
              <button
                key={subject.id}
                onClick={() => {
                  // Fallback course finder
                  const matched = courses.find(c => c.title === subject.name || c.code === subject.name)
                  if (matched) {
                    setSelectedCourseId(matched.id)
                  }
                }}
                className="group flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] hover:border-primary/40 hover:shadow-md text-left w-full cursor-pointer"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Library className="size-5" aria-hidden="true" />
                </span>
                <span className="text-sm font-medium text-foreground truncate w-full block" title={subject.name}>
                  {subject.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {subject.papers} paper{subject.papers > 1 ? "s" : ""} · {subject.questions} Qs
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No subjects with past questions are available to browse.
          </div>
        )}
      </section>

      {/* Error and Loading States */}
      {error && (
        <div className="bg-destructive/15 border border-destructive/30 text-destructive text-sm rounded-lg p-4 font-medium flex items-center justify-between gap-4">
          <div>
            <span className="font-extrabold uppercase text-xs tracking-wider block">Error:</span>
            <p>{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-8">
          <section>
            <SectionHeading title="Browse by subject" description="Pick a subject to see available papers." />
            <CollectionsSkeleton count={6} />
          </section>
          <section>
            <SectionHeading title="Available papers" description="Recently added and popular past papers." />
            <MaterialGridSkeleton count={6} />
          </section>
        </div>
      ) : (
        <section>
          <div className="flex items-center justify-between">
            <SectionHeading
              title={selectedCourseId !== "all" ? "Filtered past questions" : "Available papers"}
              description="Recently added and popular past papers."
            />
            {selectedCourseId !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCourseId("all")}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear Course Filter
              </Button>
            )}
          </div>

          {isSearchingResults ? (
            <div className="mt-4">
              <MaterialGridSkeleton count={3} />
            </div>
          ) : filteredMaterials.length > 0 ? (
            <div className="flex flex-col gap-8 mt-4">
              {courseGroups.map((group) => {
                const imageMats = group.materials.filter(isImageMaterial)
                const nonImageMats = group.materials.filter((m) => !isImageMaterial(m))

                if (group.materials.length === 0) return null

                return (
                  <div key={group.courseId || "general"} className="flex flex-col gap-4">
                    <div className="border-b border-border pb-2 mt-2">
                      <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
                        <BookOpen className="size-4 text-primary" />
                        {group.courseCode ? `${group.courseCode}: ` : ""}
                        {group.courseTitle}
                      </h3>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {/* Non-image materials */}
                      {nonImageMats.map((material) => (
                        <MaterialCard
                          key={material.id}
                          material={material}
                          onPreview={(mat, type, isEmbeddable) => {
                            if (!mat.storage_path) {
                              if (mat.source_url) {
                                window.open(mat.source_url, "_blank")
                              }
                              return
                            }
                            const downloadUrl = getMaterialUrl(mat)
                            setPreviewModal({
                              isOpen: true,
                              title: mat.title,
                              url: downloadUrl,
                              type: type,
                              isEmbeddable: isEmbeddable,
                              materialId: mat.id,
                              storagePath: mat.storage_path,
                            })
                          }}
                        />
                      ))}

                      {/* Collapsible Image Folder Card */}
                      {imageMats.length > 0 && (
                        <CollapsibleImageGroupCard
                          images={imageMats}
                          onViewImage={(img) => {
                            if (!img.storage_path) {
                              if (img.source_url) {
                                window.open(img.source_url, "_blank")
                              }
                              return
                            }
                            const downloadUrl = getMaterialUrl(img)
                            setPreviewModal({
                              isOpen: true,
                              title: img.title,
                              url: downloadUrl,
                              type: "image",
                              materialId: img.id,
                              storagePath: img.storage_path,
                            })
                          }}
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
              <Library className="size-8 mx-auto mb-3 text-muted-foreground/60" />
              <p className="font-semibold text-foreground text-base mb-1">No materials yet for this course</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Check back soon as more content is added.
              </p>
              {(selectedTier !== "all" || selectedCourseId !== "all" || searchQuery !== "" || appliedSearchQuery !== "") && (
                <Button
                  variant="link"
                  size="sm"
                  className="mt-3 text-primary"
                  onClick={() => {
                    setSearchQuery("")
                    setAppliedSearchQuery("")
                    setSelectedCourseId("all")
                    setSelectedTier("all")
                  }}
                >
                  Clear all active filters
                </Button>
              )}
            </div>
          )}
        </section>
      )}

      {/* Preview Modal */}
      <MaterialPreviewModal modal={previewModal} onClose={() => setPreviewModal(null)} />
    </div>
  )
}
