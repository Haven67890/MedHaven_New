export function safeNextPath(value: string | null | undefined, fallback = "/"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback
  if (value.startsWith("/api/")) return fallback
  return value
}

export function isEmailVerified(user: { email_confirmed_at?: string | null; confirmed_at?: string | null }): boolean {
  return Boolean(user.email_confirmed_at ?? user.confirmed_at)
}

export function maskEmail(email: string | null | undefined): string {
  if (!email || !email.includes("@")) return "your email address"
  const [local, domain] = email.split("@")
  const visible = local.slice(0, Math.min(2, local.length))
  return `${visible}${"•".repeat(Math.max(1, local.length - visible.length))}@${domain}`
}
