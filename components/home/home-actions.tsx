"use client"

import Link from "next/link"
import { Heart } from "lucide-react"

import { Button } from "@/components/ui/button"
import useAuth from "@/hooks/useAuth"

export function HomeActions() {
  const { user, loading } = useAuth()

  return (
    <div className="flex flex-wrap items-center gap-3">
      {!loading && user ? (
        <Button asChild size="lg">
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      ) : (
        <>
          <Button asChild size="lg">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/register">Register</Link>
          </Button>
        </>
      )}
      <Button
        asChild
        variant="secondary"
        size="lg"
        className="gap-2 border border-rose-500/30 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/60"
      >
        <Link href="/donate">
          <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
          Support MedHaven
        </Link>
      </Button>
    </div>
  )
}
