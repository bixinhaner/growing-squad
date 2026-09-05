import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getActiveProfile, getLastSevenDays, getSchedule, dayTypeFor, localDateKey } from '../domain/model.js'
import { deriveTodayCandidate } from '../core/today/todayEngine.js'
import { activityMomentsFor, growthSummary, resumeActivity, unresolvedHelpFor } from '../core/activity/activitySelectors.js'
import { childAssistantPrompt } from '../modules/assistant/assistantModel.js'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { appPath } from '../data/paths.js'
import { AssetArt } from '../ui/AssetArt.jsx'
import { Icon } from '../ui/Icons.jsx'
import { Modal, SaveIndicator } from '../ui/Shared.jsx'
import { ParentOverviewPage } from './ParentOverviewPage.jsx'

const AREAS = [
  { id: 'bedtime', title: '月光花园', copy: '慢慢准备，安心晚安', route: '/garden', asset: 'pillow' },
  { id: 'movement', title: '能量广场', copy: '选一个好玩的游戏', route: '/movement', asset: 'bicycle' },
  { id: 'reading', title: '故事树屋', copy: '抱一本喜欢的书', route: '/reading', asset: 'story' },
  { id: 'responsibility', title: '家庭小屋', copy: '一起把家照顾好', route: '/family-cottage', asset: 'heart' },
  { id: 'inventor', title: '发明工坊', copy: '让自己的想法长大', route: '/inventor', asset: 'craft' },
]
const dateLabel = (at) => new Date(at).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
const timeLabel = (at) => new Date(at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })

function useNow() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const update = () => setNow(Date.now())
    const timer = window.setInterval(update, 15000)
    window.addEventListener('pageshow', update)
    document.addEventListener('visibilitychange', update)
    return () => { window.clearInterval(timer); window.removeEventListener('pageshow', update); document.removeEventListener('visibilitychange', update) }
  }, [])
  return now
}
function Action({ children, onClick, secondary = false, ...props }) {
  return <button type="button" className={`calm-action${secondary ? ' calm-action--secondary' : ''}`} onClick={onClick} {...props}>{children}</button>
}
function EmptyMemory() {
  return <div className="calm-empty"><AssetArt id="courage" decorative /><h2>第一份记忆，还在路上</h2><p>等一件真实的小事发生，再把它轻轻收好。休息也没有关系。</p></div>
}
function ResumeCard({ state, profileId }) {
  const navigate = useNavigate()
  const resume = resumeActivity(state, profileId)
  return <button type="button" className="gs-continue-card calm-resume" onClick={() => navigate(resume?.route || '/reading')}>
    <AssetArt id={resume?.assetId || 'story'} decorative /><span><small>{resume?.eyebrow || '还有一点自由时间？'}</small><strong>{resume?.title || '挑一本想读的书'}</strong></span><Icon name="chevron" />
  </button>
}
export function ComfortTodayPage() {
  const { state } = useBedtimeState()
  return <TodayContent key={state.activeProfileId} />
}
function TodayContent() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const now = useNow()
  const profile = getActiveProfile(state)
  const candidate = useMemo(() => deriveTodayCandidate(state, profile.id, new Date(now)), [state, profile.id, now])
  const question = childAssistantPrompt(state, profile.id)
  const [helpOpen, setHelpOpen] = useState(false)
  const [message, setMessage] = useState('')
  const send = (type, extra = {}) => dispatch({ type, profileId: profile.id, dateKey: localDateKey(new Date(now)), routineId: candidate.routineId, timestamp: Date.now(), ...extra })
  const choose = (option) => {
    setMessage('')
    if (option.action === 'complete') { send('TODAY_COMPLETE_ITEM'); return }
    if (option.route) { navigate(option.route); return }
    send('TODAY_CHOOSE_ITEM', { itemId: option.id, itemTitle: option.title })
  }
  const later = () => { send('TODAY_LATER', { laterMinutes: 20 }); setHelpOpen(false); setMessage('先休息吧，准备好后随时可以回来。') }
  const support = (mode) => { send('TODAY_CHOOSE_SUPPORT', { supportMode: mode }); setHelpOpen(false); setMessage('已记下你的需要，请叫家长来陪一下。') }
  return <section className="calm-page calm-today" aria-labelledby="calm-today-title">
    <aside className="calm-hero"><img src={appPath('assets/platform/today-companion-scene.webp')} alt="眠眠在温暖的小天地里陪伴你" /><div><span className="calm-eyebrow">{candidate.context} · {profile.name}</span><h2>慢慢来，<br />一次只做一件。</h2><p>你的节奏，就很好。</p></div></aside>
    <div className="calm-today-content">
      <article className="gs-next-card calm-card" data-state={candidate.paused ? 'paused' : candidate.completed ? 'completed' : candidate.free ? 'free' : candidate.inProgress ? 'active' : 'ready'}>
        <span className="calm-eyebrow">{candidate.completed ? '这份努力，记下啦' : candidate.paused ? '休息一下' : candidate.inProgress ? '正在进行' : candidate.free ? '留一点空白' : '现在的小选择'}</span>
        <h1 id="calm-today-title">{candidate.title}</h1><p>{candidate.subtitle}</p>
        {candidate.paused ? <div className="calm-rest"><Icon name="clock" /><span>约 {timeLabel(candidate.laterUntil)} 后再看看，也可以现在开始。</span></div> : null}
        {candidate.options.length ? <div className="calm-choices">{candidate.options.map((option) => <button type="button" key={option.id} onClick={() => choose(option)} className={candidate.inProgress ? 'is-completing' : ''}>
          <AssetArt id={option.assetId || 'courage'} decorative /><span><strong>{option.action === 'complete' ? '我做完了' : option.action === 'resume' ? `现在开始：${option.title}` : option.title}</strong>
          <small>{option.action === 'complete' ? '把这件真实的小事收好' : option.estimatedMinutes ? `大约 ${option.estimatedMinutes} 分钟` : '按自己的节奏来'}</small></span><Icon name={option.action === 'complete' ? 'check' : 'chevron'} />
        </button>)}</div> : <div className="calm-done"><AssetArt id={candidate.completed ? 'courage' : 'park'} decorative /><Action onClick={() => navigate('/world')} secondary>去看看小队世界<Icon name="chevron" /></Action></div>}
        {candidate.supportActions.includes('help') ? <div className="calm-support"><Action secondary onClick={() => setHelpOpen(true)}><Icon name="heart" />需要帮助</Action><Action secondary onClick={later}><Icon name="clock" />稍后再做</Action></div> : null}
        {candidate.supportActions.includes('skip') ? <button className="calm-text-action" type="button" onClick={() => { send('TODAY_SKIP'); setMessage('可以，今天先休息。成长不会被扣掉。') }}>今天先不做</button> : null}
        <p className="calm-status" role="status" aria-live="polite">{message}</p>
      </article>
      <ResumeCard state={state} profileId={profile.id} />
      {question ? <Action secondary onClick={() => navigate('/companion-question')}>{question.question}</Action> : null}
    </div>
    {helpOpen ? <Modal title="需要哪种帮助" onClose={() => setHelpOpen(false)} className="calm-help-modal"><span className="calm-eyebrow">一起做，也是一种成长</span><h2>需要哪种帮助？</h2><p>选一个轻松的办法，再叫家长过来。</p><Action onClick={() => support('together')}><Icon name="heart" />和家长一起做</Action><Action secondary onClick={() => support('help')}><Icon name="bell" />只帮我最难的一步</Action><Action secondary onClick={later}><Icon name="clock" />先休息 20 分钟</Action></Modal> : null}
  </section>
}
export function ComfortWorldPage() {
  const { state } = useBedtimeState()
  const navigate = useNavigate()
  const moments = activityMomentsFor(state, state.activeProfileId)
  return <section className="calm-page calm-world"><header className="calm-section-head"><div><span className="calm-eyebrow">小队世界</span><h1>今天，想去哪儿看看？</h1><p>没有通关顺序，也不用每个地方都去。</p></div><span className="calm-badge">{AREAS.filter((a) => moments.some((m) => m.sourceModule === a.id)).length} / 5 个地方留下了记忆</span></header>
    <div className="calm-world-body"><img className="calm-map" src={appPath('assets/redesign-v1/child-world-map.png')} alt="花园、树屋与工坊组成的小队山谷" /><div className="calm-area-grid">{AREAS.map((area) => <button type="button" key={area.id} onClick={() => navigate(area.route)}><AssetArt id={area.asset} decorative /><span><strong>{area.title}</strong><small>{area.copy}</small></span><Icon name="chevron" /></button>)}</div></div>
  </section>
}
export function ComfortBackpackPage() {
  const { state } = useBedtimeState()
  const navigate = useNavigate()
  const profile = getActiveProfile(state)
  const moments = activityMomentsFor(state, profile.id)
  const [limit, setLimit] = useState(12)
  return <section className="calm-page calm-backpack"><header className="calm-section-head"><div><span className="calm-eyebrow">成长背包</span><h1>{profile.name}收集的每一份成长</h1><p>只收藏真实发生的事，不因为休息而清空。</p></div><AssetArt id="backpack" decorative /></header>
    <div className="calm-pocket-links">{[['我的愿望','/wishes'],['喜欢的活动','/movement'],['读过的故事','/reading'],['我的小发明','/inventor']].map(([title, route]) => <Action key={route} secondary onClick={() => navigate(route)}>{title}<Icon name="chevron" /></Action>)}</div>
    {moments.length ? <div className="calm-memory-list">{moments.slice(0, limit).map((m) => <button type="button" key={m.id} onClick={() => navigate(m.route)}><AssetArt id={m.assetId} decorative /><span><time dateTime={new Date(m.at).toISOString()}>{dateLabel(m.at)}</time><strong>{m.title}</strong>{m.note ? <small>{m.noteSource === 'parent' ? '家长观察：' : m.noteSource === 'child' ? '孩子原话：' : '阅读笔记：'}{m.note}</small> : null}</span><Icon name="chevron" /></button>)}</div> : <EmptyMemory />}
    {moments.length > limit ? <Action secondary onClick={() => setLimit((n) => n + 12)}>看看更早的记忆</Action> : null}
  </section>
}
export function ComfortGardenPage() {
  const { state } = useBedtimeState()
  const navigate = useNavigate()
  const days = getLastSevenDays(state)
  const count = days.filter((d) => d.session?.status === 'goodnight').length
  return <section className="calm-page calm-garden"><header className="calm-section-head"><div><span className="calm-eyebrow">月光花园</span><h1>每一次准备，都有小小回响</h1><p>{count ? `最近七天，留下了 ${count} 个晚安。` : '花园安静地等着第一份晚安。'}没有记录的日子，不是失败。</p></div></header><img className="calm-garden-art" src={appPath('assets/mascot-garden.webp')} alt="眠眠在照顾月光花园" />
    <ol className="calm-week" aria-label="最近七天晚安记录">{days.map(({ date, dateKey, session }) => <li key={dateKey} className={session?.status === 'goodnight' ? 'is-recorded' : ''}><span>{dateKey === localDateKey() ? '今天' : `周${'日一二三四五六'[date.getDay()]}`}</span><Icon name={session?.status === 'goodnight' ? 'check' : 'moon'} /><small>{session?.status === 'goodnight' ? '已留下晚安' : '未记录'}</small></li>)}</ol><Action onClick={() => navigate('/today')}>回到今天<Icon name="home" /></Action>
  </section>
}
export function ComfortParentGrowthPage() {
  const { state } = useBedtimeState()
  return <GrowthContent key={state.activeProfileId} />
}
function GrowthContent() {
  const { state } = useBedtimeState()
  const now = useNow()
  const [filter, setFilter] = useState('all')
  const profile = getActiveProfile(state)
  const summary = useMemo(() => growthSummary(state, profile.id, now, 14), [state, profile.id, now])
  const week = useMemo(() => growthSummary(state, profile.id, now), [state, profile.id, now])
  const visible = summary.moments.filter((m) => filter === 'all' || m.sourceModule === filter)
  return <section className="calm-parent"><header className="calm-section-head"><div><span className="calm-eyebrow">{profile.name} · 成长</span><h1>看见真实的小变化</h1><p>完成、一起参与、推进一个想法，都值得记住；没有记录时不作推断。</p></div><SaveIndicator /></header>
    <div className="calm-metrics">{[['晚间准备','bedtime'],['运动游戏','movement'],['阅读时光','reading'],['家庭小事','responsibility'],['发明进展','inventor']].map(([title,id]) => <article key={id}><span>{title}</span><strong>{week.counts[id]}<small> 个片段</small></strong><p>最近 7 天的真实记录</p></article>)}</div>
    <section className="calm-evidence-note"><Icon name="heart" /><div><strong>一起完成，不等于需要变少的陪伴</strong><p>记录本身不能证明独立完成。没有明确观察，就保留“尚不确定”；求助也是孩子表达需要的方式。</p></div></section>
    <div className="calm-filter" role="group" aria-label="筛选成长记录">{[['all','全部'], ...AREAS.map((a) => [a.id,a.title]),['core','日常小事']].map(([id,title]) => <button type="button" key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>{title}</button>)}</div>
    <h2 className="calm-list-title">最近 14 天</h2>{visible.length ? <ol className="calm-timeline">{visible.map((m) => <li key={m.id}><time dateTime={new Date(m.at).toISOString()}>{dateLabel(m.at)}<small>{timeLabel(m.at)}</small></time><AssetArt id={m.assetId} decorative /><div><strong>{m.title}</strong>{m.sourceModule === 'responsibility' ? <p>{m.groupComplete ? '家庭共同活动 · 已计入每位参与孩子的记录' : '个人角色已完成 · 其他家人可以继续自己的部分'}</p> : null}{m.note ? <blockquote><small>{m.noteSource === 'child' ? '孩子原话' : m.noteSource === 'parent' ? '家长观察' : '阅读笔记'}</small>{m.note}</blockquote> : null}</div></li>)}</ol> : <EmptyMemory />}
  </section>
}
export function ComfortParentTodayPage() {
  const [params] = useSearchParams()
  const { state } = useBedtimeState()
  const navigate = useNavigate()
  const profile = getActiveProfile(state)
  const schedule = getSchedule(state, dayTypeFor(), localDateKey(), profile.id)
  const help = unresolvedHelpFor(state, profile.id)
  const pending = (state.rewardRequests || []).filter((r) => r.profileId === profile.id && r.status === 'pending').length
  const missingSleep = getLastSevenDays(state).filter((d) => d.session?.inBedAt && !d.session.asleepAt && !d.session.sleepEntrySkippedAt).length
  if (params.get('view') === 'bedtime') return <section className="calm-management"><Action secondary onClick={() => navigate('/parent/overview')}>返回家长今天</Action><ParentOverviewPage key={profile.id} /></section>
  return <section className="calm-parent"><header className="calm-section-head"><div><span className="calm-eyebrow">家长的今天 · {profile.name}</span><h1>少一点催促，多一点陪伴</h1><p>只把需要处理的事放在前面，其他记录安静保存。</p></div><SaveIndicator /></header>
    <article className="calm-parent-plan"><AssetArt id="pillow" decorative /><div><span className="calm-eyebrow">今晚的节奏</span><h2>{schedule.prepareTime} 开始准备 · {schedule.bedTime} 计划完成</h2><p>可以临时调整，也可以从下一晚再改变。</p></div><Action secondary onClick={() => navigate('/parent/schedule')}>调整时间</Action></article>
    <div className="calm-parent-actions"><article><Icon name="heart" /><h2>{help.length ? `${help.length} 个需要陪伴的请求` : '暂时没有帮助请求'}</h2><p>{help[0]?.title || '不需要找出问题，也可以只是一起待一会儿。'}</p><Action secondary onClick={() => navigate(help[0]?.route || '/parent/support')}>看看陪伴方式</Action></article><article><Icon name="star" /><h2>{pending ? `${pending} 个愿望等你回应` : '愿望可以慢慢商量'}</h2><p>批准时才扣星光，回应前先听听孩子的想法。</p><Action secondary onClick={() => navigate('/parent/rewards')}>管理愿望</Action></article><article><Icon name="moon" /><h2>{missingSleep ? `${missingSleep} 晚可以补记入睡` : '晚间记录'}</h2><p>实际上床和入睡时间分开记录，不用拿完成任务代替睡着。</p><Action secondary onClick={() => navigate('/parent/overview?view=bedtime')}>查看与补记</Action></article></div>
    <nav className="calm-parent-links" aria-label="成长模块管理">{[['运动','movement'],['阅读','reading'],['家庭角色','responsibility'],['发明工坊','inventor'],['成长记录','report'],['成长助手','assistant'],['全天安排','timeline'],['陪伴与观察','support']].map(([title, route]) => <Action key={route} secondary onClick={() => navigate(`/parent/${route}`)}>{title}<Icon name="chevron" /></Action>)}</nav>
  </section>
}
