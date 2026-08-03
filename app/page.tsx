import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SiteShell } from "@/components/layout/site-shell"

export default function HomePage() {
  return (
    <SiteShell>
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-12 sm:px-6 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
          <div className="flex flex-col gap-6">
            <span className="w-fit rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-primary">
              MedHaven
            </span>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                The care-focused campus experience for medical learners.
              </h1>
              <p className="max-w-xl text-lg text-muted-foreground">
                Access study resources, track your progress, and stay connected to your academic community in one clear workspace.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/register">Register</Link>
              </Button>
            </div>
          </div>

          <Card className="border-border shadow-xl shadow-primary/5">
            <CardHeader>
              <CardTitle>Built for medical training</CardTitle>
              <CardDescription>Connected tools for students, faculty, and administrators.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <p className="text-sm font-medium text-foreground">Academic access</p>
                <p className="mt-2 text-sm text-muted-foreground">View personalized materials, study pathways, and department-level updates.</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <p className="text-sm font-medium text-foreground">Secure workflows</p>
                <p className="mt-2 text-sm text-muted-foreground">Only authenticated users can reach protected dashboard and admin pages.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </SiteShell>
  )
}
