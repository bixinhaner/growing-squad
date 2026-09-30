import { useEffect, useState } from 'react'
import { getAccessibility } from '../domain/model.js'
import { useBedtimeState } from '../store/useBedtime.js'

export function useNow(interval = 15000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const update = () => setNow(Date.now())
    const timer = window.setInterval(update, interval)
    window.addEventListener('pageshow', update)
    document.addEventListener('visibilitychange', update)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('pageshow', update)
      document.removeEventListener('visibilitychange', update)
    }
  }, [interval])
  return now
}

export function useReducedMotion() {
  const { state } = useBedtimeState()
  const preferred = getAccessibility(state).reduceMotion
  const [system] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  return Boolean(preferred || system)
}
