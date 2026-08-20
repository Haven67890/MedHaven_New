import Link from "next/link"
import { MedHavenLogo } from "@/components/brand/medhaven-logo"

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card/50 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-3">
          <MedHavenLogo />
          <p className="text-sm text-muted-foreground max-w-sm">
            Built by Medical Students, for Medical Students. Supporting medical education at UNIJOS and universities across Nigeria.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link href="/about" className="hover:text-foreground transition-colors">
            About
          </Link>
          <Link href="/features" className="hover:text-foreground transition-colors">
            Features
          </Link>
          <Link href="/courses" className="hover:text-foreground transition-colors">
            Courses
          </Link>
          <a href="mailto:support@medhaven.com" className="hover:text-foreground transition-colors">
            Contact
          </a>
          <Link href="/login" className="hover:text-foreground transition-colors">
            Sign In
          </Link>
          <Link href="/register" className="hover:text-foreground transition-colors">
            Register
          </Link>
        </div>
      </div>
      <div className="mx-auto mt-8 w-full max-w-6xl border-t border-border/40 px-4 pt-6 text-xs text-muted-foreground sm:px-6">
        &copy; {new Date().getFullYear()} MedHaven. All rights reserved.
      </div>
    </footer>
  )
}
