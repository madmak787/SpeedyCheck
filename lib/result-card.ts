import { formatSpeed, getConnectionQuality, type SpeedUnit } from "@/lib/speed-utils"

export type ResultCardInput = {
  downloadMbps: number
  uploadMbps: number
  latency: number
  jitter: number
  packetLoss: number
  unit: SpeedUnit
  isp?: string
  location?: string
  colo?: string
  planMbps?: number
  timestamp?: number
}

const SIZE = 1080
const ACCENT = "#40dcd6"
const FG = "#f5f5f5"
const MUTED = "#9a9a9a"
const CARD = "#1a1a1a"
const BG = "#0f0f0f"

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

const loadIcon = async (): Promise<HTMLImageElement | null> => {
  try {
    const image = new Image()
    image.crossOrigin = "anonymous"
    image.src = "/icons/icon-192.png"
    await image.decode()
    return image
  } catch {
    return null
  }
}

export const renderResultCardBlob = async (input: ResultCardInput): Promise<Blob> => {
  await document.fonts.ready.catch(() => {})
  const canvas = document.createElement("canvas")
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas is not available")

  const fontFamily = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif"
  const down = formatSpeed(input.downloadMbps, input.unit)
  const up = formatSpeed(input.uploadMbps, input.unit)
  const quality = getConnectionQuality(input.downloadMbps, input.latency)
  const when = new Date(input.timestamp ?? Date.now()).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })

  ctx.fillStyle = BG
  ctx.fillRect(0, 0, SIZE, SIZE)

  const glow = ctx.createRadialGradient(SIZE / 2, 80, 20, SIZE / 2, 80, 520)
  glow.addColorStop(0, "rgba(64, 220, 214, 0.22)")
  glow.addColorStop(1, "rgba(64, 220, 214, 0)")
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, SIZE, 640)

  const icon = await loadIcon()
  if (icon) ctx.drawImage(icon, 72, 64, 88, 88)

  ctx.fillStyle = FG
  ctx.font = `600 44px ${fontFamily}`
  ctx.fillText("SpeedyCheck", icon ? 180 : 72, 124)

  ctx.fillStyle = MUTED
  ctx.font = `400 28px ${fontFamily}`
  ctx.fillText("Internet speed result", icon ? 180 : 72, 168)

  ctx.fillStyle = ACCENT
  ctx.font = `700 168px ${fontFamily}`
  ctx.fillText(down.value, 72, 400)
  ctx.font = `500 48px ${fontFamily}`
  ctx.fillStyle = MUTED
  ctx.fillText(`${down.unit} download`, 72, 468)

  ctx.fillStyle = ACCENT
  ctx.font = `600 36px ${fontFamily}`
  ctx.fillText(quality.label, 72, 540)

  ctx.fillStyle = MUTED
  ctx.font = `400 26px ${fontFamily}`
  const maxDesc = SIZE - 144
  let description = quality.description
  if (ctx.measureText(description).width > maxDesc) {
    while (description.length && ctx.measureText(`${description}…`).width > maxDesc) {
      description = description.slice(0, -1)
    }
    description = `${description}…`
  }
  ctx.fillText(description, 72, 584)

  const metrics = [
    { label: "Upload", value: `${up.value} ${up.unit}` },
    { label: "Ping", value: `${input.latency} ms` },
    { label: "Jitter", value: `${input.jitter} ms` },
    { label: "Loss", value: `${input.packetLoss}%` },
  ]
  const gap = 24
  const cardW = (SIZE - 72 * 2 - gap) / 2
  const cardH = 148
  const startY = 640

  metrics.forEach((metric, index) => {
    const col = index % 2
    const row = Math.floor(index / 2)
    const x = 72 + col * (cardW + gap)
    const y = startY + row * (cardH + gap)
    ctx.fillStyle = CARD
    roundRect(ctx, x, y, cardW, cardH, 28)
    ctx.fill()
    ctx.fillStyle = MUTED
    ctx.font = `500 24px ${fontFamily}`
    ctx.fillText(metric.label.toUpperCase(), x + 28, y + 52)
    ctx.fillStyle = FG
    ctx.font = `600 40px ${fontFamily}`
    ctx.fillText(metric.value, x + 28, y + 108)
  })

  const footerParts = [input.isp, input.location, input.colo ? `CF ${input.colo}` : "", when].filter(Boolean)
  ctx.fillStyle = MUTED
  ctx.font = `400 22px ${fontFamily}`
  const maxFooter = SIZE - 144
  let line = ""
  let footerY = 1004
  footerParts.forEach((part, index) => {
    const next = line ? `${line}  ·  ${part}` : part
    if (ctx.measureText(next).width > maxFooter && line) {
      ctx.fillText(line, 72, footerY)
      line = part
      footerY += 30
    } else {
      line = next
    }
    if (index === footerParts.length - 1) ctx.fillText(line, 72, footerY)
  })

  if (input.planMbps && input.planMbps > 0) {
    const pct = Math.round((input.downloadMbps / input.planMbps) * 100)
    ctx.fillText(`${pct}% of ${input.planMbps} Mbps plan`, 72, footerY + 32)
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((next) => (next ? resolve(next) : reject(new Error("Could not build image"))), "image/png")
  })
  return blob
}

const isAbort = (error: unknown) => error instanceof DOMException && error.name === "AbortError"

const downloadBlob = (blob: Blob, name: string) => {
  const href = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = href
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(href), 1500)
}

export const saveResultCard = async (input: ResultCardInput) => {
  const blob = await renderResultCardBlob(input)
  downloadBlob(blob, "speedycheck-result.png")
}

export const shareResultCard = async (input: ResultCardInput, text: string) => {
  const blob = await renderResultCardBlob(input)
  const file = new File([blob], "speedycheck-result.png", { type: "image/png" })

  try {
    if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "SpeedyCheck", text })
      return "shared" as const
    }
  } catch (error) {
    if (isAbort(error)) return "cancelled" as const
  }

  if (navigator.share) {
    try {
      await navigator.share({ title: "SpeedyCheck", text })
      return "shared-text" as const
    } catch (error) {
      if (isAbort(error)) return "cancelled" as const
    }
  }

  downloadBlob(blob, "speedycheck-result.png")
  return "downloaded" as const
}
