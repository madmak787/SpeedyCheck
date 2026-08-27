"use client"

import { Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function InstallPrompt({
  canPrompt,
  iosHint,
  onInstall,
  onDismiss,
}: {
  canPrompt: boolean
  iosHint: boolean
  onInstall: () => void
  onDismiss: () => void
}) {
  const copy = iosHint
    ? "Add SpeedyCheck to your Home Screen from the Safari share menu."
    : canPrompt
      ? "Install SpeedyCheck for a one-tap speed test from your home screen."
      : "Install SpeedyCheck from your browser’s menu to use it like an app."

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center p-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto flex w-full max-w-lg items-center gap-3 rounded-2xl border border-accent/40 bg-card/95 px-3 py-2.5 shadow-[0_8px_40px_oklch(0.75_0.15_195/0.18)] backdrop-blur-md fade-rise">
        <Smartphone className="h-5 w-5 shrink-0 text-accent" />
        <p className="min-w-0 flex-1 text-left text-xs leading-snug text-muted-foreground sm:text-sm">{copy}</p>
        <div className="flex shrink-0 gap-1.5">
          <Button type="button" variant="ghost" size="sm" className="h-8 rounded-full px-3 text-xs" onClick={onDismiss}>
            Not now
          </Button>
          {canPrompt ? (
            <Button type="button" size="sm" className="h-8 rounded-full px-3 text-xs" onClick={onInstall}>
              Install
            </Button>
          ) : (
            <Button type="button" size="sm" className="h-8 rounded-full px-3 text-xs" onClick={onDismiss}>
              Got it
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
