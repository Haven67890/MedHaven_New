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
  Star,
  Clapperboard,
  Play
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

export default function LectureVideosPage() {
  const supabase = createClient()
  const { user } = useAuth()

  const [materials, setMaterials] = useState<Material[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
        const cached = getCachedData<{ courses: Course[]; materials: Material[] }>("lecture_videos_data")
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

        // 2. Fetch materials joined with courses and faculties (pre-filtered to type = 'video')
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
          .eq("type", "video")
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
                id: "mock-video-1",
                course_id: "mock-course-1",
                title: "The Skeletal System - Clinical Anatomy and Functions",
                type: "video",
                tier: "recommended",
                source_url: "https://www.youtube.com/watch?v=J8y87V74FHg",
                storage_path: null,
                description: "An exhaustive clinical overview of the human skeletal system, focusing on bone anatomy, joints, and biomechanics.",
                created_at: "2025-01-01T00:00:00.000Z",
                courses: { id: "mock-course-1", code: "ANA 201", title: "Gross Anatomy", level: "200L" }
              }
            ]
            setMaterials(fallbackMats)
            setCachedData("lecture_videos_data", { courses: finalCourses, materials: fallbackMats })
          } else {
            setMaterials(finalMaterials)
            setCachedData("lecture_videos_data", { courses: finalCourses, materials: finalMaterials })
          }
        }
      } catch (err) {
        console.error("Error loading lecture videos data:", err)
        if (mounted) {
          setCourses([
            { id: "mock-course-1", code: "ANA 201", title: "Gross Anatomy", level: "200L" },
            { id: "mock-course-2", code: "BCH 201", title: "Medical Biochemistry", level: "200L" },
            { id: "mock-course-3", code: "PIO 201", title: "Medical Physiology", level: "200L" }
          ])
          setMaterials([
            {
              id: "mock-video-1",
              course_id: "mock-course-1",
              title: "The Skeletal System - Clinical Anatomy and Functions",
              type: "video",
              tier: "recommended",
              source_url: "https://www.youtube.com/watch?v=J8y87V74FHg",
              storage_path: null,
              description: "An exhaustive clinical overview of the human skeletal system, focusing on bone anatomy, joints, and biomechanics.",
              created_at: "2025-01-01T00:00:00.000Z",
              courses: { id: "mock-course-1", code: "ANA 201", title: "Gross Anatomy", level: "200L" }
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

  const totalVideos = levelFilteredMaterials.length
  const totalRecommendedVideos = levelFilteredMaterials.filter(m => m.tier?.toLowerCase() === "recommended").length

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Lecture Videos" description="Watch and rewatch recorded lectures and clinical tutorials at your own pace.">
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
          {(selectedTier !== "all" || selectedCourseId !== "all" || searchQuery !== "" || sortBy !== "name") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("")
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
      <section className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Total lectures" value={String(totalVideos)} icon={Clapperboard} accent="primary" />
        <StatCard label="Recommended Videos" value={String(totalRecommendedVideos)} icon={Video} accent="secondary" />
        <StatCard label="Watched by you" value="42" icon={Play} accent="accent" />
        <StatCard label="In progress" value="6" icon={Play} accent="warning" />
      </section>

      {/* Search Bar */}
      <section>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            placeholder="Search lectures by title, description, or course…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label="Search lecture videos"
          />
        </div>
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
            title="All lectures"
            description="Browse and review active curriculum video sessions."
          />
          <MaterialGridSkeleton count={6} />
        </section>
      ) : (
        <section>
          <div className="flex items-center justify-between">
            <SectionHeading
              title={selectedCourseId !== "all" ? "Filtered Lecture Videos" : "All lectures"}
              description="Browse and review active curriculum video sessions."
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
                const videoMats = group.materials.filter(m => m.type?.toLowerCase() === "video")

                if (videoMats.length === 0) return null

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
                      {videoMats.map((material) => (
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
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
              <Video className="size-8 mx-auto mb-3 text-muted-foreground/60" />
              <p className="font-semibold text-foreground text-base mb-1">No video lectures yet</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No lecture video recordings found. Videos uploaded to the curriculum library will populate this page automatically.
              </p>
              {(selectedTier !== "all" || selectedCourseId !== "all" || searchQuery !== "") && (
                <Button
                  variant="link"
                  size="sm"
                  className="mt-3 text-primary"
                  onClick={() => {
                    setSearchQuery("")
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
              {previewModal.type === "video" ? (
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
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-6 max-w-md bg-card rounded-xl border border-border shadow-sm">
                  <h4 className="font-semibold text-foreground text-base mb-1">Preview restricted</h4>
                  <p className="text-xs text-muted-foreground mb-4">
                    Only video materials are previewable on this portal.
                  </p>
                  <Button asChild variant="outline" size="sm">
                    <a href={previewModal.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                      Open Link <ExternalLink className="size-3.5" />
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
