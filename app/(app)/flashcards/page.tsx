"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  ArrowRight,
  BrainCircuit,
  Plus,
  RotateCcw,
  Search,
  Star,
  Sparkles,
  Loader2,
  AlertCircle,
  BookOpen,
  ChevronRight,
  Eye,
  X,
  PlusCircle,
  HelpCircle
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/dashboard/page-header"
import { Progress } from "@/components/ui/progress"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { StatCard } from "@/components/dashboard/stat-card"
import { createClient } from "@/lib/supabase/client"

interface Course {
  id: string
  code: string | null
  title: string | null
  level: string | number | null
}

interface Flashcard {
  id: string
  front: string
  back: string
}

interface FlashcardDeck {
  id: string
  course_id: string | null
  topic: string
  source: "ai_generated" | "user_created"
  created_by: string | null
  created_at: string
  courses?: {
    id: string
    code: string | null
    title: string | null
  } | null
  flashcards?: Flashcard[]
}

const suggestedTopics = [
  "Antibiotic Mechanisms",
  "Cardiovascular Physiology",
  "Drug Metabolism",
  "Inflammation & Repair",
  "Cranial Nerves & Pathways",
  "Renal Pathology"
]

export default function FlashcardsPage() {
  const supabase = createClient()

  // State
  const [courses, setCourses] = useState<Course[]>([])
  const [decks, setDecks] = useState<FlashcardDeck[]>([])
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [userSession, setUserSession] = useState<any>(null)
  const [userLevel, setUserLevel] = useState<string | null>(null)
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Generator form state
  const [showGenerator, setShowGenerator] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState("")
  const [customTopic, setCustomTopic] = useState("")
  const [cardCount, setCardCount] = useState<number>(15)
  const [generating, setGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)

  // Rotating loader messages
  const [loaderMessageIndex, setLoaderMessageIndex] = useState(0)
  const loaderMessages = [
    "Analyzing course materials...",
    "Locating syllabus PDF documents...",
    "Extracting clinical medical text context...",
    "Connecting to MedHaven Groq LLM...",
    "Formulating active recall front questions...",
    "Drafting detailed clinical back answers..."
  ]

  useEffect(() => {
    if (!generating) {
      setLoaderMessageIndex(0)
      return
    }
    const interval = setInterval(() => {
      setLoaderMessageIndex((prev) => (prev + 1) % loaderMessages.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [generating])

  // Initial Fetch Data
  useEffect(() => {
    let active = true

    async function init() {
      try {
        setLoadingInitial(true)

        // 1. Get user session
        const { data: { session } } = await supabase.auth.getSession()
        if (!active) return

        setUserSession(session)

        if (!session?.user) {
          setLoadingInitial(false)
          return
        }

        // 2. Fetch user level
        let currentLvl = ""
        const { data: profileData } = await supabase
          .from("profiles")
          .select("current_level")
          .eq("id", session.user.id)
          .maybeSingle()

        if (profileData?.current_level) {
          currentLvl = profileData.current_level
          if (active) {
            setUserLevel(currentLvl)
          }
        }

        // 3. Fetch courses
        const { data: coursesData, error: coursesError } = await supabase
          .from("courses")
          .select("id, code, title, level")
          .order("code", { ascending: true })

        if (coursesError) throw coursesError

        if (active && coursesData) {
          // Sort courses: level match first, then alphabetically by code
          const sorted = [...(coursesData as Course[])].sort((a, b) => {
            const aMatch = a.level && currentLvl && String(a.level) === String(currentLvl)
            const bMatch = b.level && currentLvl && String(b.level) === String(currentLvl)
            if (aMatch && !bMatch) return -1
            if (!aMatch && bMatch) return 1
            return (a.code || "").localeCompare(b.code || "")
          })

          setCourses(sorted)
          if (sorted.length > 0) {
            setSelectedCourseId(sorted[0].id)
          }
        }

        // 4. Fetch real flashcard decks
        const { data: decksData, error: decksError } = await supabase
          .from("flashcard_decks")
          .select(`
            id,
            course_id,
            topic,
            source,
            created_by,
            created_at,
            courses (
              id,
              code,
              title
            ),
            flashcards (
              id,
              front,
              back
            )
          `)
          .or(`source.eq.ai_generated,created_by.eq.${session.user.id}`)
          .order("created_at", { ascending: false })

        if (decksError) throw decksError

        if (active && decksData) {
          const typedDecks = decksData as unknown as FlashcardDeck[]
          setDecks(typedDecks)
          if (typedDecks.length > 0) {
            setSelectedDeckId(typedDecks[0].id)
          }
        }
      } catch (err) {
        console.error("Error loading flashcards page data:", err)
      } finally {
        if (active) {
          setLoadingInitial(false)
        }
      }
    }

    void init()

    return () => {
      active = false
    }
  }, [supabase])

  // Handle deck generation
  const handleGenerateDeck = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCourseId) return

    const topicToUse = customTopic.trim()

    try {
      setGenerating(true)
      setGenerationError(null)

      const response = await fetch("/api/flashcards/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: selectedCourseId,
          topic: topicToUse,
          count: cardCount
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate flashcards deck.")
      }

      // Query the full inserted deck with joins to ensure perfect model structures
      const { data: newDeckData, error: queryError } = await supabase
        .from("flashcard_decks")
        .select(`
          id,
          course_id,
          topic,
          source,
          created_by,
          created_at,
          courses (
            id,
            code,
            title
          ),
          flashcards (
            id,
            front,
            back
          )
        `)
        .eq("id", data.deck_id)
        .single()

      if (queryError || !newDeckData) {
        throw new Error("Deck was created but could not be fetched from database.")
      }

      const freshDeck = newDeckData as unknown as FlashcardDeck

      // Insert or update in local list
      setDecks((prev) => {
        const filtered = prev.filter((d) => d.id !== freshDeck.id)
        return [freshDeck, ...filtered]
      })

      setSelectedDeckId(freshDeck.id)
      setCustomTopic("")
      setShowGenerator(false)
    } catch (err: any) {
      console.error("Flashcards generation error:", err)
      setGenerationError(err.message || "An unexpected error occurred during generation.")
    } finally {
      setGenerating(false)
    }
  }

  if (loadingInitial) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Initializing MedHaven Flashcards...</p>
      </div>
    )
  }

  // Filter decks
  const filteredDecks = decks.filter((deck) => {
    const query = searchQuery.toLowerCase()
    const matchTopic = deck.topic?.toLowerCase().includes(query)
    const matchCourse = deck.courses
      ? `${deck.courses.code || ""} ${deck.courses.title || ""}`.toLowerCase().includes(query)
      : false
    return matchTopic || matchCourse
  })

  const selectedDeck = decks.find((d) => d.id === selectedDeckId)
  const displayCards = selectedDeck?.flashcards || []

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Flashcards" description="Active recall flashcard decks powered by premium Groq AI.">
        <Button
          variant={showGenerator ? "outline" : "default"}
          onClick={() => setShowGenerator(!showGenerator)}
          className="flex items-center gap-1.5 transition-all"
        >
          {showGenerator ? (
            <>Close Generator <X className="size-4" /></>
          ) : (
            <>Generate with AI <Sparkles className="size-4" /></>
          )}
        </Button>
      </PageHeader>

      {/* STAT CARDS - REAL DECK VALUES */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total decks" value={String(decks.length)} icon={BrainCircuit} accent="primary" />
        <StatCard label="Cards reviewed" value="0" icon={RotateCcw} accent="secondary" />
        <StatCard label="Mastery rate" value="No cards yet" icon={Star} accent="accent" />
        <StatCard label="Due today" value="No cards yet" icon={BrainCircuit} accent="warning" />
      </section>

      {/* AI GENERATOR SETUP UI */}
      {showGenerator && (
        <Card className="border-primary/25 shadow-md overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="h-1 bg-primary" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="size-4.5 animate-pulse" />
                </span>
                <div>
                  <CardTitle className="text-base">AI Flashcards Generator</CardTitle>
                  <CardDescription>Generate customized active recall decks directly mapped to your courses.</CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowGenerator(false)}>
                <X className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerateDeck} className="flex flex-col gap-6 max-w-3xl">
              {/* SELECT CARD COUNT */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Number of Cards</span>
                <div className="flex items-center gap-2">
                  {[5, 10, 20].map((val) => {
                    const active = cardCount === val
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setCardCount(val)}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          active
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-background text-muted-foreground border-input hover:text-foreground hover:border-primary/40"
                        }`}
                      >
                        {val} Cards
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* SELECT COURSE */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="course-select" className="text-xs font-semibold text-muted-foreground">
                  Target Course {userLevel && `(Matching level ${userLevel} sorted first)`}
                </label>
                <select
                  id="course-select"
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {courses.length === 0 ? (
                    <option value="">No courses found</option>
                  ) : (
                    courses.map((course) => {
                      const isMatch = course.level && userLevel && String(course.level) === String(userLevel)
                      return (
                        <option key={course.id} value={course.id}>
                          {course.code ? `${course.code}: ` : ""}{course.title || "Unknown Subject"} {isMatch ? "⭐" : ""}
                        </option>
                      )
                    })
                  )}
                </select>
              </div>

              {/* INPUT CUSTOM TOPIC */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="topic-input" className="text-xs font-semibold text-muted-foreground">
                  Custom Topic (Optional)
                </label>
                <Input
                  id="topic-input"
                  type="text"
                  placeholder="e.g. G-protein receptors, Lobar pneumonia (leave blank for general high-yield review)"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                />
              </div>

              {/* SUGGESTED TOPICS CHIPS */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-muted-foreground">High-Yield Suggestions:</span>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedTopics.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => setCustomTopic(topic)}
                      className="text-xs border px-2.5 py-1 rounded-full bg-muted/30 text-foreground hover:bg-primary/5 hover:border-primary/40 transition-colors"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>

              {/* ERROR BLOCK */}
              {generationError && (
                <div className="flex items-start gap-2 bg-destructive/10 text-destructive text-xs p-3 rounded-lg border border-destructive/20 font-medium">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Generation Failed: </span>
                    {generationError}
                  </div>
                </div>
              )}

              {/* GENERATION STATE OR SUBMIT */}
              {generating ? (
                <div className="flex flex-col items-center justify-center p-4 border rounded-xl bg-primary/5 border-primary/10 gap-3 text-center">
                  <Loader2 className="size-8 animate-spin text-primary" />
                  <p className="text-sm font-semibold text-foreground">{loaderMessages[loaderMessageIndex]}</p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Leveraging syllabus files and pdf context where available. This might take up to 30 seconds.
                  </p>
                </div>
              ) : (
                <Button
                  type="submit"
                  className="w-full sm:w-auto font-semibold flex items-center justify-center gap-2"
                  disabled={courses.length === 0}
                >
                  Generate Deck with AI <Sparkles className="size-4" />
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {/* SEARCH FIELD */}
      <section>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            placeholder="Search decks by title or subject…"
            className="pl-9"
            aria-label="Search flashcard decks"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </section>

      {/* DECKS GRID LIST */}
      <section>
        <SectionHeading title="Your decks" description="Track mastery across each deck." />
        {filteredDecks.length === 0 ? (
          <div className="mt-4 flex flex-col items-center justify-center text-center p-12 border border-dashed rounded-xl text-muted-foreground bg-muted/5">
            <BrainCircuit className="size-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-semibold text-foreground">No decks found</p>
            <p className="text-xs max-w-md mt-1">
              {searchQuery ? "No decks match your active search filter." : "Get started by generating your first high-yield medical flashcards deck using our premium AI."}
            </p>
            {!showGenerator && (
              <Button onClick={() => setShowGenerator(true)} className="mt-4 gap-1.5 size-sm">
                <PlusCircle className="size-4" /> Create your first deck
              </Button>
            )}
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDecks.map((deck) => {
              const cardsCount = deck.flashcards?.length || 0
              const isSelected = deck.id === selectedDeckId
              const courseText = deck.courses
                ? `${deck.courses.code || ""} · ${deck.courses.title || ""}`
                : "General Course"

              return (
                <Card
                  key={deck.id}
                  className={`gap-3 transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary ring-1 ring-primary/40 shadow-md bg-primary/[0.02]"
                      : "hover:border-primary/20"
                  }`}
                  onClick={() => setSelectedDeckId(deck.id)}
                >
                  <CardHeader>
                    <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <BrainCircuit className="size-5" aria-hidden="true" />
                    </div>
                    <CardTitle className="pt-2 text-base">{deck.topic}</CardTitle>
                    <CardDescription className="line-clamp-1">{courseText} · {cardsCount} cards</CardDescription>
                    <CardAction>
                      {deck.source === "ai_generated" && (
                        <Badge variant="outline" className="text-[10px] py-0 px-2 font-mono bg-primary/5 text-primary">
                          AI
                        </Badge>
                      )}
                    </CardAction>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Mastery</span>
                      <span className="text-xs font-medium text-foreground">0%</span>
                    </div>
                    <Progress value={0} indicatorClassName="bg-primary" />
                    <Button
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className="mt-2 w-full justify-between"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedDeckId(deck.id)
                      }}
                    >
                      <span>{isSelected ? "Active recall mode" : "View cards"}</span>
                      <ChevronRight className="size-4" />
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      {/* SELECTED DECK CARDS PREVIEW */}
      <section>
        <SectionHeading
          title={selectedDeck ? `Cards inside: ${selectedDeck.topic}` : "Deck Preview"}
          description={selectedDeck ? `Explore all ${displayCards.length} high-yield questions in this deck.` : "Select a deck above to view and study its cards."}
        />
        {selectedDeck ? (
          displayCards.length === 0 ? (
            <div className="mt-4 text-center p-8 border rounded-xl text-muted-foreground bg-muted/10">
              This deck does not contain any cards yet.
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {displayCards.map((card, index) => (
                <Card key={card.id || index} className="gap-2 border-border/60 hover:border-primary/25 transition-all">
                  <CardHeader className="pb-2">
                    <Badge variant="accent" className="w-fit text-[10px]">Card {index + 1} Front</Badge>
                    <CardTitle className="pt-1.5 text-sm sm:text-base font-semibold leading-snug">{card.front}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2 pt-2 border-t border-border/40 bg-muted/20 rounded-b-xl">
                    <Badge variant="muted" className="w-fit text-[10px]">Back Explanation</Badge>
                    <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground font-medium">{card.back}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : (
          <div className="mt-4 flex flex-col items-center justify-center text-center p-12 border border-dashed rounded-xl text-muted-foreground">
            <HelpCircle className="size-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs font-semibold text-foreground">No deck selected</p>
            <p className="text-[10px] max-w-sm mt-0.5">Please click one of your decks above to load and preview its active recall questions.</p>
          </div>
        )}
      </section>
    </div>
  )
}
