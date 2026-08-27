"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Analytics } from "@vercel/analytics/next"
import { Button } from "@/components/ui/button"
import { getCookieConsent, storeCookieConsent, type CookieConsent } from "@/lib/legal"

export default function CookieConsent() {
  const [choice, setChoice] = useState<CookieConsent | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setChoice(getCookieConsent())
    setReady(true)
  }, [])

  const choose = (value: CookieConsent) => {
    storeCookieConsent(value)
    setChoice(value)
  }

  return (
    <>
      {choice === "all" && <Analytics />}
      {ready && choice === null && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center p-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="pointer-events-auto flex w-full max-w-2xl flex-col gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-[0_8px_40px_oklch(0_0_0/0.45)] backdrop-blur-md sm:flex-row sm:items-center">
            <p className="min-w-0 flex-1 text-left text-xs leading-relaxed text-muted-foreground sm:text-sm">
              SpeedyCheck stores settings on this device. Optional analytics help us understand visits. See the{" "}
              <Link href="/cookies" className="text-foreground underline-offset-2 hover:underline">
                cookie policy
              </Link>
              .
            </p>
            <div className="flex shrink-0 gap-1.5">
              <Button type="button" variant="ghost" size="sm" className="h-8 rounded-full px-3 text-xs" onClick={() => choose("necessary")}>
                Necessary only
              </Button>
              <Button type="button" size="sm" className="h-8 rounded-full px-3 text-xs" onClick={() => choose("all")}>
                Accept all
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
