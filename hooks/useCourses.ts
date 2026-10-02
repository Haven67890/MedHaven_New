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
  level_id?: string | null
  semester_id?: string | null
  academic_session_id?: string | null
  departments?: { id?: string; name?: string | null; faculty_id?: string | null; university_id?: string | null } | null
  academic_levels?: { code?: string | null; name?: string | null } | null
  semesters?: { code?: string | null; name?: string | null } | null
  academic_sessions?: { code?: string | null } | null
  [key: string]: unknown
}

// Relationship names are the explicit foreign-key constraint names created by
// the live production foreign-key constraint names, not guessed column aliases.
const COURSE_SELECT = [
  'id', 'code', 'name', 'title', 'level', 'level_id', 'semester_id', 'academic_session_id',
  'level_group', 'parent_id', 'department_id', 'faculty_id', 'university_id', 'description',
  'departments!courses_department_id_fkey(id,name,faculty_id,university_id)',
  'academic_levels!courses_level_id_fkey(code,name)',
  'semesters!courses_semester_id_fkey(code,name)',
  'academic_sessions!courses_academic_session_id_fkey(code)',
].join(',')

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
        .select(COURSE_SELECT)
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
          .select(COURSE_SELECT)
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
