"use client"

import { useState, useEffect } from "react"
import { Bell, Eye, EyeOff, Lock, Moon, Palette, User, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { cn } from "@/lib/utils"
import useAuth from "@/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import {
  MotionReveal,
  MotionStaggerGroup,
  MotionStaggerItem,
} from "@/components/ui/motion"

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
    { id: "all_levels", label: "All levels", description: "Show reference materials and past questions from all academic levels." },
    { id: "group_only", label: "My group only", description: "Show only content matching your academic level group (e.g., Pre-clinical vs Clinical)." },
    { id: "exact_level", label: "My exact level only", description: "Show only content that is specifically linked to your exact current level." },
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
  const { setTheme } = useTheme()

  // Section 1 State: Personal Details
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [initialEmail, setInitialEmail] = useState("")
  const [personalLoading, setPersonalLoading] = useState(false)
  const [personalMessage, setPersonalMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Section 2 State: Password
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Section 3 State: Notifications
  const [notifications, setNotifications] = useState({
    announcements: true,
    tutorialReminders: true,
    marketplaceActivity: false,
    weeklyDigest: true,
  })
  const [notifLoading, setNotifLoading] = useState(false)
  const [notifMessage, setNotifMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Section 4 State: Appearance & Content
  const [darkMode, setDarkMode] = useState(true)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [contentVisibility, setContentVisibility] = useState<string>("all_levels")
  const [selectedTheme, setSelectedTheme] = useState<string>("system")
  const [appearanceLoading, setAppearanceLoading] = useState(false)
  const [appearanceMessage, setAppearanceMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    if (!user?.id) return

    const loadData = async () => {
      let currentAuthEmail = user.email ?? ""
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser?.email) {
          currentAuthEmail = authUser.email
        }
      } catch (err) {
        console.warn("Failed to fetch user auth session details:", err)
      }

      setEmail(currentAuthEmail)
      setInitialEmail(currentAuthEmail)

      // Fetch profile details
      const { data: profileData } = await supabase
        .from("profiles")
        .select("first_name, last_name, full_name")
        .eq("id", user.id)
        .maybeSingle()

      if (profileData) {
        if (profileData.first_name || profileData.last_name) {
          setFirstName(profileData.first_name ?? "")
          setLastName(profileData.last_name ?? "")
        } else if (profileData.full_name) {
          const names = String(profileData.full_name).split(" ")
          setFirstName(names[0] || "")
          setLastName(names.slice(1).join(" ") || "")
        }
      }

      // Fetch user preferences
      try {
        const { data: prefData } = await supabase
          .from("user_preferences")
          .select("dark_mode, reduce_motion, content_visibility, notification_prefs, theme")
          .eq("user_id", user.id)
          .maybeSingle()

        if (prefData) {
          if (typeof prefData.dark_mode === "boolean") {
            setDarkMode(prefData.dark_mode)
          }
          if (typeof prefData.reduce_motion === "boolean") {
            setReduceMotion(prefData.reduce_motion)
            if (prefData.reduce_motion) {
              document.documentElement.classList.add("reduce-motion")
            } else {
              document.documentElement.classList.remove("reduce-motion")
            }
          }

          if (prefData.content_visibility) {
            let vis = prefData.content_visibility
            if (vis === "all") vis = "all_levels"
            if (vis === "group") vis = "group_only"
            if (vis === "exact") vis = "exact_level"
            setContentVisibility(vis)
          }

          if (prefData.theme) {
            setSelectedTheme(prefData.theme)
          }
          if (prefData.notification_prefs && typeof prefData.notification_prefs === "object") {
            const prefs = prefData.notification_prefs as Record<string, boolean>
            setNotifications({
              announcements: prefs.announcements ?? true,
              tutorialReminders: prefs.tutorialReminders ?? true,
              marketplaceActivity: prefs.marketplaceActivity ?? false,
              weeklyDigest: prefs.weeklyDigest ?? true,
            })
          }
        }
      } catch (err) {
        console.warn("Failed to fetch user preferences:", err)
      }
    }

    void loadData()
  }, [user?.id, user?.email, supabase])

  // SECTION 1: Personal Details Handler
  const handleSavePersonalDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return

    setPersonalLoading(true)
    setPersonalMessage(null)

    try {
      const computedFullName = `${firstName.trim()} ${lastName.trim()}`.trim()
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: computedFullName,
        }, { onConflict: "id" })

      if (profileError) {
        throw new Error(profileError.message)
      }

      let emailMsg = ""
      if (email.trim() && email.trim() !== initialEmail) {
        const { error: authError } = await supabase.auth.updateUser({ email: email.trim() })
        if (authError) {
          throw new Error(authError.message)
        }
        emailMsg = " A confirmation link has been sent to your new email address."
        setInitialEmail(email.trim())
      }

      setPersonalMessage({
        type: "success",
        text: `Personal details saved successfully!${emailMsg}`,
      })
    } catch (err: any) {
      setPersonalMessage({
        type: "error",
        text: err.message || "Failed to save personal details.",
      })
    } finally {
      setPersonalLoading(false)
    }
  }

  // SECTION 2: Password Handler
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordLoading(true)
    setPasswordMessage(null)

    if (!currentPassword) {
      setPasswordMessage({ type: "error", text: "Please enter your current password." })
      setPasswordLoading(false)
      return
    }

    if (!newPassword || !confirmPassword) {
      setPasswordMessage({ type: "error", text: "Please enter both new password and confirmation." })
      setPasswordLoading(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New password and confirmation password do not match." })
      setPasswordLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        throw new Error(error.message)
      }

      setPasswordMessage({ type: "success", text: "Password updated successfully!" })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err: any) {
      setPasswordMessage({
        type: "error",
        text: err.message || "Failed to update password.",
      })
    } finally {
      setPasswordLoading(false)
    }
  }

  // SECTION 3: Notifications Handler
  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return

    setNotifLoading(true)
    setNotifMessage(null)

    try {
      const { error } = await supabase
        .from("user_preferences")
        .upsert({
          user_id: user.id,
          notification_prefs: notifications,
        }, { onConflict: "user_id" })

      if (error) {
        throw new Error(error.message)
      }

      setNotifMessage({ type: "success", text: "Notification preferences saved!" })
    } catch (err: any) {
      setNotifMessage({
        type: "error",
        text: err.message || "Failed to save notification preferences.",
      })
    } finally {
      setNotifLoading(false)
    }
  }

  // SECTION 4: Immediate UI changes + Save Handler for Appearance
  const handleDarkModeChange = (val: boolean) => {
    setDarkMode(val)
    setTheme(val ? "dark" : "light")
    if (val) {
      setSelectedTheme("dark")
    } else {
      setSelectedTheme("light")
    }
  }

  const handleReduceMotionChange = (val: boolean) => {
    setReduceMotion(val)
    if (val) {
      document.documentElement.classList.add("reduce-motion")
    } else {
      document.documentElement.classList.remove("reduce-motion")
    }
  }

  const handleThemeSelectChange = (val: string) => {
    setSelectedTheme(val)
    setTheme(val)
    if (val === "dark") {
      setDarkMode(true)
    } else if (val === "light") {
      setDarkMode(false)
    }
  }

  const handleSaveAppearance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return

    setAppearanceLoading(true)
    setAppearanceMessage(null)

    try {
      const { error } = await supabase
        .from("user_preferences")
        .upsert({
          user_id: user.id,
          dark_mode: darkMode,
          reduce_motion: reduceMotion,
          content_visibility: contentVisibility,
          theme: selectedTheme,
        }, { onConflict: "user_id" })

      if (error) {
        throw new Error(error.message)
      }

      setAppearanceMessage({ type: "success", text: "Display & content preferences saved!" })
    } catch (err: any) {
      setAppearanceMessage({
        type: "error",
        text: err.message || "Failed to save display & content preferences.",
      })
    } finally {
      setAppearanceLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Settings" description="Manage your account, preferences, and privacy." />

      <FieldSet>
        {/* SECTION 1: Personal Details */}
        <SectionHeading title="Account" description="Your personal information." />
        <MotionReveal direction="up" distance={16}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><User className="size-4 text-primary" aria-hidden="true" /> Personal details</CardTitle>
              <CardDescription>Update how your name appears across MedHaven.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSavePersonalDetails}>
                <FieldGroup>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="settings-firstname">First name</FieldLabel>
                      <Input
                        id="settings-firstname"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="settings-lastname">Last name</FieldLabel>
                      <Input
                        id="settings-lastname"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </Field>
                  </div>
                  <Field>
                    <FieldLabel htmlFor="settings-email">Email address</FieldLabel>
                    <Input
                      id="settings-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <FieldDescription>Used for sign-in and important notifications.</FieldDescription>
                  </Field>

                  {personalMessage && (
                    <div className={cn(
                      "flex items-center gap-2 p-3 rounded-lg text-sm font-medium",
                      personalMessage.type === "success" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-destructive/10 text-destructive border border-destructive/20"
                    )}>
                      {personalMessage.type === "success" ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
                      <span>{personalMessage.text}</span>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button type="submit" disabled={personalLoading}>
                      {personalLoading ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save details"
                      )}
                    </Button>
                  </div>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
        </MotionReveal>

        {/* SECTION 2: Password */}
        <SectionHeading title="Security" description="Keep your account safe." />
        <MotionReveal direction="up" distance={16}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Lock className="size-4 text-primary" aria-hidden="true" /> Password</CardTitle>
              <CardDescription>Choose a strong, unique password.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="settings-current">Current password</FieldLabel>
                    <div className="relative">
                      <Input
                        id="settings-current"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter current password"
                        className="pr-10"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
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
                      <Input
                        id="settings-new"
                        type="password"
                        placeholder="Create a new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="settings-confirm">Confirm password</FieldLabel>
                      <Input
                        id="settings-confirm"
                        type="password"
                        placeholder="Re-enter new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </Field>
                  </div>

                  {passwordMessage && (
                    <div className={cn(
                      "flex items-center gap-2 p-3 rounded-lg text-sm font-medium",
                      passwordMessage.type === "success" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-destructive/10 text-destructive border border-destructive/20"
                    )}>
                      {passwordMessage.type === "success" ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
                      <span>{passwordMessage.text}</span>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button type="submit" disabled={passwordLoading}>
                      {passwordLoading ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        "Update password"
                      )}
                    </Button>
                  </div>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
        </MotionReveal>

        {/* SECTION 3: Notifications */}
        <SectionHeading title="Notifications" description="Choose what you hear about." />
        <MotionReveal direction="up" distance={16}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Bell className="size-4 text-primary" aria-hidden="true" /> Notification preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveNotifications} className="flex flex-col gap-4">
                <div className="flex flex-col gap-3">
                  <Toggle
                    checked={notifications.announcements}
                    onChange={(v) => setNotifications((n) => ({ ...n, announcements: v }))}
                    label="Announcements"
                    description="Academic and institutional updates."
                  />
                  <Toggle
                    checked={notifications.tutorialReminders}
                    onChange={(v) => setNotifications((n) => ({ ...n, tutorialReminders: v }))}
                    label="Tutorial reminders"
                    description="Reminders before scheduled sessions."
                  />
                  <Toggle
                    checked={notifications.marketplaceActivity}
                    onChange={(v) => setNotifications((n) => ({ ...n, marketplaceActivity: v }))}
                    label="Marketplace activity"
                    description="New listings and sales updates."
                  />
                  <Toggle
                    checked={notifications.weeklyDigest}
                    onChange={(v) => setNotifications((n) => ({ ...n, weeklyDigest: v }))}
                    label="Weekly study digest"
                    description="A summary of your activity every Sunday."
                  />
                </div>

                {notifMessage && (
                  <div className={cn(
                    "flex items-center gap-2 p-3 rounded-lg text-sm font-medium",
                    notifMessage.type === "success" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-destructive/10 text-destructive border border-destructive/20"
                  )}>
                    {notifMessage.type === "success" ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
                    <span>{notifMessage.text}</span>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button type="submit" disabled={notifLoading}>
                    {notifLoading ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save notifications"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </MotionReveal>

        {/* SECTION 4: Appearance & Content */}
        <SectionHeading title="Appearance & Content" description="How MedHaven looks and filters content for you." />
        <MotionReveal direction="up" distance={16}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Palette className="size-4 text-primary" aria-hidden="true" /> Display & content preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveAppearance} className="flex flex-col gap-4">
                <div className="flex flex-col gap-3">
                  <Toggle
                    checked={darkMode}
                    onChange={handleDarkModeChange}
                    label="Dark mode"
                    description="Use a darker theme that's easier on the eyes."
                  />
                  <Toggle
                    checked={reduceMotion}
                    onChange={handleReduceMotionChange}
                    label="Reduce motion"
                    description="Minimize animations and transitions."
                  />
                  <VisibilitySelector value={contentVisibility} onChange={setContentVisibility} />

                  <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="flex items-center gap-2 text-sm font-medium text-foreground"><Moon className="size-4 text-primary" aria-hidden="true" /> Theme</span>
                      <span className="text-xs text-muted-foreground">Select preferred theme style.</span>
                    </div>
                    <select
                      value={selectedTheme}
                      onChange={(e) => handleThemeSelectChange(e.target.value)}
                      className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="system">System</option>
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </div>
                </div>

                {appearanceMessage && (
                  <div className={cn(
                    "flex items-center gap-2 p-3 rounded-lg text-sm font-medium",
                    appearanceMessage.type === "success" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-destructive/10 text-destructive border border-destructive/20"
                  )}>
                    {appearanceMessage.type === "success" ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
                    <span>{appearanceMessage.text}</span>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button type="submit" disabled={appearanceLoading}>
                    {appearanceLoading ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save display preferences"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </MotionReveal>
      </FieldSet>
    </div>
  )
}
