export type ByteSnapshot = { t: number; bytes: number }

const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length

export const bytesToMbps = (bytes: number, ms: number) => {
  if (ms <= 0 || bytes <= 0) return 0
  return (bytes * 8) / (ms * 1000)
}

/** Ookla-style score: 20 time slices, drop slowest 30% and fastest 10%, average the rest. */
export const ooklaMbps = (snapshots: ByteSnapshot[], warmupMs = 1000) => {
  const instants: number[] = []
  for (let index = 1; index < snapshots.length; index += 1) {
    const prev = snapshots[index - 1]
    const next = snapshots[index]
    if (next.t < warmupMs) continue
    const dt = next.t - prev.t
    const bytes = next.bytes - prev.bytes
    if (dt >= 20 && bytes >= 0) instants.push(bytesToMbps(bytes, dt))
  }
  if (instants.length < 4) {
    const last = snapshots.at(-1)
    return last ? bytesToMbps(last.bytes, Math.max(last.t - warmupMs, 200)) : 0
  }

  const slices = 20
  const size = Math.max(1, Math.floor(instants.length / slices))
  const bucketed: number[] = []
  for (let slice = 0; slice < slices; slice += 1) {
    const chunk = instants.slice(slice * size, slice === slices - 1 ? instants.length : (slice + 1) * size)
    if (chunk.length) bucketed.push(average(chunk))
  }
  bucketed.sort((a, b) => a - b)
  const lo = Math.floor(bucketed.length * 0.3)
  const hi = Math.max(lo + 1, Math.ceil(bucketed.length * 0.9))
  const core = bucketed.slice(lo, hi)
  return average(core.length ? core : bucketed)
}

export const liveMbps = (snapshots: ByteSnapshot[], windowMs = 1000) => {
  if (snapshots.length < 2) return 0
  const last = snapshots[snapshots.length - 1]
  let left = snapshots.length - 1
  while (left > 0 && last.t - snapshots[left].t < windowMs) left -= 1
  const start = snapshots[left]
  return bytesToMbps(last.bytes - start.bytes, last.t - start.t)
}
