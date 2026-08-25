import { useEffect } from 'react'
import { getAccessibility } from '../domain/model.js'
import { useBedtimeState } from '../store/useBedtime.js'
import { primeAudio, scheduleTapSound } from './soundscape.js'

export function SoundEffectsBridge() {
  const { state } = useBedtimeState()
  const muted = getAccessibility(state).soundOff

  useEffect(() => {
    const handlePointer = () => primeAudio()
    const handleClick = (event) => {
      const target = event.target instanceof Element ? event.target.closest('button, a, [role="button"]') : null
      if (!target || target.matches(':disabled') || target.dataset.sound === 'none') return
      scheduleTapSound({ muted, navigation: target.matches('a') })
    }
    document.addEventListener('pointerdown', handlePointer, { capture: true, passive: true })
    document.addEventListener('click', handleClick, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointer, true)
      document.removeEventListener('click', handleClick, true)
    }
  }, [muted])

  return null
}
