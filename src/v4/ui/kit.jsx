import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CharacterPose } from '../../ui/ThemeArt.jsx'
import { appPath } from '../../data/paths.js'
import { Icon } from './Icon.jsx'
import { useSpeaker } from '../lib/hooks.js'
import { ToastContext } from './toast.js'


const cx = (...parts) => parts.filter(Boolean).join(' ')

/** The chunky picture-book button. `tone`: primary | mint | night | soft | ghost | quiet | danger. */
export function Tap({ tone = 'soft', size, block, round, icon, iconSize, className, children, type = 'button', ...props }) {
  return (
    <button type={type} className={cx('u-tap', `u-tap--${tone}`, size && `u-tap--${size}`, block && 'u-tap--block', round && 'u-tap--round', className)} {...props}>
      {icon ? <Icon name={icon} size={iconSize || (size === 'xl' ? 30 : size === 'l' ? 24 : 20)} /> : null}
      {children}
    </button>
  )
}

export function Speak({ text, label, className }) {
  const say = useSpeaker()
  return (
    <button type="button" className={cx('u-speak', className)} onClick={(event) => { event.stopPropagation(); say(text) }} aria-label={label || `听一听：${text}`}>
      <Icon name="volume" size={22} />
    </button>
  )
}

const POSES = { hello: 'wave', calm: 'waiting', cheer: 'celebrate', sleepy: 'sleep', water: 'watering', garden: 'garden' }
export function Buddy({ character = 'bear', mood = 'hello', label, className, bounce }) {
  const pose = POSES[mood] || 'wave'
  return (
    <span className={cx('u-buddy', mood === 'cheer' && 'is-cheer', className)}>
      <CharacterPose key={`${pose}:${bounce ?? ''}`} character={character} pose={pose} label={label} decorative={!label} />
    </span>
  )
}

export function Pic({ src, alt = '', className, fallback, ...props }) {
  return <img className={className} src={appPath(src)} alt={alt} draggable="false" onError={fallback ? (event) => { if (!event.currentTarget.dataset.fell) { event.currentTarget.dataset.fell = '1'; event.currentTarget.src = appPath(fallback) } } : undefined} {...props} />
}

export function Switch({ checked, onChange, label, disabled }) {
  return <button type="button" role="switch" className="u-switch" aria-checked={Boolean(checked)} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} />
}

export function Field({ label, hint, children, className }) {
  return <label className={cx('u-field', className)}><span>{label}</span>{children}{hint ? <small>{hint}</small> : null}</label>
}

/* ───────────── Sheet: bottom sheet on phones, centred card on tablets ───────────── */
const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'

export function Sheet({ title, children, onClose, className, hideTitle = false, dismissible = true }) {
  const ref = useRef(null)
  const titleId = useId()
  const closeRef = useRef(onClose)
  const [returnTo] = useState(() => (typeof document === 'undefined' ? null : document.activeElement))
  useEffect(() => { closeRef.current = onClose }, [onClose])
  useEffect(() => {
    const dialog = ref.current
    ;(dialog?.querySelector('[autofocus]') || dialog?.querySelector(FOCUSABLE))?.focus()
    const onKey = (event) => {
      if (event.key === 'Escape' && dismissible) { closeRef.current?.(); return }
      if (event.key !== 'Tab' || !dialog) return
      const items = [...dialog.querySelectorAll(FOCUSABLE)]
      if (!items.length) return
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1).focus() }
      else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus() }
    }
    window.addEventListener('keydown', onKey)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      if (returnTo instanceof HTMLElement && returnTo.isConnected) returnTo.focus({ preventScroll: true })
    }
  }, [dismissible, returnTo])
  return createPortal(
    <div className="u-scrim" onMouseDown={(event) => { if (dismissible && event.target === event.currentTarget) onClose?.() }}>
      <section ref={ref} className={cx('u-sheet', className)} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <span className="u-sheet__grip" aria-hidden="true" />
        <header className={cx('u-sheet__head', hideTitle && 'u-sr')}>
          <h2 id={titleId} className="u-display">{title}</h2>
          {dismissible ? <Tap tone="soft" round className="u-sheet__close" style={{ '--size': '44px' }} icon="close" aria-label="关闭" onClick={onClose} /> : null}
        </header>
        {children}
      </section>
    </div>,
    document.body,
  )
}

/* ───────────── Toasts with an optional action (used for undo) ───────────── */
export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const timers = useRef(new Map())
  const dismiss = useCallback((id) => {
    setItems((list) => list.filter((item) => item.id !== id))
    window.clearTimeout(timers.current.get(id))
    timers.current.delete(id)
  }, [])
  const show = useCallback((text, { action, duration = 4200, key } = {}) => {
    const id = key || `${Date.now()}:${Math.random()}`
    setItems((list) => [...list.filter((item) => item.id !== id).slice(-1), { id, text, action }])
    window.clearTimeout(timers.current.get(id))
    timers.current.set(id, window.setTimeout(() => dismiss(id), duration))
    return id
  }, [dismiss])
  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), [])
  return (
    <ToastContext.Provider value={show}>
      {children}
      {createPortal(
        <div className="u-toasts" role="status" aria-live="polite">
          {items.map((item) => (
            <div className="u-toast" key={item.id}>
              <span>{item.text}</span>
              {item.action ? <button type="button" onClick={() => { item.action.onClick(); dismiss(item.id) }}>{item.action.label}</button> : null}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

/* ───────────── Hold to open: keeps small hands out of the parent area ─────────────
 * Pointer: hold 1.2s. Keyboard users (Enter/Space) are adults or assistive tech,
 * so they get straight through. */
export function HoldButton({ onDone, label, hint = '按住不放', duration = 1200, children, className }) {
  const [progress, setProgress] = useState(0)
  const [tip, setTip] = useState(false)
  const frame = useRef(0)
  const started = useRef(0)
  const stop = useCallback(() => { window.cancelAnimationFrame(frame.current); started.current = 0; setProgress(0) }, [])
  useEffect(() => () => window.cancelAnimationFrame(frame.current), [])
  useEffect(() => { if (!tip) return undefined; const timer = window.setTimeout(() => setTip(false), 1800); return () => window.clearTimeout(timer) }, [tip])
  const tick = (time) => {
    const value = Math.min(1, (time - started.current) / duration)
    setProgress(value)
    if (value >= 1) { stop(); onDone(); return }
    frame.current = window.requestAnimationFrame(tick)
  }
  return (
    <button
      type="button"
      className={cx('u-hold', className)}
      style={{ '--p': progress }}
      aria-label={label}
      onPointerDown={(event) => { event.currentTarget.setPointerCapture?.(event.pointerId); started.current = event.timeStamp; frame.current = window.requestAnimationFrame(tick) }}
      onPointerUp={() => { if (started.current && progress < 1) setTip(true); stop() }}
      onPointerCancel={stop}
      onPointerLeave={() => { if (started.current) stop() }}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onDone() } }}
    >
      {children}
      {tip ? <span className="u-hold__tip" role="status">{hint}</span> : null}
    </button>
  )
}

/** Small helper for "pick one" groups rendered as chips. */
export function ChipGroup({ label, value, options, onChange, className }) {
  const items = useMemo(() => options.map((option) => (Array.isArray(option) ? { value: option[0], label: option[1] } : option)), [options])
  return (
    <div className={cx('u-chips', className)} role="group" aria-label={label}>
      {items.map((item) => <button type="button" key={item.value} className="u-chip" aria-pressed={value === item.value} onClick={() => onChange(item.value)}>{item.label}</button>)}
    </div>
  )
}
