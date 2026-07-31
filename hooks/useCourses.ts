import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/db/supabaseService'

export function useCourses() {
  const [courses, setCourses] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.from('courses').select('*').limit(100) as any
      if (error) throw error
      setCourses((data as Array<Record<string, unknown>>) ?? [])
    } catch (err: unknown) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { courses, loading, error, refresh: fetch }
}
