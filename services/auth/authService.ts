import { supabase } from '../../lib/auth/supabaseClient'

export async function login(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function register(email: string, password: string) {
  return supabase.auth.signUp({ email, password })
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
