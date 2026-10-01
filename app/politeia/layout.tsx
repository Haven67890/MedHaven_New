import { PoliteiaShell } from "@/components/politeia/politeia-shell"
import { requirePoliteiaContext } from "@/lib/politeia"

export default async function PoliteiaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { context, features } = await requirePoliteiaContext()
  return <PoliteiaShell app={context.app} departmentName={context.departmentName} features={features}>{children}</PoliteiaShell>
}
