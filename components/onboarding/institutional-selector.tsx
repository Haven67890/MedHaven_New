"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export type University = { id: string; name: string; short_name: string }
export type Faculty = { id: string; name: string; university_id: string }
export type Department = { id: string; name: string; university_id: string; faculty_id: string; slug: string; status: string }
export type AcademicLevel = { id: string; name: string; code: string; sort_order: number }

export function useInstitutionalCatalogue() {
  const supabase = createClient()
  const [universities, setUniversities] = useState<University[]>([])
  const [faculties, setFaculties] = useState<Faculty[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [levels, setLevels] = useState<AcademicLevel[]>([])
  const [selectedUniversityId, setSelectedUniversityId] = useState("")
  const [selectedFacultyId, setSelectedFacultyId] = useState("")
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("")
  const [loadingMetadata, setLoadingMetadata] = useState(true)
  const [metadataError, setMetadataError] = useState("")

  useEffect(() => {
    let active = true
    async function load() {
      setLoadingMetadata(true)
      const [uniRes, facRes, deptRes, levelRes] = await Promise.all([
        supabase.from("universities").select("id, name, short_name").order("name"),
        supabase.from("faculties").select("id, name, university_id").order("name"),
        supabase.from("departments").select("id, name, university_id, faculty_id, slug, status").eq("status", "active").order("name"),
        supabase.from("academic_levels").select("id, name, code, sort_order").order("sort_order"),
      ])
      if (!active) return
      const error = uniRes.error || facRes.error || deptRes.error || levelRes.error
      if (error) {
        setMetadataError("We couldn’t load the institutional catalogue. Please try again.")
        setLoadingMetadata(false)
        return
      }
      const unis = (uniRes.data ?? []) as University[]
      const facs = (facRes.data ?? []) as Faculty[]
      const depts = (deptRes.data ?? []) as Department[]
      const academicLevels = (levelRes.data ?? []) as AcademicLevel[]
      setUniversities(unis)
      setFaculties(facs)
      setDepartments(depts)
      setLevels(academicLevels)
      const universityId = unis[0]?.id ?? ""
      const facultyId = facs.find((faculty) => faculty.university_id === universityId)?.id ?? ""
      const departmentId = depts.find((department) => department.university_id === universityId && department.faculty_id === facultyId)?.id ?? ""
      setSelectedUniversityId(universityId)
      setSelectedFacultyId(facultyId)
      setSelectedDepartmentId(departmentId)
      setLoadingMetadata(false)
    }
    void load()
    return () => { active = false }
  }, [supabase])

  const availableFaculties = useMemo(() => faculties.filter((faculty) => faculty.university_id === selectedUniversityId), [faculties, selectedUniversityId])
  const availableDepartments = useMemo(() => departments.filter((department) => department.university_id === selectedUniversityId && department.faculty_id === selectedFacultyId), [departments, selectedFacultyId, selectedUniversityId])
  const selectedDepartment = departments.find((department) => department.id === selectedDepartmentId) ?? null

  function changeUniversity(universityId: string) {
    const facultyId = faculties.find((faculty) => faculty.university_id === universityId)?.id ?? ""
    const departmentId = departments.find((department) => department.university_id === universityId && department.faculty_id === facultyId)?.id ?? ""
    setSelectedUniversityId(universityId)
    setSelectedFacultyId(facultyId)
    setSelectedDepartmentId(departmentId)
  }

  function changeFaculty(facultyId: string) {
    const departmentId = departments.find((department) => department.university_id === selectedUniversityId && department.faculty_id === facultyId)?.id ?? ""
    setSelectedFacultyId(facultyId)
    setSelectedDepartmentId(departmentId)
  }

  function changeDepartment(departmentId: string) {
    if (availableDepartments.some((department) => department.id === departmentId)) setSelectedDepartmentId(departmentId)
  }

  const initializeSelection = useCallback((universityId: string, facultyId: string, departmentId: string) => {
    if (universities.some((item) => item.id === universityId)) setSelectedUniversityId(universityId)
    if (faculties.some((item) => item.id === facultyId && item.university_id === universityId)) setSelectedFacultyId(facultyId)
    if (departments.some((item) => item.id === departmentId && item.university_id === universityId && item.faculty_id === facultyId)) setSelectedDepartmentId(departmentId)
  }, [departments, faculties, universities])

  return { universities, availableFaculties, availableDepartments, levels, selectedUniversityId, selectedFacultyId, selectedDepartmentId, selectedDepartment, loadingMetadata, metadataError, changeUniversity, changeFaculty, changeDepartment, initializeSelection }
}
