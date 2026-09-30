import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../v4/ui/Icon.jsx'

function useDialogFocus(onClose) {
  const dialogRef = useRef(null)
  // Capture before a descendant autoFocus runs during the DOM commit.
  const [previousFocus] = useState(() => typeof document === 'undefined' ? null : document.activeElement)
  const closeHandlerRef = useRef(onClose)

  useEffect(() => {
    closeHandlerRef.current = onClose
  }, [onClose])

  useEffect(() => {
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
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [previousFocus])

  return dialogRef
}

export function Modal({ title, children, onClose, className = '' }) {
  const dialogRef = useDialogFocus(onClose)
  return createPortal(
    <div className="u-scrim" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <section ref={dialogRef} className={`u-sheet u-modal ${className}`} role="dialog" aria-modal="true" aria-label={title}>
        <button type="button" className="modal__close u-tap u-tap--soft u-tap--round" onClick={onClose} aria-label="关闭">
          <Icon name="close" size={20} />
        </button>
        {children}
      </section>
    </div>,
    document.body,
  )
}
