import { createClient } from '../../lib/supabase/client'

export async function login(email: string, password: string) {
  const supabase = createClient()
  return supabase.auth.signInWithPassword({ email, password })
}

export async function register(email: string, password: string, fullName?: string) {
  const supabase = createClient()
  const res = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName ?? "",
      },
    },
  })

  // Create profile row after successful signup
  if (res.data.user && !res.error) {
    await supabase
      .from("profiles")
      .insert({
        id: res.data.user.id,
        email: email.trim().toLowerCase(),
        full_name: fullName ?? "",
      })
  }

  return res
}

export async function logout() {
  const supabase = createClient()
  return supabase.auth.signOut()
}

export async function resetPassword(email: string, redirectTo?: string) {
  const supabase = createClient()
  return supabase.auth.resetPasswordForEmail(email, { redirectTo })
}

export async function getSession() {
  const supabase = createClient()
  return supabase.auth.getSession()
}

export async function signInWithGoogle() {
  const supabase = createClient()
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined,
    },
  })
}
