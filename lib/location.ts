const LOCATION_KEY = "speedycheck-location"

export type UserLocation = {
  city: string
  country: string
}

export const getStoredLocation = (): UserLocation | null => {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(LOCATION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as UserLocation
    if (!parsed.city && !parsed.country) return null
    return parsed
  } catch {
    return null
  }
}

export const storeLocation = (location: UserLocation | null) => {
  if (!location?.city && !location?.country) {
    localStorage.removeItem(LOCATION_KEY)
    return
  }
  localStorage.setItem(LOCATION_KEY, JSON.stringify(location))
}

export async function reverseGeocode(lat: number, lon: number): Promise<UserLocation | null> {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
  const res = await fetch(url)
  const data = await res.json()
  const city = data.city || data.locality || data.principalSubdivision || ""
  const country = data.countryName || ""
  if (!city && !country) return null
  return { city, country }
}

export function parseCloudflareColo(trace: string) {
  const colo = trace.match(/^colo=(.+)$/m)?.[1]?.trim()
  const loc = trace.match(/^loc=(.+)$/m)?.[1]?.trim()
  return { colo: colo || "", loc: loc || "" }
}
