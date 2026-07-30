"use client"

import React, { createContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/auth/supabaseClient'

type User = any

type AuthContextType = {
  user: User | null
n  loading: boolean
  login: (email: string, password: string) => Promise<any>
  register: (email: string, password: string) => Promise<any>
  logout: () => Promise<any>
  resetPassword: (email: string) => Promise<any>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // Get initial session/user
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return
      if (data?.session) setUser(data.session.user)
      setLoading(false)
    })

    // Listen to auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      mounted = false
      listener?.subscription?.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string) => {
    setLoading(true)
    const res = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (res.error) throw res.error
    setUser(res.data.user ?? null)
    return res
  }

  const register = async (email: string, password: string) => {
    setLoading(true)
    const res = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (res.error) throw res.error
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
    // Uses Supabase "reset password" email flow
    const res = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined' ? window.location.origin + '/(auth)/reset' : undefined,
    })
    if (res.error) throw res.error
    return res
  }

  const value = useMemo(() => ({ user, loading, login, register, logout, resetPassword }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
