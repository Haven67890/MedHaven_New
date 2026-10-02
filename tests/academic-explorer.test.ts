import { filterAcademicFaculties } from "../components/home/academic-explorer"
const workspace = { href: "/workspace/medicine", slug: "medicine", type: "universal" as const, status: "available" as const, appName: "JositeX academic workspace" }
const faculties = [
  { id: "f1", name: "Clinical Sciences", college: { id: "c1", name: "College of Health Sciences" }, programmes: [{ id: "p1", name: "Medicine and Surgery", slug: "medicine-and-surgery", award: "MBBS", durationYears: null, firstLevel: null, finalLevel: null, admissionStatus: "admitted", departmentName: "Medicine & Surgery", workspace }, { id: "p2", name: "Medical Laboratory Science", slug: "medical-laboratory-science", award: "B.M.L.S.", durationYears: null, firstLevel: null, finalLevel: null, admissionStatus: "admitted", departmentName: "Medical Laboratory Science", workspace }] },
  { id: "f2", name: "Arts", college: null, programmes: [{ id: "p3", name: "English Language", slug: "english-language", award: "B.Sc.", durationYears: 4, firstLevel: "100L", finalLevel: "400L", admissionStatus: "catalogue_only", departmentName: "English", workspace }] },
]
const grouped = filterAcademicFaculties(faculties, "")
if (grouped.length !== 2 || grouped[0].programmes.length !== 2) throw new Error("Faculty and programme grouping failed")
const byFaculty = filterAcademicFaculties(faculties, "clinical")
if (byFaculty.length !== 1 || byFaculty[0].name !== "Clinical Sciences" || byFaculty[0].programmes.length !== 2) throw new Error("Faculty search failed")
const byProgramme = filterAcademicFaculties(faculties, "laboratory")
if (byProgramme.length !== 1 || byProgramme[0].programmes[0].name !== "Medical Laboratory Science") throw new Error("Programme search failed")
if (filterAcademicFaculties(faculties, "chemical pathology").length !== 0) throw new Error("Invalid specialist destination should not be discoverable")
console.log("✓ Canonical undergraduate hierarchy, programme search, and specialist exclusion fixture validated.")
