import { useEffect, useRef } from 'react'
import { getStarBalance } from '../domain/model.js'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { Icon } from './Icons.jsx'

function useDialogFocus(onClose) {
  const dialogRef = useRef(null)
  const closeHandlerRef = useRef(onClose)

  useEffect(() => {
    closeHandlerRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previousFocus = document.activeElement
    const dialog = dialogRef.current
    const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    dialog?.querySelector(focusableSelector)?.focus()
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        closeHandlerRef.current?.()
        return
      }
      if (event.key !== 'Tab' || !dialog) return
      const focusable = [...dialog.querySelectorAll(focusableSelector)].filter((element) => !element.hidden)
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('keydown', handleKey)
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
    }
  }, [])

  return dialogRef
}

export function Brand({ compact = false }) {
  return (
    <div className={`brand ${compact ? 'brand--compact' : ''}`} aria-label="成长小队">
      <span className="brand__moon" aria-hidden="true"></span>
      <span>成长小队</span>
    </div>
  )
}

export function StarBalance({ onClick }) {
  const { state } = useBedtimeState()
  const balance = getStarBalance(state)
  return onClick ? (
    <button className="star-balance" type="button" onClick={onClick} aria-label={`打开奖励宝箱，现在有 ${balance} 点星光`}>
      <Icon name="star" size={18} /><strong>{balance}</strong><small>星光</small>
    </button>
  ) : <span className="star-balance"><Icon name="star" size={18} /><strong>{balance}</strong><small>星光</small></span>
}

export function SaveIndicator() {
  const { saveStatus, saveMessage, cloud } = useBedtimeState()
  const { retrySave } = useBedtimeActions()
  if (saveStatus === 'saved') return <span className="save-indicator save-indicator--ok"><Icon name="check" size={15} /> {cloud.mode === 'connected' ? '家庭云端已同步' : '本地保存正常'}</span>
  if (saveStatus === 'saving') return <span className="save-indicator" aria-live="polite"><span className="spinner" /> 正在同步…</span>
  return (
    <button type="button" className="save-indicator save-indicator--retry" onClick={retrySave} title={saveMessage || ''}>
      <span className="spinner" /> 保存未完成，重试
    </button>
  )
}

export function Modal({ title, children, onClose, className = '' }) {
  const dialogRef = useDialogFocus(onClose)
  return (
    <div className="overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <section ref={dialogRef} className={`modal ${className}`} role="dialog" aria-modal="true" aria-label={title}>
        <button type="button" className="icon-button modal__close" onClick={onClose} aria-label="关闭">
          <Icon name="close" />
        </button>
        {children}
      </section>
    </div>
  )
}

export function Drawer({ title, children, onClose }) {
  const dialogRef = useDialogFocus(onClose)
  return (
    <div className="overlay overlay--soft" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <aside ref={dialogRef} className="drawer" role="dialog" aria-modal="true" aria-label={title}>
        <button type="button" className="icon-button drawer__close" onClick={onClose} aria-label="关闭"><Icon name="close" /></button>
        {children}
      </aside>
    </div>
  )
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      className={`toggle ${checked ? 'toggle--on' : ''}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span></span>
    </button>
  )
}

export function Segmented({ value, options, onChange, label }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" className={value === option.value ? 'is-active' : ''} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function PageTitle({ eyebrow, title, subtitle, icon = 'moon' }) {
  return (
    <header className="page-title">
      {eyebrow ? <span className="page-title__eyebrow">{eyebrow}</span> : null}
      <h1><Icon name={icon} size={28} />{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
    </header>
  )
}
