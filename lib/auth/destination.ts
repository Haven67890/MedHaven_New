import type { SupabaseClient } from "@supabase/supabase-js"
import { appHomePath, getUserEcosystemContext } from "@/lib/jositex"

export type AuthenticatedDestination = "/profile/complete" | "/dashboard" | "/medhaven" | "/politeia"

/**
 * The single post-auth decision point. Database identity and relationships are
 * authoritative; browser metadata is never used for authorization or routing.
 */
export async function resolveAuthenticatedDestination(
  supabase: SupabaseClient,
  userId: string,
): Promise<AuthenticatedDestination> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("university_id, faculty_id, department_id, current_level")
    .eq("id", userId)
    .maybeSingle()

  if (error || !profile || !profile.university_id || !profile.faculty_id || !profile.department_id || !profile.current_level) {
    return "/profile/complete"
  }

  const context = await getUserEcosystemContext(supabase, userId)
  return (context ? appHomePath(context.app.slug) : "/dashboard") as AuthenticatedDestination
}
