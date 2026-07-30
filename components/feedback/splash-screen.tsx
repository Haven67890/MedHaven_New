import { MedHavenLogo } from "@/components/brand/medhaven-logo"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

export function SplashScreen({ className }: { className?: string }) {
  return (
    <div className={cn("flex min-h-svh flex-col items-center justify-center gap-8 bg-background p-6", className)}>
      <div className="flex flex-col items-center gap-4 text-center">
        <MedHavenLogo />
        <p className="max-w-xs text-pretty text-sm leading-6 text-muted-foreground">
          Preparing a calm, connected workspace.
        </p>
      </div>
      <Spinner className="text-primary" />
    </div>
  )
}
