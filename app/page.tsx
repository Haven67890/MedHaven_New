import { ArrowRight, CheckCircle2, Layers3, ShieldCheck, Sparkles } from "lucide-react"
import Link from "next/link"

import { SiteShell } from "@/components/layout/site-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const principles = [
  {
    icon: ShieldCheck,
    title: "Built with trust in mind",
    description: "A careful technical foundation designed for security, clarity, and responsible growth.",
  },
  {
    icon: Layers3,
    title: "Ready to scale",
    description: "Modular architecture that can evolve cleanly as MedHaven expands into future phases.",
  },
  {
    icon: Sparkles,
    title: "Thoughtfully simple",
    description: "A focused experience where modern technology feels calm, intuitive, and approachable.",
  },
]

export default function HomePage() {
  return (
    <SiteShell>
      <main id="main-content">
        <section className="border-b border-border">
          <div className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-7xl flex-col justify-center gap-12 px-4 py-20 sm:px-6 lg:flex-row lg:items-center lg:gap-20 lg:px-8">
            <div className="flex max-w-3xl flex-1 flex-col items-start gap-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground shadow-sm">
                <CheckCircle2 className="size-4 text-accent" aria-hidden="true" />
                Foundation for what comes next
              </div>
              <div className="flex flex-col gap-5">
                <h1 className="max-w-4xl text-balance text-5xl font-semibold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                  A clearer path to modern healthcare.
                </h1>
                <p className="max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl">
                  MedHaven is building an intelligent, dependable platform designed to make every future interaction feel simpler and more connected.
                </p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Button size="lg" asChild>
                  <Link href="/register">
                    Create an account
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
              </div>
            </div>

            <div className="w-full max-w-xl flex-1" aria-label="MedHaven application preview">
              <div className="rounded-3xl border border-border bg-card p-3 shadow-2xl shadow-primary/10">
                <div className="overflow-hidden rounded-2xl border border-border bg-muted/40">
                  <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-3">
                    <span className="size-2 rounded-full bg-primary" />
                    <span className="size-2 rounded-full bg-secondary" />
                    <span className="size-2 rounded-full bg-accent" />
                    <div className="ml-2 h-2 w-24 rounded-full bg-muted" />
                  </div>
                  <div className="flex min-h-80">
                    <div className="hidden w-24 border-r border-border bg-card p-4 sm:flex sm:flex-col sm:gap-3">
                      <div className="size-9 rounded-lg bg-primary" />
                      <div className="mt-4 h-2 rounded-full bg-muted" />
                      <div className="h-2 rounded-full bg-muted" />
                      <div className="h-2 w-2/3 rounded-full bg-muted" />
                    </div>
                    <div className="flex flex-1 flex-col gap-5 p-6 sm:p-8">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-2">
                          <div className="h-3 w-28 rounded-full bg-primary/25" />
                          <div className="h-6 w-44 rounded-full bg-foreground/85" />
                        </div>
                        <div className="size-10 rounded-full border border-border bg-card" />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="h-28 rounded-xl border border-border bg-card" />
                        <div className="h-28 rounded-xl border border-border bg-secondary/10" />
                      </div>
                      <div className="flex flex-1 flex-col gap-3 rounded-xl border border-border bg-card p-4">
                        <div className="h-3 w-1/3 rounded-full bg-foreground/70" />
                        <div className="h-2 rounded-full bg-muted" />
                        <div className="h-2 w-4/5 rounded-full bg-muted" />
                        <div className="mt-auto h-10 rounded-lg bg-primary/10" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-20 sm:px-6 lg:px-8">
          <div className="flex max-w-2xl flex-col gap-3">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">Our foundation</p>
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Designed to grow without losing focus.</h2>
            <p className="text-pretty leading-relaxed text-muted-foreground">The first phase establishes a polished, resilient base for everything MedHaven will become.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {principles.map(({ icon: Icon, title, description }) => (
              <Card key={title} className="border-border bg-card shadow-sm">
                <CardHeader>
                  <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <CardTitle className="pt-3">{title}</CardTitle>
                  <CardDescription className="leading-relaxed">{description}</CardDescription>
                </CardHeader>
                <CardContent />
              </Card>
            ))}
          </div>
        </section>
      </main>
    </SiteShell>
  )
}
