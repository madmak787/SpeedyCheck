import type { ReactNode } from "react"
import Link from "next/link"
import { Zap } from "lucide-react"
import { LEGAL_PAGES, SITE_NAME } from "@/lib/legal"

export default function LegalShell({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <main className="h-dvh w-dvw overflow-y-auto overscroll-contain">
      <div className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8 sm:py-10">
        <header className="mb-8 flex items-center justify-between gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-2 text-foreground">
            <Zap className="h-5 w-5 shrink-0 text-accent" fill="currentColor" />
            <span className="truncate font-semibold">{SITE_NAME}</span>
          </Link>
          <nav className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-xs text-muted-foreground sm:text-sm">
            {LEGAL_PAGES.map((page) => (
              <Link key={page.href} href={page.href} className="hover:text-foreground hover:underline">
                {page.label}
              </Link>
            ))}
          </nav>
        </header>
        <article className="legal-copy pb-16">
          <h1 className="mb-2 text-3xl font-semibold tracking-tight">{title}</h1>
          {children}
        </article>
      </div>
    </main>
  )
}

export function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <nav className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 ${className}`}>
      {LEGAL_PAGES.map((page) => (
        <Link key={page.href} href={page.href} className="hover:text-foreground hover:underline">
          {page.label}
        </Link>
      ))}
    </nav>
  )
}
