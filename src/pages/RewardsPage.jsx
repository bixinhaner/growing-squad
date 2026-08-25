import { useEffect, useMemo, useState } from 'react'
import { getRewardMoments, getStarBalance, localDateKey, uid } from '../domain/model.js'
import { OBJECT_ASSET_OPTIONS } from '../domain/assets.js'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { AssetArt } from '../ui/AssetArt.jsx'
import { Icon } from '../ui/Icons.jsx'
import { Modal, PageTitle, Toggle } from '../ui/Shared.jsx'

const QUICK_POINTS = [0, 2, 5, 10]

function createRewardDraft() {
  return { title: '', note: '', points: 10, assetId: 'heart', date: localDateKey(new Date(), 0) }
}

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric' })
}

export function RewardsPage() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const pending = state.rewardRequests.filter((request) => request.profileId === state.activeProfileId && request.status === 'pending')
  const approved = state.rewardRequests.filter((request) => request.profileId === state.activeProfileId && request.status === 'approved')
  const moments = getRewardMoments(state)
  const [selectedId, setSelectedId] = useState(pending[0]?.id || null)
  const [undoAction, setUndoAction] = useState(null)
  const [clock, setClock] = useState(0)
  const [editing, setEditing] = useState(false)
  const [draftWishes, setDraftWishes] = useState([])
  const [editorError, setEditorError] = useState('')
  const [recording, setRecording] = useState(false)
  const [rewardDraft, setRewardDraft] = useState(createRewardDraft)
  const [rewardError, setRewardError] = useState('')
  const selected = selectedId ? state.rewardRequests.find((request) => request.id === selectedId && request.status === 'pending') : null
  const wish = state.wishes.find((item) => item.id === selected?.wishId)
  const balance = getStarBalance(state)
  const remaining = wish ? balance - wish.cost : balance
  const undoRemaining = Math.max(0, Math.ceil(((undoAction?.until || 0) - clock) / 1000))

  useEffect(() => {
    if (!undoAction?.until) return undefined
    const interval = window.setInterval(() => setClock(Date.now()), 1000)
    const timeout = window.setTimeout(() => setUndoAction(null), Math.max(0, undoAction.until - Date.now()))
    return () => { window.clearInterval(interval); window.clearTimeout(timeout) }
  }, [undoAction])

  const selectedWishAsset = useMemo(() => wish?.assetId || wish?.emoji || 'gift', [wish])

  const approve = () => {
    if (!selected) return
    const timestamp = Date.now()
    dispatch({ type: 'APPROVE_REWARD', requestId: selected.id, timestamp })
    setClock(timestamp)
    setUndoAction({ kind: 'redeem', id: selected.id, until: timestamp + 30000 })
    setSelectedId(null)
  }

  const undo = () => {
    if (!undoAction) return
    dispatch(undoAction.kind === 'manual'
      ? { type: 'UNDO_REWARD_EVENT', momentId: undoAction.id }
      : { type: 'UNDO_REWARD', requestId: undoAction.id })
    setUndoAction(null)
  }

  const openEditor = () => {
    setDraftWishes(structuredClone(state.wishes))
    setEditorError('')
    setEditing(true)
  }
  const patchWish = (id, patch) => setDraftWishes((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item))
  const addWish = () => {
    if (draftWishes.length >= 12) { setEditorError('愿望单最多保留 12 项。'); return }
    setDraftWishes((items) => [...items, { id: uid('wish'), name: '新的家庭愿望', cost: 35, assetId: 'craft', enabled: true }])
    setEditorError('')
  }
  const removeWish = (id) => {
    if (draftWishes.filter((item) => item.enabled).length <= 3 && draftWishes.find((item) => item.id === id)?.enabled) {
      setEditorError('请至少保留 3 个可选愿望。')
      return
    }
    if (state.rewardRequests.some((request) => request.wishId === id)) {
      patchWish(id, { enabled: false })
      setEditorError('这个愿望已有记录，已从孩子端隐藏但保留历史。')
      return
    }
    setDraftWishes((items) => items.filter((item) => item.id !== id))
    setEditorError('')
  }
  const saveWishes = () => {
    const normalized = draftWishes.map((item) => ({ ...item, name: item.name.trim(), cost: Math.max(1, Math.min(999, Number(item.cost) || 1)), assetId: item.assetId || 'heart' }))
    if (normalized.some((item) => !item.name)) { setEditorError('每个愿望都需要一个名称。'); return }
    if (normalized.filter((item) => item.enabled).length < 3) { setEditorError('请至少保留 3 个可选愿望。'); return }
    dispatch({ type: 'UPDATE_WISHES', payload: normalized })
    setEditing(false)
  }

  const openRewardRecorder = () => {
    setRewardDraft(createRewardDraft())
    setRewardError('')
    setRecording(true)
  }
  const patchReward = (patch) => setRewardDraft((current) => ({ ...current, ...patch }))
  const recordReward = () => {
    const title = rewardDraft.title.trim()
    const points = Math.max(0, Math.floor(Number(rewardDraft.points) || 0))
    if (!title) { setRewardError('请写下这次奖励的原因。'); return }
    if (points > 9999) { setRewardError('单次星光请不要超过 9999 点。'); return }
    const timestamp = Date.now()
    const momentId = uid('moment')
    dispatch({
      type: 'ADD_REWARD_EVENT',
      timestamp,
      payload: {
        id: momentId,
        title,
        note: rewardDraft.note,
        points,
        assetId: rewardDraft.assetId,
        occurredAt: new Date(`${rewardDraft.date}T12:00:00`).getTime(),
      },
    })
    setClock(timestamp)
    setUndoAction({ kind: 'manual', id: momentId, until: timestamp + 30000 })
    setRecording(false)
  }

  return (
    <section className="rewards-page">
      <div className="rewards-heading">
        <PageTitle title="星光与奖励" subtitle="星光按提前分钟结算；奖励纪念卡会永久保留。" icon="star" />
        <div className="rewards-heading__actions">
          <button className="button button--primary" type="button" onClick={openRewardRecorder}><Icon name="gift" />记录奖励</button>
          <button className="button button--secondary" type="button" onClick={openEditor}>编辑家庭愿望单</button>
        </div>
      </div>

      <div className="reward-summary-strip">
        <div><span className="reward-summary-strip__star"><Icon name="star" /></span><small>可用星光</small><strong>{balance}</strong><em>点</em></div>
        <div><AssetArt id="heart" decorative /><small>永久奖励收藏</small><strong>{moments.length}</strong><em>份</em></div>
        <p>兑换只减少可用余额，不会移除孩子已经获得的奖励纪念。</p>
      </div>

      <div className="rewards-layout">
        <article className="request-list-card">
          <div className="card-heading"><h2>待处理的愿望申请</h2><span className="count-badge">{pending.length}</span></div>
          <div className="request-list">
            {pending.map((request) => {
              const item = state.wishes.find((entry) => entry.id === request.wishId)
              return (
                <button type="button" key={request.id} className={selected?.id === request.id ? 'is-selected' : ''} onClick={() => setSelectedId(request.id)}>
                  <AssetArt id={item?.assetId || item?.emoji} label={item?.name} /><div><strong>{item?.name}</strong><small>需要 {item?.cost} 点星光 · 等待确认</small></div><Icon name="chevron" />
                </button>
              )
            })}
            {!pending.length ? <div className="empty-state"><Icon name="check" size={42} /><strong>目前没有待处理申请</strong><p>孩子的新愿望会出现在这里。</p></div> : null}
          </div>
          {approved.length ? <div className="approved-list"><h3>最近确认</h3>{approved.slice(0, 3).map((request) => { const item = state.wishes.find((entry) => entry.id === request.wishId); return <div key={request.id}><AssetArt id={item?.assetId || item?.emoji} decorative /><strong>{item?.name}</strong><em>已确认</em></div> })}</div> : null}
        </article>
        <aside className="request-detail-card">
          {selected && wish ? (
            <>
              <AssetArt id={selectedWishAsset} label={wish.name} className="reward-detail-art" />
              <h2>{wish.name}</h2>
              <div className="reward-math"><span>现在有 <strong>{balance} 点</strong></span><span>本次使用 <strong>{wish.cost} 点</strong></span><i></i><span>确认后剩 <strong>{Math.max(0, remaining)} 点</strong></span></div>
              <button className="button button--primary button--wide" type="button" disabled={remaining < 0} onClick={approve}><Icon name="check" />确认兑换</button>
              <button className="button button--secondary button--wide" type="button" onClick={() => setSelectedId(null)}>稍后处理</button>
            </>
          ) : <div className="empty-detail"><AssetArt id="pillow" decorative /><h2>星光奖励提前完成任务</h2><p>等于或晚于计划完成时间不奖励，也不会扣除星光。</p><button className="text-button" type="button" onClick={openRewardRecorder}>记录一件其他奖励</button></div>}
        </aside>
      </div>

      <article className="reward-history-card">
        <div className="card-heading"><div><h2>奖励纪念</h2><p>孩子得到过的每一份奖励都会留在宝箱里。</p></div><span>{moments.length} 份</span></div>
        <div className="reward-history-list">
          {moments.slice(0, 8).map((moment) => <div key={moment.id}><AssetArt id={moment.assetId} label={moment.title} /><span><strong>{moment.title}</strong><small>{formatDate(moment.occurredAt)}{moment.note ? ` · ${moment.note}` : ''}</small></span><em>{moment.points > 0 ? `+${moment.points} 点` : '纪念卡'}</em></div>)}
          {!moments.length ? <div className="reward-history-empty">还没有奖励记录。点击“记录奖励”就能留下第一张纪念卡。</div> : null}
        </div>
      </article>

      {undoAction && undoRemaining > 0 ? <div className="undo-bar" role="status"><span><Icon name="check" />已保存，{undoRemaining} 秒内可撤销</span><button type="button" onClick={undo}>撤销</button></div> : null}

      {recording ? (
        <Modal title="记录奖励" onClose={() => setRecording(false)} className="reward-recorder-modal">
          <div className="reward-recorder-heading"><AssetArt id={rewardDraft.assetId} decorative /><div><h2>记录一份奖励</h2><p>会加入当前孩子的星光与永久奖励宝箱。</p></div></div>
          <label>奖励原因<input autoFocus value={rewardDraft.title} maxLength={24} placeholder="例如：今天主动整理了书包" onChange={(event) => patchReward({ title: event.target.value })} /></label>
          <label>奖励图片<div className="reward-asset-picker">{OBJECT_ASSET_OPTIONS.map((asset) => <button key={asset.id} type="button" className={rewardDraft.assetId === asset.id ? 'is-selected' : ''} aria-label={asset.label} title={asset.label} onClick={() => patchReward({ assetId: asset.id })}><AssetArt id={asset.id} decorative /></button>)}</div></label>
          <div className="reward-points-field"><span>星光数量</span><div className="quick-points">{QUICK_POINTS.map((points) => <button key={points} type="button" className={Number(rewardDraft.points) === points ? 'is-selected' : ''} onClick={() => patchReward({ points })}>{points === 0 ? '只留纪念' : `+${points}`}</button>)}</div><label>自定义<input aria-label="自定义星光数量" type="number" min="0" max="9999" value={rewardDraft.points} onChange={(event) => patchReward({ points: event.target.value })} /></label><small>0 点也可以生成纪念卡，不增加余额。</small></div>
          <div className="form-grid form-grid--two"><label>日期<input type="date" value={rewardDraft.date} onChange={(event) => patchReward({ date: event.target.value })} /></label><label>补充说明（可选）<input value={rewardDraft.note} maxLength={30} placeholder="给孩子的一句话" onChange={(event) => patchReward({ note: event.target.value })} /></label></div>
          {rewardError ? <div className="form-error" role="alert">{rewardError}</div> : null}
          <button className="button button--primary button--wide" type="button" onClick={recordReward}><Icon name="gift" />保存到奖励宝箱</button>
        </Modal>
      ) : null}

      {editing ? (
        <Modal title="编辑家庭愿望单" onClose={() => setEditing(false)} className="wish-editor-modal">
          <h2>家庭愿望单</h2><p>保留 3–12 个真实可兑现的家庭活动；孩子端会自动分页，不需要上下滑动。</p>
          <div className="wish-editor-list">{draftWishes.map((item, index) => <div className="wish-editor-row" key={item.id}><label>图片<div className="wish-asset-field"><AssetArt id={item.assetId || item.emoji} decorative /><select aria-label={`愿望 ${index + 1} 图片`} value={item.assetId || 'heart'} onChange={(event) => patchWish(item.id, { assetId: event.target.value })}>{OBJECT_ASSET_OPTIONS.map((asset) => <option key={asset.id} value={asset.id}>{asset.label}</option>)}</select></div></label><label>愿望名称<input aria-label={`愿望 ${index + 1} 名称`} value={item.name} maxLength={16} onChange={(event) => patchWish(item.id, { name: event.target.value })} /></label><label>星光<input aria-label={`愿望 ${index + 1} 星光`} type="number" min="1" max="999" value={item.cost} onChange={(event) => patchWish(item.id, { cost: event.target.value })} /></label><Toggle label={`显示愿望 ${item.name}`} checked={item.enabled} onChange={(value) => patchWish(item.id, { enabled: value })} /><button className="icon-button wish-remove" type="button" aria-label={`移除${item.name}`} onClick={() => removeWish(item.id)}><Icon name="trash" /></button></div>)}</div>
          {editorError ? <div className={editorError.startsWith('这个愿望') ? 'form-success' : 'form-error'} role="status">{editorError}</div> : null}
          <button className="button button--dashed button--wide" type="button" onClick={addWish}>＋ 添加愿望</button><button className="button button--primary button--wide" type="button" onClick={saveWishes}>保存愿望单</button>
        </Modal>
      ) : null}
    </section>
  )
}
