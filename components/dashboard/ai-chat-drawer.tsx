"use client"

import React, { useState, useRef, useEffect } from "react"
import { Sparkles, Send, X, Bot, User, Loader2, AlertCircle, CornerDownLeft, RefreshCcw, Copy, Check, ThumbsUp, ThumbsDown, Search, Brain } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import MedicalImage from "@/components/ai/MedicalImage"

interface Message {
  role: "user" | "assistant"
  content: string
  searchedWebQuery?: string | null
}

interface AIChatDrawerProps {
  isOpen: boolean
  onClose: () => void
  suggestions?: string[]
}

const DEFAULT_SUGGESTIONS = [
  "Explain first-pass metabolism",
  "Summarize the cardiac cycle",
  "Clinical presentation of appendicitis",
  "Outline the stages of hypovolemic shock"
]

const preprocessMarkdown = (content: string): string => {
  return content.replace(
    /!\[([^\]]*)\]\(MEDICAL_IMAGE:([^)]+)\)/g,
    (match, alt, query) => {
      const encoded = query.trim().replace(/\s+/g, '_')
      return `![${alt}](MEDICAL_IMAGE:${encoded})`
    }
  )
}

function parseFollowUpQuestions(text: string): { mainText: string; questions: string[] } {
  const markerIndex = text.indexOf("**Want to explore further?**")
  if (markerIndex === -1) {
    return { mainText: text, questions: [] }
  }

  const mainText = text.substring(0, markerIndex).trim()
  const followUpSection = text.substring(markerIndex)
  const lines = followUpSection.split("\n")
  const questions: string[] = []

  lines.forEach((line) => {
    const match = line.match(/^\d+\.\s*\[?(.*?)\]?$/)
    if (match && match[1]) {
      const q = match[1].trim().replace(/^\[/, "").replace(/\]$/, "")
      if (q && q !== "**Want to explore further?**") {
        questions.push(q)
      }
    }
  })

  return { mainText, questions }
}

export default function AIChatDrawer({ isOpen, onClose, suggestions = DEFAULT_SUGGESTIONS }: AIChatDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [studentInfo, setStudentInfo] = useState<{ name: string; level: string } | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [feedbackRatings, setFeedbackRatings] = useState<Record<number, number>>({})

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isLoading, isOpen])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim()
    if (!text) return

    if (!textToSend) {
      setInput("")
    }
    setError(null)

    const updatedMessages: Message[] = [...messages, { role: "user", content: text }]
    setMessages(updatedMessages)
    setIsLoading(true)

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages,
          conversation_id: conversationId
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to communicate with Groq API")
      }

      const data = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }

      if (data.conversationId) {
        setConversationId(data.conversationId)
      }

      if (data.studentName || data.studentLevel) {
        setStudentInfo({
          name: data.studentName || "Student",
          level: data.studentLevel || "MBBS"
        })
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.content,
          searchedWebQuery: data.searchedWebQuery || null
        }
      ])
    } catch (err: any) {
      console.error("AI Assistant Chat Error:", err)
      setError(err.message || "Something went wrong, please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClearChat = () => {
    setMessages([])
    setError(null)
    setInput("")
    setConversationId(null)
    setFeedbackRatings({})
  }

  const handleCopyMessage = (index: number, content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    })
  }

  const handleFeedback = async (index: number, rating: number) => {
    setFeedbackRatings((prev) => ({ ...prev, [index]: rating }))
    try {
      await fetch("/api/assistant/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: conversationId,
          message_index: index,
          rating
        })
      })
    } catch (err) {
      console.error("Failed to submit feedback:", err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden bg-black/60 backdrop-blur-xs transition-opacity duration-300">
      {/* Backdrop Click */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />

      {/* Main Drawer Container */}
      <div className="relative flex h-full w-full max-w-xl flex-col border-l border-border bg-background shadow-2xl transition-transform duration-300 ease-out sm:rounded-l-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4 bg-card/50 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20">
              <Brain className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                MedHaven AI <span className="text-[10px] bg-cyan-500/15 text-cyan-500 font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">Beta</span>
              </h3>
              <p className="text-xs text-muted-foreground font-semibold">
                {studentInfo ? `Hi ${studentInfo.name} · ${studentInfo.level}` : "Specialised MBBS Clinical Assistant"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                title="Start fresh conversation"
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
              >
                <RefreshCcw className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Chat History / Interactive Workspace */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-500">
                <Bot className="h-8 w-8" />
              </div>
              <div className="max-w-xs space-y-2">
                <h4 className="text-lg font-bold text-foreground">Welcome to MedHaven AI</h4>
                <p className="text-sm text-muted-foreground font-semibold leading-relaxed">
                  Your specialised clinical tutor for anatomy, ward rounds, pharmacology, disease presentations, and MBBS exam prep.
                </p>
              </div>

              {/* Suggestions Grid */}
              <div className="w-full max-w-sm space-y-2.5 text-left">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">Suggested topics:</p>
                <div className="grid gap-2">
                  {suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(suggestion)}
                      className="w-full text-left p-3 rounded-xl border border-border bg-card hover:bg-muted hover:border-primary/30 text-xs font-bold text-foreground transition-all duration-200 cursor-pointer flex items-center justify-between group"
                    >
                      <span className="truncate pr-2">{suggestion}</span>
                      <CornerDownLeft className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, index) => {
                if (msg.role === "user") {
                  return (
                    <div key={index} className="flex gap-3 justify-end">
                      <div className="max-w-[85%] flex flex-col space-y-1">
                        <div className="rounded-2xl px-4 py-3 text-sm font-semibold leading-relaxed shadow-xs whitespace-pre-wrap bg-gradient-to-tr from-cyan-500 to-blue-600 text-white rounded-tr-none">
                          {msg.content}
                        </div>
                      </div>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground border border-border">
                        <User className="h-4.5 w-4.5" />
                      </div>
                    </div>
                  )
                }

                const { mainText, questions } = parseFollowUpQuestions(msg.content)
                const currentRating = feedbackRatings[index]

                return (
                  <div key={index} className="flex gap-3 justify-start">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 shadow-xs">
                      <Bot className="h-4.5 w-4.5" />
                    </div>

                    <div className="max-w-[90%] flex flex-col space-y-2">
                      <div className="rounded-2xl px-4 py-3.5 text-sm leading-relaxed shadow-xs bg-card border border-border text-foreground rounded-tl-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeRaw]}
                          components={{
                            table: ({ node, ...props }) => (
                              <div className="overflow-x-auto my-4">
                                <table className="min-w-full border border-zinc-700 text-sm" {...props} />
                              </div>
                            ),
                            th: ({ node, ...props }) => (
                              <th className="border border-zinc-700 px-3 py-2 bg-zinc-800 text-left font-semibold" {...props} />
                            ),
                            td: ({ node, ...props }) => (
                              <td className="border border-zinc-700 px-3 py-2" {...props} />
                            ),
                            code: ({ node, inline, ...props }: any) =>
                              inline ? (
                                <code className="bg-zinc-800 px-1 rounded text-blue-300 font-mono text-xs" {...props} />
                              ) : (
                                <pre className="bg-zinc-900 p-4 rounded-lg overflow-x-auto my-3 text-xs font-mono text-zinc-100" {...props} />
                              ),
                            h1: ({ node, ...props }) => <h1 className="text-xl font-bold mt-4 mb-2 text-foreground" {...props} />,
                            h2: ({ node, ...props }) => <h2 className="text-lg font-bold mt-3 mb-2 text-foreground" {...props} />,
                            h3: ({ node, ...props }) => <h3 className="text-base font-bold mt-2 mb-1 text-muted-foreground" {...props} />,
                            ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-1 my-2 text-foreground" {...props} />,
                            ol: ({ node, ...props }) => <ol className="list-decimal list-inside space-y-1 my-2 text-foreground" {...props} />,
                            strong: ({ node, ...props }) => <strong className="font-bold text-foreground" {...props} />,
                            blockquote: ({ node, ...props }) => (
                              <blockquote className="border-l-4 border-blue-500 bg-blue-500/10 p-2.5 rounded-r-lg my-3 text-muted-foreground italic" {...props} />
                            ),
                            img: ({ src, alt }: any) => {
                              if (src?.startsWith('MEDICAL_IMAGE:')) {
                                const query = src.replace('MEDICAL_IMAGE:', '').trim()
                                return <MedicalImage query={query} alt={alt || query} />
                              }
                              // regular images render normally
                              return (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={src} alt={alt}
                                  className="rounded-lg max-w-full max-h-80 my-4
                                    border border-zinc-700" />
                              )
                            }
                          }}
                        >
                          {preprocessMarkdown(mainText)}
                        </ReactMarkdown>

                        {/* Web Search Line Indicator */}
                        {msg.searchedWebQuery && (
                          <div className="mt-3 pt-2.5 border-t border-border flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                            <Search className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
                            <span>Searched the web for: <strong className="text-foreground">{msg.searchedWebQuery}</strong></span>
                          </div>
                        )}
                      </div>

                      {/* Follow-up question chips */}
                      {questions.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider pl-1">Want to explore further?</p>
                          <div className="flex flex-wrap gap-1.5">
                            {questions.map((q, qIdx) => (
                              <button
                                key={qIdx}
                                onClick={() => handleSend(q)}
                                className="text-left px-3 py-1.5 rounded-xl border border-border bg-muted/60 hover:bg-muted hover:border-primary/40 text-xs font-semibold text-foreground transition cursor-pointer"
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Copy & Feedback Toolbar */}
                      <div className="flex items-center gap-3 pt-0.5 px-1">
                        <button
                          onClick={() => handleCopyMessage(index, msg.content)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition cursor-pointer"
                          title="Copy raw markdown text"
                        >
                          {copiedIndex === index ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-green-500" />
                              <span className="text-green-500 font-bold text-[11px]">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span className="text-[11px]">Copy</span>
                            </>
                          )}
                        </button>

                        <div className="flex items-center gap-1 text-muted-foreground">
                          <button
                            onClick={() => handleFeedback(index, 1)}
                            className={`p-1 rounded-md hover:bg-muted transition cursor-pointer ${currentRating === 1 ? "text-green-500 bg-green-500/10" : ""}`}
                            title="Helpful response"
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleFeedback(index, -1)}
                            className={`p-1 rounded-md hover:bg-muted transition cursor-pointer ${currentRating === -1 ? "text-red-500 bg-red-500/10" : ""}`}
                            title="Not helpful"
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Typing Loader State */}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 animate-pulse">
                    <Bot className="h-4.5 w-4.5" />
                  </div>
                  <div className="max-w-[85%] rounded-2xl rounded-tl-none border border-border bg-card/60 px-4 py-3.5 shadow-xs flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-500" />
                    <span className="text-xs text-muted-foreground font-bold animate-pulse">MedHaven AI is generating response...</span>
                    <div className="flex items-center gap-1 ml-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Error State Banner */}
              {error && (
                <div className="flex gap-3 justify-start">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/15 text-red-500">
                    <AlertCircle className="h-4.5 w-4.5" />
                  </div>
                  <div className="max-w-[85%] rounded-2xl rounded-tl-none border border-red-500/20 bg-red-500/10 p-4 shadow-xs text-sm">
                    <p className="font-bold text-red-600 dark:text-red-400">Request Failed</p>
                    <p className="text-xs text-muted-foreground mt-1 font-semibold">{error}</p>
                    <button
                      onClick={() => handleSend()}
                      className="mt-2.5 flex items-center gap-1.5 px-3 py-1.5 bg-red-500/15 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      <RefreshCcw className="h-3 w-3" /> Retry Message
                    </button>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Footer */}
        <div className="border-t border-border p-4 bg-card/40 backdrop-blur-md">
          <div className="relative flex items-center rounded-xl border border-border bg-background focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/40 transition">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your coursework or clinical scenarios..."
              disabled={isLoading}
              className="w-full resize-none bg-transparent py-3 pl-3.5 pr-12 text-sm font-semibold placeholder:text-muted-foreground outline-hidden focus:ring-0 max-h-32 min-h-[44px]"
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              className={`absolute right-2 flex h-8 w-8 items-center justify-center rounded-lg shadow-sm transition-all duration-200 cursor-pointer ${
                input.trim() && !isLoading
                  ? "bg-gradient-to-tr from-cyan-500 to-blue-600 text-white hover:scale-105 active:scale-95"
                  : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
              }`}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2.5 text-center text-[10px] text-muted-foreground font-bold tracking-wide">
            MedHaven AI is an educational tool. Always cross-verify clinical concepts with textbooks & JUTH consultants.
          </p>
        </div>
      </div>
    </div>
  )
}
