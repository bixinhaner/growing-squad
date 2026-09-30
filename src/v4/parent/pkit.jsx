import { NavLink } from 'react-router-dom'
import { useBedtimeActions, useBedtimeState } from '../../store/useBedtime.js'
import { OBJECT_ASSET_OPTIONS } from '../../domain/assets.js'
import { AssetArt } from '../../ui/AssetArt.jsx'
import { Icon } from '../ui/Icon.jsx'

const cx = (...parts) => parts.filter(Boolean).join(' ')

/** Page heading: small eyebrow, an editorial title, one calm sentence, actions on the right. */
export function PageHead({ eyebrow, title, lead, children }) {
  return (
    <header className="p-head">
      <div>
        {eyebrow ? <span className="p-eyebrow">{eyebrow}</span> : null}
        <h1 className="u-display">{title}</h1>
        {lead ? <p className="p-lead">{lead}</p> : null}
      </div>
      {children ? <div className="p-head__do">{children}</div> : null}
    </header>
  )
}

export function Panel({ title, aside, children, className, tone, id }) {
  return (
    <section className={cx('p-panel', tone && `p-panel--${tone}`, className)} aria-labelledby={title && id ? id : undefined}>
      {title || aside ? <header className="p-panel__head">{title ? <h2 id={id}>{title}</h2> : <span />}{aside}</header> : null}
      {children}
    </section>
  )
}

export function Stat({ label, value, unit, note, tone }) {
  return (
    <div className={cx('p-stat', tone && `p-stat--${tone}`)}>
      <span>{label}</span>
      <strong className="u-num">{value}{unit ? <small> {unit}</small> : null}</strong>
      {note ? <p>{note}</p> : null}
    </div>
  )
}

export function Empty({ icon = 'leaf', title, children }) {
  return (
    <div className="p-empty">
      <span className="p-empty__icon"><Icon name={icon} size={26} /></span>
      <strong>{title}</strong>
      {children ? <p>{children}</p> : null}
    </div>
  )
}

export function Notice({ icon = 'info', tone, children }) {
  return <p className={cx('p-notice', tone && `p-notice--${tone}`)}><Icon name={icon} size={18} /><span>{children}</span></p>
}

/** Pill tabs for the pages inside one section. */
export function SubNav({ items, label }) {
  return (
    <nav className="p-subnav" aria-label={label}>
      {items.map((item) => <NavLink key={item.to} to={item.to} end className={({ isActive }) => (isActive ? 'is-on' : undefined)}>{item.label}{item.badge ? <b className="u-num">{item.badge}</b> : null}</NavLink>)}
    </nav>
  )
}

/** Segmented choice for settings. Options: [[value, label], …] */
export function Segment({ label, value, options, onChange, className }) {
  return (
    <div className={cx('p-seg', className)} role="radiogroup" aria-label={label}>
      {options.map(([id, text]) => <button type="button" role="radio" key={String(id)} aria-checked={value === id} onClick={() => onChange(id)}>{text}</button>)}
    </div>
  )
}

export function SettingRow({ icon, title, copy, children }) {
  return (
    <div className="p-setting">
      {icon ? <span className="p-setting__icon"><Icon name={icon} size={20} /></span> : null}
      <span className="p-setting__text"><strong>{title}</strong>{copy ? <small>{copy}</small> : null}</span>
      <span className="p-setting__do">{children}</span>
    </div>
  )
}

export function SaveStatus() {
  const { saveStatus, saveMessage, cloud } = useBedtimeState()
  const { retrySave } = useBedtimeActions()
  if (saveStatus === 'saved') return <span className="p-save is-ok"><Icon name="check" size={15} strokeWidth={3} />{cloud.mode === 'connected' ? '已同步' : '已保存'}</span>
  if (saveStatus === 'saving') return <span className="p-save" aria-live="polite"><i className="p-spin" />保存中</span>
  return <button type="button" className="p-save is-error" onClick={retrySave} title={saveMessage || ''}><Icon name="sync" size={15} />没保存上，重试</button>
}

/** Grid of the shared object illustrations, for steps, wishes and rewards. */
export function AssetPicker({ value, onChange, label = '选一张图' }) {
  return (
    <div className="p-assets" role="radiogroup" aria-label={label}>
      {OBJECT_ASSET_OPTIONS.map((asset) => (
        <button type="button" role="radio" key={asset.id} aria-checked={value === asset.id} aria-label={asset.label} title={asset.label} onClick={() => onChange(asset.id)}>
          <AssetArt id={asset.id} decorative />
        </button>
      ))}
    </div>
  )
}
