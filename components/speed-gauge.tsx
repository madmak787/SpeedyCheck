"use client"

interface SpeedGaugeProps {
  speed: number
  isRunning: boolean
}

function getScale(speed: number) {
  if (speed <= 50) return 50
  if (speed <= 100) return 100
  if (speed <= 250) return 250
  if (speed <= 500) return 500
  if (speed <= 1000) return 1000
  return Math.ceil(speed / 1000) * 1000
}

export default function SpeedGauge({ speed, isRunning }: SpeedGaugeProps) {
  const maxSpeed = getScale(speed)
  const angle = Math.min(Math.max(speed / maxSpeed, 0) * 180, 180)
  const midPoint = maxSpeed / 2
  const formatTick = (value: number) => (value >= 1000 ? `${value / 1000}k` : String(value))

  return (
    <div className="relative mx-auto h-full max-h-[min(22vh,12rem)] w-[min(42vmin,20rem)]">
      <svg className="h-full w-full" viewBox="0 0 200 118" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="gauge-fill" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
        <path
          d="M 20 90 A 80 80 0 0 1 180 90"
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-muted"
          strokeLinecap="round"
        />
        <path
          d="M 20 90 A 80 80 0 0 1 180 90"
          fill="none"
          stroke="url(#gauge-fill)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(angle / 180) * 251.2} 251.2`}
          className="gauge-arc"
        />
        <g
          className="gauge-needle origin-center"
          style={{ transform: `rotate(${angle - 90}deg)`, transformOrigin: "100px 90px" }}
        >
          <line x1="100" y1="90" x2="100" y2="28" stroke="currentColor" strokeWidth="2.5" className="text-accent" strokeLinecap="round" />
        </g>
        <circle cx="100" cy="90" r="5" fill="currentColor" className="text-accent" />
        <circle cx="100" cy="90" r="2" fill="currentColor" className="text-accent-foreground" />
        <text x="20" y="112" textAnchor="middle" fill="currentColor" className="text-muted-foreground" fontSize="10">
          0
        </text>
        <text x="100" y="112" textAnchor="middle" fill="currentColor" className="text-muted-foreground" fontSize="10">
          {formatTick(midPoint)}
        </text>
        <text x="180" y="112" textAnchor="middle" fill="currentColor" className="text-muted-foreground" fontSize="10">
          {formatTick(maxSpeed)}
        </text>
      </svg>
      <span className="sr-only">{isRunning ? "Speed test running" : "Speed gauge"}</span>
    </div>
  )
}
