import { useMemo, useState } from 'react'
import { defaultRoutinesFor, deriveTodayCandidate, getCoreRoutines, inspectRoutineLoad, ROUTINE_PERIODS } from '../core/today/todayEngine.js'
import { getActiveProfile } from '../domain/model.js'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { AssetArt } from '../ui/AssetArt.jsx'
import { Icon } from '../ui/Icons.jsx'
import { appPath } from '../data/paths.js'

const periodLabels = { morning: '早晨', 'after-school': '放学后', evening: '晚间' }

export function FamilyTimelinePage() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const profile = getActiveProfile(state)
  const initialRoutines = useMemo(() => getCoreRoutines(state, profile.id), [profile.id, state])
  const [routines, setRoutines] = useState(() => structuredClone(initialRoutines))
  const [saved, setSaved] = useState(false)
  const warnings = inspectRoutineLoad(routines)
  const previewState = { ...state, modules: { ...state.modules, core: { ...(state.modules.core || {}), routines: [...(state.modules.core?.routines || []).filter((item) => item.profileId !== profile.id), ...routines] } } }
  const preview = deriveTodayCandidate(previewState, profile.id)

  const updateRoutine = (id, patch) => setRoutines((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item))
  const addItem = (routineId) => setRoutines((items) => items.map((item) => item.id === routineId ? {
    ...item,
    items: [...item.items, { id: `item-${Date.now()}`, title: '新的成长活动', assetId: 'heart', estimatedMinutes: 10, required: false }],
  } : item))
  const save = () => {
    dispatch({ type: 'UPDATE_CORE_ROUTINES', profileId: profile.id, routines })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  const restore = () => setRoutines(defaultRoutinesFor(profile.id))

  return (
    <section className="timeline-page">
      <header className="platform-page-header"><div><span className="eyebrow">今日与时间线</span><h1>家庭时间线</h1><p>家长安排完整节奏，孩子每次只看到一件事。</p></div><div><button type="button" className="button button--secondary" onClick={restore}>恢复温和模板</button><button type="button" className="button button--primary" onClick={save}>{saved ? '已保存' : '保存时间线'}</button></div></header>
      {warnings.length ? <aside className="schedule-advice"><Icon name="sparkle" /><div><strong>当前安排有点密</strong><p>{warnings.join('；')}。建议先留出自由玩耍，再决定是否增加活动。</p></div><button type="button" onClick={() => { const target = routines.find((item) => item.period === 'after-school'); if (target && !target.items.some((item) => item.kind === 'free')) updateRoutine(target.id, { items: [{ id: 'free-play', title: '自由玩耍', kind: 'free', assetId: 'park', estimatedMinutes: 30, required: false }, ...target.items] }) }}>留出自由时间</button></aside> : null}
      <div className="timeline-workspace">
        <div className="timeline-board">
          <div className="timeline-axis"><span>07:00</span><span>12:00</span><span>16:00</span><span>19:00</span><span>21:30</span></div>
          {ROUTINE_PERIODS.map((period) => {
            const routine = routines.find((item) => item.period === period)
            if (!routine) return null
            return <article key={period} className={`timeline-lane timeline-lane--${period}`}>
              <div className="timeline-lane__label"><strong>{periodLabels[period]}</strong><label>开始<input type="time" value={routine.startTime} onChange={(event) => updateRoutine(routine.id, { startTime: event.target.value })} /></label></div>
              <div className="timeline-items">
                {routine.items.map((item) => <div key={item.id} className={`timeline-item ${item.kind === 'free' ? 'timeline-item--free' : ''}`}><AssetArt id={item.assetId} decorative /><input aria-label={`${periodLabels[period]}活动名称`} value={item.title} onChange={(event) => updateRoutine(routine.id, { items: routine.items.map((value) => value.id === item.id ? { ...value, title: event.target.value } : value) })} /><small>{item.kind === 'free' ? '自由时间' : `约 ${item.estimatedMinutes} 分钟`}</small></div>)}
                <button type="button" className="timeline-add" onClick={() => addItem(routine.id)}><Icon name="sparkle" /> 添加活动</button>
              </div>
            </article>
          })}
          <article className="timeline-lane timeline-lane--family"><div className="timeline-lane__label"><strong>全家一起</strong><small>不强制打卡</small></div><div className="timeline-items"><div className="timeline-item timeline-item--family"><AssetArt id="story" decorative /><strong>家庭阅读</strong><small>一起分享故事</small></div><div className="timeline-item timeline-item--free"><AssetArt id="heart" decorative /><strong>自由相处</strong><small>无需记录</small></div></div></article>
        </div>
        <aside className="child-preview"><img className="timeline-family-art" src={appPath('assets/platform/family-timeline-decoration.webp')} alt="" /><span className="eyebrow">孩子此刻看到的</span><div className="child-preview__card"><span>{preview.context}</span><strong>{preview.title}</strong>{preview.options[0] ? <><AssetArt id={preview.options[0].assetId} decorative /><small>{preview.options[0].title}</small></> : <AssetArt id="park" decorative />}</div><p>预览会随时间和孩子的选择自动更新。</p><button type="button" className="button button--secondary">预览孩子视图</button></aside>
      </div>
    </section>
  )
}
