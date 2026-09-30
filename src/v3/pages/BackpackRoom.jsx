import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getActiveProfile } from '../../domain/model.js'
import { activityMomentsFor } from '../../core/activity/activitySelectors.js'
import { filterMemories, MEMORY_FILTERS } from '../../ui/v2/evolutionModel.js'
import { useBedtimeState } from '../../store/useBedtime.js'
import { appPath } from '../../data/paths.js'
import { AssetArt } from '../../ui/AssetArt.jsx'

const POCKETS = [
  { title: '我的小伙伴', route: '/pet', asset: 'heart' },
  { title: '我的愿望', route: '/wishes', asset: 'surprise' },
  { title: '喜欢的活动', route: '/movement', asset: 'bicycle' },
  { title: '读过的故事', route: '/reading', asset: 'story' },
  { title: '我的小发明', route: '/inventor', asset: 'craft' },
]
const dateLabel = (at) => new Date(at).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
const NOTE_SOURCE = { parent: '家长观察', child: '我说的话' }

export function BackpackRoom() {
  const { state } = useBedtimeState()
  const navigate = useNavigate()
  const profile = getActiveProfile(state)
  const moments = activityMomentsFor(state, profile.id)
  const [category, setCategory] = useState('all')
  const [limit, setLimit] = useState(16)
  const filtered = filterMemories(moments, category)
  const filters = MEMORY_FILTERS.filter(([id]) => id === 'all' || moments.some((moment) => moment.sourceModule === id))

  return (
    <section className="v3-backpack" aria-labelledby="v3-backpack-title">
      <header className="v3-backpack__title">
        <img src={appPath('assets/objects/backpack.webp')} alt="" />
        <div>
          <h1 id="v3-backpack-title" className="v3-display">{profile.name}的成长背包</h1>
          <p>只收藏真实发生的事，不会因为休息而清空。</p>
        </div>
      </header>

      <nav className="v3-pockets" aria-label="背包口袋">
        {POCKETS.map((pocket, index) => (
          <button type="button" key={pocket.route} onClick={() => navigate(pocket.route)} style={{ '--i': index }}>
            <span><AssetArt id={pocket.asset} decorative /></span>
            <strong>{pocket.title}</strong>
          </button>
        ))}
      </nav>

      {moments.length ? (
        <div className="v3-memory-filters" role="group" aria-label="背包里的记忆类型">
          {filters.map(([id, title]) => <button type="button" key={id} aria-pressed={category === id} onClick={() => { setCategory(id); setLimit(16) }}>{title}</button>)}
        </div>
      ) : null}

      {filtered.length ? (
        <div className="v3-line" role="group" aria-label="成长记忆">
          {filtered.slice(0, limit).map((moment, index) => (
            <button type="button" key={moment.id} className="v3-memory" style={{ '--i': index, '--tilt': `${((index * 53) % 7) - 3}deg` }} onClick={() => navigate(moment.route)}>
              <span className="v3-memory__pin" aria-hidden="true" />
              <span className="v3-memory__photo"><AssetArt id={moment.assetId} decorative /></span>
              <time dateTime={new Date(moment.at).toISOString()}>{dateLabel(moment.at)}</time>
              <strong>{moment.title}</strong>
              {moment.note ? <small>{NOTE_SOURCE[moment.noteSource] || '阅读笔记'}：{moment.note}</small> : null}
            </button>
          ))}
          {filtered.length > limit ? <button type="button" className="v3-memory v3-memory--more" onClick={() => setLimit((count) => count + 16)}><strong>看看更早的记忆</strong></button> : null}
        </div>
      ) : (
        <div className="v3-backpack__empty">
          <img src={appPath('assets/platform/growth-backpack-room.webp')} alt="" />
          <div>
            <h2 className="v3-display">第一份记忆，还在路上</h2>
            <p>等一件真实的小事发生，再把它轻轻收好。</p>
          </div>
        </div>
      )}
    </section>
  )
}
