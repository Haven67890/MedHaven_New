import { UniversalWorkspaceShell } from "@/components/dashboard/universal-workspace-shell"
import { ApplicationShell } from "@/components/layout/application-shell"
import { getEcosystemFeatures, getUserEcosystemContext } from "@/lib/jositex"
import { createClient } from "@/lib/supabase/server"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const context = user ? await getUserEcosystemContext(supabase, user.id) : null

  if (!context || context.app.slug === "medhaven") return <ApplicationShell>{children}</ApplicationShell>

  const features = await getEcosystemFeatures(supabase, context.app.id)
  return <UniversalWorkspaceShell app={context.app} departmentName={context.departmentName} facultyName={context.facultyName} universityName={context.universityName} features={features}>{children}</UniversalWorkspaceShell>
}
