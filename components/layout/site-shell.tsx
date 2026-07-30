import { SiteFooter } from "@/components/layout/site-footer"
import { TopNavigation } from "@/components/layout/top-navigation"

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <TopNavigation />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}
