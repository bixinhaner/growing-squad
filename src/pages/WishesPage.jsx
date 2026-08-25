import { useEffect, useState } from 'react'
import { getActiveProfile, getStarBalance } from '../domain/model.js'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { Drawer, PageTitle } from '../ui/Shared.jsx'
import { AssetArt } from '../ui/AssetArt.jsx'
import { Icon } from '../ui/Icons.jsx'
import { CharacterPose, ThemeWorld } from '../ui/ThemeArt.jsx'

export function WishesPage() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const profile = getActiveProfile(state)
  const [selected, setSelected] = useState(null)
  const balance = getStarBalance(state)
  const enabledWishes = state.wishes.filter((wish) => wish.enabled)
  const pendingIds = new Set(state.rewardRequests.filter((request) => request.profileId === state.activeProfileId && request.status === 'pending').map((request) => request.wishId))
  const [pageSize, setPageSize] = useState(() => window.innerWidth < 640 ? 4 : 6)
  const [pageIndex, setPageIndex] = useState(0)
  const pageCount = Math.max(1, Math.ceil(enabledWishes.length / pageSize))
  const activePage = Math.min(pageIndex, pageCount - 1)
  const visibleWishes = enabledWishes.slice(activePage * pageSize, (activePage + 1) * pageSize)

  useEffect(() => {
    const update = () => setPageSize(window.innerWidth < 640 ? 4 : 6)
    window.addEventListener('resize', update, { passive: true })
    return () => window.removeEventListener('resize', update)
  }, [])

  const requestReward = () => {
    if (!selected || balance < selected.cost) return
    dispatch({ type: 'REQUEST_REWARD', wishId: selected.id })
    setSelected(null)
  }

  return (
    <section className="wishes-page">
      <ThemeWorld theme={profile.theme} className="wishes-world" />
      <CharacterPose character={profile.character} pose="celebrate" decorative className="wishes-companion" />
      <PageTitle eyebrow={`现在有 ${balance} 点星光`} title="我的愿望" subtitle="选择一个愿望，请家长和你一起决定。" icon="star" />
      <div className={`wish-grid wish-grid--count-${visibleWishes.length}`}>
        {visibleWishes.map((wish) => (
          <button key={wish.id} type="button" className={`wish-card ${pendingIds.has(wish.id) ? 'wish-card--pending' : ''}`} onClick={() => setSelected(wish)}>
            <AssetArt id={wish.assetId || wish.emoji} label={wish.name} className="wish-card__art" />
            <span><strong>{wish.name}</strong><small><Icon name="star" size={14} /> {wish.cost} 点</small></span>
            {pendingIds.has(wish.id) ? <em>等待家长确认</em> : <i>看看这个愿望</i>}
          </button>
        ))}
      </div>
      {pageCount > 1 ? (
        <nav className="task-page-nav wish-page-nav" aria-label="愿望分页">
          <button type="button" aria-label="上一页愿望" onClick={() => setPageIndex((activePage - 1 + pageCount) % pageCount)}>‹</button>
          <div>{Array.from({ length: pageCount }, (_, index) => <button key={index} type="button" className={index === activePage ? 'is-active' : ''} aria-label={`第 ${index + 1} 页愿望`} onClick={() => setPageIndex(index)} />)}</div>
          <button type="button" aria-label="下一页愿望" onClick={() => setPageIndex((activePage + 1) % pageCount)}>›</button>
        </nav>
      ) : null}
      {selected ? (
        <Drawer title="愿望确认" onClose={() => setSelected(null)}>
          <AssetArt id={selected.assetId || selected.emoji} label={selected.name} className="drawer-illustration" />
          {balance >= selected.cost ? (
            <>
              <h2>要请家长帮你兑换吗？</h2>
              <div className="balance-box"><strong>现在有 {balance} 点星光</strong><span>确认后等待家长同意，不会马上扣除。</span></div>
              <button className="button button--primary button--wide" type="button" onClick={requestReward}><Icon name="gift" />请家长确认</button>
              <button className="text-button" type="button" onClick={() => setSelected(null)}>再想想</button>
            </>
          ) : (
            <>
              <h2>还差 {selected.cost - balance} 点星光。</h2>
              <p>提前完成睡前任务或获得家长奖励后，就可以申请啦。</p>
              <button className="button button--primary button--wide" type="button" onClick={() => setSelected(null)}>看看别的愿望</button>
              <button className="button button--secondary button--wide" type="button" onClick={() => setSelected(null)}>先留在愿望单</button>
            </>
          )}
        </Drawer>
      ) : null}
    </section>
  )
}
