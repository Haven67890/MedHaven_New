"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import useAuth from "@/hooks/useAuth"
import { useDebounce } from "@/hooks/useDebounce"
import {
  BookMarked,
  BookOpen,
  Library,
  Search,
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
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { StatCard } from "@/components/dashboard/stat-card"
import { createClient } from "@/lib/supabase/client"
import { MaterialCard } from "@/components/dashboard/material-card"
import { logMaterialActivity } from "@/utils/activity"
import { getCachedData, setCachedData } from "@/lib/cache"
import { MaterialGridSkeleton } from "@/components/feedback/loading-skeletons"

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
  if (material.source_url) return material.source_url
  if (material.storage_path) {
    if (material.storage_path.startsWith("http://") || material.storage_path.startsWith("https://")) {
      return material.storage_path
    }
    return `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/${material.storage_path}`
  }
  return "#"
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
  const url = material.source_url || (material.storage_path ? getMaterialUrl(material) : null)
  if (!url) return false
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
        const res = await fetch(`/api/slideshare-embed?url=${encodeURIComponent(url)}`)
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
        const src = iframe ? iframe.getAttribute("src") : null

        if (src && active) {
          setEmbedSrc(src)
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

export default function StudyMaterialsPage() {
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
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean
    title: string
    url: string
    type: "pdf" | "office" | "image" | "video" | "slideshare" | null
    isEmbeddable?: boolean
  } | null>(null)

  // Filters State
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [selectedCourseId, setSelectedCourseId] = useState<string>("all")
  const [selectedType, setSelectedType] = useState<string>("all")

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
        const cached = getCachedData<{ courses: Course[]; materials: Material[] }>("study_materials_data")
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

        // 2. Fetch materials joined with courses and faculties (pre-filtered to tier = 'study')
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
          .eq("tier", "study")
          .eq("status", "published")
          .order("created_at", { ascending: false })

        if (mError) throw mError

        if (mounted) {
          const finalCourses = (coursesData as Course[]) || []
          const finalMaterials = (mData as unknown as Material[]) || []

          if (finalCourses.length === 0) {
            setCourses([
              { id: "mock-course-1", code: "ANA 201", title: "Gross Anatomy", level: "200L" },
              { id: "mock-course-2", code: "BCH 201", title: "Medical Biochemistry", level: "200L" },
              { id: "mock-course-3", code: "PIO 201", title: "Medical Physiology", level: "200L" }
            ])
          } else {
            setCourses(finalCourses)
          }

          if (finalMaterials.length === 0) {
            const fallbackMats = [
              {
                id: "mock-img-1",
                course_id: "mock-course-2",
                title: "BCH 201 Midterm Question Paper 2024",
                type: "past_question",
                tier: "study",
                source_url: "https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/bch_midterm_2024.jpg",
                storage_path: "bch_midterm_2024.jpg",
                description: "Scanned copy of the 2024 biochemistry midterm examination paper.",
                created_at: "2025-01-01T00:00:00.000Z",
                courses: { id: "mock-course-2", code: "BCH 201", title: "Medical Biochemistry", level: "200L" }
              }
            ]
            setMaterials(fallbackMats)
            setCachedData("study_materials_data", { courses: finalCourses, materials: fallbackMats })
          } else {
            setMaterials(finalMaterials)
            setCachedData("study_materials_data", { courses: finalCourses, materials: finalMaterials })
          }
        }
      } catch (err) {
        console.error("Error loading study materials data:", err)
        if (mounted) {
          setCourses([
            { id: "mock-course-1", code: "ANA 201", title: "Gross Anatomy", level: "200L" },
            { id: "mock-course-2", code: "BCH 201", title: "Medical Biochemistry", level: "200L" },
            { id: "mock-course-3", code: "PIO 201", title: "Medical Physiology", level: "200L" }
          ])
          setMaterials([
            {
              id: "mock-img-1",
              course_id: "mock-course-2",
              title: "BCH 201 Midterm Question Paper 2024",
              type: "past_question",
              tier: "study",
              source_url: "https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/bch_midterm_2024.jpg",
              storage_path: "bch_midterm_2024.jpg",
              description: "Scanned copy of the 2024 biochemistry midterm examination paper.",
              created_at: "2025-01-01T00:00:00.000Z",
              courses: { id: "mock-course-2", code: "BCH 201", title: "Medical Biochemistry", level: "200L" }
            }
          ])
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

  // Get dynamic category/collection statistics
  const categoryData = useMemo(() => {
    const groupsMap = new Map<string, number>()
    levelFilteredMaterials.forEach((m) => {
      const typeLabel = formatTypeName(m.type)
      groupsMap.set(typeLabel, (groupsMap.get(typeLabel) || 0) + 1)
    })
    return Array.from(groupsMap.entries()).map(([name, count], index) => ({
      id: `cat-${index}`,
      name,
      count,
    }))
  }, [levelFilteredMaterials])

  // Filtering Logic
  const filteredMaterials = levelFilteredMaterials.filter((material) => {
    // 1. Search Query Filter
    if (debouncedSearchQuery.trim() !== "") {
      const q = debouncedSearchQuery.toLowerCase()
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

    // 3. Type Filter
    if (selectedType !== "all" && material.type?.toLowerCase() !== selectedType.toLowerCase()) {
      return false
    }

    return true
  })

  // Rank materials so student's own level appears first
  const rankedMaterials = useMemo(() => {
    if (!userLevel) return filteredMaterials
    return [...filteredMaterials].sort((a, b) => {
      const aLevel = a.courses?.level ?? null
      const bLevel = b.courses?.level ?? null
      const aMatch = String(aLevel) === String(userLevel)
      const bMatch = String(bLevel) === String(userLevel)
      if (aMatch && !bMatch) return -1
      if (!aMatch && bMatch) return 1
      return 0
    })
  }, [filteredMaterials, userLevel])

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

  const totalTitles = levelFilteredMaterials.length

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Study Materials" description="Curated notes, handouts, and references shared by lecturers and peers.">
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <select
            id="type-filter"
            aria-label="Filter by material type"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="flex h-9 w-36 rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="all">All Types</option>
            <option value="lecture_slide">Lecture Slides</option>
            <option value="pdf">PDF Textbooks</option>
            <option value="past_question">Past Questions</option>
            <option value="textbook">Textbooks</option>
            <option value="tutorial_note">Tutorial Notes</option>
            <option value="video">Videos</option>
          </select>

          {/* Reset Filters */}
          {(selectedType !== "all" || selectedCourseId !== "all" || searchQuery !== "") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("")
                setSelectedCourseId("all")
                setSelectedType("all")
              }}
            >
              <X className="size-3.5 mr-1" /> Reset
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <section className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Total Materials" value={String(totalTitles)} icon={FileText} accent="primary" />
        <StatCard label="Downloaded by you" value="0" icon={Download} accent="secondary" />
        <StatCard label="Your uploads" value="0" icon={FileText} accent="accent" />
        <StatCard label="Avg. rating" value="4.8" icon={Star} accent="warning" />
      </section>

      {/* Search Bar */}
      <section>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            placeholder="Search study materials by title, description, or subject…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label="Search study materials"
          />
        </div>
      </section>

      {/* Categories/Types section */}
      <section>
        <SectionHeading title="Categories" description="Filter materials by type." />
        {categoryData.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {categoryData.map((category) => (
              <Badge key={category.id} variant="outline" className="cursor-default px-3 py-1.5 text-sm">
                {category.name}
                <span className="ml-1.5 text-muted-foreground">{category.count}</span>
              </Badge>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No study materials are available yet.
          </div>
        )}
      </section>

      {/* Error and Loading States */}
      {error && (
        <div className="bg-destructive/15 border border-destructive/30 text-destructive text-sm rounded-lg p-4 font-medium">
          <span className="font-extrabold uppercase text-xs tracking-wider block">Error:</span>
          <p>{error}</p>
        </div>
      )}

      {isLoading ? (
        <section>
          <SectionHeading
            title="All Study Materials"
            description="Browse the study catalog, curated reference resources, and slide packs."
          />
          <MaterialGridSkeleton count={6} />
        </section>
      ) : (
        <section>
          <div className="flex items-center justify-between">
            <SectionHeading
              title={selectedCourseId !== "all" ? "Filtered Study Materials" : "All Study Materials"}
              description="Browse the study catalog, curated reference resources, and slide packs."
            />
            {selectedCourseId !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCourseId("all")}
                className="text-xs"
              >
                Clear Course Filter
              </Button>
            )}
          </div>

          {filteredMaterials.length > 0 ? (
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
                            const downloadUrl = getMaterialUrl(mat)
                            setPreviewModal({
                              isOpen: true,
                              title: mat.title,
                              url: downloadUrl,
                              type: type,
                              isEmbeddable: isEmbeddable,
                            })
                          }}
                        />
                      ))}

                      {/* Collapsible Image Folder Card */}
                      {imageMats.length > 0 && (
                        <CollapsibleImageGroupCard
                          images={imageMats}
                          onViewImage={(img) => {
                            const downloadUrl = getMaterialUrl(img)
                            setPreviewModal({
                              isOpen: true,
                              title: img.title,
                              url: downloadUrl,
                              type: "image",
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
              <p className="font-semibold text-foreground text-base mb-1">No study materials yet</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No active resources found matching this category. Select another tab or clear your active search query.
              </p>
              {(selectedType !== "all" || selectedCourseId !== "all" || searchQuery !== "") && (
                <Button
                  variant="link"
                  size="sm"
                  className="mt-3 text-primary"
                  onClick={() => {
                    setSearchQuery("")
                    setSelectedCourseId("all")
                    setSelectedType("all")
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
      {previewModal && previewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-5xl h-[85vh] bg-background rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-lg text-foreground truncate max-w-[50%] sm:max-w-[70%]" title={previewModal.title}>
                Preview: {previewModal.title}
              </h3>
              <div className="flex items-center gap-2">
                {previewModal.type === "video" && (
                  <Button variant="outline" size="sm" asChild className="text-xs h-8">
                    <a href={previewModal.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                      Watch on YouTube <ExternalLink className="size-3.5" />
                    </a>
                  </Button>
                )}
                {previewModal.type === "slideshare" && (
                  <Button variant="outline" size="sm" asChild className="text-xs h-8">
                    <a href={previewModal.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                      View on SlideShare <ExternalLink className="size-3.5" />
                    </a>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPreviewModal(null)}
                  className="size-8 rounded-full animate-in fade-in zoom-in-75 duration-200"
                >
                  <X className="size-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 bg-muted relative flex items-center justify-center p-4 overflow-auto">
              {previewModal.type === "image" ? (
                <img
                  src={previewModal.url}
                  alt={previewModal.title}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-md"
                />
              ) : previewModal.type === "video" ? (
                (() => {
                  const ytId = getYouTubeId(previewModal.url)
                  const ytEmbedUrl = getYouTubeEmbedUrl(previewModal.url)

                  if (ytEmbedUrl && previewModal.isEmbeddable !== false) {
                    return (
                      <iframe
                        src={ytEmbedUrl}
                        title={previewModal.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute inset-0 w-full h-full border-0"
                      />
                    )
                  }

                  if (ytId) {
                    return (
                      <div className="flex flex-col items-center justify-center text-center p-6 max-w-md bg-card rounded-xl border border-border shadow-sm">
                        <div className="relative aspect-video w-64 overflow-hidden rounded-lg border bg-muted mb-4 shadow-sm">
                          <img
                            src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                            alt={previewModal.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Video className="size-10 text-white/90" />
                          </div>
                        </div>
                        <h4 className="font-semibold text-foreground text-base mb-1">Embedding restricted by uploader</h4>
                        <p className="text-xs text-muted-foreground mb-4">
                          This video is restricted and can only be watched directly on YouTube.
                        </p>
                        <Button asChild variant="destructive" size="sm">
                          <a href={previewModal.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                            Watch on YouTube <ExternalLink className="size-3.5" />
                          </a>
                        </Button>
                      </div>
                    )
                  }

                  // Non-YouTube video (e.g. direct MP4 or external video URL)
                  return (
                    <div className="flex flex-col items-center justify-center text-center p-6 max-w-md bg-card rounded-xl border border-border shadow-sm">
                      <div className="flex size-14 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400 mb-4">
                        <Video className="size-7" />
                      </div>
                      <h4 className="font-semibold text-foreground text-base mb-1">External Video Stream</h4>
                      <p className="text-xs text-muted-foreground mb-4">
                        This video material is hosted externally and cannot be embedded inline.
                      </p>
                      <Button asChild variant="default" size="sm">
                        <a href={previewModal.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                          Open Video Stream <ExternalLink className="size-3.5" />
                        </a>
                      </Button>
                    </div>
                  )
                })()
              ) : previewModal.type === "slideshare" ? (
                failedSlideShareEmbeds[previewModal.url] ? (
                  <div className="flex flex-col items-center justify-center text-center p-6 max-w-md bg-card rounded-xl border border-border shadow-sm">
                    <h4 className="font-semibold text-foreground text-base mb-1">Slide preview unavailable</h4>
                    <p className="text-xs text-muted-foreground mb-4">
                      We were unable to load the slide preview. You can view the slides directly on SlideShare.
                    </p>
                    <Button asChild variant="outline" size="sm">
                      <a href={previewModal.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                        View on SlideShare <ExternalLink className="size-3.5" />
                      </a>
                    </Button>
                  </div>
                ) : (
                  <div className="absolute inset-0 w-full h-full p-4 flex items-center justify-center">
                    <SlideShareEmbed
                      url={previewModal.url}
                      title={previewModal.title}
                      onError={() => {
                        setFailedSlideShareEmbeds((prev) => ({
                          ...prev,
                          [previewModal.url]: true,
                        }))
                      }}
                    />
                  </div>
                )
              ) : (
                <iframe
                  src={
                    previewModal.type === "office"
                      ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewModal.url)}`
                      : `https://docs.google.com/viewer?url=${encodeURIComponent(previewModal.url)}&embedded=true`
                  }
                  className="absolute inset-0 w-full h-full border-0"
                  title={previewModal.title}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
