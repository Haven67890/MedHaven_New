import type { SupabaseClient } from "@supabase/supabase-js"

export type PoliteiaQueryResult = {
  rows: Record<string, unknown>[]
  error: string | null
}

const SELECTS: Record<string, string> = {
  assignment_guides: "id,title,description,content,course_id,storage_path,status",
  academic_calendar_events: "id,title,description,event_type,starts_at,ends_at,location,status",
  career_pathways: "id,title,description,sectors,skills,resources,status",
  political_dictionary_entries: "id,term,definition,explanation,related_terms,source,status",
  presentations: "id,title,description,presenter,course_id,storage_path,external_url,status",
  research_resources: "id,title,description,resource_type,author,publisher,course_id,external_url,storage_path,status",
  staff: "id,full_name,title,department,specialty,courses,status",
  timetable_entries: "id,day_of_week,start_time,end_time,title,activity_type,course_id,lecturer,notes,level",
  materials: "id,title,type,tier,description,storage_path,course_id,status,featured,created_at",
  question_bank: "id,course_id,topic,question_text,options,correct_answer,explanation,difficulty,status",
  quizzes: "id,course_id,topic,format,created_at",
  flashcard_decks: "id,course_id,topic,source,created_at",
}

export async function getPoliteiaRows(supabase: SupabaseClient, table: string, limit = 100): Promise<PoliteiaQueryResult> {
  const selection = SELECTS[table]
  if (!selection) return { rows: [], error: "This section is temporarily unavailable." }
  const { data, error } = await supabase.from(table).select(selection).limit(limit)
  if (error) {
    console.warn(`Unable to load POLITEIA ${table}:`, error.message)
    return { rows: [], error: "This section is temporarily unavailable." }
  }
  return { rows: (data ?? []) as unknown as Record<string, unknown>[], error: null }
}
