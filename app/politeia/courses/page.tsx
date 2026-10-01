import { SectionHeader } from "@/components/politeia/section-list"
import { CourseBrowser } from "@/components/politeia/course-browser"
import { requirePoliteiaContext } from "@/lib/politeia"

export default async function PoliteiaCoursesPage() {
  const { supabase } = await requirePoliteiaContext()
  const { data } = await supabase.from("courses").select("id, code, name, title, level, description").order("code", { ascending: true })
  return <><SectionHeader eyebrow="POLITEIA curriculum" title="Courses" description="Browse the courses available to your department. Results remain subject to Supabase Row Level Security." /><CourseBrowser courses={(data ?? []) as { id: string; code: string | null; name: string | null; title: string | null; level: string | number | null; description: string | null }[]} /></>
}
