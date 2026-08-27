"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Zap, Upload, Download, Clock, Settings, History, Activity, Share2, Copy, Check, Globe, RotateCcw } from "lucide-react"
import SpeedGauge from "@/components/speed-gauge"
import { PingSparkline } from "@/components/ping-pulse"
import LiveSpeedGraph from "@/components/live-speed-graph"
import SpeedUnitToggle from "@/components/speed-unit-toggle"
import TestHistory, { type SpeedTestResult } from "@/components/test-history"
import SettingsDialog from "@/components/settings-dialog"
import { createUploadBlob, measureTransfer } from "@/lib/measure-bandwidth"
import { measureLoadedLatency, measurePing } from "@/lib/measure-latency"
import { getStoredLocation, parseCloudflareColo, storeLocation, type UserLocation } from "@/lib/location"
import { useAnimatedNumber } from "@/hooks/use-animated-number"
import {
  formatDataUsed,
  formatLiveSpeed,
  formatShareText,
  formatSpeed,
  getConnectionQuality,
  getStoredSpeedUnit,
  storeSpeedUnit,
  STAGE_ORDER,
  type SpeedSample,
  type SpeedUnit,
} from "@/lib/speed-utils"

interface TestState {
  isRunning: boolean
  stage: "idle" | "download" | "latency" | "upload" | "jitter" | "complete"
  downloadSpeed: number
  uploadSpeed: number
  latency: number
  loadedLatency: number
  jitter: number
}

interface NetworkInfo {
  ip: string
  isp: string
  city: string
  country: string
}

const STAGES = [
  { id: "download", label: "Download" },
  { id: "latency", label: "Ping" },
  { id: "upload", label: "Upload" },
  { id: "jitter", label: "Jitter" },
] as const

const waitFor = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"))
      return
    }
    if (ms <= 0) {
      resolve()
      return
    }
    const timer = window.setTimeout(() => resolve(), ms)
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer)
        reject(new DOMException("Aborted", "AbortError"))
      },
      { once: true },
    )
  })

const isAtLeast = (stage: TestState["stage"], target: TestState["stage"]) =>
  STAGE_ORDER.indexOf(stage) >= STAGE_ORDER.indexOf(target)

export default function SpeedTest() {
  const abortRef = useRef<AbortController | null>(null)
  const abortedRef = useRef(false)
  const graphStartRef = useRef(0)
  const samplesRef = useRef<SpeedSample[]>([])
  const stageRef = useRef<TestState["stage"]>("idle")
  const liveDownRef = useRef(0)
  const payloadRef = useRef<Promise<Blob> | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [pingPoints, setPingPoints] = useState<number[]>([])
  const [dataUsed, setDataUsed] = useState({ down: 0, up: 0 })
  const [colo, setColo] = useState("")
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)

  const [copied, setCopied] = useState(false)
  const [unit, setUnit] = useState<SpeedUnit>("bits")
  const [samples, setSamples] = useState<SpeedSample[]>([])
  const [heroTarget, setHeroTarget] = useState(0)
  const [network, setNetwork] = useState<NetworkInfo | null>(null)
  const [testState, setTestState] = useState<TestState>({
    isRunning: true,
    stage: "download",
    downloadSpeed: 0,
    uploadSpeed: 0,
    latency: 0,
    loadedLatency: 0,
    jitter: 0,
  })
  const [showHistory, setShowHistory] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [testHistory, setTestHistory] = useState<SpeedTestResult[]>([])

  const heroSpeed = useAnimatedNumber(heroTarget, testState.stage !== "idle")

  useEffect(() => {
    setUnit(getStoredSpeedUnit())
    setUserLocation(getStoredLocation())
    const stored = localStorage.getItem("speedTestHistory")
    if (stored) {
      try {
        setTestHistory(JSON.parse(stored))
      } catch {
        localStorage.removeItem("speedTestHistory")
      }
    }
  }, [])

  useEffect(() => {
    fetch("https://speed.cloudflare.com/cdn-cgi/trace")
      .then((res) => res.text())
      .then((trace) => {
        const { colo: edge } = parseCloudflareColo(trace)
        if (edge) setColo(edge)
      })
      .catch(() => null)
  }, [])

  useEffect(() => {
    fetch("https://ipwho.is/")
      .then((res) => res.json())
      .then((data) => {
        if (!data?.success) return
        setNetwork({
          ip: data.ip ?? "Unknown",
          isp: data.connection?.isp || data.connection?.org || "Unknown ISP",
          city: data.city ?? "",
          country: data.country ?? "",
        })
      })
      .catch(() => null)
  }, [])

  const changeUnit = (next: SpeedUnit) => {
    setUnit(next)
    storeSpeedUnit(next)
  }

  const persistHistory = (next: SpeedTestResult[]) => {
    setTestHistory(next)
    localStorage.setItem("speedTestHistory", JSON.stringify(next))
  }

  const saveTestResult = useCallback((result: SpeedTestResult) => {
    setTestHistory((prev) => {
      const newHistory = [result, ...prev].slice(0, 10)
      localStorage.setItem("speedTestHistory", JSON.stringify(newHistory))
      return newHistory
    })
  }, [])

  const changeLocation = (next: UserLocation | null) => {
    setUserLocation(next)
    storeLocation(next)
  }

  const runSpeedTest = () => {
    abortedRef.current = true
    abortRef.current?.abort()
    abortedRef.current = false
    liveDownRef.current = 0
    stageRef.current = "download"
    samplesRef.current = []
    setSamples([])
    setPingPoints([])
    setHeroTarget(0)
    setUploadProgress(0)
    setDataUsed({ down: 0, up: 0 })
    setCopied(false)
    graphStartRef.current = performance.now()
    setTestState({
      isRunning: true,
      stage: "download",
      downloadSpeed: 0,
      uploadSpeed: 0,
      latency: 0,
      loadedLatency: 0,
      jitter: 0,
    })

    const controller = new AbortController()
    abortRef.current = controller
    payloadRef.current = createUploadBlob(4 * 1024 * 1024, controller.signal)

    void (async () => {
      try {
        let loadedLatency = 0
        void (async () => {
          try {
            await waitFor(3500, controller.signal)
            loadedLatency = await measureLoadedLatency(controller.signal, 5)
          } catch {
            /* cancelled */
          }
        })()

        const down = await measureTransfer({
          direction: "download",
          durationMs: 10000,
          concurrency: 6,
          signal: controller.signal,
          onProgress: (mbps, _progress, bytes) => {
            if (abortedRef.current) return
            liveDownRef.current = mbps
            setHeroTarget(mbps)
            setDataUsed((prev) => ({ ...prev, down: bytes }))
            setTestState((prev) => ({ ...prev, downloadSpeed: mbps }))
            const sample = {
              t: (performance.now() - graphStartRef.current) / 1000,
              speed: mbps,
              phase: "download" as const,
            }
            const next = [...samplesRef.current, sample].slice(-80)
            samplesRef.current = next
            setSamples(next)
          },
        })
        if (abortedRef.current) return

        const downloadSpeed = down.mbps
        setHeroTarget(downloadSpeed)
        setDataUsed((prev) => ({ ...prev, down: down.bytes }))

        stageRef.current = "latency"
        setTestState({
          isRunning: true,
          stage: "latency",
          downloadSpeed,
          uploadSpeed: 0,
          latency: 0,
          loadedLatency,
          jitter: 0,
        })

        const ping = await measurePing({
          packets: 16,
          signal: controller.signal,
          onSample: (_rtt, all) => setPingPoints(all),
        })
        if (abortedRef.current) return

        setTestState((prev) => ({
          ...prev,
          latency: ping.latency,
          loadedLatency: loadedLatency || prev.loadedLatency,
        }))
        await waitFor(400, controller.signal)
        if (abortedRef.current) return

        stageRef.current = "upload"
        setUploadProgress(0.04)
        setTestState({
          isRunning: true,
          stage: "upload",
          downloadSpeed,
          uploadSpeed: 0,
          latency: ping.latency,
          loadedLatency,
          jitter: 0,
        })

        const blob = await (payloadRef.current ?? createUploadBlob(4 * 1024 * 1024, controller.signal))
        const up = await measureTransfer({
          direction: "upload",
          durationMs: 10000,
          concurrency: 6,
          blob,
          signal: controller.signal,
          onProgress: (mbps, progress) => {
            if (abortedRef.current) return
            setUploadProgress(progress)
            setTestState((prev) => ({ ...prev, uploadSpeed: mbps }))
          },
        })
        if (abortedRef.current) return

        stageRef.current = "jitter"
        setUploadProgress(1)
        setDataUsed({ down: down.bytes, up: up.bytes })
        setTestState({
          isRunning: true,
          stage: "jitter",
          downloadSpeed,
          uploadSpeed: up.mbps,
          latency: ping.latency,
          loadedLatency,
          jitter: ping.jitter,
        })
        await waitFor(900, controller.signal)
        if (abortedRef.current) return

        stageRef.current = "complete"
        setTestState({
          isRunning: false,
          stage: "complete",
          downloadSpeed,
          uploadSpeed: up.mbps,
          latency: ping.latency,
          loadedLatency,
          jitter: ping.jitter,
        })
        saveTestResult({
          downloadSpeed,
          uploadSpeed: up.mbps,
          latency: ping.latency,
          jitter: ping.jitter,
          timestamp: Date.now(),
        })
      } catch (error) {
        if ((error as Error).name === "AbortError" || abortedRef.current) return
        console.error("Speed test error:", error)
      }
    })()
  }

  useEffect(() => {
    const timer = window.setTimeout(() => runSpeedTest(), 80)
    return () => window.clearTimeout(timer)
    // Fast.com-style autostart on first visit to the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cancelTest = () => {
    abortedRef.current = true
    abortRef.current?.abort()
    if (testState.downloadSpeed > 0) {
      stageRef.current = "complete"
      setHeroTarget(testState.downloadSpeed)
      setTestState((prev) => ({ ...prev, isRunning: false, stage: "complete" }))
      return
    }
    stageRef.current = "idle"
    setHeroTarget(0)
    setTestState({
      isRunning: false,
      stage: "idle",
      downloadSpeed: 0,
      uploadSpeed: 0,
      latency: 0,
      loadedLatency: 0,
      jitter: 0,
    })
  }

  const shareResult = async () => {
    const text = formatShareText(testState, unit)
    try {
      if (navigator.share) {
        await navigator.share({ title: "SpeedyCheck", text })
        return
      }
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* cancelled */
    }
  }

  const copyResult = async () => {
    await navigator.clipboard.writeText(formatShareText(testState, unit))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isPing = testState.stage === "latency"
  const live = testState.isRunning
  const formatted =
    testState.stage === "complete"
      ? formatSpeed(testState.downloadSpeed, unit)
      : formatLiveSpeed(heroSpeed, unit)
  const quality = testState.stage === "complete" ? getConnectionQuality(testState.downloadSpeed, testState.latency) : null
  const location = [userLocation?.city || network?.city, userLocation?.country || network?.country].filter(Boolean).join(", ")
  const currentIndex = STAGES.findIndex((item) => item.id === testState.stage)
  const status =
    testState.stage === "download"
      ? "Your internet speed is"
      : testState.stage === "latency"
        ? pingPoints.length
          ? `Measuring ping · ${pingPoints.length}/16`
          : "Measuring ping"
        : testState.stage === "upload"
          ? "Measuring upload"
          : testState.stage === "jitter"
            ? "Measuring jitter"
            : testState.stage === "complete"
              ? "Your internet speed is"
              : "Your internet speed is"

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-5 py-5 sm:px-8 sm:py-8">
      <header className="mb-8 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Zap className="h-6 w-6 shrink-0 text-accent" fill="currentColor" />
          <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">SpeedyCheck</h1>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <SpeedUnitToggle unit={unit} onChange={changeUnit} />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowHistory(true)}
            aria-label="Open test history"
            className="text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <History className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(true)}
            aria-label="Open settings"
            className="text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <p className="mb-5 min-h-7 text-base text-muted-foreground transition-opacity sm:text-lg">{status}</p>

        <div className="mb-6 flex w-full max-w-xs gap-2">
          {STAGES.map((stage, index) => {
            const isActive = testState.stage === stage.id
            const isDone = testState.stage === "complete" || (currentIndex > index && currentIndex !== -1)
            return (
              <div key={stage.id} className="flex flex-1 flex-col items-center gap-1.5">
                <div className={`h-1 w-full rounded-full transition-colors duration-500 ${isActive || isDone ? "bg-accent" : "bg-muted"}`} />
                <span className={`text-[10px] uppercase tracking-[0.14em] ${isActive ? "text-accent" : "text-muted-foreground"}`}>
                  {stage.label}
                </span>
              </div>
            )
          })}
        </div>

        <div className="flex min-h-[11.5rem] w-full items-center justify-center">
          <SpeedGauge speed={heroSpeed} isRunning={live && testState.stage === "download"} />
        </div>

        <div className="mt-2 flex items-end justify-center gap-3">
          <div className="speed-hero bg-linear-to-r from-accent via-cyan-300 to-accent bg-clip-text text-6xl font-semibold text-transparent sm:text-8xl">
            {formatted.value}
          </div>
          {testState.stage === "complete" && (
            <button
              type="button"
              onClick={runSpeedTest}
              className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground transition hover:scale-105 fade-rise"
              aria-label="Test again"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => changeUnit(unit === "bits" ? "bytes" : "bits")}
          className="mt-1 text-lg text-muted-foreground transition-colors hover:text-foreground sm:text-xl"
        >
          {formatted.unit}
        </button>
        {testState.stage === "complete" && unit === "bytes" && (
          <p className="text-sm text-muted-foreground">{Math.round(testState.downloadSpeed)} Mbps</p>
        )}

        <div className="mt-4 h-12 w-full max-w-lg">
          {isPing && <PingSparkline points={pingPoints} />}
          {testState.stage === "upload" && (
            <div className="mx-auto w-full max-w-xs">
              <div className="mb-1 flex justify-between text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <span>Upload</span>
                <span>{Math.round(uploadProgress * 100)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-fuchsia-400 transition-[width] duration-150"
                  style={{ width: `${Math.max(uploadProgress * 100, 4)}%` }}
                />
              </div>
            </div>
          )}
          {samples.length > 0 && (testState.stage === "download" || testState.stage === "complete") && (
            <LiveSpeedGraph samples={samples} unit={unit} compact />
          )}
          {testState.stage === "jitter" && (
            <div className="flex h-12 items-center justify-center gap-1">
              {Array.from({ length: 7 }, (_, index) => (
                <span
                  key={index}
                  className="ping-bar h-3 w-1 rounded-full bg-accent/80"
                  style={{ animationDelay: `${index * 80}ms` }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex min-h-16 items-center justify-center">
          {testState.stage === "idle" && (
            <Button
              size="lg"
              onClick={runSpeedTest}
              className="h-12 rounded-full bg-accent px-8 text-base font-semibold text-accent-foreground shadow-[0_0_32px_oklch(0.75_0.15_195/0.35)] transition hover:bg-accent/90"
            >
              <Zap className="h-4 w-4" fill="currentColor" />
              Start
            </Button>
          )}
          {live && (
            <button type="button" onClick={cancelTest} className="text-sm text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline">
              Cancel
            </button>
          )}
          {testState.stage === "complete" && (
            <div className="flex gap-2 fade-rise">
              <Button variant="outline" onClick={shareResult} className="rounded-full">
                <Share2 className="h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" onClick={copyResult} className="rounded-full">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          )}
        </div>

        {quality && (
          <p className="mt-5 max-w-sm text-sm text-muted-foreground fade-rise">
            <span className="font-medium text-accent">{quality.label}.</span> {quality.description}
          </p>
        )}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          icon={Download}
          label="Download"
          value={formatSpeed(testState.downloadSpeed, unit).value}
          unit={formatSpeed(testState.downloadSpeed, unit).unit}
          live={testState.stage === "download"}
          dimmed={!isAtLeast(testState.stage, "download") || testState.stage === "idle"}
        />
        <MetricCard
          icon={Clock}
          label="Latency"
          value={testState.latency ? String(testState.latency) : "—"}
          unit="ms unloaded"
          detail={testState.loadedLatency ? `Loaded ${testState.loadedLatency} ms` : undefined}
          live={isPing}
          dimmed={!isAtLeast(testState.stage, "latency")}
        />
        <MetricCard
          icon={Upload}
          label="Upload"
          value={formatSpeed(testState.uploadSpeed, unit).value}
          unit={formatSpeed(testState.uploadSpeed, unit).unit}
          live={testState.stage === "upload"}
          dimmed={!isAtLeast(testState.stage, "upload")}
        />
        <MetricCard
          icon={Activity}
          label="Jitter"
          value={testState.jitter ? String(testState.jitter) : "—"}
          unit="ms"
          live={testState.stage === "jitter"}
          dimmed={!isAtLeast(testState.stage, "jitter")}
        />
      </div>

      {(network || location || colo) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {network && (
            <span className="inline-flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              {network.isp}
            </span>
          )}
          {location && (
            <button type="button" onClick={() => setShowSettings(true)} className="underline-offset-2 hover:underline">
              {location}
            </button>
          )}
          {colo && <span>Cloudflare {colo}</span>}
          {testState.stage === "complete" && (dataUsed.down > 0 || dataUsed.up > 0) && (
            <span>
              {formatDataUsed(dataUsed.down)} ↓ · {formatDataUsed(dataUsed.up)} ↑
            </span>
          )}
        </div>
      )}

      <TestHistory open={showHistory} onOpenChange={setShowHistory} history={testHistory} onClear={() => persistHistory([])} unit={unit} />
      <SettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        onClearHistory={() => persistHistory([])}
        location={userLocation}
        detected={network ? { city: network.city, country: network.country } : null}
        onLocationChange={changeLocation}
      />
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  unit,
  detail,
  live,
  dimmed,
}: {
  icon: typeof Download
  label: string
  value: string
  unit: string
  detail?: string
  live?: boolean
  dimmed?: boolean
}) {
  return (
    <Card className={`border-border/80 bg-card/50 p-4 text-left transition-opacity duration-500 ${live ? "metric-live" : ""} ${dimmed ? "opacity-40" : "opacity-100"}`}>
      <div className="mb-1.5 flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-accent" />
        <h3 className="text-[11px] uppercase tracking-[0.12em]">{label}</h3>
      </div>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{unit}</p>
      {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
    </Card>
  )
}
