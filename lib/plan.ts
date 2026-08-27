const PLAN_KEY = "speedycheck-plan-mbps"

export const PLAN_PRESETS = [50, 100, 200, 300, 500, 1000] as const

export const getStoredPlanMbps = () => {
  if (typeof window === "undefined") return 0
  const raw = Number(localStorage.getItem(PLAN_KEY))
  return Number.isFinite(raw) && raw > 0 ? raw : 0
}

export const storePlanMbps = (mbps: number) => {
  if (!Number.isFinite(mbps) || mbps <= 0) {
    localStorage.removeItem(PLAN_KEY)
    return
  }
  localStorage.setItem(PLAN_KEY, String(Math.round(mbps)))
}

export type PlanCompare = {
  percent: number
  barPercent: number
  label: "Above plan" | "On plan" | "Close" | "Below plan"
  description: string
}

export const compareToPlan = (measuredMbps: number, planMbps: number): PlanCompare | null => {
  if (!planMbps || planMbps <= 0 || !Number.isFinite(measuredMbps) || measuredMbps < 0) return null
  const percent = Math.round((measuredMbps / planMbps) * 100)
  const barPercent = Math.min(percent, 100)

  if (percent >= 100) {
    return {
      percent,
      barPercent,
      label: "Above plan",
      description: `You're getting ${percent}% of the ${planMbps} Mbps you pay for.`,
    }
  }
  if (percent >= 85) {
    return {
      percent,
      barPercent,
      label: "On plan",
      description: `${percent}% of your ${planMbps} Mbps plan — a healthy result for advertised "up to" speeds.`,
    }
  }
  if (percent >= 60) {
    return {
      percent,
      barPercent,
      label: "Close",
      description: `${percent}% of your ${planMbps} Mbps plan. Some slowdown is common at peak hours.`,
    }
  }
  return {
    percent,
    barPercent,
    label: "Below plan",
    description: `Only ${percent}% of your ${planMbps} Mbps plan. Worth retesting or checking with your ISP.`,
  }
}
