import { useEffect, useState, useCallback } from 'react'
import { UserRepository } from '../repositories'

type ProfileRecord = Record<string, unknown> | null

export function useProfile(userId?: string) {
  const [profile, setProfile] = useState<ProfileRecord>(null)
  const [loading, setLoading] = useState(Boolean(userId))
  const [error, setError] = useState<Error | null>(null)

  const fetchProfile = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      const data = await UserRepository.getById(userId)
      setProfile(data)
    } catch (err: unknown) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    let mounted = true
    if (!userId) return
    UserRepository.getById(userId)
      .then((data) => {
        if (!mounted) return
        setProfile(data)
      })
      .catch((err: unknown) => {
        if (!mounted) return
        setError(err as Error)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [userId])

  return { profile, loading, error, refresh: fetchProfile }
}
