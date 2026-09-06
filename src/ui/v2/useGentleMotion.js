import { useEffect, useRef, useState } from 'react'
import { getAccessibility } from '../../domain/model.js'
import { useBedtimeState } from '../../store/useBedtime.js'

/** Finite, non-blocking motion. Nothing is hidden while the lazy module loads. */
export function useGentleMotion(identity) {
  const ref = useRef(null)
  const { state } = useBedtimeState()
  const preference = getAccessibility(state).reduceMotion
  const [systemReduced, setSystemReduced] = useState(() => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setSystemReduced(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    const element = ref.current
    if (!element || preference || systemReduced || !element.animate) return undefined
    let cancelled = false
    let animation
    import('../../vendor/motion-mini/index.js').then(({ animate }) => {
      if (cancelled || !element.isConnected) return
      animation = animate(element, { opacity: [0.88, 1], transform: ['translateY(6px)', 'translateY(0px)'] }, { duration: 0.2, ease: 'easeOut' })
    }).catch(() => { /* Motion is enhancement only; actions remain available offline. */ })
    return () => {
      cancelled = true
      animation?.stop()
      element.style.removeProperty('transform')
      element.style.removeProperty('opacity')
    }
  }, [identity, preference, systemReduced])
  return ref
}
