import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/db/supabaseService'

export function useCourses() {
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.from('courses').select('*').limit(100)
      if (error) throw error
      setCourses(data ?? [])
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { courses, loading, error, refresh: fetch }
}
