"use client"

import { useEffect, useRef, useState } from "react"

export function useAnimatedNumber(target: number, enabled = true) {
  const [value, setValue] = useState(target)
  const currentRef = useRef(target)
  const targetRef = useRef(target)
  targetRef.current = target

  useEffect(() => {
    if (!enabled) {
      currentRef.current = target
      setValue(target)
      return
    }

    let frame = 0
    const tick = () => {
      const current = currentRef.current
      const nextTarget = targetRef.current
      const delta = nextTarget - current
      if (Math.abs(delta) < 0.08) {
        currentRef.current = nextTarget
        setValue(nextTarget)
        return
      }
      currentRef.current = current + delta * 0.16
      setValue(currentRef.current)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, enabled])

  return value
}
