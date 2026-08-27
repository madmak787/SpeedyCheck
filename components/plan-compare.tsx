"use client"

import { compareToPlan } from "@/lib/plan"
import { formatSpeed, type SpeedUnit } from "@/lib/speed-utils"

export default function PlanCompare({
  downloadMbps,
  planMbps,
  unit,
  onSetPlan,
}: {
  downloadMbps: number
  planMbps: number
  unit: SpeedUnit
  onSetPlan: () => void
}) {
  const comparison = compareToPlan(downloadMbps, planMbps)
  const measured = formatSpeed(downloadMbps, unit)

  if (!comparison) {
    return (
      <button
        type="button"
        onClick={onSetPlan}
        className="max-w-full truncate text-[11px] text-muted-foreground underline-offset-2 hover:underline sm:text-sm"
      >
        Add your plan speed to see if you get what you pay for
      </button>
    )
  }

  return (
    <div className="w-full max-w-md fade-rise">
      <div className="mb-1 flex items-center justify-between gap-3 text-[11px] sm:text-sm">
        <span className="font-medium text-accent">{comparison.label}</span>
        <span className="tabular-nums text-muted-foreground">
          {measured.value} {measured.unit} / {planMbps} Mbps
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-muted sm:h-1.5">
        <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${Math.max(comparison.barPercent, 4)}%` }} />
      </div>
      <p className="mt-1 hidden text-xs text-muted-foreground min-[700px]:block">{comparison.description}</p>
    </div>
  )
}
