"use client"

import { memo } from "react"
import { toDisplaySpeed, type SpeedSample, type SpeedUnit } from "@/lib/speed-utils"

interface LiveSpeedGraphProps {
  samples: SpeedSample[]
  unit: SpeedUnit
  compact?: boolean
}

const WIDTH = 400
const HEIGHT = 96
const PAD = { top: 8, right: 8, bottom: 8, left: 8 }

function LiveSpeedGraph({ samples, unit, compact = false }: LiveSpeedGraphProps) {
  const innerWidth = WIDTH - PAD.left - PAD.right
  const innerHeight = HEIGHT - PAD.top - PAD.bottom
  const maxTime = Math.max(1, ...samples.map((sample) => sample.t))
  const maxSpeed = Math.max(8, ...samples.map((sample) => toDisplaySpeed(sample.speed, unit))) * 1.2

  const toPoint = (sample: SpeedSample) => {
    const x = PAD.left + (sample.t / maxTime) * innerWidth
    const y = PAD.top + innerHeight - (toDisplaySpeed(sample.speed, unit) / maxSpeed) * innerHeight
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }

  const download = samples.filter((sample) => sample.phase === "download").map(toPoint).join(" ")
  const upload = samples.filter((sample) => sample.phase === "upload").map(toPoint).join(" ")

  return (
    <div className={`mx-auto w-full max-w-lg ${compact ? "h-full" : "rounded-2xl border border-border/70 bg-card/40 p-3"}`}>
      {!compact && (
        <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          <span>Live</span>
          <span className="flex gap-3">
            <span className="text-accent">Download</span>
            <span className="text-fuchsia-400">Upload</span>
          </span>
        </div>
      )}
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className={compact ? "h-full w-full" : "h-24 w-full"} role="img" aria-label="Live speed">
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinejoin="round"
          strokeLinecap="round"
          className="text-accent/90"
          points={download}
        />
        <polyline
          fill="none"
          stroke="#e879f9"
          strokeWidth="2.2"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={upload}
        />
      </svg>
    </div>
  )
}

export default memo(LiveSpeedGraph)
