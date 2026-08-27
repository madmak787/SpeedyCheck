"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, Upload, Clock, Activity, Trash2, WifiOff } from "lucide-react"
import HistoryChart from "@/components/history-chart"
import { formatSpeed, type SpeedUnit } from "@/lib/speed-utils"

export interface SpeedTestResult {
  downloadSpeed: number
  uploadSpeed: number
  latency: number
  jitter: number
  packetLoss?: number
  timestamp: number
}

interface TestHistoryProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  history: SpeedTestResult[]
  onClear: () => void
  unit: SpeedUnit
  planMbps: number
}

export default function TestHistory({ open, onOpenChange, history, onClear, unit, planMbps }: TestHistoryProps) {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-1.5rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Test History</DialogTitle>
          <DialogDescription>Your last {history.length || 10} speed tests, stored on this device</DialogDescription>
        </DialogHeader>

        {history.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No test history yet. Run a speed test to see results here.
          </div>
        ) : (
          <div className="space-y-3">
            <HistoryChart history={history} unit={unit} planMbps={planMbps} />
            {history.map((result, index) => (
              <div key={`${result.timestamp}-${index}`} className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">{formatDate(result.timestamp)}</span>
                  {index === 0 && (
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">Latest</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <HistoryMetric icon={Download} label="Download" value={formatSpeed(result.downloadSpeed, unit).value} unit={formatSpeed(result.downloadSpeed, unit).unit} />
                  <HistoryMetric icon={Upload} label="Upload" value={formatSpeed(result.uploadSpeed, unit).value} unit={formatSpeed(result.uploadSpeed, unit).unit} />
                  <HistoryMetric icon={Clock} label="Ping" value={String(result.latency)} unit="ms" />
                  <HistoryMetric icon={Activity} label="Jitter" value={String(result.jitter)} unit="ms" />
                  <HistoryMetric icon={WifiOff} label="Loss" value={String(result.packetLoss ?? 0)} unit="%" />
                </div>
              </div>
            ))}

            <Button variant="outline" onClick={onClear} className="w-full">
              <Trash2 className="h-4 w-4" />
              Clear history
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function HistoryMetric({
  icon: Icon,
  label,
  value,
  unit,
}: {
  icon: typeof Download
  label: string
  value: string
  unit: string
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-accent" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-bold tabular-nums sm:text-xl">
        {value}
        <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>
      </p>
    </div>
  )
}
