import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { appHomePath, getEcosystemFeatures, getUserEcosystemContext } from "@/lib/jositex"
import { PoliteiaShell } from "@/components/politeia/politeia-shell"

export default async function PoliteiaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const context = await getUserEcosystemContext(supabase, user.id)
  if (!context || context.app.slug !== "politeia") redirect(appHomePath(context?.app.slug))
  const features = await getEcosystemFeatures(supabase, context.app.id)

  return <PoliteiaShell app={context.app} departmentName={context.departmentName} features={features} />
}
