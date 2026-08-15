import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '../services/db/supabaseService'

type CourseRecord = {
  id?: string
  code?: string | null
  name?: string | null
  title?: string | null
  level?: string | null
  level_group?: string | null
  parent_id?: string | null
  department_id?: string | number | null
  faculty_id?: string | number | null
  university_id?: string | number | null
  description?: string | null
  [key: string]: unknown
}

export function useCourses(level?: string) {
  const [courses, setCourses] = useState<CourseRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchCourses = useCallback(async (selectedLevel?: string) => {
    setLoading(true)
    setError(null)
    const supabase = getSupabase()

    try {
      let query = supabase
        .from('courses')
        .select('id, code, name, title, level, level_group, parent_id, department_id, faculty_id, university_id, description')
        .order('name', { ascending: true })

      if (selectedLevel) {
        query = query.eq('level', selectedLevel)
      }

      const { data, error: queryError } = await query
      if (queryError) throw queryError

      const courseData = (data as CourseRecord[]) ?? []
      setCourses(
        selectedLevel ? courseData.filter((course) => !course.level || course.level === selectedLevel) : courseData
      )
    } catch (err: unknown) {
      setError(err instanceof Error ? err : new Error('Unable to fetch courses'))
      setCourses([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const supabase = getSupabase()

    const load = async () => {
      try {
        let query = supabase
          .from('courses')
          .select('id, code, name, title, level, level_group, parent_id, department_id, faculty_id, university_id, description')
          .order('name', { ascending: true })

        if (level) {
          query = query.eq('level', level)
        }

        const { data, error: queryError } = await query
        if (!mounted) return

        if (queryError) {
          setError(queryError)
          setCourses([])
        } else {
          setCourses((data as CourseRecord[]) ?? [])
        }
      } catch (err: unknown) {
        if (!mounted) return
        setError(err instanceof Error ? err : new Error('Unable to fetch courses'))
        setCourses([])
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void load()

    return () => {
      mounted = false
    }
  }, [level])

  return { courses, loading, error, refresh: fetchCourses }
}
