import { useMemo, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { getActiveProfile, getSessionHistory, getWeeklyMetrics, timeToMinutes } from '../../domain/model.js'
import { activityMomentsFor, growthSummary, sessionsForProfile, unresolvedHelpFor } from '../../core/activity/activitySelectors.js'
import { getScaffoldStates, getScaffoldSuggestion, SCAFFOLD_LEVELS } from '../../core/scaffold/scaffoldEngine.js'
import { assistantSettings, assistantSuggestions, buildAssistantSuggestions } from '../../modules/assistant/assistantModel.js'
import { useBedtimeActions, useBedtimeState } from '../../store/useBedtime.js'
import { appPath } from '../../data/paths.js'
import { AssetArt } from '../../ui/AssetArt.jsx'
import { Icon } from '../ui/Icon.jsx'
import { Sheet, Switch, Tap } from '../ui/kit.jsx'
import { useToast } from '../ui/toast.js'
import { useNow } from '../lib/hooks.js'
import { Empty, Notice, PageHead, Panel, Segment, SettingRow, Stat, SubNav } from './pkit.jsx'
import { clock, dateLabel, dayTitle, longDate } from './format.js'
import { SleepEntry } from './SleepEntry.jsx'

export function GrowthLayout() {
  const { state } = useBedtimeState()
  const profile = getActiveProfile(state)
  const help = unresolvedHelpFor(state, profile.id).length
  return (
    <div className="p-page">
      <SubNav label="成长" items={[
        { to: '/parent/growth', label: '记录' },
        { to: '/parent/growth/sleep', label: '睡眠' },
        { to: '/parent/growth/support', label: '陪伴', badge: help },
        { to: '/parent/growth/movement', label: '运动' },
        { to: '/parent/growth/reading', label: '阅读' },
        { to: '/parent/growth/chores', label: '家务' },
        { to: '/parent/growth/inventor', label: '发明' },
        { to: '/parent/growth/pet', label: '小伙伴' },
        { to: '/parent/growth/assistant', label: '助手' },
      ]} />
      <Outlet />
    </div>
  )
}

/* ─────────────  记录: a quiet diary of real moments  ───────────── */
const AREAS = [['all', '全部'], ['bedtime', '睡前'], ['movement', '运动'], ['reading', '阅读'], ['responsibility', '家务'], ['inventor', '发明'], ['core', '日常'], ['encouragement', '奖励']]
const NOTE_SOURCE = { child: '孩子原话', parent: '家长观察', unknown: '阅读笔记' }

export function GrowthMoments() {
  const now = useNow(60000)
  const { state } = useBedtimeState()
  const profile = getActiveProfile(state)
  const [area, setArea] = useState('all')
  const [limit, setLimit] = useState(30)
  const week = useMemo(() => growthSummary(state, profile.id, now), [state, profile.id, now])
  const all = useMemo(() => activityMomentsFor(state, profile.id).filter((moment) => moment.at <= now), [state, profile.id, now])
  const visible = all.filter((moment) => area === 'all' || moment.sourceModule === area)
  const days = []
  for (const moment of visible.slice(0, limit)) {
    const key = new Date(moment.at).toDateString()
    if (days.at(-1)?.key !== key) days.push({ key, at: moment.at, items: [] })
    days.at(-1).items.push(moment)
  }
  return (
    <>
      <PageHead eyebrow={`${profile.name} · 成长`} title="看见真实的小变化" lead="完成、一起参与、推进一个想法都值得记住。没有记录时，不作推断。" />
      <div className="p-stats">
        <Stat label="睡前" value={week.counts.bedtime} unit="晚" note="最近 7 天" />
        <Stat label="运动" value={week.counts.movement} unit="次" />
        <Stat label="阅读" value={week.counts.reading} unit="次" />
        <Stat label="家务" value={week.counts.responsibility} unit="次" />
        <Stat label="发明" value={week.counts.inventor} unit="步" />
      </div>
      <Notice icon="heart">一起完成，不等于陪伴需要变少。求助也是孩子表达需要的方式。</Notice>
      <Segment className="p-seg--wrap" label="筛选" value={area} onChange={(value) => { setArea(value); setLimit(30) }} options={AREAS} />
      {days.length ? (
        <div className="p-diary">
          {days.map((day) => (
            <section key={day.key} className="p-diary__day">
              <h3>{longDate(day.at)}</h3>
              <ol>
                {day.items.map((moment) => (
                  <li key={moment.id}>
                    <time>{clock(moment.at)}</time>
                    <AssetArt id={moment.assetId} decorative />
                    <div>
                      <strong>{moment.title}</strong>
                      {moment.sourceModule === 'responsibility' ? <small>{moment.groupComplete ? '全家一起完成 · 记在每个参与的孩子身上' : '自己的一份做好了'}</small> : null}
                      {moment.note ? <blockquote><small>{NOTE_SOURCE[moment.noteSource] || '笔记'}</small>{moment.note}</blockquote> : null}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      ) : <Panel><Empty icon="leaf" title="这里还空着">孩子做完一件事，就会在这里留下一行。</Empty></Panel>}
      {visible.length > limit ? <Tap tone="soft" block onClick={() => setLimit((value) => value + 30)}>再看更早的</Tap> : null}
    </>
  )
}

/* ─────────────  睡眠: plan vs. what actually happened  ───────────── */
const AXIS_START = 19 * 60
const AXIS_SPAN = 4 * 60
const toMinutes = (timestamp) => { if (!timestamp) return null; const date = new Date(timestamp); let value = date.getHours() * 60 + date.getMinutes(); if (value < 12 * 60) value += 24 * 60; return value }
const pos = (minutes) => `${Math.min(100, Math.max(0, ((minutes - AXIS_START) / AXIS_SPAN) * 100))}%`

export function GrowthSleep() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const profile = getActiveProfile(state)
  const metrics = getWeeklyMetrics(state)
  const [range, setRange] = useState('7')
  const [limit, setLimit] = useState(20)
  const [entry, setEntry] = useState(null)
  const [undo, setUndo] = useState(null)
  const history = useMemo(() => getSessionHistory(state, { days: range === 'all' ? null : Number(range) }), [state, range])
  return (
    <>
      <PageHead eyebrow={`${profile.name} · 睡眠`} title="这一周的晚上" lead="计划和实际分开记。星光只看任务完成时间，上床和入睡只用来观察节奏。" />
      <div className="p-stats">
        <Stat label="走完睡前小路" value={metrics.completed} unit="/ 7 晚" />
        <Stat label="按计划完成" value={metrics.onTime} unit="/ 7 晚" />
        <Stat label="平均准备" value={metrics.averageMinutes || '—'} unit={metrics.averageMinutes ? '分钟' : ''} />
        <Stat label="上床后到睡着" value={metrics.averageSleepLatency || '—'} unit={metrics.averageSleepLatency ? '分钟' : ''} note={metrics.sleepRecorded ? `${metrics.sleepRecorded} 晚有记录` : '补记后才会出现'} />
      </div>

      <Panel title="一周的夜晚" aside={<span className="p-legend"><i className="is-plan" />计划完成<i className="is-go" />准备中<i className="is-bed" />上床<i className="is-sleep" />睡着</span>}>
        <div className="p-nights">
          <div className="p-nights__axis" aria-hidden="true">{['19:00', '20:00', '21:00', '22:00', '23:00'].map((label) => <span key={label}>{label}</span>)}</div>
          {metrics.days.map(({ dateKey, session, schedule }) => {
            const plan = timeToMinutes(clock(session?.targetRoutineCompleteAt) || schedule.bedTime)
            const start = toMinutes(session?.routineStartedAt)
            const done = toMinutes(session?.routineCompletedAt)
            const bed = toMinutes(session?.inBedAt)
            const sleep = toMinutes(session?.asleepAt)
            return (
              <div className="p-night" key={dateKey} aria-label={`${dayTitle(dateKey)}：计划 ${clock(session?.targetRoutineCompleteAt) || schedule.bedTime} 完成${done ? `，实际 ${clock(session.routineCompletedAt)} 完成` : ''}${bed ? `，${clock(session.inBedAt)} 上床` : ''}${sleep ? `，${clock(session.asleepAt)} 睡着` : ''}`}>
                <span className="p-night__day">{dayTitle(dateKey).replace(/^\d+\/\d+/, '')}</span>
                <div className="p-night__track">
                  {start && done ? <i className="p-night__go" style={{ left: pos(start), width: `calc(${pos(done)} - ${pos(start)})` }} /> : null}
                  <i className="p-night__plan" style={{ left: pos(plan) }} />
                  {bed ? <i className="p-night__dot is-bed" style={{ left: pos(bed) }} /> : null}
                  {sleep ? <i className="p-night__dot is-sleep" style={{ left: pos(sleep) }} /> : null}
                </div>
              </div>
            )
          })}
        </div>
        <Notice icon="info">{metrics.lateCount ? `有 ${metrics.lateCount} 晚晚于计划，平均晚 ${metrics.averageLateMinutes} 分钟。只记录，不扣星光。一次只调一个变量，更容易看出效果。` : '没有记录的时间保持空白，不做推测。'}</Notice>
      </Panel>

      <Panel title="每一晚" aside={<Segment label="范围" value={range} onChange={(value) => { setRange(value); setLimit(20) }} options={[['7', '7 天'], ['30', '30 天'], ['all', '全部']]} />}>
        {history.length ? (
          <div className="p-table" role="table" aria-label="睡前记录">
            <div className="p-table__row is-head" role="row"><span role="columnheader">日期</span><span role="columnheader">开始</span><span role="columnheader">计划</span><span role="columnheader">完成</span><span role="columnheader">上床</span><span role="columnheader">睡着</span><span role="columnheader"><span className="u-sr">操作</span></span></div>
            {history.slice(0, limit).map((session) => (
              <div className="p-table__row" role="row" key={session.id || session.dateKey}>
                <strong role="cell">{dayTitle(session.dateKey)}</strong>
                {[session.routineStartedAt, session.targetRoutineCompleteAt, session.routineCompletedAt, session.inBedAt, session.asleepAt].map((value, index) => <span role="cell" key={index} className={value ? 'u-num' : 'is-none'}>{clock(value) || '—'}</span>)}
                <span role="cell" className="p-table__do">
                  {session.inBedAt && !session.asleepAt ? <button type="button" className="p-link" onClick={() => setEntry(session)}>补记睡着</button> : null}
                  {session.status === 'goodnight' ? <button type="button" className="p-link is-quiet" onClick={() => setUndo(session)}>纠正</button> : null}
                </span>
              </div>
            ))}
          </div>
        ) : <Empty icon="moon" title="这段时间还没有记录">今晚走完一次睡前小路，就会留下第一晚。</Empty>}
        {history.length > limit ? <Tap tone="soft" block onClick={() => setLimit((value) => value + 20)}>再显示 20 晚</Tap> : null}
      </Panel>

      {entry ? <Sheet title={`${dayTitle(entry.dateKey)} 几点睡着的？`} onClose={() => setEntry(null)}><SleepEntry session={entry} onDone={() => setEntry(null)} /></Sheet> : null}
      {undo ? (
        <Sheet title={`重新完成 ${dayTitle(undo.dateKey)} 的小路？`} onClose={() => setUndo(null)}>
          <p className="p-lead">会撤回这晚的 {Number(undo.starsAwarded || 0)} 点星光、月亮花和睡眠时间，把任务恢复为没做。其他日期不受影响。</p>
          <Tap tone="danger" block onClick={() => { dispatch({ type: 'UNDO_BEDTIME_SETTLEMENT', profileId: state.activeProfileId, dateKey: undo.dateKey }); setUndo(null) }}>撤销这晚的结算</Tap>
          <Tap tone="soft" block onClick={() => setUndo(null)}>保留</Tap>
        </Sheet>
      ) : null}
    </>
  )
}

/* ─────────────  陪伴: support that follows the child, not a ladder  ───────────── */
export function GrowthSupport() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const toast = useToast()
  const profile = getActiveProfile(state)
  const states = useMemo(() => getScaffoldStates(state, profile.id), [profile.id, state])
  const suggestion = getScaffoldSuggestion(states)
  const requests = unresolvedHelpFor(state, profile.id)
  const [dismissed, setDismissed] = useState('')
  const [open, setOpen] = useState(null)
  const setLevel = (capability, level) => dispatch({ type: 'UPDATE_SCAFFOLD', profileId: profile.id, capabilityId: capability.id, capabilityKey: capability.key, level })
  const observe = (capability, record, mode) => dispatch({ type: 'RECORD_SUPPORT_EVIDENCE', profileId: profile.id, sourceModule: capability.key.split('.')[0], sessionId: record.sessionId, capabilityKey: capability.key, mode })
  const groups = [...new Set(states.map((item) => item.group))]
  const movement = sessionsForProfile(state.modules.movement?.sessions, profile.id).filter((session) => session.completedAt).sort((a, b) => b.completedAt - a.completedAt).slice(0, 5)
  const openCapability = states.find((item) => item.id === open)
  return (
    <>
      <PageHead eyebrow={`${profile.name} · 陪伴`} title="支持跟着孩子的需要改变" lead="不是升级，也不是考核。开学、生病或生活变化时，随时多陪一点，不代表退步。" />
      {requests.length ? (
        <Panel title={`${requests.length} 个求助`} tone="warm">
          {requests.map((request) => (
            <div className="p-line" key={request.id}>
              <Icon name="hand" size={20} />
              <span><strong>{request.title}</strong><small>{dateLabel(request.at)} {clock(request.at)}</small></span>
              <Tap tone="primary" size="s" onClick={() => { dispatch({ type: 'RESOLVE_SUPPORT_REQUEST', profileId: profile.id, sourceModule: request.sourceModule, sessionId: request.sessionId, decisionId: request.decisionId }); toast('已标记为陪过。') }}>已经陪过</Tap>
            </div>
          ))}
        </Panel>
      ) : null}
      {suggestion && dismissed !== `${suggestion.capabilityId}:${suggestion.nextLevel}` ? (
        <Panel tone="mint" title={suggestion.title}>
          <p className="p-lead">{suggestion.body}</p>
          <div className="p-inline">
            <Tap tone="primary" size="s" onClick={() => { const capability = states.find((item) => item.id === suggestion.capabilityId); if (capability) setLevel(capability, suggestion.nextLevel) }}>试一周</Tap>
            <Tap tone="soft" size="s" onClick={() => setDismissed(`${suggestion.capabilityId}:${suggestion.nextLevel}`)}>先不调整</Tap>
          </div>
          <small className="p-fine">只有你确认后，陪伴方式才会改变。</small>
        </Panel>
      ) : null}
      {groups.map((group) => (
        <Panel key={group} title={group}>
          <div className="p-support">
            {states.filter((item) => item.group === group).map((capability) => (
              <div className="p-support__row" key={capability.id}>
                <AssetArt id={capability.assetId} decorative />
                <div className="p-support__text">
                  <strong>{capability.title}</strong>
                  <small>{capability.evidence.count ? `${capability.evidence.count} 次记录 · ${capability.evidence.confirmedCount} 次有观察 · ${capability.evidence.unknownCount} 次不确定` : '还没有记录，先按孩子的需要陪。'}</small>
                  {capability.evidence.records.some((record) => record.sessionId) ? <button type="button" className="p-link" onClick={() => setOpen(capability.id)}>记下这几次实际怎样完成</button> : null}
                </div>
                <Segment label={`${capability.title}的陪伴方式`} value={Number(capability.level)} onChange={(level) => setLevel(capability, level)} options={SCAFFOLD_LEVELS.map((level) => [level.id, level.label])} />
              </div>
            ))}
          </div>
        </Panel>
      ))}
      {movement.length ? (
        <Panel title="运动是谁提议的？">
          <p className="p-fine">在孩子那边点“开始”不能说明是主动的。这项记录完全可选。</p>
          {movement.map((session) => (
            <div className="p-line" key={session.id}>
              <Icon name="play" size={18} />
              <span><strong>{dateLabel(session.completedAt)} {clock(session.completedAt)}</strong></span>
              <Segment label="谁提议的" value={session.initiationEvidence?.value || 'unknown'} onChange={(initiation) => dispatch({ type: 'RECORD_SUPPORT_EVIDENCE', profileId: profile.id, sourceModule: 'movement', sessionId: session.id, capabilityKey: 'movement.start', mode: 'unknown', initiation })} options={[['unknown', '不确定'], ['child', '孩子自己'], ['prompted', '家长提醒']]} />
            </div>
          ))}
        </Panel>
      ) : null}
      {openCapability ? (
        <Sheet title={openCapability.title} onClose={() => setOpen(null)}>
          <p className="p-lead">只记自己看见的，不需要补齐每一条。</p>
          {openCapability.evidence.records.filter((record) => record.sessionId).map((record) => {
            const sourceModule = openCapability.key.split('.')[0]
            const session = state.modules[sourceModule]?.sessions?.[record.sessionId]
            const mode = session?.supportEvidence?.[`${profile.id}:${openCapability.key}`]?.mode || session?.supportEvidence?.[openCapability.key]?.mode || 'unknown'
            return (
              <div className="p-line is-stack" key={record.sessionId}>
                <strong>{dateLabel(record.at)} {clock(record.at)}</strong>
                <Segment label="实际怎样完成" value={mode} onChange={(value) => observe(openCapability, record, value)} options={[['unknown', '不确定'], ['independent', '自己完成'], ['together', '一起完成'], ['helped', '帮了一把']]} />
              </div>
            )
          })}
        </Sheet>
      ) : null}
    </>
  )
}

/* ─────────────  助手: suggestions the parent edits and approves  ───────────── */
export function GrowthAssistant() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const toast = useToast()
  const profileId = state.activeProfileId
  const profile = getActiveProfile(state)
  const settings = assistantSettings(state, profileId)
  const suggestions = assistantSuggestions(state, profileId)
  const generated = useMemo(() => buildAssistantSuggestions(state, profileId), [profileId, state])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const update = (patch) => dispatch({ type: 'UPDATE_ASSISTANT_SETTINGS', profileId, settings: patch })
  const hasDerived = suggestions.length || Object.values(state.modules?.assistant?.reflections || {}).some((item) => item.profileId === profileId)
  return (
    <>
      <PageHead eyebrow={`${profile.name} · 小队助手`} title="把零散记录整理成线索" lead="只在这台设备里整理，由你修改和确认。不打分，不贴标签，不自动改任何规则。">
        <SettingRow title={settings.enabled ? '助手已开启' : '助手已关闭'}><Switch label="启用小队助手" checked={settings.enabled} onChange={(enabled) => update({ enabled })} /></SettingRow>
      </PageHead>
      <div className="p-cols">
        <Panel title="允许整理的内容">
          <SettingRow icon="chart" title="活动摘要" copy="只读完成次数和求助记录"><Switch label="活动摘要" disabled={!settings.enabled} checked={settings.scopes.activitySummary} onChange={(activitySummary) => update({ scopes: { activitySummary } })} /></SettingRow>
          <SettingRow icon="heart" title="孩子的一句话" copy="只包括孩子主动选择或说出的内容"><Switch label="孩子的一句话" disabled={!settings.enabled} checked={settings.scopes.childQuotes} onChange={(childQuotes) => update({ scopes: { childQuotes } })} /></SettingRow>
          <SettingRow icon="image" title="照片与语音" copy="这个版本不整理，也不上传"><Switch label="照片与语音" disabled checked={false} onChange={() => {}} /></SettingRow>
          <SettingRow icon="info" title="孩子的一问一答" copy="孩子首页偶尔出现一个选择题，可以跳过"><Switch label="孩子的一问一答" disabled={!settings.enabled} checked={settings.childOneQuestion} onChange={(childOneQuestion) => update({ childOneQuestion })} /></SettingRow>
          <Notice icon="shield">外部 AI 上传：关闭。活动、照片和语音都不会发给外部模型。</Notice>
        </Panel>
        <Panel title="本周建议" className="p-assistant">
          <img src={appPath('assets/assistant/assistant-hero.webp')} alt="" />
          <p className="p-lead">建议来自已有记录，会写明依据。你可以先改字，再决定要不要采用。</p>
          <Tap tone="primary" icon="sparkle" disabled={!settings.enabled} onClick={() => { dispatch({ type: 'CREATE_ASSISTANT_SUGGESTIONS', profileId, suggestions: generated }); toast(`整理出 ${generated.length} 条建议，等你确认。`) }}>{suggestions.length ? '重新整理' : '整理本周建议'}</Tap>
          {!settings.enabled ? <small className="p-fine">开启助手后才能整理。</small> : null}
          <button type="button" className="p-link is-danger" disabled={!hasDerived} onClick={() => setConfirmDelete(true)}>删除全部助手内容</button>
        </Panel>
      </div>
      {suggestions.length ? <div className="p-suggestions">{suggestions.map((suggestion) => <Suggestion key={suggestion.id} suggestion={suggestion} profileId={profileId} />)}</div> : null}
      {confirmDelete ? (
        <Sheet title="删除全部助手内容？" onClose={() => setConfirmDelete(false)}>
          <p className="p-lead">会删除为{profile.name}整理的建议和问答。原始任务和成长记录不会删除。</p>
          <Tap tone="danger" block onClick={() => { dispatch({ type: 'DELETE_ASSISTANT_DERIVED', profileId }); setConfirmDelete(false); toast('助手内容已删除，原始记录不变。') }}>删除</Tap>
          <Tap tone="soft" block onClick={() => setConfirmDelete(false)}>保留</Tap>
        </Sheet>
      ) : null}
    </>
  )
}

function Suggestion({ suggestion, profileId }) {
  const { dispatch } = useBedtimeActions()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(suggestion.title)
  const [body, setBody] = useState(suggestion.body)
  const approved = suggestion.status === 'approved'
  return (
    <article className={`p-suggestion${approved ? ' is-approved' : ''}`}>
      <small>依据：{suggestion.evidence}</small>
      {editing ? (
        <div className="p-form">
          <input className="u-input" aria-label="建议标题" value={title} onChange={(event) => setTitle(event.target.value)} />
          <textarea className="u-input" aria-label="建议内容" rows={3} value={body} onChange={(event) => setBody(event.target.value)} />
          <div className="p-inline"><Tap tone="primary" size="s" disabled={!title.trim() || !body.trim()} onClick={() => { dispatch({ type: 'EDIT_ASSISTANT_SUGGESTION', profileId, suggestionId: suggestion.id, title: title.trim(), body: body.trim() }); setEditing(false) }}>保存</Tap><Tap tone="quiet" size="s" onClick={() => setEditing(false)}>取消</Tap></div>
        </div>
      ) : (
        <>
          <h3>{suggestion.title}</h3>
          <p>{suggestion.body}</p>
          <div className="p-inline">
            {approved ? <span className="p-pill is-ok"><Icon name="check" size={14} strokeWidth={3} />已收进家长计划</span> : <><Tap tone="primary" size="s" onClick={() => dispatch({ type: 'APPROVE_ASSISTANT_SUGGESTION', profileId, suggestionId: suggestion.id })}>采用</Tap><Tap tone="soft" size="s" onClick={() => setEditing(true)}>先改一改</Tap></>}
            <button type="button" className="p-link is-quiet" onClick={() => dispatch({ type: 'DELETE_ASSISTANT_DERIVED', profileId, suggestionId: suggestion.id })}>删除</button>
          </div>
        </>
      )}
    </article>
  )
}
