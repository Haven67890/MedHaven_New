"use client"

import React, { createContext, useEffect, useMemo, useState } from 'react'
import type { Session, Subscription } from '@supabase/supabase-js'
import { supabase } from '../../lib/auth/supabaseClient'

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
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    let listener: { subscription: Subscription } | null = null

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setUser(sessionUser(data.session))
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(sessionUser(session))
    })
    listener = data

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
    const res = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (res.error) throw res.error
    setUser(sessionUser(res.data.session))
    return res
  }

  const register = async (email: string, password: string, fullName?: string) => {
    setLoading(true)
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

    // Attempt to create profile row after signup
    if (res.data.user) {
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

  const logout = async () => {
    setLoading(true)
    const res = await supabase.auth.signOut()
    setUser(null)
    setLoading(false)
    return res
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
