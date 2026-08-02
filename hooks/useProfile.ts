import { useEffect, useState, useCallback } from 'react'
import { UserRepository, type ProfileRecord } from '../repositories'

export function useProfile(userId?: string) {
  const [profile, setProfile] = useState<ProfileRecord | null>(null)
  const [loading, setLoading] = useState(Boolean(userId))
  const [error, setError] = useState<Error | null>(null)

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await UserRepository.getById(userId)
      setProfile(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err : new Error('Unable to fetch profile'))
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    let mounted = true

    const loadProfile = async () => {
      if (!userId) {
        if (!mounted) return
        setProfile(null)
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const data = await UserRepository.getById(userId)
        if (!mounted) return
        setProfile(data)
      } catch (err: unknown) {
        if (!mounted) return
        setError(err instanceof Error ? err : new Error('Unable to fetch profile'))
        setProfile(null)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void loadProfile()

    return () => {
      mounted = false
    }
  }, [userId])

  return { profile, loading, error, refresh: fetchProfile }
}
