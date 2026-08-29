import { useMemo, useState } from 'react'
import { MOVEMENT_FILTERS, filterMovementActivities } from '../modules/movement/activityCatalog.js'
import { movementState, movementStats } from '../modules/movement/movementModel.js'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { Icon } from '../ui/Icons.jsx'

const people = { solo: '自己', parent: '家长', sibling: '兄弟姐妹' }

export function MovementParentPage() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const [filter, setFilter] = useState('all')
  const profileId = state.activeProfileId
  const stats = useMemo(() => movementStats(state, profileId), [profileId, state])
  const preferences = movementState(state).preferencesByProfile[profileId] || {}
  const activities = filterMovementActivities(filter)
  const updateRain = (rainMode) => dispatch({ type: 'UPDATE_MOVEMENT_PREFERENCES', profileId, preferences: { rainMode } })
  return <section className="movement-parent">
    <header className="movement-parent__head"><div><span className="page-title__eyebrow">成长模块</span><h1>运动小队</h1><p>看见孩子愿意尝试什么，不比较运动量。</p></div><label className="rain-toggle"><span><Icon name="sparkle" />下雨时自动推荐室内活动</span><input type="checkbox" checked={preferences.rainMode === true} onChange={(event) => updateRain(event.target.checked)} /></label></header>
    <div className="movement-insights"><article><span>累计自主选择</span><strong>{stats.autonomous}<small> / {stats.completed.length || 0} 次</small></strong><p>{stats.completed.length ? `自主选择占 ${stats.ratio}%` : '完成一次活动后这里会出现趋势'}</p></article><article><span>最喜欢</span><strong>{stats.favorite?.title || '还在发现'}</strong><p>只根据孩子说“还想玩”来判断</p></article><article><span>觉得有点难</span><strong>{stats.feedbackCounts.hard || 0}<small> 次</small></strong><p>下次会自动降低这类活动频率</p></article></div>
    <div className="movement-library"><div className="movement-filters" aria-label="筛选活动">{MOVEMENT_FILTERS.map((item) => <button className={filter === item.id ? 'is-active' : ''} key={item.id} type="button" onClick={() => setFilter(item.id)}>{item.label}</button>)}</div><div className="movement-library__grid">{activities.map((activity) => <article key={activity.id}><img src={activity.image} alt="" /><div><strong>{activity.title}</strong><span>{activity.environment === 'indoor' ? '室内' : '户外'} · {activity.participants.map((item) => people[item]).join(' / ')}</span></div></article>)}</div></div>
  </section>
}
