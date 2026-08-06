"use client"

import React, { createContext, useEffect, useMemo, useState } from 'react'
import type { Session, Subscription, AuthChangeEvent } from '@supabase/supabase-js'
import { createClient } from '../../lib/supabase/client'

type User = { id?: string; email?: string | null }

type AuthContextType = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<unknown>
  register: (email: string, password: string, fullName?: string) => Promise<unknown>
  logout: () => Promise<unknown>
  resetPassword: (email: string) => Promise<unknown>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

function sessionUser(session: Session | null): User | null {
  return session?.user ?? null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    let listener: { subscription: Subscription } | null = null

    const fetchSession = async () => {
      try {
        const response = await supabase.auth.getSession()
        if (!mounted) return
        setUser(sessionUser(response.data?.session))
      } catch (err: unknown) {
        console.warn("Supabase getSession failed to fetch:", err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void fetchSession()

    try {
      const res = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
        if (mounted) {
          setUser(sessionUser(session))
        }
      })
      listener = res.data
    } catch (err) {
      console.warn("Supabase onAuthStateChange initialization error:", err)
    }

    return () => {
      mounted = false
      try {
        listener?.subscription?.unsubscribe()
      } catch {
        // ignore unsubscribe errors
      }
    }
  }, [])

  const login = async (email: string, password: string) => {
    setLoading(true)
    try {
      const res = await supabase.auth.signInWithPassword({ email, password })
      setLoading(false)
      if (res.error) throw res.error
      setUser(sessionUser(res.data.session))
      return res
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  const register = async (email: string, password: string, fullName?: string) => {
    setLoading(true)
    try {
      const res = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName ?? null,
          },
        },
      })
      setLoading(false)
      if (res.error) throw res.error

      // Attempt to safely UPSERT profile row after signup without crashing
      if (res.data.user) {
        try {
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert({
              id: res.data.user.id,
              email: email.trim().toLowerCase(),
              full_name: fullName ?? null,
            }, { onConflict: "id" })
          if (profileError) {
            console.warn("Profile creation/upsert warning:", profileError.message)
          }
        } catch (dbErr) {
          console.warn("Failed to create profile row gracefully:", dbErr)
        }
      }

      return res
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  const logout = async () => {
    setLoading(true)
    try {
      const res = await supabase.auth.signOut()
      setUser(null)
      setLoading(false)
      return res
    } catch (error) {
      setUser(null)
      setLoading(false)
      throw error
    }
  }

  const resetPassword = async (email: string) => {
    const res = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined,
    })
    if (res.error) throw res.error
    return res
  }

  const value = useMemo(() => ({ user, loading, login, register, logout, resetPassword }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
