import { ApplicationShell } from "@/components/layout/application-shell"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <ApplicationShell>{children}</ApplicationShell>
}
