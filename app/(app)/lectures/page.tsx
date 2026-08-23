"use client"

import { getSlideDeckProvider, getSlideEmbedApiUrl, getIframePreviewSrc } from "@/lib/embed"
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
  Star,
  Clapperboard,
  Play
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { StatCard } from "@/components/dashboard/stat-card"
import { createClient } from "@/lib/supabase/client"
import { MaterialCard } from "@/components/dashboard/material-card"
import { getCachedData, setCachedData } from "@/lib/cache"
import { MaterialGridSkeleton } from "@/components/feedback/loading-skeletons"
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

export default function LectureVideosPage() {
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
          setCourses(finalCourses)
          setMaterials(finalMaterials)
          setCachedData("lecture_videos_data", { courses: finalCourses, materials: finalMaterials })
        }
      } catch (err: any) {
        console.error("Error loading lecture videos data:", err)
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
      <section className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Total lectures" value={String(totalVideos)} icon={Clapperboard} accent="primary" />
        <StatCard label="Recommended Videos" value={String(totalRecommendedVideos)} icon={Video} accent="secondary" />
        <StatCard label="Watched by you" value="42" icon={Play} accent="accent" />
        <StatCard label="In progress" value="6" icon={Play} accent="warning" />
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
          placeholder="Search lectures by title, description, or course…"
          ariaLabel="Search lecture videos"
        />
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
                      View Slides <ExternalLink className="size-3.5" />
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
                      We were unable to load the slide preview. You can view the slides directly on the source platform.
                    </p>
                    <Button asChild variant="outline" size="sm">
                      <a href={previewModal.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                        View Slides <ExternalLink className="size-3.5" />
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
                (() => {
                const lowerUrl = (previewModal.url || "").toLowerCase()
                const type = (previewModal.type || "").toLowerCase()
                const isOffice = ["pptx", "ppt", "docx", "doc", "xlsx", "xls"].some((ext) => lowerUrl.includes("." + ext) || lowerUrl.includes("%2e" + ext)) || type === "office" || type === "lecture_slide"
                if (isOffice) {
                  return (
                    <div className="flex flex-col items-center justify-center text-center p-8 max-w-md bg-card rounded-xl border border-border shadow-sm">
                      <div className="flex size-16 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400 mb-4">
                        <FileText className="size-8" />
                      </div>
                      <h4 className="font-semibold text-foreground text-lg mb-1">{previewModal.title}</h4>
                      <p className="text-xs text-muted-foreground mb-6">
                        PowerPoint files must be downloaded to view
                      </p>
                      <Button asChild variant="default" size="default" className="w-full sm:w-auto px-6">
                        <a href={previewModal.url} download className="flex items-center justify-center gap-2">
                          <Download className="size-4" /> Download File
                        </a>
                      </Button>
                    </div>
                  )
                }
                return (
                  <iframe
                    src={getIframePreviewSrc(previewModal.url, previewModal.type)}
                    className="absolute inset-0 w-full h-full border-0"
                    title={previewModal.title}
                  />
                )
              })()
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
