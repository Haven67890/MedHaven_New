"use client"

import { useState, useEffect, useRef } from "react"
import {
  BookMarked,
  BookOpen,
  Library,
  Search,
  Video,
  ExternalLink,
  FileText,
  X
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { StatCard } from "@/components/dashboard/stat-card"
import { createClient } from "@/lib/supabase/client"

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

// Helper to format type names neatly
function formatTypeName(type: string): string {
  if (!type) return "Material"
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

// Helper to extract YouTube ID and build embed URL
function getYouTubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
  const match = url.match(regExp)
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`
  }
  return null
}

// Helper to resolve material URL
function getMaterialUrl(material: Material): string {
  if (material.source_url) return material.source_url
  if (material.storage_path) {
    if (material.storage_path.startsWith("http://") || material.storage_path.startsWith("https://")) {
      return material.storage_path
    }
    // Safe fallback construction
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

export default function SmartLibraryPage() {
  const supabase = createClient()

  const [materials, setMaterials] = useState<Material[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [userLevel, setUserLevel] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [failedSlideShareEmbeds, setFailedSlideShareEmbeds] = useState<Record<string, boolean>>({})

  // Preview Modal State
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean
    title: string
    url: string
    type: "pdf" | "office" | null
  } | null>(null)

  // Filters State
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCourseId, setSelectedCourseId] = useState<string>("all")
  const [selectedTier, setSelectedTier] = useState<string>("all")
  const [selectedType, setSelectedType] = useState<string>("all")

  useEffect(() => {
    let mounted = true

    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // 0. Fetch user session and level
        const { data: { user } } = await supabase.auth.getUser()
        let level: string | null = null
        if (user) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("current_level")
            .eq("id", user.id)
            .maybeSingle()
          if (profileData) {
            level = profileData.current_level
          }
        }

        // 1. Fetch courses
        const { data: coursesData, error: coursesError } = await supabase
          .from("courses")
          .select("id, code, title, level, parent_id")
          .order("code", { ascending: true })

        if (coursesError) throw coursesError

        // 2. Fetch materials joined with courses and faculties
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
          .order("created_at", { ascending: false })

        if (mError) throw mError

        if (mounted) {
          setUserLevel(level)
          setCourses((coursesData as Course[]) || [])
          setMaterials((mData as unknown as Material[]) || [])
        }
      } catch (err) {
        console.error("Error loading library data:", err)
        if (mounted) {
          setError("Failed to load materials from the database. Please try again.")
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

  const isPreclinicalLevel = (lvl: string | number | null | undefined): boolean => {
    if (lvl === null || lvl === undefined) return false
    const s = String(lvl).trim().toUpperCase()
    if (s.startsWith("100") || s.startsWith("200") || s.startsWith("300")) return true
    const n = parseInt(s, 10)
    if (!isNaN(n) && n >= 100 && n <= 300) return true
    return false
  }

  const isClinicalLevel = (lvl: string | number | null | undefined): boolean => {
    if (lvl === null || lvl === undefined) return false
    const s = String(lvl).trim().toUpperCase()
    if (s.startsWith("400") || s.startsWith("500") || s.startsWith("600") || s.includes("FINAL")) return true
    const n = parseInt(s, 10)
    if (!isNaN(n) && n >= 400) return true
    return false
  }

  const isPreclinicalUser = userLevel ? isPreclinicalLevel(userLevel) : false
  const isClinicalUser = userLevel ? isClinicalLevel(userLevel) : true

  // Level-based filtered arrays
  const levelFilteredCourses = courses.filter((course) => {
    if (isPreclinicalUser) {
      return isPreclinicalLevel(course.level)
    }
    if (isClinicalUser) {
      return isClinicalLevel(course.level)
    }
    return true
  })

  const levelFilteredMaterials = materials.filter((material) => {
    const courseLevel = material.courses?.level
    if (isPreclinicalUser) {
      return isPreclinicalLevel(courseLevel)
    }
    if (isClinicalUser) {
      return isClinicalLevel(courseLevel)
    }
    return true
  })

  // Get dynamic collection statistics & display
  const collectionData = levelFilteredCourses.slice(0, 6).map((course, index) => {
    const courseMaterialsCount = levelFilteredMaterials.filter((m) => m.course_id === course.id).length
    return {
      id: course.id,
      code: course.code || "",
      name: course.title || course.code || "Curriculum",
      count: courseMaterialsCount,
      icon: index % 3 === 0 ? "BookOpen" : index % 3 === 1 ? "BookMarked" : "Library",
      color: index % 3 === 0 ? "primary" : index % 3 === 1 ? "secondary" : "accent",
    }
  })

  // Filtering Logic
  const filteredMaterials = levelFilteredMaterials.filter((material) => {
    // 1. Search Query Filter
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase()
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

    // 4. Type Filter
    if (selectedType !== "all" && material.type?.toLowerCase() !== selectedType.toLowerCase()) {
      return false
    }

    return true
  })

  const totalTitles = levelFilteredMaterials.length
  const recommendedCount = levelFilteredMaterials.filter((m) => m.tier?.toLowerCase() === "recommended").length
  const studyCount = levelFilteredMaterials.filter((m) => m.tier?.toLowerCase() === "study").length

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Smart Library" description="Search across thousands of textbooks, journals, and references curated for your curriculum.">
        <div className="flex flex-wrap items-center gap-2">
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
          {(selectedTier !== "all" || selectedType !== "all" || selectedCourseId !== "all" || searchQuery !== "") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("")
                setSelectedCourseId("all")
                setSelectedTier("all")
                setSelectedType("all")
              }}
            >
              <X className="size-3.5 mr-1" /> Reset
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Materials" value={String(totalTitles)} icon={Library} accent="primary" />
        <StatCard label="Recommended Items" value={String(recommendedCount)} icon={BookOpen} accent="secondary" />
        <StatCard label="Study Guides" value={String(studyCount)} icon={BookMarked} accent="accent" />
      </section>

      {/* Search Bar */}
      <section>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            placeholder="Search by title, description, course, or faculty…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label="Search the library"
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
        <div className="flex min-h-[20vh] items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading study library...</p>
        </div>
      ) : (
        <>
          {/* Browse Collections Section */}
          <section>
            <SectionHeading title="Browse collections" description="Explore materials by active curriculum courses." />
            {collectionData.length > 0 ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {collectionData.map((collection) => {
                  const Icon = collectionIcons[collection.icon as keyof typeof collectionIcons] || Library
                  const isSelected = selectedCourseId === collection.id
                  return (
                    <button
                      key={collection.id}
                      onClick={() => setSelectedCourseId(isSelected ? "all" : collection.id)}
                      className={`group flex flex-col items-start text-left gap-3 rounded-xl border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md w-full ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border bg-card hover:border-primary/40"
                      }`}
                    >
                      <span className={`flex size-10 items-center justify-center rounded-xl ${colorMap[collection.color]}`}>
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <div className="flex flex-col gap-0.5 overflow-hidden w-full">
                        <span className="text-sm font-medium text-foreground truncate block" title={collection.name}>
                          {collection.code ? `${collection.code}: ` : ""}{collection.name}
                        </span>
                        <span className="text-xs text-muted-foreground">{collection.count} materials</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
                No active courses available to browse.
              </div>
            )}
          </section>

          {/* Library Materials Listings Section */}
          <section>
            <div className="flex items-center justify-between">
              <SectionHeading
                title={selectedCourseId !== "all" ? "Filtered materials" : "All materials"}
                description="Browse recommended textbooks, references, and slides."
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
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredMaterials.map((material) => {
                  const embedUrl = getYouTubeEmbedUrl(material.source_url)
                  const downloadUrl = getMaterialUrl(material)
                  const isVideo = material.type?.toLowerCase() === "video"

                  return (
                    <Card key={material.id} className="gap-3 flex flex-col justify-between">
                      <CardHeader className="relative">
                        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                          {isVideo ? (
                            <Video className="size-5" aria-hidden="true" />
                          ) : (
                            <FileText className="size-5" aria-hidden="true" />
                          )}
                        </div>
                        <div className="flex flex-col gap-1 pt-2">
                          <CardTitle className="text-base leading-snug line-clamp-2" title={material.title}>
                            {material.title}
                          </CardTitle>
                          {material.courses && (
                            <CardDescription className="font-semibold text-primary">
                              {material.courses.code ? `${material.courses.code} · ` : ""}
                              {material.courses.title}
                            </CardDescription>
                          )}
                          {material.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {material.description}
                            </p>
                          )}
                        </div>
                        <CardAction>
                          <Badge variant={material.tier?.toLowerCase() === "recommended" ? "success" : "muted"}>
                            {material.tier?.toUpperCase() || "STUDY"}
                          </Badge>
                        </CardAction>
                      </CardHeader>

                      <CardContent className="flex flex-col gap-3 mt-auto pt-0">
                        {/* Video embeds if straightforward */}
                        {isVideo && embedUrl && (
                          <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
                            <iframe
                              src={embedUrl}
                              title={material.title}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              className="absolute inset-0 h-full w-full border-0"
                            />
                          </div>
                        )}

                        {/* SlideShare embeds */}
                        {!isVideo &&
                          material.type?.toLowerCase() === "lecture_slide" &&
                          material.source_url &&
                          material.source_url.includes("slideshare.net") &&
                          !failedSlideShareEmbeds[material.id] && (
                            <SlideShareEmbed
                              url={material.source_url}
                              title={material.title}
                              onError={() => {
                                setFailedSlideShareEmbeds((prev) => ({
                                  ...prev,
                                  [material.id]: true,
                                }))
                              }}
                            />
                          )}

                        <div className="flex items-center justify-between gap-2 border-t pt-3">
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {formatTypeName(material.type)}
                          </Badge>

                          <div className="flex items-center gap-1.5">
                            {downloadUrl !== "#" && (
                              <>
                                {(() => {
                                  const ext = getFileExtension(downloadUrl)
                                  const isPdf = ext === "pdf"
                                  const isOffice = ["pptx", "ppt", "docx", "doc", "xlsx", "xls"].includes(ext)
                                  const isSupabaseStorage = downloadUrl.includes("supabase.co/storage")
                                  const isStudyTier = material.tier?.toLowerCase() === "study"
                                  const isExternalLinkOnly = !isSupabaseStorage
                                  const isYouTube = downloadUrl.includes("youtube.com") || downloadUrl.includes("youtu.be")
                                  const isSlideShare = downloadUrl.includes("slideshare.net")
                                  const hasEmbed = isVideo ? !!embedUrl : isSlideShare && !failedSlideShareEmbeds[material.id]

                                  const showViewButton = isPdf || isOffice
                                  const showDownloadButton = isSupabaseStorage
                                  const showOpenLinkButton = (!showViewButton && !hasEmbed) || (isStudyTier && isExternalLinkOnly && !hasEmbed)

                                  return (
                                    <>
                                      {showViewButton && (
                                        <Button
                                          size="sm"
                                          onClick={() =>
                                            setPreviewModal({
                                              isOpen: true,
                                              title: material.title,
                                              url: downloadUrl,
                                              type: isPdf ? "pdf" : "office",
                                            })
                                          }
                                        >
                                          View
                                        </Button>
                                      )}

                                      {showDownloadButton && (
                                        <Button size="sm" variant="outline" asChild>
                                          <a href={downloadUrl} download>
                                            Download
                                          </a>
                                        </Button>
                                      )}

                                      {showOpenLinkButton && (
                                        <Button size="sm" variant="outline" asChild>
                                          <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                                            {isVideo ? "Play Video" : "Open Link"}{" "}
                                            <ExternalLink className="size-3.5 ml-1" />
                                          </a>
                                        </Button>
                                      )}
                                    </>
                                  )
                                })()}
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
                <Library className="size-8 mx-auto mb-3 text-muted-foreground/60" />
                <p className="font-semibold text-foreground text-base mb-1">No materials yet</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  No reference books, tutorial notes, or video materials found. Upload resource materials to populate this library curriculum section.
                </p>
                {(selectedTier !== "all" || selectedType !== "all" || selectedCourseId !== "all" || searchQuery !== "") && (
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-3 text-primary"
                    onClick={() => {
                      setSearchQuery("")
                      setSelectedCourseId("all")
                      setSelectedTier("all")
                      setSelectedType("all")
                    }}
                  >
                    Clear all active filters
                  </Button>
                )}
              </div>
            )}
          </section>
        </>
      )}

      {/* Preview Modal */}
      {previewModal && previewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-5xl h-[85vh] bg-background rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-lg text-foreground truncate max-w-[80%]" title={previewModal.title}>
                Preview: {previewModal.title}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPreviewModal(null)}
                className="size-8 rounded-full"
              >
                <X className="size-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 bg-muted relative">
              <iframe
                src={
                  previewModal.type === "office"
                    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewModal.url)}`
                    : `https://docs.google.com/viewer?url=${encodeURIComponent(previewModal.url)}&embedded=true`
                }
                className="absolute inset-0 w-full h-full border-0"
                title={previewModal.title}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
