import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/db/supabaseService'

type CourseRecord = Record<string, unknown>

export function useCourses() {
  const [courses, setCourses] = useState<CourseRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchCourses = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: queryError } = await supabase.from('courses').select('*').limit(100)
      if (queryError) throw queryError
      setCourses((data as CourseRecord[]) ?? [])
    } catch (err: unknown) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    supabase
      .from('courses')
      .select('*')
      .limit(100)
      .then(({ data, error: queryError }) => {
        if (!mounted) return
        if (queryError) {
          setError(queryError)
        } else {
          setCourses((data as CourseRecord[]) ?? [])
        }
        setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  return { courses, loading, error, refresh: fetchCourses }
}
