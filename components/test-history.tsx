"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Download, Upload, Clock, Activity, Trash2, WifiOff, GitCompare, FileText } from "lucide-react"
import HistoryChart from "@/components/history-chart"
import { shareHistoryComparePdf } from "@/lib/history-pdf"
import { formatSpeed, toDisplaySpeed, type SpeedUnit } from "@/lib/speed-utils"

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

const resultId = (result: SpeedTestResult, index: number) => `${result.timestamp}-${index}`

const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

export default function TestHistory({ open, onOpenChange, history, onClear, unit, planMbps }: TestHistoryProps) {
  const [selected, setSelected] = useState<string[]>([])
  const [comparing, setComparing] = useState(false)
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    if (!open) {
      setSelected([])
      setComparing(false)
    }
  }, [open])

  const selectedResults = useMemo(
    () =>
      history
        .map((result, index) => ({ result, id: resultId(result, index) }))
        .filter((item) => selected.includes(item.id))
        .map((item) => item.result)
        .sort((a, b) => a.timestamp - b.timestamp),
    [history, selected],
  )

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const sharePdf = async () => {
    if (selectedResults.length < 2) return
    setSharing(true)
    try {
      await shareHistoryComparePdf(selectedResults, unit)
    } finally {
      setSharing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-1.5rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Test History</DialogTitle>
          <DialogDescription>
            Select two or more tests to compare them, then share a PDF. Stored on this device.
          </DialogDescription>
        </DialogHeader>

        {history.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No test history yet. Run a speed test to see results here.
          </div>
        ) : (
          <div className="space-y-3">
            <HistoryChart history={history} unit={unit} planMbps={planMbps} />

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={selectedResults.length < 2}
                onClick={() => setComparing((prev) => !prev)}
              >
                <GitCompare className="h-4 w-4" />
                {comparing ? "Hide compare" : "Compare"}
              </Button>
              <Button
                type="button"
                size="sm"
                className="rounded-full"
                disabled={selectedResults.length < 2 || sharing}
                onClick={() => void sharePdf()}
              >
                <FileText className="h-4 w-4" />
                {sharing ? "Sharing…" : "Share PDF"}
              </Button>
              <span className="text-xs text-muted-foreground">
                {selected.length === 0 ? "Select tests to compare" : `${selected.length} selected`}
              </span>
              {selected.length > 0 && (
                <button type="button" className="text-xs text-muted-foreground underline-offset-2 hover:underline" onClick={() => setSelected([])}>
                  Clear
                </button>
              )}
            </div>

            {comparing && selectedResults.length >= 2 && <CompareTable results={selectedResults} unit={unit} />}

            {history.map((result, index) => {
              const id = resultId(result, index)
              const isSelected = selected.includes(id)
              return (
                <div
                  key={id}
                  className={`rounded-xl border bg-card p-4 ${isSelected ? "border-accent" : "border-border"}`}
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <label className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                      <Checkbox checked={isSelected} onCheckedChange={() => toggle(id)} aria-label={`Select test from ${formatDate(result.timestamp)}`} />
                      {formatDate(result.timestamp)}
                    </label>
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
              )
            })}

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

function CompareTable({ results, unit }: { results: SpeedTestResult[]; unit: SpeedUnit }) {
  const baseline = results[0]
  const newest = results[results.length - 1]
  const speedUnit = unit === "bytes" ? "MB/s" : "Mbps"

  const change = (current: number, start: number, invert = false) => {
    const diff = current - start
    if (Math.abs(diff) < 0.05) return { text: "0", className: "text-muted-foreground" }
    const better = invert ? diff < 0 : diff > 0
    return {
      text: `${diff > 0 ? "+" : ""}${diff.toFixed(1)}`,
      className: better ? "text-accent" : "text-rose-400",
    }
  }

  const down = change(toDisplaySpeed(newest.downloadSpeed, unit), toDisplaySpeed(baseline.downloadSpeed, unit))
  const up = change(toDisplaySpeed(newest.uploadSpeed, unit), toDisplaySpeed(baseline.uploadSpeed, unit))
  const ping = change(newest.latency, baseline.latency, true)
  const jitter = change(newest.jitter, baseline.jitter, true)
  const loss = change(newest.packetLoss ?? 0, baseline.packetLoss ?? 0, true)

  return (
    <div className="overflow-x-auto rounded-xl border border-accent/40 bg-card/80 p-3 fade-rise">
      <p className="mb-2 text-xs text-muted-foreground">Newest vs oldest of the {results.length} selected tests</p>
      <table className="w-full min-w-lg text-left text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            <th className="pb-2 pr-2 font-medium">When</th>
            <th className="pb-2 pr-2 font-medium">Down</th>
            <th className="pb-2 pr-2 font-medium">Up</th>
            <th className="pb-2 pr-2 font-medium">Ping</th>
            <th className="pb-2 pr-2 font-medium">Jitter</th>
            <th className="pb-2 font-medium">Loss</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result) => {
            const downSpeed = formatSpeed(result.downloadSpeed, unit)
            const upSpeed = formatSpeed(result.uploadSpeed, unit)
            return (
              <tr key={result.timestamp} className="border-t border-border/70">
                <td className="py-2 pr-2 text-muted-foreground">{formatDate(result.timestamp)}</td>
                <td className="py-2 pr-2 tabular-nums">
                  {downSpeed.value} {downSpeed.unit}
                </td>
                <td className="py-2 pr-2 tabular-nums">
                  {upSpeed.value} {upSpeed.unit}
                </td>
                <td className="py-2 pr-2 tabular-nums">{result.latency} ms</td>
                <td className="py-2 pr-2 tabular-nums">{result.jitter} ms</td>
                <td className="py-2 tabular-nums">{result.packetLoss ?? 0}%</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
        <ChangeChip label={`Down ${speedUnit}`} change={down} />
        <ChangeChip label={`Up ${speedUnit}`} change={up} />
        <ChangeChip label="Ping" change={ping} />
        <ChangeChip label="Jitter" change={jitter} />
        <ChangeChip label="Loss" change={loss} />
      </div>
    </div>
  )
}

function ChangeChip({ label, change }: { label: string; change: { text: string; className: string } }) {
  return (
    <div className="rounded-lg border border-border/70 px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
      <p className={`tabular-nums font-medium ${change.className}`}>{change.text}</p>
    </div>
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
