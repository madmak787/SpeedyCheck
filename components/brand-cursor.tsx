"use client"

import { useEffect, useRef } from "react"

const HOVER_TARGET = "a, button, [role='button'], [role='radio'], [role='tab'], input, textarea, select, label, summary"

export default function BrandCursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)")
    if (!fine.matches) return

    const root = document.documentElement
    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    root.classList.add("has-brand-cursor")

    let x = window.innerWidth / 2
    let y = window.innerHeight / 2
    let rx = x
    let ry = y
    let hovering = false
    let pressing = false
    let frame = 0
    let armed = false
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const follow = reduced ? 1 : 0.28

    const render = () => {
      if (!armed) {
        frame = window.requestAnimationFrame(render)
        return
      }
      rx += (x - rx) * follow
      ry += (y - ry) * follow
      dot.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%) scale(${pressing ? 0.78 : hovering ? 1.45 : 1})`
      frame = window.requestAnimationFrame(render)
    }

    const onMove = (event: PointerEvent) => {
      x = event.clientX
      y = event.clientY
      hovering = Boolean((event.target as Element | null)?.closest?.(HOVER_TARGET))
      if (!armed) {
        armed = true
        rx = x
        ry = y
        root.classList.add("brand-cursor-on")
      }
    }
    const onDown = () => {
      pressing = true
    }
    const onUp = () => {
      pressing = false
    }

    window.addEventListener("pointermove", onMove, { passive: true })
    window.addEventListener("pointerdown", onDown)
    window.addEventListener("pointerup", onUp)
    frame = window.requestAnimationFrame(render)

    return () => {
      root.classList.remove("has-brand-cursor", "brand-cursor-on")
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerdown", onDown)
      window.removeEventListener("pointerup", onUp)
      window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <>
      <div ref={ringRef} className="brand-cursor-ring" aria-hidden="true" />
      <div ref={dotRef} className="brand-cursor-dot" aria-hidden="true" />
    </>
  )
}
