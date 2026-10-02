import { filterAcademicFaculties } from "../components/home/academic-explorer"

const faculties = [
  { id: "f1", name: "Clinical Sciences", departments: [{ id: "d1", name: "Radiology", workspace: null }, { id: "d2", name: "Medicine", workspace: null }] },
  { id: "f2", name: "Arts", departments: [{ id: "d3", name: "English", workspace: null }] },
]

const grouped = filterAcademicFaculties(faculties, "")
if (grouped.length !== 2 || grouped[0].departments.length !== 2) throw new Error("Faculty and department grouping failed")

const byFaculty = filterAcademicFaculties(faculties, "clinical")
if (byFaculty.length !== 1 || byFaculty[0].name !== "Clinical Sciences" || byFaculty[0].departments.length !== 2) throw new Error("Faculty search failed")

const byDepartment = filterAcademicFaculties(faculties, "radiology")
if (byDepartment.length !== 1 || byDepartment[0].name !== "Clinical Sciences" || byDepartment[0].departments[0].name !== "Radiology") throw new Error("Department search failed")

if (filterAcademicFaculties(faculties, "not-a-real-department").length !== 0) throw new Error("Zero-result search failed")

console.log("✓ Academic hierarchy grouping, faculty search, department search, and zero-result filtering validated.")
