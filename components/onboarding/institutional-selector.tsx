"use client"
import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
export type University = { id: string; name: string; short_name: string }
export type Faculty = { id: string; name: string; university_id: string }
export type College = { id: string; name: string; university_id: string }
export type Programme = { id: string; name: string; university_id: string; faculty_id: string; college_id: string | null; institutional_department_id: string | null; slug: string; award: string | null; duration_years: number | null; first_level: string | null; final_level: string | null; admission_status: string }
export type AcademicLevel = { id: string; name: string; code: string; sort_order: number }
export function useInstitutionalCatalogue() {
  const supabase = createClient()
  const [universities, setUniversities] = useState<University[]>([])
  const [faculties, setFaculties] = useState<Faculty[]>([])
  const [colleges, setColleges] = useState<College[]>([])
  const [programmes, setProgrammes] = useState<Programme[]>([])
  const [levels, setLevels] = useState<AcademicLevel[]>([])
  const [selectedUniversityId, setSelectedUniversityId] = useState("")
  const [selectedFacultyId, setSelectedFacultyId] = useState("")
  const [selectedCollegeId, setSelectedCollegeId] = useState("")
  const [selectedProgrammeId, setSelectedProgrammeId] = useState("")
  const [loadingMetadata, setLoadingMetadata] = useState(true)
  const [metadataError, setMetadataError] = useState("")
  useEffect(() => { let active = true; async function load() { const [uniRes, facRes, collegeRes, programmeRes, levelRes] = await Promise.all([
    supabase.from("universities").select("id, name, short_name").order("name"), supabase.from("faculties").select("id, name, university_id").order("name"), supabase.from("academic_colleges").select("id, name, university_id").order("name"), supabase.from("undergraduate_programmes").select("id, name, university_id, faculty_id, college_id, institutional_department_id, slug, award, duration_years, first_level, final_level, admission_status").eq("is_active", true).order("name"), supabase.from("academic_levels").select("id, name, code, sort_order").order("sort_order")
  ]); if (!active) return; const error = uniRes.error || facRes.error || collegeRes.error || programmeRes.error || levelRes.error; if (error) { setMetadataError("We couldn’t load the undergraduate programme catalogue. Please try again."); setLoadingMetadata(false); return } const unis = (uniRes.data ?? []) as University[]; const facs = (facRes.data ?? []) as Faculty[]; const cols = (collegeRes.data ?? []) as College[]; const progs = (programmeRes.data ?? []) as Programme[]; setUniversities(unis); setFaculties(facs); setColleges(cols); setProgrammes(progs); setLevels((levelRes.data ?? []) as AcademicLevel[]); const universityId = unis[0]?.id ?? ""; const facultyId = facs.find((faculty) => faculty.university_id === universityId && progs.some((p) => p.faculty_id === faculty.id))?.id ?? ""; const programme = progs.find((p) => p.university_id === universityId && p.faculty_id === facultyId); setSelectedUniversityId(universityId); setSelectedFacultyId(facultyId); setSelectedCollegeId(programme?.college_id ?? ""); setSelectedProgrammeId(programme?.id ?? ""); setLoadingMetadata(false) }; void load(); return () => { active = false } }, [supabase])
  const availableFaculties = useMemo(() => faculties.filter((faculty) => faculty.university_id === selectedUniversityId && programmes.some((p) => p.faculty_id === faculty.id)), [faculties, programmes, selectedUniversityId])
  const availableColleges = useMemo(() => colleges.filter((college) => college.university_id === selectedUniversityId && programmes.some((p) => p.faculty_id === selectedFacultyId && p.college_id === college.id)), [colleges, programmes, selectedFacultyId, selectedUniversityId])
  const availableProgrammes = useMemo(() => programmes.filter((programme) => programme.university_id === selectedUniversityId && programme.faculty_id === selectedFacultyId && (!selectedCollegeId || programme.college_id === selectedCollegeId)), [programmes, selectedCollegeId, selectedFacultyId, selectedUniversityId])
  const selectedProgramme = programmes.find((programme) => programme.id === selectedProgrammeId) ?? null
  const availableLevels = useMemo(() => levels.filter((level) => (!selectedProgramme?.first_level || Number(level.code.replace("L", "")) >= Number(selectedProgramme.first_level.replace("L", ""))) && (!selectedProgramme?.final_level || Number(level.code.replace("L", "")) <= Number(selectedProgramme.final_level.replace("L", "")))), [levels, selectedProgramme])
  function chooseProgramme(id: string) { const next = availableProgrammes.find((programme) => programme.id === id); if (next) { setSelectedProgrammeId(id); setSelectedCollegeId(next.college_id ?? "") } }
  function changeUniversity(id: string) { const facultyId = availableFaculties.find((faculty) => faculty.university_id === id)?.id ?? ""; const programme = programmes.find((p) => p.university_id === id && p.faculty_id === facultyId); setSelectedUniversityId(id); setSelectedFacultyId(facultyId); setSelectedCollegeId(programme?.college_id ?? ""); setSelectedProgrammeId(programme?.id ?? "") }
  function changeFaculty(id: string) { const programme = programmes.find((p) => p.university_id === selectedUniversityId && p.faculty_id === id); setSelectedFacultyId(id); setSelectedCollegeId(programme?.college_id ?? ""); setSelectedProgrammeId(programme?.id ?? "") }
  function changeCollege(id: string) { const programme = programmes.find((p) => p.university_id === selectedUniversityId && p.faculty_id === selectedFacultyId && p.college_id === id); setSelectedCollegeId(id); setSelectedProgrammeId(programme?.id ?? "") }
  const initializeSelection = useCallback((universityId: string, facultyId: string, programmeId: string) => { const programme = programmes.find((p) => p.id === programmeId && p.university_id === universityId && p.faculty_id === facultyId); if (programme) { setSelectedUniversityId(universityId); setSelectedFacultyId(facultyId); setSelectedCollegeId(programme.college_id ?? ""); setSelectedProgrammeId(programme.id) } }, [programmes])
  return { universities, availableFaculties, availableColleges, availableProgrammes, availableLevels, levels, selectedUniversityId, selectedFacultyId, selectedCollegeId, selectedProgrammeId, selectedProgramme, loadingMetadata, metadataError, changeUniversity, changeFaculty, changeCollege, chooseProgramme, initializeSelection }
}
