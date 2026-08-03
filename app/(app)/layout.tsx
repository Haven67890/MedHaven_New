"use client"

import { ApplicationShell } from "@/components/layout/application-shell"
import useAuth from "@/hooks/useAuth"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
        Loading...
      </div>
    )
  }

  // Auth protection is handled server-side by middleware.
  // This client layout just renders the application shell for authenticated users.
  return <ApplicationShell>{children}</ApplicationShell>
}
