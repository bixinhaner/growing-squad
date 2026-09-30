import { useEffect, useRef, useState } from 'react'
import { getActiveProfile, getStarBalance } from '../../domain/model.js'
import { useBedtimeActions, useBedtimeState } from '../../store/useBedtime.js'
import { AssetArt } from '../../ui/AssetArt.jsx'
import { Icon } from '../../ui/Icons.jsx'
import { Companion } from '../components/Companion.jsx'

function WishSheet({ wish, balance, onClose, onRequest }) {
  const closeRef = useRef(null)
  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const enough = balance >= wish.cost
  return (
    <div className="v3-sheet" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="v3-sheet__card v3-felt" role="dialog" aria-modal="true" aria-labelledby="wish-sheet-title">
        <button ref={closeRef} className="v3-sheet__close" type="button" aria-label="关闭" onClick={onClose}><Icon name="close" /></button>
        <AssetArt id={wish.assetId || wish.emoji} label={wish.name} className="v3-sheet__art" />
        <span className="v3-eyebrow">愿望确认 · {wish.name}</span>
        {enough ? (
          <>
            <h2 id="wish-sheet-title" className="v3-display">要请家长帮你兑换吗？</h2>
            <p>现在有 <b className="v3-num">{balance}</b> 点星光。确认后等待家长同意，不会马上扣除。</p>
            <div className="v3-actions">
              <button className="v3-button" type="button" onClick={onRequest}><Icon name="gift" />请家长确认</button>
              <button className="v3-textlink" type="button" onClick={onClose}>再想想</button>
            </div>
          </>
        ) : (
          <>
            <h2 id="wish-sheet-title" className="v3-display">还差 {wish.cost - balance} 点星光。</h2>
            <p>提前完成睡前任务或获得家长奖励后，就可以申请啦。</p>
            <div className="v3-actions">
              <button className="v3-button" type="button" onClick={onClose}>看看别的愿望</button>
              <button className="v3-button v3-button--wool" type="button" onClick={onClose}>先留在愿望单</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function WishSky() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const profile = getActiveProfile(state)
  const [selected, setSelected] = useState(null)
  const balance = getStarBalance(state)
  const wishes = state.wishes.filter((wish) => wish.enabled)
  const pendingIds = new Set(state.rewardRequests.filter((request) => request.profileId === state.activeProfileId && request.status === 'pending').map((request) => request.wishId))
  const requestReward = () => {
    if (!selected || balance < selected.cost) return
    dispatch({ type: 'REQUEST_REWARD', wishId: selected.id })
    setSelected(null)
  }
  return (
    <div className="v3-wishes" aria-labelledby="v3-wishes-title">
      <header className="v3-wishes__head">
        <div className="v3-wishes__buddy" aria-hidden="true"><Companion character={profile.character} mood="cheer" /></div>
        <div>
          <span className="v3-wishes__balance"><Icon name="star" size={20} />现在有 <b className="v3-num">{balance}</b> 点星光</span>
          <h1 id="v3-wishes-title" className="v3-display">我的愿望</h1>
          <p>选择一个愿望，请家长和你一起决定。</p>
        </div>
      </header>
      {wishes.length ? (
        <ul className="v3-wishes__grid">
          {wishes.map((wish, index) => {
            const pending = pendingIds.has(wish.id)
            const ready = balance >= wish.cost
            const fill = Math.min(1, wish.cost ? balance / wish.cost : 1)
            return (
              <li key={wish.id} style={{ '--i': index, '--fill': fill }}>
                <button type="button" className={`v3-wish ${ready ? 'is-ready' : ''} ${pending ? 'is-pending' : ''}`} onClick={() => setSelected(wish)}>
                  <span className="v3-wish__string" aria-hidden="true" />
                  <AssetArt id={wish.assetId || wish.emoji} label={wish.name} className="v3-wish__art" />
                  <strong>{wish.name}</strong>
                  <span className="v3-wish__cost"><Icon name="star" size={14} /><b className="v3-num">{wish.cost}</b> 点</span>
                  <span className="v3-wish__meter" aria-hidden="true"><i /></span>
                  <small>{pending ? '等待家长确认' : ready ? '可以请家长兑换啦' : `还差 ${wish.cost - balance} 点`}</small>
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="v3-plaza__empty v3-felt"><strong>愿望单还空着</strong><small>请家长在家长区添加几个家里的小愿望。</small></div>
      )}
      {selected ? <WishSheet wish={selected} balance={balance} onClose={() => setSelected(null)} onRequest={requestReward} /> : null}
    </div>
  )
}
