"use client"

import React, { useState, useRef, useEffect } from "react"
import { Sparkles, Send, X, Bot, User, Loader2, AlertCircle, CornerDownLeft, RefreshCcw } from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
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

export default function AIChatDrawer({ isOpen, onClose, suggestions = DEFAULT_SUGGESTIONS }: AIChatDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom whenever messages or loading state changes
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isLoading, isOpen])

  // Focus input when open
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
        body: JSON.stringify({ messages: updatedMessages }),
      })

      if (!response.ok) {
        throw new Error("Failed to communicate with Groq API")
      }

      const data = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.content }])
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
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden bg-black/60 backdrop-blur-xs transition-opacity duration-300">
      {/* Backdrop Click */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />

      {/* Main Drawer Container */}
      <div className="relative flex h-full w-full max-w-lg flex-col border-l border-border bg-background shadow-2xl transition-transform duration-300 ease-out sm:rounded-l-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4 bg-card/50 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                MedHaven AI <span className="text-[10px] bg-cyan-500/15 text-cyan-500 font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">Beta</span>
              </h3>
              <p className="text-xs text-muted-foreground font-semibold">General MBBS JUTH study companion</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                title="Clear chat session"
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
                  Ask me questions about anatomy, physiology, ward-rounds, drugs, clinical scenarios, or general medical science.
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
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role !== "user" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 shadow-xs">
                      <Bot className="h-4.5 w-4.5" />
                    </div>
                  )}

                  <div className="max-w-[85%] flex flex-col space-y-1">
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm font-semibold leading-relaxed shadow-xs whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-gradient-to-tr from-cyan-500 to-blue-600 text-white rounded-tr-none"
                          : "bg-card border border-border text-foreground rounded-tl-none"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>

                  {msg.role === "user" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground border border-border">
                      <User className="h-4.5 w-4.5" />
                    </div>
                  )}
                </div>
              ))}

              {/* Typing Loader State */}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 animate-pulse">
                    <Bot className="h-4.5 w-4.5" />
                  </div>
                  <div className="max-w-[85%] rounded-2xl rounded-tl-none border border-border bg-card/60 px-4 py-3.5 shadow-xs flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-500" />
                    <span className="text-xs text-muted-foreground font-bold animate-pulse">MedHaven AI is thinking...</span>
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
              placeholder="Ask anything about your coursework..."
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
