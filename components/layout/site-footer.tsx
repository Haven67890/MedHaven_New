import { MedHavenLogo } from "@/components/brand/medhaven-logo"

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <MedHavenLogo />
        <p className="text-sm leading-6 text-muted-foreground">
          A thoughtful foundation for what comes next.
        </p>
      </div>
    </footer>
  )
}
