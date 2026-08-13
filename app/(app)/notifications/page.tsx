"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Bell, BellRing, CheckCheck, ListFilter as Filter, Loader2, Inbox } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { StatCard } from "@/components/dashboard/stat-card"
import { cn } from "@/lib/utils"
import useAuth from "@/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"

type AuditLogNotification = {
  id: string
  action: string
  old_value: string | null
  new_value: string | null
  reason: string | null
  created_at: string
}

type TranslatedNotification = {
  id: string
  title: string
  body: string
  time: string
  category: string
  unread: boolean
}

function translateAuditLog(log: AuditLogNotification): TranslatedNotification {
  const action = log.action
  const reason = log.reason
  const oldVal = log.old_value
  const newVal = log.new_value

  let title = "Account Updated"
  let body = "Your account profile was updated by an administrator."

  switch (action) {
    case "suspend_user":
      title = "Account Suspended"
      body = reason ? `Your account was suspended: ${reason}` : "Your account was suspended."
      break
    case "reactivate_user":
      title = "Account Status Restored"
      body = "Your account status was restored."
      break
    case "ban_user":
      title = "Account Banned"
      body = reason ? `Your account was banned: ${reason}` : "Your account was banned."
      break
    case "update_role":
      title = "Account Role Updated"
      body = `Your account role was updated from ${oldVal || "unknown"} to ${newVal || "unknown"}.`
      break
    case "update_permissions":
      title = "Administrative Permissions Updated"
      body = "Your administrative permissions were updated."
      break
    case "update_profile_name":
      title = "Profile Name Updated"
      body = `Your account name was changed from ${oldVal || "none"} to ${newVal || "none"}.`
      break
    case "update_profile_department":
      title = "Department Updated"
      body = `Your department was updated from ${oldVal || "none"} to ${newVal || "none"}.`
      break
    case "update_profile_level":
      title = "Academic Level Updated"
      body = `Your academic level was updated from ${oldVal || "none"} to ${newVal || "none"}.`
      break
    case "update_profile_university":
      title = "University Association Updated"
      body = "Your university association was updated."
      break
    case "update_profile_faculty":
      title = "Faculty Association Updated"
      body = "Your faculty association was updated."
      break
    default:
      if (reason) {
        body = reason
      } else if (action) {
        body = `Your account was updated (${action.replace(/_/g, " ")}).`
      }
      break
  }

  // Format time beautifully
  let timeStr = "Recent"
  try {
    const date = new Date(log.created_at)
    timeStr = date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch (e) {
    console.warn("Error parsing created_at date:", e)
  }

  return {
    id: log.id,
    title,
    body,
    time: timeStr,
    category: "Platform",
    unread: true,
  }
}

export default function NotificationsPage() {
  const supabase = createClient()
  const { user, loading: authLoading } = useAuth()

  const [activeCategory, setActiveCategory] = useState<"platform" | "academic" | "timetable" | "clinical" | "marketplace">("platform")
  const [logs, setLogs] = useState<AuditLogNotification[]>([])
  const [prefs, setPrefs] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user?.id) {
      setLoading(false)
      return
    }

    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        // Query admin_audit_log filtered to target_type = 'user' and target_id = current user's ID
        const { data: auditData, error: auditError } = await supabase
          .from("admin_audit_log")
          .select("id, action, old_value, new_value, reason, created_at")
          .eq("target_type", "user")
          .eq("target_id", user.id)
          .order("created_at", { ascending: false })

        if (auditError) {
          console.error("Failed to fetch admin audit logs:", auditError)
          setError(auditError.message)
        } else {
          setLogs(auditData || [])
        }

        // Safely fetch user_preferences
        const { data: prefData, error: prefError } = await supabase
          .from("user_preferences")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle()

        if (prefError) {
          console.warn("Could not load user_preferences safely:", prefError.message)
        } else if (prefData) {
          setPrefs(prefData)
        }
      } catch (err: any) {
        console.error("Unexpected error loading notifications data:", err)
        setError(err.message || "An unexpected error occurred.")
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [user?.id, authLoading, supabase])

  // Helper to determine if platform notifications are enabled in user_preferences
  const isPlatformEnabled = () => {
    if (!prefs) return true
    const np = prefs.notification_prefs
    if (!np) return true
    if (np.platform !== undefined) return Boolean(np.platform)
    if (np.announcements !== undefined) return Boolean(np.announcements)
    if (np.system !== undefined) return Boolean(np.system)
    return true
  }

  const translatedNotifications = logs.map(translateAuditLog)
  const showPlatformNotifications = isPlatformEnabled()

  const categories = [
    { id: "platform" as const, label: "Platform" },
    { id: "academic" as const, label: "Academic" },
    { id: "timetable" as const, label: "Timetable" },
    { id: "clinical" as const, label: "Clinical" },
    { id: "marketplace" as const, label: "Marketplace" },
  ]

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Notifications" description="Stay on top of announcements, replies, and reminders." />

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-px">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "relative pb-3 text-sm font-medium transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isActive
                  ? "text-foreground after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-primary"
                  : "text-muted-foreground"
              )}
            >
              <span className="px-3">{cat.label}</span>
            </button>
          )
        })}
      </div>

      {/* Content Area */}
      {authLoading || loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading notifications...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed rounded-2xl p-6">
          <p className="text-sm text-destructive font-medium">Failed to load notifications</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        </div>
      ) : activeCategory === "platform" ? (
        !showPlatformNotifications ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed rounded-2xl p-6">
            <Inbox className="size-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium text-foreground">Platform Notifications Disabled</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              You have disabled platform notifications in your settings. You can re-enable them under display/notification settings.
            </p>
          </div>
        ) : translatedNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed rounded-2xl p-6">
            <Inbox className="size-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium text-foreground">You are all caught up!</p>
            <p className="text-xs text-muted-foreground mt-1">No account-related events to show right now.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <SectionHeading title="Recent Events" description="Account-related events logged on your profile." />
            <div className="flex flex-col gap-3 mt-2">
              {translatedNotifications.map((item) => (
                <div key={item.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors">
                  <span className="mt-1 flex size-2.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <Badge variant="secondary" className="shrink-0">{item.category}</Badge>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">{item.body}</p>
                    <span className="text-xs text-muted-foreground/70">{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      ) : (
        /* Empty states for empty categories as instructed */
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed rounded-2xl p-6">
          <Inbox className="size-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium text-foreground">No notifications in this category yet</p>
          <p className="text-xs text-muted-foreground mt-1">There are no upcoming or past updates in this section.</p>
        </div>
      )}

      <div className="flex justify-center mt-4">
        <Button variant="ghost" asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
