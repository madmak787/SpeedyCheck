export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

export function withBasePath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`
  if (!BASE_PATH) return normalized
  if (normalized === "/") return `${BASE_PATH}/`
  return `${BASE_PATH}${normalized}`
}

export function siteOrigin(): string {
  const fallback = "http://localhost:3000"
  const raw = process.env.NEXT_PUBLIC_APP_URL || fallback
  try {
    return new URL(raw).origin
  } catch {
    return fallback
  }
}
