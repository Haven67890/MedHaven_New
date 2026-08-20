"use client"

import React, { useState, useEffect, useRef } from "react"
import { Camera, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"

import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { clearCache } from "@/lib/cache"

type ProfileData = {
  id: string
  first_name?: string | null
  last_name?: string | null
  full_name?: string | null
  nickname?: string | null
  current_level?: string | null
  avatar_url?: string | null
}

interface EditProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: ProfileData | null
  onSaveSuccess?: () => void
}

const LEVEL_OPTIONS = ["100L", "200L", "300L", "400L", "500L", "600L"] as const
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB limit
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]

export function EditProfileDialog({
  open,
  onOpenChange,
  profile,
  onSaveSuccess,
}: EditProfileDialogProps) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Form State
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [nickname, setNickname] = useState("")
  const [level, setLevel] = useState<string>("100L")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  // UI State
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Populate form state when modal opens or profile changes
  useEffect(() => {
    if (open && profile) {
      setErrorMsg(null)
      setSuccessMsg(null)

      let fName = profile.first_name || ""
      let lName = profile.last_name || ""

      if (!fName && !lName && profile.full_name) {
        const parts = profile.full_name.trim().split(" ")
        fName = parts[0] || ""
        lName = parts.slice(1).join(" ") || ""
      }

      setFirstName(fName)
      setLastName(lName)
      setNickname(profile.nickname || "")
      setLevel(profile.current_level || "100L")
      setAvatarUrl(profile.avatar_url || null)
    }
  }, [open, profile])

  // Get initials fallback
  const computedDisplayName = `${firstName} ${lastName}`.trim() || profile?.full_name || "User"
  const initials = computedDisplayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U"

  // Handle immediate photo select & upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile?.id) return

    setErrorMsg(null)
    setSuccessMsg(null)

    // Reset input so re-selecting same file fires onChange again
    e.target.value = ""

    // Validate size (max 2MB)
    if (file.size > MAX_FILE_SIZE) {
      setErrorMsg("Image size exceeds 2MB limit. Please choose a smaller file.")
      return
    }

    // Validate type (JPEG, PNG, WebP)
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setErrorMsg("Invalid file format. Please upload a JPEG, PNG, or WebP image.")
      return
    }

    setUploadingPhoto(true)

    try {
      const ext = file.name.split(".").pop() || "jpg"
      const filePath = `${profile.id}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type,
        })

      if (uploadError) {
        throw new Error(uploadError.message || "Failed to upload profile photo.")
      }

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath)

      setAvatarUrl(publicUrl)
      setSuccessMsg("Photo uploaded successfully!")
    } catch (err: any) {
      console.error("Photo upload error:", err)
      setErrorMsg(err.message || "Photo upload failed. Please try again.")
    } finally {
      setUploadingPhoto(false)
    }
  }

  // Handle form submit (save all 4 fields at once)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.id) return

    setErrorMsg(null)
    setSuccessMsg(null)

    const trimmedFirstName = firstName.trim()
    const trimmedLastName = lastName.trim()

    if (!trimmedFirstName || !trimmedLastName) {
      setErrorMsg("Both First name and Last name are required.")
      return
    }

    if (nickname.length > 30) {
      setErrorMsg("Nickname must be 30 characters or less.")
      return
    }

    setSaving(true)

    try {
      const computedFullName = `${trimmedFirstName} ${trimmedLastName}`.trim()
      const trimmedNickname = nickname.trim() || null

      const { error: saveError } = await supabase
        .from("profiles")
        .upsert({
          id: profile.id,
          first_name: trimmedFirstName,
          last_name: trimmedLastName,
          full_name: computedFullName,
          nickname: trimmedNickname,
          current_level: level,
          avatar_url: avatarUrl,
        }, { onConflict: "id" })

      if (saveError) {
        throw new Error(saveError.message || "Failed to save profile changes.")
      }

      // Clear client cache and notify global listeners for immediate UI sync
      clearCache()
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("profile-updated"))
      }

      if (onSaveSuccess) {
        onSaveSuccess()
      }

      onOpenChange(false)
    } catch (err: any) {
      console.error("Save profile error:", err)
      setErrorMsg(err.message || "An error occurred while saving your profile.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your personal details, nickname, level, and profile photo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Avatar Upload Section */}
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Avatar
                initials={initials}
                src={avatarUrl}
                className="size-24 border-2 border-border shadow-md"
              />
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                {uploadingPhoto ? (
                  <Loader2 className="size-6 text-white animate-spin" />
                ) : (
                  <Camera className="size-6 text-white" />
                )}
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploadingPhoto || saving}
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadingPhoto || saving}
              onClick={() => fileInputRef.current?.click()}
              className="text-xs"
            >
              {uploadingPhoto ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Uploading photo...
                </>
              ) : (
                "Change photo"
              )}
            </Button>
            <p className="text-[11px] text-muted-foreground">JPEG, PNG, or WebP. Max 2MB.</p>
          </div>

          <FieldGroup className="gap-4">
            {/* First Name & Last Name */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="edit-firstname">First name *</FieldLabel>
                <Input
                  id="edit-firstname"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  disabled={saving}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="edit-lastname">Last name *</FieldLabel>
                <Input
                  id="edit-lastname"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  disabled={saving}
                />
              </Field>
            </div>

            {/* Nickname */}
            <Field>
              <FieldLabel htmlFor="edit-nickname">Nickname (optional)</FieldLabel>
              <Input
                id="edit-nickname"
                value={nickname}
                maxLength={30}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g. Doc Alex"
                disabled={saving}
              />
              <p className="text-[11px] text-muted-foreground text-right mt-1">
                {nickname.length}/30 characters
              </p>
            </Field>

            {/* Current Level Dropdown */}
            <Field>
              <FieldLabel htmlFor="edit-level">Current level *</FieldLabel>
              <select
                id="edit-level"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                disabled={saving}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {LEVEL_OPTIONS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    Level {lvl}
                  </option>
                ))}
              </select>
            </Field>
          </FieldGroup>

          {/* Feedback Banners */}
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || uploadingPhoto}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving changes...
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
