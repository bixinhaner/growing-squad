import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSessionHistory, getWeeklyMetrics, timeToMinutes } from '../domain/model.js'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { Icon } from '../ui/Icons.jsx'
import { Modal, PageTitle, Segmented } from '../ui/Shared.jsx'

const weekday = ['日', '一', '二', '三', '四', '五', '六']
const HISTORY_RANGES = [
  { value: '7', label: '最近 7 天' },
  { value: '30', label: '最近 30 天' },
  { value: 'all', label: '全部记录' },
]
const chartTop = (time) => {
  const minutes = timeToMinutes(time)
  return `${Math.min(90, Math.max(6, ((minutes - 19 * 60) / 180) * 84 + 6))}%`
}
const formatTime = (timestamp) => {
  if (!timestamp) return null
  const date = new Date(timestamp)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
const formatDate = (dateKey) => new Date(`${dateKey}T12:00:00`).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })

function asleepTimestamp(dateKey, time, inBedAt) {
  const value = new Date(`${dateKey}T${time}:00`).getTime()
  if (!Number.isFinite(value)) return null
  return value < inBedAt ? value + 24 * 60 * 60000 : value
}

export function ParentOverviewPage() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const metrics = getWeeklyMetrics(state)
  const [historyRange, setHistoryRange] = useState('7')
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(20)
  const [entryDateKey, setEntryDateKey] = useState(null)
  const [correctionDateKey, setCorrectionDateKey] = useState(null)
  const [openedAt] = useState(Date.now)
  const candidate = useMemo(() => Object.values(state.sessions)
    .filter((session) => session.profileId === state.activeProfileId && session.inBedAt && !session.asleepAt && !session.sleepEntrySkippedAt)
    .sort((a, b) => Number(b.inBedAt) - Number(a.inBedAt))[0] || null, [state])
  const entrySession = entryDateKey ? state.sessions[`${state.activeProfileId}:${entryDateKey}`] : candidate
  const correctionSession = correctionDateKey ? state.sessions[`${state.activeProfileId}:${correctionDateKey}`] : null
  const defaultSleepTime = formatTime(entrySession?.inBedAt ? entrySession.inBedAt + 20 * 60000 : openedAt)
  const [exactTime, setExactTime] = useState('')
  const allHistory = useMemo(() => getSessionHistory(state), [state])
  const filteredHistory = useMemo(() => getSessionHistory(state, {
    days: historyRange === 'all' ? null : Number(historyRange),
  }), [state, historyRange])
  const fallbackSession = historyRange !== 'all' && !filteredHistory.length ? allHistory[0] || null : null
  const selectedHistory = fallbackSession ? [fallbackSession] : filteredHistory
  const visibleHistory = selectedHistory.slice(0, visibleHistoryCount)
  const changeHistoryRange = (value) => {
    setHistoryRange(value)
    setVisibleHistoryCount(20)
  }

  const recordAfter = (minutes) => {
    if (!entrySession) return
    dispatch({ type: 'RECORD_ASLEEP_TIME', dateKey: entrySession.dateKey, timestamp: entrySession.inBedAt + minutes * 60000, source: 'parent-estimate', accuracy: 'approximate' })
    setEntryDateKey(null)
  }
  const recordExact = () => {
    if (!entrySession) return
    const timestamp = asleepTimestamp(entrySession.dateKey, exactTime || defaultSleepTime, entrySession.inBedAt)
    dispatch({ type: 'RECORD_ASLEEP_TIME', dateKey: entrySession.dateKey, timestamp, source: 'parent-entry', accuracy: 'exact' })
    setEntryDateKey(null)
  }
  const skipEntry = () => {
    if (!entrySession) return
    dispatch({ type: 'SKIP_ASLEEP_TIME', dateKey: entrySession.dateKey })
    setEntryDateKey(null)
  }
  const undoSettlement = () => {
    if (!correctionSession) return
    dispatch({ type: 'UNDO_BEDTIME_SETTLEMENT', profileId: state.activeProfileId, dateKey: correctionSession.dateKey })
    setCorrectionDateKey(null)
  }

  return (
    <section>
      <PageTitle title="本周怎么样？" subtitle="计划和实际分开记录，先看节奏，再决定要不要调整。" />
      {candidate && !entryDateKey ? <button className="sleep-prompt" type="button" onClick={() => { setExactTime(''); setEntryDateKey(candidate.dateKey) }}><span><Icon name="moon" /></span><div><strong>补充 {formatDate(candidate.dateKey)} 的入睡时间</strong><small>{formatTime(candidate.inBedAt)} 已上床 · 入睡时间由家长估计，不影响星光</small></div><Icon name="chevron" /></button> : null}
      <div className="metric-grid">
        <article className="metric-card"><span className="metric-icon metric-icon--sage"><Icon name="check" /></span><div><small>完成睡前流程</small><strong>{metrics.completed} <em>/ 7</em></strong></div></article>
        <article className="metric-card"><span className="metric-icon"><Icon name="clock" /></span><div><small>按计划完成</small><strong>{metrics.onTime} <em>/ 7</em></strong></div></article>
        <article className="metric-card"><span className="metric-icon metric-icon--apricot"><Icon name="moon" /></span><div><small>平均准备时长</small><strong>{metrics.averageMinutes || '—'} <em>{metrics.averageMinutes ? '分钟' : ''}</em></strong></div></article>
      </div>
      <div className="overview-grid">
        <article className="chart-card">
          <div className="card-heading"><div><h2>最近 7 天时间线</h2><p>旧记录没有的时间保持空白，不做推测。</p></div><div className="chart-legend"><span className="started">实际开始</span><span className="planned">计划完成</span><span className="completed">实际完成</span><span className="in-bed">实际上床</span><span className="asleep">实际入睡</span></div></div>
          <div className="time-chart">
            <div className="time-axis"><span>22:00</span><span>21:00</span><span>20:00</span><span>19:00</span></div>
            <div className="time-chart__plot">
              {metrics.days.map(({ dateKey, date, session, schedule }) => {
                const target = formatTime(session?.targetRoutineCompleteAt) || schedule.bedTime
                const started = formatTime(session?.routineStartedAt)
                const completed = formatTime(session?.routineCompletedAt)
                const inBed = formatTime(session?.inBedAt)
                const asleep = formatTime(session?.asleepAt)
                return (
                  <div className="time-column" key={dateKey} aria-label={`${dateKey}，计划完成 ${target}${completed ? `，实际完成 ${completed}` : ''}${inBed ? `，实际上床 ${inBed}` : ''}${asleep ? `，实际入睡 ${asleep}` : ''}`}>
                    {started ? <i className="time-dot time-dot--started" style={{ top: chartTop(started) }}></i> : null}
                    <i className="time-dot time-dot--planned" style={{ top: chartTop(target) }}></i>
                    {completed ? <i className="time-dot time-dot--completed" style={{ top: chartTop(completed) }}></i> : null}
                    {inBed ? <i className="time-dot time-dot--in-bed" style={{ top: chartTop(inBed) }}></i> : null}
                    {asleep ? <i className="time-dot time-dot--asleep" style={{ top: chartTop(asleep) }}></i> : null}
                    <span>{weekday[date.getDay()]}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="chart-note"><Icon name="sparkle" size={15} />星光只看实际完成任务时间；上床和入睡用于观察节奏，不扣分。</div>
        </article>
        <aside className="insight-column">
          <article className="insight-card"><span className="insight-card__icon"><Icon name="home" /></span><h2>本周观察</h2>{metrics.lateCount ? <p>有 {metrics.lateCount} 晚超过计划完成时间，平均晚 {metrics.averageLateMinutes} 分钟。只记录，不追补、不扣星光。</p> : <p>{metrics.completed ? '已有睡前记录；有数据的字段才会进入统计。' : '还没有完整记录。今晚完成一次流程后，这里会出现趋势。'}</p>}<small>一次只调整一个变量，更容易看出效果。</small></article>
          <article className="insight-card insight-card--small"><span className="insight-card__icon"><Icon name="moon" /></span><div><small>完成后到上床</small><strong>{metrics.averageToBedMinutes || '—'}{metrics.averageToBedMinutes ? ' 分钟' : ''}</strong></div></article>
          <article className="insight-card insight-card--small"><span className="insight-card__icon"><Icon name="clock" /></span><div><small>上床后到入睡</small><strong>{metrics.averageSleepLatency || '—'}{metrics.averageSleepLatency ? ` 分钟 · ${metrics.sleepRecorded} 晚` : ''}</strong></div></article>
        </aside>
      </div>
      <section className="time-history-card">
        <div className="card-heading history-heading"><div><h2>睡前记录</h2><p>五个时间各自独立，缺失就显示“未记录”。</p></div><Segmented value={historyRange} options={HISTORY_RANGES} onChange={changeHistoryRange} label="历史记录范围" /></div>
        {fallbackSession ? <div className="history-fallback"><Icon name="clock" size={17} /><span><strong>这段时间还没有记录</strong><small>先为你显示最近一次：{formatDate(fallbackSession.dateKey)}</small></span></div> : null}
        <div className="time-history-list">
          {visibleHistory.map((session) => (
            <div className="time-history-row" key={session.id || session.dateKey}>
              <strong>{formatDate(session.dateKey)}</strong>
              <span><small>开始</small>{formatTime(session.routineStartedAt) || '未记录'}</span>
              <span><small>计划完成</small>{formatTime(session.targetRoutineCompleteAt) || '未记录'}</span>
              <span><small>实际完成</small>{formatTime(session.routineCompletedAt) || '未记录'}</span>
              <span><small>上床</small>{formatTime(session.inBedAt) || '未记录'}</span>
              <span><small>入睡</small>{formatTime(session.asleepAt) || '未记录'}</span>
              <div className="time-history-actions">
                {session.inBedAt && !session.asleepAt ? <button type="button" onClick={() => { setExactTime(''); setEntryDateKey(session.dateKey) }}>补录</button> : null}
                {session.status === 'goodnight' ? <button className="time-history-correct" type="button" aria-label={`纠正 ${formatDate(session.dateKey)} 结算`} onClick={() => setCorrectionDateKey(session.dateKey)}>纠正</button> : null}
              </div>
            </div>
          ))}
          {!visibleHistory.length ? <div className="history-empty"><Icon name="moon" /><strong>还没有睡前记录</strong><span>今晚完成一次流程后，这里就会留下第一晚。</span></div> : null}
        </div>
        {selectedHistory.length > visibleHistory.length ? <button className="history-more" type="button" onClick={() => setVisibleHistoryCount((count) => count + 20)}>再显示 20 条 <small>还有 {selectedHistory.length - visibleHistory.length} 条</small></button> : null}
      </section>
      <div className="overview-actions">
        <button className="button button--primary" type="button" onClick={() => navigate('/parent/schedule')}><Icon name="clock" /> 调整作息</button>
        <button className="button button--lavender" type="button" onClick={() => navigate('/parent/routine')}><Icon name="book" /> 编辑流程</button>
      </div>
      {entryDateKey && entrySession ? <Modal title="记录入睡时间" onClose={() => setEntryDateKey(null)} className="sleep-entry-modal"><Icon name="moon" size={42} /><h2>{formatDate(entrySession.dateKey)} 大约几点睡着？</h2><p>{formatTime(entrySession.inBedAt)} 上床。估计即可，不参与星光结算。</p><div className="sleep-quick-options">{[10, 20, 30].map((minutes) => <button type="button" key={minutes} onClick={() => recordAfter(minutes)}>约 {minutes} 分钟后</button>)}</div><label>或填写时间<input type="time" value={exactTime || defaultSleepTime} onChange={(event) => setExactTime(event.target.value)} /></label><button className="button button--primary button--wide" type="button" onClick={recordExact}>保存入睡时间</button><button className="button button--secondary button--wide" type="button" onClick={skipEntry}>今天先不填</button></Modal> : null}
      {correctionSession ? <Modal title="纠正今晚结算" onClose={() => setCorrectionDateKey(null)} className="delete-modal"><div className="danger-icon"><Icon name="clock" size={32} /></div><h2>重新完成 {formatDate(correctionSession.dateKey)} 的任务？</h2><p>将撤回这晚获得的 {Number(correctionSession.starsAwarded || 0)} 点星光、花园纪念和睡眠时间，并把全部任务恢复为待完成。不会影响其他日期。</p><button className="button button--danger button--wide" type="button" onClick={undoSettlement}>撤销结算并重新完成</button><button className="button button--secondary button--wide" type="button" onClick={() => setCorrectionDateKey(null)}>保留今晚记录</button></Modal> : null}
    </section>
  )
}
