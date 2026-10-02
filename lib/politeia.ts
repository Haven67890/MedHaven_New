import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { workspacePath, getEcosystemFeatures, getUserEcosystemContext, type EcosystemFeature, type UserEcosystemContext } from "@/lib/jositex"

export async function requirePoliteiaContext(): Promise<{ supabase: Awaited<ReturnType<typeof createClient>>; context: UserEcosystemContext; features: EcosystemFeature[] }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const context = await getUserEcosystemContext(supabase, user.id)
  if (!context || context.app.slug !== "politeia") redirect(workspacePath(context?.workspace))
  const features = await getEcosystemFeatures(supabase, context.app.id)
  return { supabase, context, features }
}
