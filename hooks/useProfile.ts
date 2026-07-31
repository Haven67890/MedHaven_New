import { useEffect, useState, useCallback } from 'react'
import { UserRepository } from '../repositories'

export function useProfile(userId?: string) {
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
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
    fetchProfile()
  }, [fetchProfile])

  return { profile, loading, error, refresh: fetchProfile }
}
