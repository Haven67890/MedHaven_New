"use client"

import Link from "next/link"
import { Menu as MenuIcon } from "lucide-react"

import { MedHavenLogo } from "@/components/brand/medhaven-logo"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { Button } from "@/components/ui/button"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import useAuth from "@/hooks/useAuth"

export function TopNavigation() {
  const { user, loading, logout } = useAuth()

  return (
    <header className="sticky top-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <MedHavenLogo />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
          {!loading && !user ? (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Register</Link>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  await logout()
                  window.location.href = "/login"
                }}
              >
                Logout
              </Button>
            </>
          )}
          <ThemeToggle />
        </nav>
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open navigation">
                <MenuIcon aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Navigation</SheetTitle>
                <SheetDescription>Move around the MedHaven foundation.</SheetDescription>
              </SheetHeader>
              <nav className="flex flex-col gap-2 px-4" aria-label="Mobile navigation">
                {!loading && !user ? (
                  <>
                    <SheetClose asChild>
                      <Button variant="ghost" className="justify-start" asChild>
                        <Link href="/login">Sign in</Link>
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button className="mt-2" asChild>
                        <Link href="/register">Register</Link>
                      </Button>
                    </SheetClose>
                  </>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Button className="mt-2" asChild>
                        <Link href="/dashboard">Dashboard</Link>
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button
                        variant="outline"
                        className="mt-2"
                        onClick={async () => {
                          await logout()
                          window.location.href = "/login"
                        }}
                      >
                        Logout
                      </Button>
                    </SheetClose>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
