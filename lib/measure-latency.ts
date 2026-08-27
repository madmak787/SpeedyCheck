const PING_URL = "https://speed.cloudflare.com/__down?bytes=0"
const PING_TIMEOUT_MS = 1500

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

const readTtfb = (url: string, fallback: number) => {
  const entries = performance.getEntriesByName(url)
  const last = entries.at(-1) as PerformanceResourceTiming | undefined
  if (last?.requestStart && last.responseStart > last.requestStart) {
    return last.responseStart - last.requestStart
  }
  return fallback
}

export type PingResult = { ok: true; rtt: number } | { ok: false }

export function pingOnce(signal: AbortSignal): Promise<PingResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const url = `${PING_URL}&r=${Math.random()}`
    const started = performance.now()
    xhr.open("GET", url)
    xhr.timeout = PING_TIMEOUT_MS

    const abort = () => {
      xhr.abort()
      reject(new DOMException("Aborted", "AbortError"))
    }

    const settle = (ok: boolean) => {
      signal.removeEventListener("abort", abort)
      if (!ok) {
        resolve({ ok: false })
        return
      }
      resolve({ ok: true, rtt: readTtfb(url, performance.now() - started) })
    }

    xhr.onload = () => settle(xhr.status >= 200 && xhr.status < 400)
    xhr.onerror = () => settle(false)
    xhr.ontimeout = () => settle(false)
    xhr.onabort = () => {
      if (signal.aborted) reject(new DOMException("Aborted", "AbortError"))
      else settle(false)
    }

    if (signal.aborted) {
      abort()
      return
    }
    signal.addEventListener("abort", abort, { once: true })
    xhr.send()
  })
}

export async function measurePing({
  packets,
  signal,
  onSample,
}: {
  packets: number
  signal: AbortSignal
  onSample?: (rtt: number, all: number[], sent: number) => void
}): Promise<{ latency: number; jitter: number; points: number[]; lost: number; sent: number }> {
  const points: number[] = []
  let lost = 0
  let sent = 0

  await pingOnce(signal).catch((error) => {
    if ((error as Error).name === "AbortError") throw error
  })

  for (let index = 0; index < packets; index += 1) {
    if (signal.aborted) break
    sent += 1
    try {
      const result = await pingOnce(signal)
      if (!result.ok || result.rtt < 2 || result.rtt > 1200) {
        lost += 1
      } else {
        points.push(result.rtt)
        onSample?.(result.rtt, [...points], sent)
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") throw error
      lost += 1
    }
  }

  const latency = points.length ? median(points) : 0
  let jitter = 0
  if (points.length >= 2) {
    let deltas = 0
    for (let index = 1; index < points.length; index += 1) {
      deltas += Math.abs(points[index] - points[index - 1])
    }
    jitter = deltas / (points.length - 1)
  }

  return {
    latency: Math.round(latency),
    jitter: Math.round(jitter),
    points,
    lost,
    sent,
  }
}

export async function measurePacketLoss({
  probes,
  signal,
  onProgress,
}: {
  probes: number
  signal: AbortSignal
  onProgress?: (done: number, total: number, lost: number) => void
}): Promise<{ percent: number; lost: number; sent: number }> {
  let lost = 0
  let sent = 0

  for (let index = 0; index < probes; index += 1) {
    if (signal.aborted) break
    sent += 1
    try {
      const result = await pingOnce(signal)
      if (!result.ok) lost += 1
    } catch (error) {
      if ((error as Error).name === "AbortError") throw error
      lost += 1
    }
    onProgress?.(sent, probes, lost)
  }

  return {
    percent: sent ? Math.round((lost / sent) * 1000) / 10 : 0,
    lost,
    sent,
  }
}
