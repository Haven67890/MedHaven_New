import { supabase } from '../../lib/auth/supabaseClient'

export async function login(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function register(email: string, password: string, fullName?: string) {
  const res = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName ?? null,
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
        full_name: fullName ?? null,
      })
  }

  return res
}

export async function logout() {
  return supabase.auth.signOut()
}

export async function resetPassword(email: string, redirectTo?: string) {
  return supabase.auth.resetPasswordForEmail(email, { redirectTo })
}

export async function getSession() {
  return supabase.auth.getSession()
}

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined,
    },
  })
}
