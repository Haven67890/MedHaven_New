import type { SupabaseClient } from "@supabase/supabase-js"
import { getUserEcosystemContext, workspacePath } from "@/lib/jositex"

export type AuthenticatedDestination = string

export async function resolveAuthenticatedDestination(supabase: SupabaseClient, userId: string): Promise<AuthenticatedDestination> {
  const { data: profile, error } = await supabase.from("profiles").select("university_id, faculty_id, department_id, undergraduate_programme_id, current_level").eq("id", userId).maybeSingle()
  if (error || !profile || !profile.university_id || !profile.faculty_id || !profile.current_level) return "/profile/complete"
  const context = await getUserEcosystemContext(supabase, userId)
  return (context ? workspacePath(context.workspace) : "/dashboard") as AuthenticatedDestination
}
