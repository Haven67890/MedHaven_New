"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Menu as MenuIcon } from "lucide-react"

import { accountNav, adminNav, communityNav, primaryNav, type NavItem } from "@/lib/navigation"
import { MedHavenLogo } from "@/components/brand/medhaven-logo"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import useAuth from "@/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"

function normalizeRole(value: unknown): string {
  if (typeof value !== "string") return ""
  return value.trim().toLowerCase()
}

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const router = useRouter()
  const pathname = usePathname()
  const isActive = pathname === item.href
  const Icon = item.icon

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onNavigate) {
      onNavigate()
    }
    if (item.href === "/admin") {
      e.preventDefault()
      router.refresh()
      router.push("/admin")
    }
  }

  return (
    <Link
      href={item.href}
      onClick={handleClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="truncate">{item.label}</span>
    </Link>
  )
}

function NavSection({ title, items, onNavigate }: { title: string; items: NavItem[]; onNavigate?: () => void }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
      {items.map((item) => (
        <NavLink key={item.href} item={item} onNavigate={onNavigate} />
      ))}
    </div>
  )
}

function SidebarContent({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <MedHavenLogo />
      <Separator />
      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto" aria-label="Application navigation">
        <NavSection title="Workspace" items={primaryNav} onNavigate={onNavigate} />
        <NavSection title="Community" items={communityNav} onNavigate={onNavigate} />
        <NavSection title="Account" items={accountNav} onNavigate={onNavigate} />
        {isAdmin && (
          <NavSection title="Administration" items={adminNav} onNavigate={onNavigate} />
        )}
      </nav>
      <p className="text-xs leading-5 text-muted-foreground">
        MedHaven — interactive preview.
      </p>
    </div>
  )
}

export function ApplicationShell({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!user?.id) return

    const checkAdmin = async () => {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle()

      const profile = profileData as Record<string, unknown> | null
      const role = normalizeRole(profile?.role ?? "")
      const admin = role === "admin" || role === "super_admin" || role === "moderator"
      setIsAdmin(admin)
    }

    void checkAdmin()
  }, [user?.id])

  return (
    <div className="flex min-h-svh bg-muted/40">
      <aside className="hidden w-64 border-r bg-background lg:block" aria-label="Application sidebar">
        <SidebarContent isAdmin={isAdmin} />
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
                  <SheetDescription>Navigate the MedHaven workspace.</SheetDescription>
                </SheetHeader>
                <SidebarContent isAdmin={isAdmin} />
              </SheetContent>
            </Sheet>
            <MedHavenLogo compact />
          </div>
          <p className="hidden text-sm font-medium lg:block">MedHaven workspace</p>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut()
                window.location.href = "/login"
              }}
            >
              Logout
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
