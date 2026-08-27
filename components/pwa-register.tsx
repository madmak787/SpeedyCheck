"use client"

import { useEffect } from "react"
import { withBasePath } from "@/lib/site"

export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    const register = () => {
      navigator.serviceWorker
        .register(withBasePath("/sw.js"), { scope: withBasePath("/") })
        .catch(() => {})
    }
    if (document.readyState === "complete") register()
    else window.addEventListener("load", register, { once: true })
  }, [])

  return null
}
