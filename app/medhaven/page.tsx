import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { appHomePath, getUserEcosystemContext } from "@/lib/jositex"

export default async function MedHavenEntryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const context = await getUserEcosystemContext(supabase, user.id)
  if (context?.app.slug !== "medhaven") redirect(appHomePath(context?.app.slug))
  redirect("/dashboard")
}
