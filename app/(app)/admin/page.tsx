import type { Metadata } from "next"

import { ShieldCheck } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "MedHaven administration workspace.",
}

export default function AdminPage() {
  // Admin dashboard is not yet implemented.
  // Route protection is handled server-side by middleware — non-admin users are redirected.
  // If an admin reaches this page, show a placeholder.
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="border-border max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Admin Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The admin dashboard is coming soon. Platform administration tools will be available in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
