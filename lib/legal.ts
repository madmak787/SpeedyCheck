export const SITE_NAME = "SpeedyCheck"
export const LEGAL_UPDATED = "28 August 2026"

export const LEGAL_PAGES = [
  { href: "/privacy", label: "Privacy" },
  { href: "/cookies", label: "Cookies" },
  { href: "/terms", label: "Terms" },
  { href: "/disclaimer", label: "Disclaimer" },
] as const

export const CONSENT_KEY = "speedycheck-cookie-consent"
export type CookieConsent = "necessary" | "all"

export const getCookieConsent = (): CookieConsent | null => {
  if (typeof window === "undefined") return null
  const value = localStorage.getItem(CONSENT_KEY)
  return value === "all" || value === "necessary" ? value : null
}

export const storeCookieConsent = (value: CookieConsent) => {
  localStorage.setItem(CONSENT_KEY, value)
  window.dispatchEvent(new Event("speedycheck-consent"))
}
