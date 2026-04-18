'use client'

import { useState, useEffect, useRef } from 'react'

export function useCountUp(
  end: number,
  duration: number = 2000,
  start: number = 0,
  enabled: boolean = true
) {
  const [value, setValue] = useState(start)
  const rafRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    if (!enabled) {
      setValue(start)
      return
    }

    startTimeRef.current = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      // easeOutExpo for natural deceleration
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      setValue(Math.round(start + (end - start) * eased))

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [end, duration, start, enabled])

  return value
}
