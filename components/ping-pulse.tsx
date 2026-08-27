"use client"

const EXPECTED = 20
const WIDTH = 400
const HEIGHT = 48

export default function PingPulse({ points }: { points: number[] }) {
  const maxRtt = Math.max(80, ...points)
  const last = points.at(-1)

  return (
    <div className="relative mx-auto w-[min(100%,16rem)] sm:w-64" aria-hidden={false}>
      <div className="relative mx-auto aspect-square w-[min(100%,11.5rem)]">
        <div className="absolute inset-0 overflow-hidden rounded-full">
          <div className="ping-sweep absolute inset-0 rounded-full" />
        </div>
        <div className="absolute inset-[8%] rounded-full border border-accent/25" />
        <div className="absolute inset-[22%] rounded-full border border-accent/18" />
        <div className="absolute inset-[38%] rounded-full border border-accent/12" />
        <div className="ping-echo absolute inset-[8%] rounded-full border-2 border-accent/70" />
        <div className="ping-echo ping-echo-2 absolute inset-[8%] rounded-full border border-accent/50" />
        <div className="absolute inset-[42%] rounded-full bg-accent/10 shadow-[0_0_28px_oklch(0.75_0.15_195/0.35)]" />
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden="true">
          {points.map((rtt, index) => {
            const angle = (index / EXPECTED) * Math.PI * 2 - Math.PI / 2
            const dist = 16 + (1 - Math.min(rtt / maxRtt, 1)) * 26
            return (
              <circle
                key={`${index}-${rtt}`}
                cx={50 + Math.cos(angle) * dist}
                cy={50 + Math.sin(angle) * dist}
                r="1.8"
                className="fill-accent ping-dot"
              />
            )
          })}
        </svg>
      </div>
      <span className="sr-only">
        Measuring ping
        {last ? `, last packet ${Math.round(last)} milliseconds` : ""}
        {points.length ? `, ${points.length} of ${EXPECTED} packets` : ""}
      </span>
    </div>
  )
}

export function PingSparkline({ points }: { points: number[] }) {
  if (!points.length) {
    return (
      <div className="flex h-full items-center justify-center gap-1">
        {Array.from({ length: 5 }, (_, index) => (
          <span
            key={index}
            className="ping-bar h-2 w-1 rounded-full bg-accent/70"
            style={{ animationDelay: `${index * 120}ms` }}
          />
        ))}
      </div>
    )
  }

  const maxRtt = Math.max(40, ...points)
  const step = (WIDTH - 16) / Math.max(EXPECTED - 1, 1)
  const coords = points
    .map((rtt, index) => {
      const x = 8 + index * step
      const y = HEIGHT - 6 - (Math.min(rtt / maxRtt, 1) * (HEIGHT - 14))
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-full w-full" role="img" aria-label="Ping samples">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
        strokeLinecap="round"
        className="text-accent"
        points={coords}
      />
    </svg>
  )
}
