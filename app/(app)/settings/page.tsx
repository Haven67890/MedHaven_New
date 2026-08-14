"use client"

import { useState, useEffect } from "react"
import { Bell, Eye, EyeOff, Lock, Moon, Palette, User } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { cn } from "@/lib/utils"
import useAuth from "@/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          checked ? "bg-primary" : "bg-muted"
        )}
      >
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-background shadow-sm transition-transform", checked ? "left-[1.375rem]" : "left-0.5")} />
      </button>
    </div>
  )
}

function VisibilitySelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = [
    { id: "all", label: "All levels", description: "Show reference materials and past questions from all academic levels." },
    { id: "group", label: "My group only", description: "Show only content matching your academic level group (e.g., Pre-clinical vs Clinical)." },
    { id: "exact", label: "My exact level only", description: "Show only content that is specifically linked to your exact current level." },
  ]

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-4 bg-card">
      <div className="flex flex-col gap-0.5 pb-2 border-b border-border mb-1">
        <span className="text-sm font-medium text-foreground">Content visibility</span>
        <span className="text-xs text-muted-foreground">Control what academic levels are visible across the platform.</span>
      </div>
      <div className="flex flex-col gap-2">
        {options.map((opt) => {
          const isSelected = value === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-left transition-all hover:bg-muted/50",
                isSelected ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              <div className="flex h-5 items-center">
                <div className={cn(
                  "flex size-4 items-center justify-center rounded-full border",
                  isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                )}>
                  {isSelected && <span className="size-1.5 rounded-full bg-background" />}
                </div>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">{opt.label}</span>
                <span className="text-xs text-muted-foreground">{opt.description}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const supabase = createClient()
  const { user } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [notifications, setNotifications] = useState({ announcements: true, tutorials: true, marketplace: false, weekly: true })
  const [appearance, setAppearance] = useState({ darkMode: true, reducedMotion: false })
  const [profile, setProfile] = useState<{ first_name?: string; last_name?: string; email?: string } | null>(null)
  const [contentVisibility, setContentVisibility] = useState<string>("all")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!user?.id) return

    const loadProfile = async () => {
      let sessionEmail = user.email ?? ""
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser?.email) {
          sessionEmail = authUser.email
        }
      } catch (err) {
        console.warn("Failed to fetch user auth session details in settings:", err)
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle()

      if (profileData) {
        const names = String(profileData.full_name ?? "").split(" ")
        setProfile({
          first_name: names[0] || "",
          last_name: names.slice(1).join(" ") || "",
          email: sessionEmail,
        })
      } else {
        setProfile({
          first_name: "",
          last_name: "",
          email: sessionEmail,
        })
      }

      // Fetch user_preferences
      try {
        const { data: prefData } = await supabase
          .from("user_preferences")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle()

        if (prefData) {
          if (prefData.content_visibility) {
            setContentVisibility(prefData.content_visibility)
          } else if (prefData.show_other_levels === false) {
            setContentVisibility("group")
          } else {
            setContentVisibility("all")
          }
        } else {
          setContentVisibility("all")
        }
      } catch (err) {
        console.warn("Failed to fetch user preferences:", err)
      }
    }

    void loadProfile()
  }, [user?.id, user?.email, supabase])

  const handleContentVisibilityChange = async (val: string) => {
    setContentVisibility(val)
    if (!user?.id) return
    try {
      const { error } = await supabase
        .from("user_preferences")
        .upsert({
          user_id: user.id,
          content_visibility: val,
          show_other_levels: val === "all"
        }, { onConflict: "user_id" })
      if (error) {
        console.error("Failed to save content_visibility preference:", error)
      }
    } catch (err) {
      console.error("Error saving content_visibility preference:", err)
    }
  }

  const handleSaveAllChanges = async () => {
    if (!user?.id) return
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from("user_preferences")
        .upsert({
          user_id: user.id,
          content_visibility: contentVisibility,
          show_other_levels: contentVisibility === "all"
        }, { onConflict: "user_id" })

      if (error) {
        alert("Failed to save changes: " + error.message)
      } else {
        alert("All preferences saved successfully!")
      }
    } catch (err: any) {
      alert("Error saving preferences: " + (err.message || err))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Settings" description="Manage your account, preferences, and privacy." />

      <FieldSet>
        <SectionHeading title="Account" description="Your personal information." />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><User className="size-4 text-primary" aria-hidden="true" /> Personal details</CardTitle>
            <CardDescription>Update how your name appears across MedHaven.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="settings-firstname">First name</FieldLabel>
                  <Input id="settings-firstname" defaultValue={profile?.first_name ?? ""} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="settings-lastname">Last name</FieldLabel>
                  <Input id="settings-lastname" defaultValue={profile?.last_name ?? ""} />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="settings-email">Email address</FieldLabel>
                <Input id="settings-email" type="email" defaultValue={profile?.email ?? ""} />
                <FieldDescription>Used for sign-in and important notifications.</FieldDescription>
              </Field>
              <div className="flex justify-end">
                <Button>Save changes</Button>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        <SectionHeading title="Security" description="Keep your account safe." />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Lock className="size-4 text-primary" aria-hidden="true" /> Password</CardTitle>
            <CardDescription>Choose a strong, unique password.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="settings-current">Current password</FieldLabel>
                <div className="relative">
                  <Input id="settings-current" type={showPassword ? "text" : "password"} placeholder="Enter current password" className="pr-10" />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                  </button>
                </div>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="settings-new">New password</FieldLabel>
                  <Input id="settings-new" type="password" placeholder="Create a new password" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="settings-confirm">Confirm password</FieldLabel>
                  <Input id="settings-confirm" type="password" placeholder="Re-enter new password" />
                </Field>
              </div>
              <div className="flex justify-end">
                <Button>Update password</Button>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        <SectionHeading title="Notifications" description="Choose what you hear about." />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Bell className="size-4 text-primary" aria-hidden="true" /> Notification preferences</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Toggle checked={notifications.announcements} onChange={(v) => setNotifications((n) => ({ ...n, announcements: v }))} label="Announcements" description="Academic and institutional updates." />
            <Toggle checked={notifications.tutorials} onChange={(v) => setNotifications((n) => ({ ...n, tutorials: v }))} label="Tutorial reminders" description="Reminders before scheduled sessions." />
            <Toggle checked={notifications.marketplace} onChange={(v) => setNotifications((n) => ({ ...n, marketplace: v }))} label="Marketplace activity" description="New listings and sales updates." />
            <Toggle checked={notifications.weekly} onChange={(v) => setNotifications((n) => ({ ...n, weekly: v }))} label="Weekly study digest" description="A summary of your activity every Sunday." />
          </CardContent>
        </Card>

        <SectionHeading title="Appearance & Content" description="How MedHaven looks and filters content for you." />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Palette className="size-4 text-primary" aria-hidden="true" /> Display & content preferences</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Toggle checked={appearance.darkMode} onChange={(v) => setAppearance((a) => ({ ...a, darkMode: v }))} label="Dark mode" description="Use a darker theme that's easier on the eyes." />
            <Toggle checked={appearance.reducedMotion} onChange={(v) => setAppearance((a) => ({ ...a, reducedMotion: v }))} label="Reduce motion" description="Minimize animations and transitions." />
            <VisibilitySelector value={contentVisibility} onChange={handleContentVisibilityChange} />
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
              <div className="flex flex-col gap-0.5">
                <span className="flex items-center gap-2 text-sm font-medium text-foreground"><Moon className="size-4 text-primary" aria-hidden="true" /> Theme</span>
                <span className="text-xs text-muted-foreground">Sync with system is on.</span>
              </div>
              <Badge variant="accent">System</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline">Cancel</Button>
          <Button onClick={handleSaveAllChanges} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save all changes"}
          </Button>
        </div>
      </FieldSet>
    </div>
  )
}
