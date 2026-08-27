"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Zap, Upload, Download, Clock, Settings, History, Activity, Share2, Copy, Check, Globe, RotateCcw, WifiOff } from "lucide-react"
import SpeedGauge from "@/components/speed-gauge"
import { PingSparkline } from "@/components/ping-pulse"
import LiveSpeedGraph from "@/components/live-speed-graph"
import SpeedUnitToggle from "@/components/speed-unit-toggle"
import TestHistory, { type SpeedTestResult } from "@/components/test-history"
import SettingsDialog from "@/components/settings-dialog"
import InstallPrompt from "@/components/install-prompt"
import ResultShareDialog from "@/components/result-share-dialog"
import { createUploadBlob, measureTransfer } from "@/lib/measure-bandwidth"
import { measurePacketLoss, measurePing } from "@/lib/measure-latency"
import { getStoredLocation, parseCloudflareColo, storeLocation, type UserLocation } from "@/lib/location"
import PlanCompare from "@/components/plan-compare"
import { getStoredPlanMbps, storePlanMbps } from "@/lib/plan"
import { shareResultCard, saveResultCard, renderResultCardBlob } from "@/lib/result-card"
import { useAnimatedNumber } from "@/hooks/use-animated-number"
import { usePwaInstall } from "@/hooks/use-pwa-install"
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
  stage: "idle" | "download" | "latency" | "loss" | "upload" | "jitter" | "complete"
  downloadSpeed: number
  uploadSpeed: number
  latency: number
  loadedLatency: number
  jitter: number
  packetLoss: number
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
  { id: "loss", label: "Loss" },
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
  const [uploadProgress, setUploadProgress] = useState(0)
  const [lossProgress, setLossProgress] = useState({ done: 0, total: 20, lost: 0 })
  const [pingPoints, setPingPoints] = useState<number[]>([])
  const [dataUsed, setDataUsed] = useState({ down: 0, up: 0 })
  const [colo, setColo] = useState("")
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [planMbps, setPlanMbps] = useState(0)

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
    packetLoss: 0,
  })
  const [showHistory, setShowHistory] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [testHistory, setTestHistory] = useState<SpeedTestResult[]>([])
  const [sharing, setSharing] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null)
  const pwa = usePwaInstall()

  const heroSpeed = useAnimatedNumber(heroTarget, testState.stage !== "idle")

  useEffect(() => {
    setUnit(getStoredSpeedUnit())
    setUserLocation(getStoredLocation())
    setPlanMbps(getStoredPlanMbps())
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
    void (async () => {
      try {
        const ipRes = await fetch("https://ipwho.is/")
        const data = await ipRes.json()
        if (data?.success) {
          setNetwork({
            ip: data.ip ?? "Unknown",
            isp: data.connection?.isp || data.connection?.org || "Unknown ISP",
            city: data.city ?? "",
            country: data.country ?? "",
          })
        }
      } catch {
        /* ignore */
      }
      try {
        const trace = await fetch("https://speed.cloudflare.com/cdn-cgi/trace").then((res) => res.text())
        const { colo: edge } = parseCloudflareColo(trace)
        if (edge) setColo(edge)
      } catch {
        /* ignore */
      }
    })()
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

  const changePlan = (next: number) => {
    setPlanMbps(next)
    storePlanMbps(next)
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
    setLossProgress({ done: 0, total: 20, lost: 0 })
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
      packetLoss: 0,
    })

    const controller = new AbortController()
    abortRef.current = controller

    void (async () => {
      try {
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
          loadedLatency: 0,
          jitter: 0,
          packetLoss: 0,
        })

        const loaded = await measurePing({
          packets: 8,
          signal: controller.signal,
          onSample: (_rtt, all) => setPingPoints(all),
        })
        if (abortedRef.current) return
        setTestState((prev) => ({ ...prev, loadedLatency: loaded.latency }))
        await waitFor(400, controller.signal)
        if (abortedRef.current) return

        const ping = await measurePing({
          packets: 16,
          signal: controller.signal,
          onSample: (_rtt, all) => setPingPoints(all),
        })
        if (abortedRef.current) return
        setTestState((prev) => ({
          ...prev,
          latency: ping.latency,
          loadedLatency: loaded.latency,
        }))

        stageRef.current = "loss"
        setLossProgress({ done: 0, total: 20, lost: 0 })
        setTestState({
          isRunning: true,
          stage: "loss",
          downloadSpeed,
          uploadSpeed: 0,
          latency: ping.latency,
          loadedLatency: loaded.latency,
          jitter: 0,
          packetLoss: 0,
        })
        const loss = await measurePacketLoss({
          probes: 20,
          signal: controller.signal,
          onProgress: (done, total, lost) => {
            setLossProgress({ done, total, lost })
            setTestState((prev) => ({
              ...prev,
              packetLoss: done ? Math.round((lost / done) * 1000) / 10 : 0,
            }))
          },
        })
        if (abortedRef.current) return

        stageRef.current = "upload"
        setUploadProgress(0.04)
        setTestState({
          isRunning: true,
          stage: "upload",
          downloadSpeed,
          uploadSpeed: 0,
          latency: ping.latency,
          loadedLatency: loaded.latency,
          jitter: 0,
          packetLoss: loss.percent,
        })

        const blob = await createUploadBlob(4 * 1024 * 1024, controller.signal)
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
          loadedLatency: loaded.latency,
          jitter: ping.jitter,
          packetLoss: loss.percent,
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
          loadedLatency: loaded.latency,
          jitter: ping.jitter,
          packetLoss: loss.percent,
        })
        saveTestResult({
          downloadSpeed,
          uploadSpeed: up.mbps,
          latency: ping.latency,
          jitter: ping.jitter,
          packetLoss: loss.percent,
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
      packetLoss: 0,
    })
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

  const sharePayload = () => ({
    downloadMbps: testState.downloadSpeed,
    uploadMbps: testState.uploadSpeed,
    latency: testState.latency,
    jitter: testState.jitter,
    packetLoss: testState.packetLoss,
    unit,
    isp: network?.isp,
    location,
    colo,
    planMbps,
  })

  const openShareCard = async () => {
    setShowShare(true)
    setSharing(true)
    try {
      const blob = await renderResultCardBlob(sharePayload())
      const url = URL.createObjectURL(blob)
      setShareImageUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
    } catch {
      setShowShare(false)
      await navigator.clipboard.writeText(formatShareText(testState, unit)).catch(() => {})
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } finally {
      setSharing(false)
    }
  }

  const shareResult = async () => {
    setSharing(true)
    try {
      await shareResultCard(sharePayload(), formatShareText(testState, unit))
    } catch {
      /* cancelled */
    } finally {
      setSharing(false)
    }
  }

  const saveResult = async () => {
    try {
      await saveResultCard(sharePayload())
    } catch {
      /* ignore */
    }
  }

  const currentIndex = STAGES.findIndex((item) => item.id === testState.stage)
  const status =
    testState.stage === "download"
      ? "Your internet speed is"
      : testState.stage === "latency"
        ? pingPoints.length
          ? `Measuring ping · ${pingPoints.length}`
          : "Measuring ping"
        : testState.stage === "loss"
          ? `Checking packet loss · ${lossProgress.done}/${lossProgress.total}`
          : testState.stage === "upload"
          ? "Measuring upload"
          : testState.stage === "jitter"
            ? "Measuring jitter"
            : testState.stage === "complete"
              ? "Your internet speed is"
              : "Your internet speed is"

  return (
    <div className="relative mx-auto flex h-full w-full max-w-[min(100dvw,120rem)] flex-col overflow-hidden px-[max(clamp(0.6rem,2vw,2.5rem),env(safe-area-inset-left))] pr-[max(clamp(0.6rem,2vw,2.5rem),env(safe-area-inset-right))] pt-[max(clamp(0.4rem,1.2vh,1.5rem),env(safe-area-inset-top))] pb-[max(clamp(0.4rem,1.2vh,1.5rem),env(safe-area-inset-bottom))]">
      <header className="flex shrink-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Zap className="h-[clamp(1.1rem,2.4vmin,1.75rem)] w-[clamp(1.1rem,2.4vmin,1.75rem)] shrink-0 text-accent" fill="currentColor" />
          <h1 className="truncate text-[clamp(0.95rem,2vmin,1.35rem)] font-semibold tracking-tight">SpeedyCheck</h1>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <SpeedUnitToggle unit={unit} onChange={changeUnit} />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowHistory(true)}
            aria-label="Open test history"
            className="h-9 w-9 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <History className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(true)}
            aria-label="Open settings"
            className="h-9 w-9 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden text-center">
        <p className="shrink-0 text-[clamp(0.75rem,1.8vmin,1.125rem)] text-muted-foreground">{status}</p>

        <div className="mt-[clamp(0.35rem,1vh,0.9rem)] flex w-full max-w-3xl shrink-0 gap-1 sm:gap-2">
          {STAGES.map((stage, index) => {
            const isActive = testState.stage === stage.id
            const isDone = testState.stage === "complete" || (currentIndex > index && currentIndex !== -1)
            return (
              <div key={stage.id} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <div className={`h-1 w-full rounded-full transition-colors duration-500 ${isActive || isDone ? "bg-accent" : "bg-muted"}`} />
                <span className={`text-[clamp(0.55rem,1.3vmin,0.7rem)] uppercase tracking-[0.12em] ${isActive ? "text-accent" : "text-muted-foreground"}`}>
                  {stage.label}
                </span>
              </div>
            )
          })}
        </div>

        <div className="speed-gauge-well flex min-h-0 w-full flex-1 items-center justify-center">
          <SpeedGauge speed={heroSpeed} isRunning={live && testState.stage === "download"} />
        </div>

        <div className="flex shrink-0 items-end justify-center gap-2 sm:gap-3">
          <div className="speed-hero bg-linear-to-r from-accent via-cyan-300 to-accent bg-clip-text font-semibold text-transparent">
            {formatted.value}
          </div>
          {testState.stage === "complete" && (
            <button
              type="button"
              onClick={runSpeedTest}
              className="mb-[0.15em] flex h-[clamp(2rem,4.5vmin,2.75rem)] w-[clamp(2rem,4.5vmin,2.75rem)] items-center justify-center rounded-full bg-accent text-accent-foreground transition hover:scale-105 fade-rise"
              aria-label="Test again"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => changeUnit(unit === "bits" ? "bytes" : "bits")}
          className="shrink-0 text-[clamp(0.85rem,2vmin,1.25rem)] text-muted-foreground transition-colors hover:text-foreground"
        >
          {formatted.unit}
        </button>
        {testState.stage === "complete" && unit === "bytes" && (
          <p className="shrink-0 text-[11px] text-muted-foreground sm:text-sm">{Math.round(testState.downloadSpeed)} Mbps</p>
        )}

        <div className="mt-[clamp(0.2rem,0.8vh,0.6rem)] flex h-[clamp(1.75rem,6vh,3.25rem)] w-full max-w-2xl shrink-0 items-center">
          {isPing && <PingSparkline points={pingPoints} />}
          {testState.stage === "loss" && (
            <div className="mx-auto w-full max-w-xs">
              <div className="mb-1 flex justify-between text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <span>Packet loss</span>
                <span>
                  {lossProgress.lost} lost · {lossProgress.done}/{lossProgress.total}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-amber-400 transition-[width] duration-150"
                  style={{ width: `${Math.max((lossProgress.done / lossProgress.total) * 100, 4)}%` }}
                />
              </div>
            </div>
          )}
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
            <div className="flex h-full w-full items-center justify-center gap-1">
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

        <div className="mt-[clamp(0.2rem,0.8vh,0.6rem)] flex h-[clamp(2rem,6vh,3.5rem)] shrink-0 items-center justify-center">
          {testState.stage === "idle" && (
            <Button
              size="lg"
              onClick={runSpeedTest}
              className="h-10 rounded-full bg-accent px-7 text-sm font-semibold text-accent-foreground shadow-[0_0_32px_oklch(0.75_0.15_195/0.35)] transition hover:bg-accent/90 sm:h-12 sm:px-8 sm:text-base"
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
              <Button variant="outline" onClick={openShareCard} disabled={sharing} className="h-9 rounded-full px-3 sm:h-10 sm:px-4">
                <Share2 className="h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" onClick={copyResult} className="h-9 rounded-full px-3 sm:h-10 sm:px-4">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          )}
        </div>

        {quality && (
          <p className="speed-quality mt-[clamp(0.2rem,0.8vh,0.5rem)] max-w-lg shrink-0 truncate text-[clamp(0.7rem,1.6vmin,0.9rem)] text-muted-foreground fade-rise">
            <span className="font-medium text-accent">{quality.label}.</span> {quality.description}
          </p>
        )}
        {testState.stage === "complete" && (
          <div className="mt-[clamp(0.2rem,0.7vh,0.5rem)] w-full shrink-0 px-1">
            <PlanCompare
              downloadMbps={testState.downloadSpeed}
              planMbps={planMbps}
              unit={unit}
              onSetPlan={() => setShowSettings(true)}
            />
          </div>
        )}
      </div>

      <div className="grid shrink-0 grid-cols-5 gap-[clamp(0.25rem,0.8vw,0.75rem)]">
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
          unit="ms"
          detail={testState.loadedLatency ? `L ${testState.loadedLatency}` : undefined}
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
        <MetricCard
          icon={WifiOff}
          label="Loss"
          value={isAtLeast(testState.stage, "loss") ? String(testState.packetLoss) : "—"}
          unit="%"
          live={testState.stage === "loss"}
          dimmed={!isAtLeast(testState.stage, "loss")}
        />
      </div>

      {(network || location || colo) && (
        <div className="mt-[clamp(0.25rem,1vh,0.7rem)] flex shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[clamp(0.65rem,1.4vmin,0.8rem)] text-muted-foreground">
          {network && (
            <span className="inline-flex max-w-[40vw] items-center gap-1 truncate">
              <Globe className="h-3.5 w-3.5 shrink-0" />
              {network.isp}
            </span>
          )}
          {location && (
            <button type="button" onClick={() => setShowSettings(true)} className="max-w-[30vw] truncate underline-offset-2 hover:underline">
              {location}
            </button>
          )}
          {colo && <span>CF {colo}</span>}
          {testState.stage === "complete" && (dataUsed.down > 0 || dataUsed.up > 0) && (
            <span>
              {formatDataUsed(dataUsed.down)} ↓ · {formatDataUsed(dataUsed.up)} ↑
            </span>
          )}
        </div>
      )}

      {pwa.showFirstAsk && (
        <InstallPrompt canPrompt={pwa.canPrompt} iosHint={pwa.iosHint} onInstall={() => void pwa.install()} onDismiss={pwa.markAsked} />
      )}
      <ResultShareDialog
        open={showShare}
        onOpenChange={(open) => {
          setShowShare(open)
          if (!open) {
            setShareImageUrl((prev) => {
              if (prev) URL.revokeObjectURL(prev)
              return null
            })
          }
        }}
        imageUrl={shareImageUrl}
        sharing={sharing}
        onShare={() => void shareResult()}
        onSave={() => void saveResult()}
      />
      <TestHistory
        open={showHistory}
        onOpenChange={setShowHistory}
        history={testHistory}
        onClear={() => persistHistory([])}
        unit={unit}
        planMbps={planMbps}
      />
      <SettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        onClearHistory={() => persistHistory([])}
        location={userLocation}
        detected={network ? { city: network.city, country: network.country } : null}
        onLocationChange={changeLocation}
        planMbps={planMbps}
        onPlanChange={changePlan}
        canInstall={pwa.canPrompt}
        iosInstallHint={pwa.iosHint}
        installed={pwa.installed}
        onInstall={() => void pwa.install()}
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
    <Card className={`min-w-0 border-border/80 bg-card/50 p-[clamp(0.35rem,1vmin,0.85rem)] text-left transition-opacity duration-500 ${live ? "metric-live" : ""} ${dimmed ? "opacity-40" : "opacity-100"}`}>
      <div className="mb-0.5 flex items-center gap-1 text-muted-foreground sm:mb-1 sm:gap-1.5">
        <Icon className="h-3 w-3 shrink-0 text-accent sm:h-3.5 sm:w-3.5" />
        <h3 className="truncate text-[clamp(0.5rem,1.1vmin,0.7rem)] uppercase tracking-[0.08em]">{label}</h3>
      </div>
      <p className="truncate text-[clamp(0.8rem,2.2vmin,1.35rem)] font-semibold tabular-nums">{value}</p>
      <p className="truncate text-[clamp(0.55rem,1.2vmin,0.75rem)] text-muted-foreground">{unit}</p>
      {detail && <p className="mt-0.5 hidden truncate text-[10px] text-muted-foreground min-[800px]:block">{detail}</p>}
    </Card>
  )
}
