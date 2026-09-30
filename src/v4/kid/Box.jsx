import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getActiveProfile, getCompletionOutcome, getLastSevenDays, getStarBalance, localDateKey } from '../../domain/model.js'
import { activityMomentsFor } from '../../core/activity/activitySelectors.js'
import { useBedtimeActions, useBedtimeState } from '../../store/useBedtime.js'
import { AssetArt } from '../../ui/AssetArt.jsx'
import { appPath } from '../../data/paths.js'
import { Icon } from '../ui/Icon.jsx'
import { Buddy, Pic, Sheet, Speak, Tap } from '../ui/kit.jsx'
import { useToast } from '../ui/toast.js'

const TABS = [
  { id: 'garden', title: '月亮花', icon: 'leaf' },
  { id: 'memories', title: '回忆', icon: 'image' },
  { id: 'wishes', title: '愿望', icon: 'gift' },
]

/** The treasure box keeps everything the child has actually done — nothing is ever taken away. */
export function Box() {
  const { state } = useBedtimeState()
  const [params, setParams] = useSearchParams()
  const profile = getActiveProfile(state)
  const tab = TABS.some((item) => item.id === params.get('tab')) ? params.get('tab') : 'garden'
  return (
    <section className="k-box" aria-labelledby="k-box-title">
      <header className="k-box__head">
        <img className="k-box__chest" src={appPath('assets/v4/treasure-box.webp')} alt="" />
        <div>
          <h1 id="k-box-title" className="u-display">{profile.name}的宝盒</h1>
          <div className="k-tabs" role="tablist" aria-label="宝盒里的东西">
            {TABS.map((item) => (
              <button key={item.id} type="button" role="tab" id={`k-tab-${item.id}`} aria-controls="k-box-panel" aria-selected={tab === item.id} className="k-tab" onClick={() => setParams({ tab: item.id }, { replace: true })}>
                <Icon name={item.icon} size={20} />{item.title}
              </button>
            ))}
          </div>
        </div>
      </header>
      <div id="k-box-panel" role="tabpanel" aria-labelledby={`k-tab-${tab}`} className="k-box__panel" key={tab}>
        {tab === 'garden' ? <Garden /> : tab === 'memories' ? <Memories /> : <Wishes />}
      </div>
    </section>
  )
}

/* ─────────────  月亮花: last seven nights as pots on a shelf ───────────── */
const WEEKDAY = '日一二三四五六'
function stageOf(session, today) {
  if (!session) return today ? 1 : 0
  if (session.status === 'goodnight') return 4
  const values = Object.values(session.stepStatus || {})
  const resolved = values.length ? values.filter((status) => status !== 'todo').length / values.length : 0
  return resolved === 0 ? 1 : resolved < 0.5 ? 2 : 3
}
function describe(session, stage, today) {
  const outcome = getCompletionOutcome(session)
  if (stage === 4) return outcome === 'early' ? `提前完成，收下 ${session.starsAwarded || session.earlyMinutes} 点星光。月亮花开得特别亮！`
    : outcome === 'on-time' ? '按时完成，月亮花开啦。' : '完成了睡前小路，月亮花照常开了。'
  if (today) return ['', '种子在等今晚的第一件小事。', '冒出小芽了，继续加油。', '花苞鼓鼓的，快开花了。'][stage] || '种子在等今晚的第一件小事。'
  return stage === 0 ? '这盆花那天在休息。休息不是失败。' : '那天做了一部分，也是真的努力。'
}

function Garden() {
  const { state } = useBedtimeState()
  const navigate = useNavigate()
  const profile = getActiveProfile(state)
  const todayKey = localDateKey()
  const days = getLastSevenDays(state)
  const [selected, setSelected] = useState(todayKey)
  const blooms = days.filter((day) => day.session?.status === 'goodnight').length
  const active = days.find((day) => day.dateKey === selected) || days.at(-1)
  const activeToday = active?.dateKey === todayKey
  const activeStage = stageOf(active?.session, activeToday)
  const text = active ? describe(active.session, activeStage, activeToday) : ''
  const todayDone = days.find((day) => day.dateKey === todayKey)?.session?.status === 'goodnight'
  return (
    <div className="k-garden">
      <p className="k-box__lead">{blooms ? `最近七个晚上，开了 ${blooms} 朵月亮花。` : '每走完一次睡前小路，这里就开一朵月亮花。'}</p>
      <ol className="k-shelf" aria-label="最近七天的月亮花">
        {days.map((day, index) => {
          const today = day.dateKey === todayKey
          const stage = stageOf(day.session, today)
          const label = today ? '今天' : `周${WEEKDAY[day.date.getDay()]}`
          return (
            <li key={day.dateKey} style={{ '--i': index }}>
              <button type="button" className={`k-pot is-stage-${stage}${today ? ' is-today' : ''}${getCompletionOutcome(day.session) === 'early' ? ' is-early' : ''}`} aria-pressed={selected === day.dateKey} onClick={() => setSelected(day.dateKey)} aria-label={`${label}：${describe(day.session, stage, today)}`}>
                <img src={appPath(`assets/v3/moonflower-${stage}.webp`)} alt="" />
                <span>{label}</span>
              </button>
            </li>
          )
        })}
      </ol>
      <div className="k-garden__note" aria-live="polite">
        <Buddy character={profile.character} mood={activeStage === 4 ? 'garden' : 'water'} />
        <div>
          <strong className="u-display">{activeToday ? '今天' : `周${WEEKDAY[active?.date.getDay() ?? 0]}`}</strong>
          <p>{text}<Speak text={text} /></p>
          {!todayDone ? <Tap tone="primary" icon="moon" onClick={() => navigate('/tonight')}>去走今晚的小路</Tap> : null}
        </div>
      </div>
    </div>
  )
}

/* ─────────────  回忆: a scrapbook of real moments ───────────── */
const FILTERS = [['all', '全部'], ['bedtime', '晚安'], ['reading', '故事'], ['movement', '运动'], ['responsibility', '家人'], ['inventor', '发明'], ['core', '日常'], ['encouragement', '鼓励']]
const NOTE_SOURCE = { parent: '家长说', child: '我说' }
const dayTitle = (at) => {
  const key = localDateKey(new Date(at))
  if (key === localDateKey()) return '今天'
  if (key === localDateKey(new Date(Date.now() - 86400000))) return '昨天'
  return new Date(at).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
}

function Memories() {
  const { state } = useBedtimeState()
  const navigate = useNavigate()
  const profile = getActiveProfile(state)
  const moments = activityMomentsFor(state, profile.id)
  const [filter, setFilter] = useState('all')
  const [limit, setLimit] = useState(18)
  const shown = moments.filter((moment) => filter === 'all' || moment.sourceModule === filter)
  const filters = FILTERS.filter(([id]) => id === 'all' || moments.some((moment) => moment.sourceModule === id))
  const groups = []
  for (const moment of shown.slice(0, limit)) {
    const title = dayTitle(moment.at)
    if (groups.at(-1)?.title !== title) groups.push({ title, items: [] })
    groups.at(-1).items.push(moment)
  }
  if (!moments.length) {
    return (
      <div className="k-empty">
        <Pic src="assets/platform/growth-backpack-room.webp" />
        <h2 className="u-display">宝盒还空空的</h2>
        <p>做完一件真实的小事，它就会被收进来。</p>
      </div>
    )
  }
  return (
    <div className="k-memories">
      {filters.length > 2 ? (
        <div className="u-chips k-memories__filters" role="group" aria-label="回忆的种类">
          {filters.map(([id, title]) => <button type="button" key={id} className="u-chip" aria-pressed={filter === id} onClick={() => { setFilter(id); setLimit(18) }}>{title}</button>)}
        </div>
      ) : null}
      {groups.map((group) => (
        <section key={group.title} className="k-memories__day" aria-label={group.title}>
          <h2 className="u-display">{group.title}</h2>
          <div className="k-memories__grid">
            {group.items.map((moment, index) => (
              <button type="button" key={moment.id} className="k-memory" style={{ '--tilt': `${((index * 47) % 5) - 2}deg` }} onClick={() => { if (!moment.route.startsWith('/parent')) navigate(moment.route) }}>
                <span className="k-memory__pic"><AssetArt id={moment.assetId} decorative /></span>
                <strong>{moment.title}</strong>
                {moment.note ? <small>{NOTE_SOURCE[moment.noteSource] || '笔记'}：{moment.note}</small> : null}
              </button>
            ))}
          </div>
        </section>
      ))}
      {shown.length > limit ? <Tap tone="soft" className="k-memories__more" onClick={() => setLimit((count) => count + 18)}>看看更早的</Tap> : null}
    </div>
  )
}

/* ─────────────  愿望: star meters, ask a parent ───────────── */
function Wishes() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const toast = useToast()
  const balance = getStarBalance(state)
  const [picked, setPicked] = useState(null)
  const wishes = state.wishes.filter((wish) => wish.enabled)
  const pending = new Set(state.rewardRequests.filter((request) => request.profileId === state.activeProfileId && request.status === 'pending').map((request) => request.wishId))
  const ask = () => {
    dispatch({ type: 'REQUEST_REWARD', wishId: picked.id })
    toast(`已经告诉家长：想要「${picked.name}」`)
    setPicked(null)
  }
  if (!wishes.length) {
    return <div className="k-empty"><AssetArt id="surprise" decorative /><h2 className="u-display">愿望单还空着</h2><p>请家长在家长区添几个家里的小愿望。</p></div>
  }
  return (
    <div className="k-wishes">
      <p className="k-box__lead k-wishes__balance"><Icon name="star" size={20} />星光罐里有 <b className="u-num">{balance}</b> 点星光</p>
      <ul className="k-wishes__grid">
        {wishes.map((wish) => {
          const ready = balance >= wish.cost
          const waiting = pending.has(wish.id)
          return (
            <li key={wish.id}>
              <button type="button" className={`k-wish${ready ? ' is-ready' : ''}${waiting ? ' is-waiting' : ''}`} style={{ '--fill': Math.min(1, wish.cost ? balance / wish.cost : 1) }} onClick={() => setPicked(wish)}>
                <AssetArt id={wish.assetId || wish.emoji} decorative />
                <strong>{wish.name}</strong>
                <span className="k-wish__meter" aria-hidden="true"><i /></span>
                <small>{waiting ? '等家长确认中' : ready ? '星光够啦！' : `还差 ${wish.cost - balance} 点`}</small>
                <span className="k-wish__cost"><Icon name="star" size={14} /><b className="u-num">{wish.cost}</b></span>
              </button>
            </li>
          )
        })}
      </ul>
      {picked ? (
        <Sheet title={picked.name} onClose={() => setPicked(null)}>
          <div className="k-wish-sheet">
            <AssetArt id={picked.assetId || picked.emoji} decorative />
            {pending.has(picked.id) ? (
              <><p>已经告诉家长啦，等家长点头就能兑换。</p><Tap tone="soft" size="l" block onClick={() => setPicked(null)}>好的</Tap></>
            ) : balance >= picked.cost ? (
              <><p>需要 <b className="u-num">{picked.cost}</b> 点星光。告诉家长以后，等家长同意才会用掉星光。</p>
                <Tap tone="primary" size="l" block icon="gift" onClick={ask}>告诉家长我想要</Tap>
                <Tap tone="quiet" size="s" onClick={() => setPicked(null)}>再想想</Tap></>
            ) : (
              <><p>还差 <b className="u-num">{picked.cost - balance}</b> 点星光。提前走完睡前小路，就能攒星光。</p>
                <Tap tone="soft" size="l" block onClick={() => setPicked(null)}>继续攒</Tap></>
            )}
          </div>
        </Sheet>
      ) : null}
    </div>
  )
}
