import { liveMbps, ooklaMbps, type ByteSnapshot } from "@/lib/speed-math"

const DOWN_URL = "https://speed.cloudflare.com/__down"
const UP_URL = "https://speed.cloudflare.com/__up"
const CHUNK_BYTES = 25_000_000
const REQUEST_TIMEOUT_MS = 30000

export async function createUploadBlob(bytes: number, signal?: AbortSignal): Promise<Blob> {
  const data = new Uint8Array(bytes)
  const step = 65536
  for (let offset = 0; offset < bytes; offset += step) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError")
    crypto.getRandomValues(data.subarray(offset, Math.min(offset + step, bytes)))
    if (offset > 0 && offset % (step * 8) === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }
  return new Blob([data], { type: "application/octet-stream" })
}

const bindAbort = (signal: AbortSignal, abort: () => void) => {
  if (signal.aborted) {
    abort()
    return () => undefined
  }
  signal.addEventListener("abort", abort, { once: true })
  return () => signal.removeEventListener("abort", abort)
}

const downloadChunk = (signal: AbortSignal, onBytes: (delta: number) => void) =>
  new Promise<void>((resolve) => {
    const xhr = new XMLHttpRequest()
    let reported = 0
    let done = false
    const finish = () => {
      if (done) return
      done = true
      unbind()
      resolve()
    }
    const abort = () => {
      xhr.abort()
      finish()
    }
    const unbind = bindAbort(signal, abort)

    xhr.open("GET", `${DOWN_URL}?bytes=${CHUNK_BYTES}&r=${Math.random()}`)
    xhr.responseType = "arraybuffer"
    xhr.timeout = REQUEST_TIMEOUT_MS
    xhr.onprogress = (event) => {
      const delta = event.loaded - reported
      if (delta > 0) {
        reported += delta
        onBytes(delta)
      }
    }
    xhr.onload = () => {
      const size = xhr.response instanceof ArrayBuffer ? xhr.response.byteLength : eventLoadedFallback(xhr)
      if (size > reported) onBytes(size - reported)
      finish()
    }
    xhr.onerror = finish
    xhr.ontimeout = finish
    xhr.onabort = finish
    xhr.send()
  })

const eventLoadedFallback = (xhr: XMLHttpRequest) => {
  try {
    return Number(xhr.getResponseHeader("content-length")) || 0
  } catch {
    return 0
  }
}

const uploadChunk = (blob: Blob, signal: AbortSignal, onBytes: (delta: number) => void) =>
  new Promise<void>((resolve) => {
    const xhr = new XMLHttpRequest()
    let reported = 0
    let done = false
    const finish = () => {
      if (done) return
      done = true
      unbind()
      resolve()
    }
    const abort = () => {
      xhr.abort()
      finish()
    }
    const unbind = bindAbort(signal, abort)

    xhr.open("POST", `${UP_URL}?bytes=${blob.size}&r=${Math.random()}`)
    xhr.timeout = REQUEST_TIMEOUT_MS
    xhr.upload.onprogress = (event) => {
      const delta = event.loaded - reported
      if (delta > 0) {
        reported += delta
        onBytes(delta)
      }
    }
    xhr.onload = () => {
      if (blob.size > reported) onBytes(blob.size - reported)
      finish()
    }
    xhr.onerror = finish
    xhr.ontimeout = finish
    xhr.onabort = finish
    xhr.send(blob)
  })

export async function measureTransfer({
  direction,
  durationMs,
  concurrency,
  signal,
  blob,
  onProgress,
}: {
  direction: "download" | "upload"
  durationMs: number
  concurrency: number
  signal: AbortSignal
  blob?: Blob
  onProgress: (mbps: number, progress: number, bytes: number) => void
}): Promise<{ mbps: number; bytes: number }> {
  if (direction === "upload" && !blob) throw new Error("Upload blob required")

  const start = performance.now()
  const local = new AbortController()
  const stop = () => local.abort()
  if (signal.aborted) stop()
  signal.addEventListener("abort", stop, { once: true })

  let totalBytes = 0
  const snapshots: ByteSnapshot[] = [{ t: 0, bytes: 0 }]
  const addBytes = (delta: number) => {
    totalBytes += delta
  }

  const report = () => {
    const elapsed = performance.now() - start
    snapshots.push({ t: elapsed, bytes: totalBytes })
    onProgress(liveMbps(snapshots, 1200), Math.min(elapsed / durationMs, 1), totalBytes)
  }

  const timer = window.setInterval(report, 100)
  const spawnUntil = start + durationMs
  const hardStop = window.setTimeout(stop, durationMs + 1500)

  const worker = async () => {
    while (!local.signal.aborted && performance.now() < spawnUntil) {
      if (direction === "download") await downloadChunk(local.signal, addBytes)
      else await uploadChunk(blob as Blob, local.signal, addBytes)
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))
  report()
  stop()
  window.clearInterval(timer)
  window.clearTimeout(hardStop)
  signal.removeEventListener("abort", stop)

  return { mbps: ooklaMbps(snapshots), bytes: totalBytes }
}
