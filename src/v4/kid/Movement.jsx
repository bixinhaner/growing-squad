import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getActiveProfile, localDateKey } from '../../domain/model.js'
import { MOVEMENT_ACTIVITIES, getMovementActivity } from '../../modules/movement/activityCatalog.js'
import { movementRecommendations, movementSessionsFor, movementState } from '../../modules/movement/movementModel.js'
import { useBedtimeActions, useBedtimeState } from '../../store/useBedtime.js'
import { appPath } from '../../data/paths.js'
import { Icon } from '../ui/Icon.jsx'
import { Buddy, ChipGroup, Sheet, Speak, Tap } from '../ui/kit.jsx'
import { useToast } from '../ui/toast.js'
import { Face } from './Face.jsx'

const WHO = { solo: '自己玩', parent: '和家长', sibling: '和兄弟姐妹' }
const FEEL = [
  { id: 'again', title: '还想玩', face: 'joy', tone: 'honey' },
  { id: 'just-right', title: '刚刚好', face: 'smile', tone: 'mint' },
  { id: 'hard', title: '有点难', face: 'wobble', tone: 'sky' },
]
const FEEL_LABEL = { again: '还想玩', 'just-right': '刚刚好', hard: '有点难', change: '想换一种' }
const newSessionId = (profileId) => `movement-${profileId}-${localDateKey()}-${crypto.randomUUID()}`

/** One page to choose: two suggestions up top, the whole gallery below, and last plays as stickers. */
export function MovementHome() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const profile = getActiveProfile(state)
  const [where, setWhere] = useState('all')
  const [preview, setPreview] = useState(null)
  const picks = useMemo(() => movementRecommendations(state, profile.id, 2), [state, profile.id])
  const gallery = MOVEMENT_ACTIVITIES.filter((activity) => where === 'all' || activity.environment === where)
  const played = movementSessionsFor(state, profile.id).filter((session) => session.completedAt).slice(0, 8)

  const start = (activity, supportMode) => {
    const sessionId = newSessionId(profile.id)
    dispatch({ type: 'SELECT_MOVEMENT_ACTIVITY', profileId: profile.id, sessionId, activityId: activity.id, initiatedBy: 'child', supportMode })
    dispatch({ type: 'START_MOVEMENT_ACTIVITY', profileId: profile.id, sessionId, activityId: activity.id, supportMode })
    navigate(`/movement/play/${sessionId}`)
  }

  return (
    <section className="k-place k-move" aria-labelledby="k-move-title">
      <header className="k-place__head">
        <Buddy character={profile.character} mood="cheer" />
        <div>
          <h1 id="k-move-title" className="u-display">动一动</h1>
          <p className="k-place__sub">挑一个游戏，玩完回来告诉我感觉<Speak text="动一动。挑一个游戏，玩完回来告诉我感觉。" /></p>
        </div>
      </header>

      <div className="k-move__picks">
        {picks.map((activity, index) => (
          <button type="button" key={activity.id} className="k-card k-move__pick" onClick={() => setPreview(activity)}>
            <span className="k-card__pic"><img src={activity.image} alt="" /></span>
            <span className="k-card__tag is-hot">{index === 0 ? '今天推荐' : '也不错'}</span>
            <span className="k-card__body"><strong>{activity.title}</strong><small>{activity.participants.map((item) => WHO[item]).join(' · ')} · {activity.environment === 'indoor' ? '在家里' : '在外面'}</small></span>
          </button>
        ))}
      </div>

      <div className="k-move__gallery-head">
        <h2 className="k-section-title u-display">全部游戏</h2>
        <ChipGroup label="在哪里玩" value={where} onChange={setWhere} options={[['all', '全部'], ['indoor', '在家里'], ['outdoor', '在外面']]} />
      </div>
      <div className="k-cards">
        {gallery.map((activity) => (
          <button type="button" key={activity.id} className="k-card" onClick={() => setPreview(activity)}>
            <span className="k-card__pic"><img src={activity.image} alt="" loading="lazy" /></span>
            <span className="k-card__body"><strong>{activity.title}</strong><small>{activity.equipment}</small></span>
          </button>
        ))}
      </div>

      {played.length ? (
        <>
          <h2 className="k-section-title u-display"><Icon name="sparkle" size={22} />亮起来的能量花</h2>
          <ul className="k-stickers">
            {played.map((session) => {
              const activity = getMovementActivity(session.activityId)
              return activity ? <li key={session.id}><img src={activity.image} alt="" /><span>{activity.title}</span><small>{FEEL_LABEL[session.feedback] || '玩过啦'}</small></li> : null
            })}
          </ul>
        </>
      ) : null}

      {preview ? (
        <Sheet title={preview.title} onClose={() => setPreview(null)} className="k-preview">
          <img className="k-preview__pic" src={preview.image} alt="" />
          <HowTo steps={preview.steps} />
          <p className="k-safety"><Icon name="shield" size={18} />安全约定：{preview.safety}</p>
          <div className="k-preview__go">
            <Tap tone="primary" size="l" icon="play" onClick={() => start(preview, 'self')}>开始玩</Tap>
            <Tap tone="soft" size="l" icon="users" onClick={() => start(preview, 'together')}>和家长一起玩</Tap>
          </div>
        </Sheet>
      ) : null}
    </section>
  )
}

/** Numbered steps that can each be read aloud — pre-readers can follow along. */
export function HowTo({ steps, title = '怎么玩' }) {
  return (
    <div className="k-howto">
      <h3 className="u-display">{title}<Speak text={steps.map((step, index) => `第${index + 1}步，${step}`).join('。')} label="把每一步都读给我听" /></h3>
      <ol>
        {steps.map((step, index) => <li key={step}><b className="u-num">{index + 1}</b><span>{step}</span></li>)}
      </ol>
    </div>
  )
}

export function MovementPlay() {
  const { sessionId } = useParams()
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const toast = useToast()
  const profile = getActiveProfile(state)
  const session = movementState(state).sessions[sessionId]
  const activity = getMovementActivity(session?.activityId)
  if (!session || !activity) {
    return <div className="k-empty k-panel"><h1 className="u-display">这个游戏已经收好啦</h1><Tap tone="primary" onClick={() => navigate('/movement')}>再挑一个</Tap></div>
  }
  const base = { profileId: profile.id, sessionId, activityId: activity.id }
  const help = () => { dispatch({ type: 'REQUEST_MOVEMENT_HELP', ...base }); toast('已经告诉家长了，请叫家长过来。') }

  if (session.status === 'done') {
    return (
      <div className="k-panel k-done">
        <span className="k-done__flower" aria-hidden="true"><img src={activity.image} alt="" /><Icon name="sparkle" size={34} /></span>
        <h1 className="u-display">能量花亮起来啦！</h1>
        <p>「{activity.title}」{FEEL_LABEL[session.feedback] ? `，你觉得${FEEL_LABEL[session.feedback]}` : ''}。已经收进宝盒了。</p>
        <div className="k-done__go">
          <Tap tone="primary" size="l" onClick={() => navigate('/movement')}>再玩一个</Tap>
          <Tap tone="soft" size="l" icon="home" onClick={() => navigate('/today')}>回首页</Tap>
        </div>
      </div>
    )
  }

  if (session.status === 'feedback') {
    const answer = (feedback) => dispatch({ type: 'RECORD_MOVEMENT_FEEDBACK', ...base, feedback, showAgain: feedback !== 'hard' })
    return (
      <div className="k-panel k-feel">
        <Buddy character={profile.character} mood="cheer" />
        <h1 className="u-display">回来啦！玩得怎么样？<Speak text="回来啦！玩得怎么样？还想玩，刚刚好，还是有点难？" /></h1>
        <p>没有对错，选一个真实的感觉。</p>
        <div className="k-feel__faces">
          {FEEL.map((item) => (
            <button type="button" key={item.id} className={`k-face-btn is-${item.tone}`} onClick={() => answer(item.id)}>
              <Face kind={item.face} /><strong>{item.title}</strong>
            </button>
          ))}
        </div>
        <Tap tone="quiet" size="s" onClick={() => answer('change')}>下次想换一种</Tap>
      </div>
    )
  }

  const go = () => {
    if (session.status !== 'active') dispatch({ type: 'START_MOVEMENT_ACTIVITY', ...base })
  }
  const art = activity.id === 'balloon-keep-up' ? appPath('assets/movement/balloon-active-hero.webp') : activity.image
  const ready = session.status === 'active'
  return (
    <div className="k-panel k-go">
      <div className="k-go__pic" style={{ backgroundImage: `url("${art}")` }} role="img" aria-label={activity.title} />
      <div className="k-go__body">
        <span className="k-go__eyebrow">{ready ? '去玩吧，屏幕在这里等你' : '准备好了吗？'}</span>
        <h1 className="u-display">{activity.title}</h1>
        <HowTo steps={activity.steps} />
        <p className="k-safety"><Icon name="shield" size={18} />{activity.safety}</p>
        {ready
          ? <Tap tone="primary" size="xl" icon="check" onClick={() => dispatch({ type: 'COMPLETE_MOVEMENT_ACTIVITY', ...base })}>我玩好啦</Tap>
          : <Tap tone="primary" size="xl" icon="play" onClick={go}>开始玩</Tap>}
        <div className="k-go__more">
          <Tap tone="soft" size="s" icon="hand" onClick={help}>需要帮忙</Tap>
          <Tap tone="quiet" size="s" onClick={() => { dispatch({ type: 'SKIP_MOVEMENT_ACTIVITY', ...base }); navigate('/movement') }}>换一个</Tap>
        </div>
      </div>
    </div>
  )
}
