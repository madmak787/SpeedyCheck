const PING_TARGETS = [
  "https://speed.cloudflare.com/__down?bytes=0",
  "https://www.gstatic.com/generate_204",
]

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

const pingXhr = (url: string, signal: AbortSignal) =>
  new Promise<number>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const started = performance.now()
    xhr.open("GET", `${url}${url.includes("?") ? "&" : "?"}r=${Math.random()}`)
    xhr.timeout = 4000
    const finish = (ok: boolean) => {
      signal.removeEventListener("abort", abort)
      if (!ok) {
        reject(new Error("ping failed"))
        return
      }
      resolve(performance.now() - started)
    }
    const abort = () => {
      xhr.abort()
      reject(new DOMException("Aborted", "AbortError"))
    }
    xhr.onload = () => finish(true)
    xhr.onerror = () => finish(xhr.status === 0)
    xhr.ontimeout = () => reject(new Error("timeout"))
    xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"))
    if (signal.aborted) {
      abort()
      return
    }
    signal.addEventListener("abort", abort, { once: true })
    xhr.send()
  })

export async function measurePing({
  packets,
  signal,
  onSample,
}: {
  packets: number
  signal: AbortSignal
  onSample?: (rtt: number, all: number[]) => void
}): Promise<{ latency: number; jitter: number; points: number[] }> {
  const points: number[] = []

  for (let index = 0; index < packets; index += 1) {
    if (signal.aborted) break
    const url = PING_TARGETS[index % PING_TARGETS.length]
    try {
      const rtt = await pingXhr(url, signal)
      if (index === 0) continue
      if (rtt > 5 && rtt < 1500) {
        points.push(rtt)
        onSample?.(rtt, [...points])
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") break
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

  return { latency: Math.round(latency), jitter: Math.round(jitter), points }
}

export async function measureLoadedLatency(signal: AbortSignal, times = 6) {
  const points: number[] = []
  for (let index = 0; index < times; index += 1) {
    if (signal.aborted) break
    try {
      const rtt = await pingXhr(PING_TARGETS[0], signal)
      if (rtt > 5 && rtt < 2000) points.push(rtt)
    } catch {
      if (signal.aborted) break
    }
  }
  return points.length ? Math.round(median(points)) : 0
}
