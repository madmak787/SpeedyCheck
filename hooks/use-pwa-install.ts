"use client"

import { useCallback, useEffect, useState } from "react"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export const PWA_ASKED_KEY = "speedycheck-pwa-asked"

const isStandalone = () => {
  if (typeof window === "undefined") return false
  return window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
}

const isIosSafari = () => {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  const webkit = /WebKit/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)
  return ios && webkit
}

const readAsked = () => {
  try {
    return localStorage.getItem(PWA_ASKED_KEY) === "1"
  } catch {
    return true
  }
}

const writeAsked = () => {
  try {
    localStorage.setItem(PWA_ASKED_KEY, "1")
  } catch {
    /* ignore quota / private mode */
  }
}

export function usePwaInstall() {
  const [installed, setInstalled] = useState(false)
  const [iosHint, setIosHint] = useState(false)
  const [asked, setAsked] = useState(true)
  const [showFirstAsk, setShowFirstAsk] = useState(false)
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)

  const markAsked = useCallback(() => {
    writeAsked()
    setAsked(true)
    setShowFirstAsk(false)
  }, [])

  useEffect(() => {
    const standalone = isStandalone()
    setInstalled(standalone)
    setIosHint(isIosSafari() && !standalone)

    if (standalone) {
      writeAsked()
      setAsked(true)
      return
    }

    const alreadyAsked = readAsked()
    setAsked(alreadyAsked)

    const onPrompt = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      writeAsked()
      setInstalled(true)
      setAsked(true)
      setShowFirstAsk(false)
      setPromptEvent(null)
      setIosHint(false)
    }

    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("appinstalled", onInstalled)

    const timer = window.setTimeout(() => {
      if (!alreadyAsked && !isStandalone()) setShowFirstAsk(true)
    }, 1800)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    if (!promptEvent) {
      markAsked()
      return false
    }
    await promptEvent.prompt()
    const choice = await promptEvent.userChoice
    setPromptEvent(null)
    markAsked()
    return choice.outcome === "accepted"
  }, [promptEvent, markAsked])

  return {
    installed,
    canPrompt: Boolean(promptEvent) && !installed,
    iosHint,
    asked,
    showFirstAsk: showFirstAsk && !installed && !asked,
    markAsked,
    install,
  }
}
