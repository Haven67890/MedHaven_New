"use client"

import { MenuIcon, PanelLeftIcon } from "lucide-react"

import { MedHavenLogo } from "@/components/brand/medhaven-logo"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

function SidebarContent() {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <MedHavenLogo />
      <Separator />
      <div className="flex flex-col gap-3" aria-label="Reserved navigation">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Workspace</p>
        <div className="flex items-center gap-3 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          <PanelLeftIcon aria-hidden="true" />
          Future navigation
        </div>
      </div>
      <p className="mt-auto text-xs leading-5 text-muted-foreground">
        This shell is ready for future phases.
      </p>
    </div>
  )
}

export function ApplicationShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh bg-muted/40">
      <aside className="hidden w-64 border-r bg-background lg:block" aria-label="Application sidebar">
        <SidebarContent />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-4 border-b bg-background px-4 sm:px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open sidebar">
                  <MenuIcon aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Application navigation</SheetTitle>
                  <SheetDescription>Placeholder navigation for future phases.</SheetDescription>
                </SheetHeader>
                <SidebarContent />
              </SheetContent>
            </Sheet>
            <MedHavenLogo compact />
          </div>
          <p className="hidden text-sm font-medium lg:block">Foundation workspace</p>
          <ThemeToggle />
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
