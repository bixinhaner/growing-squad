import { useCallback, useEffect, useState } from 'react'
import { getAccessibility, getSchedule, getSession, dayTypeFor, isRoutineOpen, localDateKey } from '../../domain/model.js'
import { useBedtimeState } from '../../store/useBedtime.js'
import { speak } from './speech.js'

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
  const [system] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches))
  return Boolean(preferred || system)
}

/** Speak a line unless the family turned sound off. */
export function useSpeaker() {
  const { state } = useBedtimeState()
  const muted = getAccessibility(state).soundOff
  return useCallback((text) => speak(text, { muted }), [muted])
}

/**
 * The child side re-tints with the day. Bedtime wins over the clock: once the
 * evening routine opens (or tonight is already settled) the world goes to night.
 */
export function daypartFor(state, now = Date.now()) {
  const date = new Date(now)
  const dateKey = localDateKey(date)
  const schedule = getSchedule(state, dayTypeFor(date), dateKey)
  const session = getSession(state, dateKey)
  if (session?.status === 'goodnight' || isRoutineOpen(schedule, date)) return 'night'
  const minutes = date.getHours() * 60 + date.getMinutes()
  if (minutes < 300) return 'night'
  if (minutes < 660) return 'morning'
  if (minutes < 1020) return 'afternoon'
  if (minutes < 1170) return 'evening'
  return 'night'
}

export function useDaypart() {
  const { state } = useBedtimeState()
  const now = useNow(60000)
  return daypartFor(state, now)
}

export const clockLabel = (at) => new Date(at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
export const dayLabel = (at) => new Date(at).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
