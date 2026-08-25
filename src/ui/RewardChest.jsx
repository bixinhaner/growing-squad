import { useEffect, useState } from 'react'
import { getActiveProfile, getRewardMoments, getStarBalance } from '../domain/model.js'
import { useBedtimeState } from '../store/useBedtime.js'
import { AssetArt } from './AssetArt.jsx'
import { Icon } from './Icons.jsx'
import { Modal } from './Shared.jsx'
import { CharacterPose, ThemeWorld } from './ThemeArt.jsx'

function formatMomentDate(timestamp) {
  if (!timestamp) return '历史记录'
  return new Date(timestamp).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

export function RewardChest({ onClose }) {
  const { state } = useBedtimeState()
  const profile = getActiveProfile(state)
  const moments = getRewardMoments(state)
  const balance = getStarBalance(state)
  const [pageSize, setPageSize] = useState(() => window.innerWidth < 640 ? 4 : 6)
  const [pageIndex, setPageIndex] = useState(0)

  useEffect(() => {
    const update = () => setPageSize(window.innerWidth < 640 ? 4 : 6)
    window.addEventListener('resize', update, { passive: true })
    return () => window.removeEventListener('resize', update)
  }, [])

  const pageCount = Math.max(1, Math.ceil(moments.length / pageSize))
  const activePage = Math.min(pageIndex, pageCount - 1)
  const visibleMoments = moments.slice(activePage * pageSize, (activePage + 1) * pageSize)

  return (
    <Modal title={`${profile.name}的奖励宝箱`} onClose={onClose} className={`reward-chest-modal ${moments.length <= 2 ? 'reward-chest-modal--sparse' : ''}`}>
      <div className="reward-chest-hero">
        <ThemeWorld theme={profile.theme} />
        <CharacterPose character={profile.character} pose="celebrate" decorative className="reward-chest-companion" />
        <div className="reward-chest-hero__copy">
          <span>我的奖励宝箱</span>
          <h2>{balance} <small>点星光</small></h2>
          <p>已经收藏 {moments.length} 份奖励</p>
        </div>
      </div>
      <div className="reward-chest-bar">
        <div><Icon name="gift" /><span><strong>得到过的都在这里</strong><small>兑换愿望只会减少可用星光，纪念卡永远保留。</small></span></div>
        {pageCount > 1 ? (
          <nav aria-label="奖励收藏分页">
            <button type="button" aria-label="上一页奖励" onClick={() => setPageIndex((activePage - 1 + pageCount) % pageCount)}><Icon name="chevronBack" /></button>
            <span>{activePage + 1} / {pageCount}</span>
            <button type="button" aria-label="下一页奖励" onClick={() => setPageIndex((activePage + 1) % pageCount)}><Icon name="chevron" /></button>
          </nav>
        ) : null}
      </div>
      <div className={`reward-memory-grid reward-memory-grid--${visibleMoments.length}`} aria-label="永久奖励收藏">
        {visibleMoments.map((moment) => (
          <article className="reward-memory-card" key={moment.id}>
            <AssetArt id={moment.assetId} label={moment.title} className="reward-memory-card__art" />
            <div><strong>{moment.title}</strong><small>{formatMomentDate(moment.occurredAt)}</small></div>
            <em>{moment.points > 0 ? `+${moment.points}` : '纪念'}</em>
          </article>
        ))}
        {!moments.length ? (
          <div className="reward-chest-empty">
            <AssetArt id="pillow" decorative />
            <strong>第一份奖励正在路上</strong>
            <p>提前完成睡前任务或家长记录奖励后，会永久收藏在这里。</p>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
