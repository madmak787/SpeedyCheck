export type SpeedUnit = "bits" | "bytes"

export type SpeedSample = {
  t: number
  speed: number
  phase: "download" | "upload"
}

const UNIT_STORAGE_KEY = "speedycheck-speed-unit"

export const getStoredSpeedUnit = (): SpeedUnit => {
  if (typeof window === "undefined") return "bits"
  return localStorage.getItem(UNIT_STORAGE_KEY) === "bytes" ? "bytes" : "bits"
}

export const storeSpeedUnit = (unit: SpeedUnit) => {
  localStorage.setItem(UNIT_STORAGE_KEY, unit)
}

export const bpsToMbps = (bps: number) => {
  if (!Number.isFinite(bps) || bps <= 0) return 0
  return bps / 1_000_000
}

type BandwidthPoint = {
  bps?: number
  duration?: number
  bytes?: number
  transferSize?: number
}

export const settledMbps = (points: BandwidthPoint[] | undefined): number => {
  if (!points?.length) return 0

  const longEnough = points.filter((point) => {
    const duration = point.duration ?? 0
    const bytes = point.bytes ?? point.transferSize ?? 0
    return (point.bps ?? 0) > 0 && duration >= 800 && bytes >= 2_000_000
  })

  const fallback = points.filter((point) => (point.bps ?? 0) > 0 && (point.duration ?? 0) >= 400)
  const pool = longEnough.length >= 3 ? longEnough : fallback.length ? fallback : points.filter((point) => (point.bps ?? 0) > 0)
  if (!pool.length) return 0

  const speeds = pool.map((point) => point.bps as number).sort((a, b) => a - b)
  const lo = Math.floor(speeds.length * 0.3)
  const hi = Math.max(lo + 1, Math.ceil(speeds.length * 0.9))
  const core = speeds.slice(lo, hi)
  const chosen = core.length ? core : speeds
  return bpsToMbps(chosen.reduce((sum, value) => sum + value, 0) / chosen.length)
}

export const transferredBytes = (points: BandwidthPoint[] | undefined) => {
  if (!points?.length) return 0
  return points.reduce((sum, point) => sum + (point.transferSize ?? point.bytes ?? 0), 0)
}

export const formatDataUsed = (bytes: number) => {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(0)} MB`
  if (bytes >= 1000) return `${Math.round(bytes / 1000)} KB`
  return `${bytes} B`
}

export const isReliableSample = (point?: BandwidthPoint) => {
  if (!point?.bps) return false
  const duration = point.duration ?? 0
  const bytes = point.bytes ?? point.transferSize ?? 0
  return duration >= 250 && bytes >= 5_000_000
}

export const toDisplaySpeed = (speedMbps: number, unit: SpeedUnit) => {
  return unit === "bytes" ? speedMbps / 8 : speedMbps
}

const formatScaled = (value: number, mega: string, giga: string, kilo: string, base: string) => {
  if (!Number.isFinite(value) || value <= 0) {
    return { value: "0.00", unit: mega }
  }
  if (value >= 1000) {
    return { value: (value / 1000).toFixed(2), unit: giga }
  }
  if (value >= 1) {
    return { value: value.toFixed(2), unit: mega }
  }
  if (value >= 0.001) {
    return { value: (value * 1000).toFixed(0), unit: kilo }
  }
  return { value: Math.round(value * 1_000_000).toString(), unit: base }
}

export const formatSpeed = (
  speedMbps: number,
  unit: SpeedUnit = "bits",
): { value: string; unit: string } => {
  if (unit === "bytes") {
    return formatScaled(toDisplaySpeed(speedMbps, unit), "MB/s", "GB/s", "KB/s", "B/s")
  }
  return formatScaled(speedMbps, "Mbps", "Gbps", "Kbps", "bps")
}

export const formatLiveSpeed = (
  speedMbps: number,
  unit: SpeedUnit = "bits",
): { value: string; unit: string } => {
  const displayed = toDisplaySpeed(speedMbps, unit)
  const labels =
    unit === "bytes"
      ? { giga: "GB/s", mega: "MB/s", kilo: "KB/s", base: "B/s" }
      : { giga: "Gbps", mega: "Mbps", kilo: "Kbps", base: "bps" }

  if (!Number.isFinite(displayed) || displayed <= 0) {
    return { value: "0", unit: labels.mega }
  }
  if (displayed >= 1000) {
    return { value: (displayed / 1000).toFixed(1), unit: labels.giga }
  }
  if (displayed >= 10) {
    return { value: displayed.toFixed(0), unit: labels.mega }
  }
  if (displayed >= 1) {
    return { value: displayed.toFixed(1), unit: labels.mega }
  }
  return { value: (displayed * 1000).toFixed(0), unit: labels.kilo }
}

export const STAGE_ORDER = ["idle", "download", "latency", "upload", "jitter", "complete"] as const

export const advanceStage = (
  current: (typeof STAGE_ORDER)[number],
  next: (typeof STAGE_ORDER)[number],
) => {
  return STAGE_ORDER.indexOf(next) >= STAGE_ORDER.indexOf(current) ? next : current
}

export type ConnectionQuality = {
  label: "Excellent" | "Good" | "Fair" | "Poor"
  description: string
}

export const getConnectionQuality = (
  downloadMbps: number,
  latencyMs: number,
): ConnectionQuality => {
  if (downloadMbps >= 100 && latencyMs <= 40) {
    return { label: "Excellent", description: "Great for 4K streaming, gaming, and video calls" }
  }
  if (downloadMbps >= 50 && latencyMs <= 70) {
    return { label: "Good", description: "Comfortable for HD streaming and most work from home" }
  }
  if (downloadMbps >= 15) {
    return { label: "Fair", description: "Fine for browsing and SD video, but may struggle with 4K" }
  }
  return { label: "Poor", description: "Expect buffering on video and lag on calls" }
}

export const formatShareText = (
  result: {
    downloadSpeed: number
    uploadSpeed: number
    latency: number
    jitter: number
  },
  unit: SpeedUnit = "bits",
): string => {
  const down = formatSpeed(result.downloadSpeed, unit)
  const up = formatSpeed(result.uploadSpeed, unit)
  return `My SpeedyCheck results: ↓ ${down.value} ${down.unit} · ↑ ${up.value} ${up.unit} · ping ${result.latency} ms · jitter ${result.jitter} ms`
}
