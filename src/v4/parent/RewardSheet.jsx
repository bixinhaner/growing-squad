import { useState } from 'react'
import { localDateKey, uid } from '../../domain/model.js'
import { useBedtimeActions } from '../../store/useBedtime.js'
import { AssetArt } from '../../ui/AssetArt.jsx'
import { Field, Sheet, Tap } from '../ui/kit.jsx'
import { useToast } from '../ui/toast.js'
import { AssetPicker, Segment } from './pkit.jsx'

const POINTS = [[0, '只留纪念'], [2, '+2'], [5, '+5'], [10, '+10']]

/** Record a reward that did not come from bedtime: a keepsake card, with or without stars. */
export function RewardSheet({ childName, onClose }) {
  const { dispatch } = useBedtimeActions()
  const toast = useToast()
  const [draft, setDraft] = useState({ title: '', note: '', points: 5, assetId: 'heart', date: localDateKey() })
  const [error, setError] = useState('')
  const patch = (value) => { setDraft((current) => ({ ...current, ...value })); setError('') }
  const save = (event) => {
    event.preventDefault()
    const title = draft.title.trim()
    const points = Math.max(0, Math.floor(Number(draft.points) || 0))
    if (!title) { setError('写一句为什么奖励。'); return }
    if (points > 9999) { setError('一次不要超过 9999 点。'); return }
    const momentId = uid('moment')
    dispatch({ type: 'ADD_REWARD_EVENT', timestamp: Date.now(), payload: { id: momentId, title, note: draft.note.trim(), points, assetId: draft.assetId, occurredAt: new Date(`${draft.date}T12:00:00`).getTime() } })
    toast(points ? `已给${childName}加 ${points} 点星光` : '纪念卡已放进宝盒', { duration: 30000, action: { label: '撤销', onClick: () => dispatch({ type: 'UNDO_REWARD_EVENT', momentId }) } })
    onClose()
  }
  return (
    <Sheet title={`给${childName}记一份奖励`} onClose={onClose}>
      <form className="p-form" onSubmit={save}>
        <div className="p-reward-preview"><AssetArt id={draft.assetId} decorative /><span><strong>{draft.title.trim() || '奖励的原因'}</strong><small>{draft.points > 0 ? `+${draft.points} 点星光` : '纪念卡'} · 会放进孩子的宝盒</small></span></div>
        <Field label="为什么奖励"><input className="u-input" autoFocus value={draft.title} maxLength={24} placeholder="例如：主动整理了书包" onChange={(event) => patch({ title: event.target.value })} /></Field>
        <div className="u-field"><span>星光</span>
          <div className="p-inline">
            <Segment label="星光数量" value={Number(draft.points)} onChange={(points) => patch({ points })} options={POINTS} />
            <input className="u-input p-num-input" aria-label="自定义星光数量" type="number" min="0" max="9999" value={draft.points} onChange={(event) => patch({ points: event.target.value })} />
          </div>
          <small>0 点也会生成纪念卡，但不增加余额。</small>
        </div>
        <div className="u-field"><span>图片</span><AssetPicker value={draft.assetId} onChange={(assetId) => patch({ assetId })} /></div>
        <div className="p-grid-2">
          <Field label="日期"><input className="u-input" type="date" value={draft.date} onChange={(event) => patch({ date: event.target.value })} /></Field>
          <Field label="给孩子的一句话（可不填）"><input className="u-input" value={draft.note} maxLength={30} onChange={(event) => patch({ note: event.target.value })} /></Field>
        </div>
        {error ? <p className="p-error" role="alert">{error}</p> : null}
        <Tap tone="primary" size="l" block type="submit" icon="gift">放进宝盒</Tap>
      </form>
    </Sheet>
  )
}
