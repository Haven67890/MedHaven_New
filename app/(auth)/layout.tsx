"use client"

import Link from "next/link"

import { MedHavenLogo } from "@/components/brand/medhaven-logo"
import { ThemeToggle } from "@/components/layout/theme-toggle"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-svh bg-background">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      <aside className="hidden w-[42%] flex-col justify-between border-r border-border bg-primary p-10 text-primary-foreground lg:flex xl:p-14">
        <MedHavenLogo href="/" inverse />
        <div className="flex max-w-md flex-col gap-5">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary-foreground/70">MedHaven</p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight xl:text-5xl">A thoughtful foundation for care, connection, and progress.</h1>
          <p className="text-pretty text-lg leading-relaxed text-primary-foreground/75">A modern platform is taking shape—built to be clear, dependable, and easy to use from the very beginning.</p>
        </div>
        <p className="text-sm text-primary-foreground/65">Secure foundation. Human-centered design.</p>
      </aside>
      <main id="main-content" className="flex flex-1 items-center justify-center px-4 py-20 sm:px-8">
        <div className="flex w-full max-w-md flex-col gap-8">
          <div className="lg:hidden">
            <MedHavenLogo href="/" />
          </div>
          {children}
          <Link href="/" className="text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            Return to home
          </Link>
        </div>
      </main>
    </div>
  )
}
