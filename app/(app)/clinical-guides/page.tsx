"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useDebounce } from "@/hooks/useDebounce"
import { ArrowRight, Clock, MapPin, Search, Stethoscope, ChevronDown, ChevronUp, BookOpen, Layers, Award } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { StatCard } from "@/components/dashboard/stat-card"
import { createClient } from "@/lib/supabase/client"
import useAuth from "@/hooks/useAuth"

interface GuideSection {
  heading: string
  content: string
}

interface ClinicalGuide {
  id: string
  specialty: string
  level: string | null
  title: string
  sections: GuideSection[]
  status: string
  created_at: string
}

function getLevelPhase(level: string | number | null | undefined): "pre-clinical" | "clinical" {
  if (!level) return "pre-clinical"
  const lvl = String(level).toUpperCase().trim()
  const clinicalLevels = ["400L", "500L", "600L", "FINAL YEAR"]
  return clinicalLevels.includes(lvl) ? "clinical" : "pre-clinical"
}

export default function ClinicalPostingGuidesPage() {
  const supabase = createClient()
  const { user } = useAuth()

  // Data State
  const [guides, setGuides] = useState<ClinicalGuide[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Profile / Preferences State
  const [userLevel, setUserLevel] = useState<string | null>(null)
  const [contentVisibility, setContentVisibility] = useState<string>("all")

  // Filter State
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [selectedSpecialty, setSelectedSpecialty] = useState("all")

  // Accordion State
  const [expandedGuides, setExpandedGuides] = useState<Record<string, boolean>>({})

  // Fetch guides & user preferences
  useEffect(() => {
    let active = true

    async function loadData() {
      try {
        setIsLoading(true)
        setError(null)

        // 1. Fetch user level and content visibility
        if (user?.id) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("current_level")
            .eq("id", user.id)
            .maybeSingle()

          if (active && profileData) {
            setUserLevel(profileData.current_level)
          }

          const { data: prefData } = await supabase
            .from("user_preferences")
            .select("content_visibility, show_other_levels")
            .eq("user_id", user.id)
            .maybeSingle()

          if (active && prefData) {
            if (prefData.content_visibility) {
              setContentVisibility(prefData.content_visibility)
            } else if (prefData.show_other_levels === false) {
              setContentVisibility("group")
            } else {
              setContentVisibility("all")
            }
          }
        }

        // 2. Fetch clinical guides (published only)
        const { data: guidesData, error: guidesError } = await supabase
          .from("clinical_guides")
          .select("*")
          .eq("status", "published")
          .order("created_at", { ascending: false })

        if (guidesError) throw guidesError

        if (active) {
          setGuides((guidesData as ClinicalGuide[]) || [])
        }
      } catch (err: any) {
        console.error("Error loading clinical posting guides:", err)
        if (active) {
          setError(err.message || "Failed to load clinical posting guides.")
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void loadData()

    return () => {
      active = false
    }
  }, [user?.id])

  // Filter guides according to level / preference logic
  const levelFilteredGuides = useMemo(() => {
    if (contentVisibility === "all" || !userLevel) return guides
    const userPhase = getLevelPhase(userLevel)
    return guides.filter((guide) => {
      if (!guide.level) return true // Show unassigned/general guides to everyone
      if (contentVisibility === "exact") {
        return String(guide.level).toUpperCase().trim() === String(userLevel).toUpperCase().trim()
      }
      // Group phase filtering
      return getLevelPhase(guide.level) === userPhase
    })
  }, [guides, contentVisibility, userLevel])

  // Get unique specialties from the level filtered guides
  const specialties = useMemo(() => {
    const list = new Set<string>()
    levelFilteredGuides.forEach((g) => {
      if (g.specialty) {
        list.add(g.specialty.trim())
      }
    })
    return Array.from(list).sort()
  }, [levelFilteredGuides])

  // Apply search/specialty filters
  const filteredGuides = useMemo(() => {
    return levelFilteredGuides.filter((guide) => {
      // Specialty Filter
      if (selectedSpecialty !== "all" && guide.specialty.trim() !== selectedSpecialty) {
        return false
      }

      // Text Search Filter (Title or Specialty)
      if (debouncedSearchQuery.trim() !== "") {
        const query = debouncedSearchQuery.toLowerCase()
        const titleMatch = guide.title?.toLowerCase().includes(query)
        const specialtyMatch = guide.specialty?.toLowerCase().includes(query)
        return titleMatch || specialtyMatch
      }

      return true
    })
  }, [levelFilteredGuides, selectedSpecialty, debouncedSearchQuery])

  // Stat metrics based on filtered lists
  const stats = useMemo(() => {
    const total = filteredGuides.length
    const uniqueSpecs = new Set(filteredGuides.map(g => g.specialty)).size
    const targetLevelMatch = filteredGuides.filter(g => g.level && String(g.level).toUpperCase().trim() === String(userLevel).toUpperCase().trim()).length

    return {
      total,
      uniqueSpecs,
      targetLevelMatch
    }
  }, [filteredGuides, userLevel])

  const toggleExpand = (id: string) => {
    setExpandedGuides((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Clinical Posting Guides" description="Everything you need for each clinical rotation — procedures, requirements, and expert notes.">
        <div className="flex gap-2">
          {/* Specialty Dropdown */}
          <select
            aria-label="Filter by specialty"
            value={selectedSpecialty}
            onChange={(e) => setSelectedSpecialty(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="all">All Specialties</option>
            {specialties.map((spec) => (
              <option key={spec} value={spec}>
                {spec}
              </option>
            ))}
          </select>
        </div>
      </PageHeader>

      {/* Dynamic Statistics Cards */}
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Available Posting Guides" value={String(stats.total)} icon={Stethoscope} accent="primary" />
        <StatCard label="Unique Specialties" value={String(stats.uniqueSpecs)} icon={Layers} accent="warning" />
        <StatCard label="My Level Guides" value={String(stats.targetLevelMatch)} icon={Award} accent="secondary" />
      </section>

      {/* Search Input Bar */}
      <section>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            placeholder="Search posting guides by title or specialty…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label="Search clinical guides"
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
          <p className="text-sm text-muted-foreground">Loading clinical posting guides...</p>
        </div>
      ) : (
        <section>
          <SectionHeading title="Guides Directory" description="Click on a guide to expand its sections, rules, and expectations." />

          {filteredGuides.length > 0 ? (
            <div className="mt-6 flex flex-col gap-4">
              {filteredGuides.map((guide) => {
                const isExpanded = !!expandedGuides[guide.id]
                return (
                  <Card
                    key={guide.id}
                    className="overflow-hidden border-border transition-all duration-200"
                  >
                    <CardHeader
                      className="cursor-pointer select-none pb-4"
                      onClick={() => toggleExpand(guide.id)}
                    >
                      <div className="flex items-start gap-3 sm:items-center">
                        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                          <Stethoscope className="size-5" aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0 pr-8">
                          <div className="flex flex-wrap gap-2 items-center mb-1">
                            <Badge variant="outline">{guide.specialty}</Badge>
                            <Badge variant="secondary">Level: {guide.level || "General"}</Badge>
                          </div>
                          <CardTitle className="text-base sm:text-lg leading-snug font-bold">
                            {guide.title}
                          </CardTitle>
                        </div>
                      </div>
                      <CardAction>
                        <div className="text-muted-foreground p-1">
                          {isExpanded ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
                        </div>
                      </CardAction>
                    </CardHeader>

                    {isExpanded && (
                      <CardContent className="border-t pt-5 bg-muted/5 animate-in fade-in duration-200">
                        {guide.sections && guide.sections.length > 0 ? (
                          <div className="space-y-6">
                            {guide.sections.map((section, idx) => (
                              <div key={idx} className="space-y-2">
                                <h4 className="text-sm font-extrabold uppercase tracking-wide text-primary border-b pb-1">
                                  {section.heading || `Section #${idx + 1}`}
                                </h4>
                                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                                  {section.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">No details or sections added for this posting guide yet.</p>
                        )}
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
              <Stethoscope className="size-8 mx-auto mb-3 text-muted-foreground/60" />
              <p className="font-semibold text-foreground text-base mb-1">No guides found</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No published clinical posting guides match your search criteria or your currently assigned visibility level parameters.
              </p>
              {(searchQuery !== "" || selectedSpecialty !== "all") && (
                <Button
                  variant="link"
                  size="sm"
                  className="mt-3 text-primary"
                  onClick={() => {
                    setSearchQuery("")
                    setSelectedSpecialty("all")
                  }}
                >
                  Clear all active filters
                </Button>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
