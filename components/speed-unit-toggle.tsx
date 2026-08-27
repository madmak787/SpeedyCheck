"use client"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { SpeedUnit } from "@/lib/speed-utils"

interface SpeedUnitToggleProps {
  unit: SpeedUnit
  onChange: (unit: SpeedUnit) => void
}

export default function SpeedUnitToggle({ unit, onChange }: SpeedUnitToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={unit}
      onValueChange={(value) => {
        if (value === "bits" || value === "bytes") onChange(value)
      }}
      variant="outline"
      size="sm"
      aria-label="Speed unit"
      className="rounded-full border border-border bg-card p-0.5"
    >
      <ToggleGroupItem
        value="bits"
        aria-label="Show speeds in megabits per second"
        className="h-8 rounded-full px-2.5 text-xs data-[state=on]:bg-accent data-[state=on]:text-accent-foreground sm:px-3"
      >
        Mbps
      </ToggleGroupItem>
      <ToggleGroupItem
        value="bytes"
        aria-label="Show speeds in megabytes per second"
        className="h-8 rounded-full px-2.5 text-xs data-[state=on]:bg-accent data-[state=on]:text-accent-foreground sm:px-3"
      >
        MB/s
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
