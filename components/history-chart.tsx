"use client"

import { toDisplaySpeed, type SpeedUnit } from "@/lib/speed-utils"

const WIDTH = 420
const HEIGHT = 140
const PAD = { top: 16, right: 12, bottom: 28, left: 36 }

export default function HistoryChart({
  history,
  unit,
  planMbps,
}: {
  history: { downloadSpeed: number; uploadSpeed: number; timestamp: number }[]
  unit: SpeedUnit
  planMbps: number
}) {
  const points = [...history].reverse()
  if (points.length < 2) {
    return (
      <p className="mb-4 text-center text-sm text-muted-foreground">
        Run at least two tests to see your speed over time.
      </p>
    )
  }

  const innerWidth = WIDTH - PAD.left - PAD.right
  const innerHeight = HEIGHT - PAD.top - PAD.bottom
  const displayed = points.map((item) => ({
    down: toDisplaySpeed(item.downloadSpeed, unit),
    up: toDisplaySpeed(item.uploadSpeed, unit),
  }))
  const planDisplay = planMbps ? toDisplaySpeed(planMbps, unit) : 0
  const maxSpeed = Math.max(planDisplay, ...displayed.flatMap((item) => [item.down, item.up]), 8) * 1.15

  const x = (index: number) => PAD.left + (index / (points.length - 1)) * innerWidth
  const y = (speed: number) => PAD.top + innerHeight - (speed / maxSpeed) * innerHeight

  const downLine = displayed.map((item, index) => `${x(index).toFixed(1)},${y(item.down).toFixed(1)}`).join(" ")
  const upLine = displayed.map((item, index) => `${x(index).toFixed(1)},${y(item.up).toFixed(1)}`).join(" ")
  const planY = planDisplay ? y(planDisplay) : 0
  const axisUnit = unit === "bytes" ? "MB/s" : "Mbps"

  return (
    <div className="mb-5 rounded-2xl border border-border/70 bg-card/40 p-3">
      <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        <span>History</span>
        <span className="flex gap-3">
          <span className="text-accent">Download</span>
          <span className="text-fuchsia-400">Upload</span>
          {planMbps > 0 && <span>Plan</span>}
        </span>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-36 w-full" role="img" aria-label="Speed history">
        {planMbps > 0 && (
          <line
            x1={PAD.left}
            x2={WIDTH - PAD.right}
            y1={planY}
            y2={planY}
            stroke="currentColor"
            strokeDasharray="4 4"
            strokeWidth="1.2"
            className="text-muted-foreground/70"
          />
        )}
        <polyline fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" className="text-accent" points={downLine} />
        <polyline fill="none" stroke="#e879f9" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" points={upLine} />
        {displayed.map((item, index) => (
          <circle key={`d-${points[index].timestamp}`} cx={x(index)} cy={y(item.down)} r="3" className="fill-accent" />
        ))}
        <text x={PAD.left} y={HEIGHT - 8} fill="currentColor" className="fill-muted-foreground" fontSize="10">
          Older
        </text>
        <text x={WIDTH - PAD.right} y={HEIGHT - 8} textAnchor="end" fill="currentColor" className="fill-muted-foreground" fontSize="10">
          Latest
        </text>
        <text x={4} y={PAD.top + 4} fill="currentColor" className="fill-muted-foreground" fontSize="10">
          {axisUnit}
        </text>
      </svg>
    </div>
  )
}
