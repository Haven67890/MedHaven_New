"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { Download, X } from "lucide-react"

type PwaContextType = {
  isInstallable: boolean
  isInstalled: boolean
  triggerInstall: () => Promise<void>
}

const PwaContext = createContext<PwaContextType>({
  isInstallable: false,
  isInstalled: false,
  triggerInstall: async () => {},
})

export const usePwa = () => useContext(PwaContext)

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed"
    platform: string
  }>
  prompt(): Promise<void>
}

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("ServiceWorker registration successful with scope: ", registration.scope)
        })
        .catch((err) => {
          console.error("ServiceWorker registration failed: ", err)
        })
    }

    // 2. Handle beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)

      const dismissedTime = localStorage.getItem("medhaven_pwa_dismissed")
      if (!dismissedTime) {
        setShowBanner(true)
      } else {
        const sevenDays = 7 * 24 * 60 * 60 * 1000
        if (Date.now() - parseInt(dismissedTime, 10) > sevenDays) {
          setShowBanner(true)
        }
      }
    }

    // 3. Handle appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
      setShowBanner(false)
      console.log("MedHaven PWA was installed successfully!")
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any)?.standalone
    ) {
      setIsInstalled(true)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const triggerInstall = async () => {
    if (!deferredPrompt) return

    await deferredPrompt.prompt()

    const { outcome } = await deferredPrompt.userChoice
    console.log(`User response to the install prompt: ${outcome}`)

    if (outcome === "accepted") {
      setIsInstalled(true)
      setIsInstallable(false)
      setShowBanner(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowBanner(false)
    localStorage.setItem("medhaven_pwa_dismissed", Date.now().toString())
  }

  return (
    <PwaContext.Provider value={{ isInstallable, isInstalled, triggerInstall }}>
      {children}

      {/* Floating PWA Install Banner */}
      {showBanner && isInstallable && (
        <div className="fixed bottom-4 right-4 left-4 z-[9999] md:left-auto md:max-w-md">
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-lg text-card-foreground animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Download className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Install MedHaven</h3>
                  <p className="text-xs text-muted-foreground">
                    Install MedHaven on your device for fast offline access and native feel.
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                aria-label="Dismiss install notification"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={handleDismiss}
                className="rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors cursor-pointer"
              >
                Maybe later
              </button>
              <button
                onClick={triggerInstall}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors cursor-pointer"
              >
                <Download className="size-3.5" />
                Install App
              </button>
            </div>
          </div>
        </div>
      )}
    </PwaContext.Provider>
  )
}
