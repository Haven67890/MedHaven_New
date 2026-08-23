import Metadata from "next"
import Link from "next/link"
import { Mail, MessageSquare, Clock, ArrowLeft, Headphones } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { SiteShell } from "@/components/layout/site-shell"

export const metadata = {
  title: "Contact & Support — MedHaven",
  description: "Reach out to MedHaven Support via Email or WhatsApp. We're here to help 24/7.",
}

export default function ContactPage() {
  return (
    <SiteShell>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-4 py-12 sm:px-6 md:py-20">
        {/* Navigation back */}
        <div>
          <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground hover:text-foreground">
            <Link href="/" className="flex items-center gap-1.5">
              <ArrowLeft className="size-4" /> Back to Home
            </Link>
          </Button>
        </div>

        {/* Page Header */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
            <Headphones className="size-6" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
            Contact MedHaven Support
          </h1>
          <p className="text-base text-muted-foreground max-w-md">
            We're here to help — reach out anytime
          </p>
        </div>

        {/* Contact Cards Grid */}
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Email Card */}
          <Card className="border border-border/80 bg-card hover:border-primary/50 transition-all shadow-sm flex flex-col justify-between">
            <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
              <div className="flex size-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 shrink-0">
                <Mail className="size-6" />
              </div>
              <div>
                <CardTitle className="text-lg">Email Support</CardTitle>
                <CardDescription className="text-xs">Direct inbox for all inquiries</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-6 pt-4">
              <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email Address</p>
                <p className="text-base font-medium text-foreground select-all">medhaven57@gmail.com</p>
              </div>

              <Button asChild variant="default" className="w-full h-10 font-semibold bg-primary hover:bg-primary/90">
                <a href="mailto:medhaven57@gmail.com" className="flex items-center justify-center gap-2">
                  <Mail className="size-4" /> Send us an email
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* WhatsApp Card */}
          <Card className="border border-border/80 bg-card hover:border-emerald-500/50 transition-all shadow-sm flex flex-col justify-between">
            <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
              <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
                <MessageSquare className="size-6" />
              </div>
              <div>
                <CardTitle className="text-lg">WhatsApp Support</CardTitle>
                <CardDescription className="text-xs">Fast messaging & instant help</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-6 pt-4">
              <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">WhatsApp Line</p>
                <p className="text-base font-medium text-foreground select-all">07072299463</p>
              </div>

              <Button asChild variant="default" className="w-full h-10 font-semibold bg-emerald-600 hover:bg-emerald-600/90 text-white">
                <a href="https://wa.me/2347072299463" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                  <MessageSquare className="size-4" /> Message on WhatsApp
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Response Time Note */}
        <div className="flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground bg-muted/30 border border-border/60 rounded-xl p-4 text-center">
          <Clock className="size-4 text-primary shrink-0" />
          <span>We typically respond within 24 hours</span>
        </div>
      </div>
    </SiteShell>
  )
}
