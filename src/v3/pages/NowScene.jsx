import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAccessibility, getActiveProfile, localDateKey } from '../../domain/model.js'
import { deriveTodayCandidate } from '../../core/today/todayEngine.js'
import { resumeActivity } from '../../core/activity/activitySelectors.js'
import { childAssistantPrompt } from '../../modules/assistant/assistantModel.js'
import { useBedtimeActions, useBedtimeState } from '../../store/useBedtime.js'
import { appPath } from '../../data/paths.js'
import { AssetArt } from '../../ui/AssetArt.jsx'
import { Modal } from '../../ui/Shared.jsx'
import { Icon } from '../../ui/Icons.jsx'
import { Companion } from '../components/Companion.jsx'
import { CHARACTER_ASSET_LABELS } from '../../domain/assets.js'
import { speak } from '../speech.js'
import { useNow } from '../hooks.js'

const timeLabel = (at) => new Date(at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
const greeting = (hour) => hour < 5 ? '夜深啦' : hour < 11 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好'

export function NowScene() {
  const { state } = useBedtimeState()
  return <NowContent key={state.activeProfileId} />
}

function NowContent() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const now = useNow()
  const profile = getActiveProfile(state)
  const accessibility = getAccessibility(state)
  const candidate = useMemo(() => deriveTodayCandidate(state, profile.id, new Date(now)), [state, profile.id, now])
  const resume = resumeActivity(state, profile.id)
  const question = childAssistantPrompt(state, profile.id)
  const [helpOpen, setHelpOpen] = useState(false)
  const [message, setMessage] = useState('')
  const hour = new Date(now).getHours()
  const night = hour >= 18 || hour < 6
  const mood = candidate.completed ? 'cheer' : candidate.paused ? 'calm' : candidate.free ? (night ? 'sleepy' : 'garden') : 'hello'
  const stateName = candidate.paused ? 'paused' : candidate.completed ? 'completed' : candidate.free ? 'free' : candidate.inProgress ? 'active' : 'ready'

  const send = (type, extra = {}) => dispatch({ type, profileId: profile.id, dateKey: localDateKey(new Date(now)), routineId: candidate.routineId, ...extra })
  const choose = (option) => {
    setMessage('')
    if (option.action === 'complete') { send('TODAY_COMPLETE_ITEM'); return }
    if (option.route) { navigate(option.route); return }
    send('TODAY_CHOOSE_ITEM', { itemId: option.id, itemTitle: option.title })
  }
  const later = () => { send('TODAY_LATER', { laterMinutes: 20 }); setHelpOpen(false); setMessage('先休息吧，准备好后随时可以回来。') }
  const support = (mode) => { send('TODAY_CHOOSE_SUPPORT', { supportMode: mode }); setHelpOpen(false); setMessage('已记下你的需要，请叫家长来陪一下。') }
  const say = `${candidate.title}。${candidate.subtitle}`

  return (
    <section className={`v3-now is-${stateName}`} aria-labelledby="v3-now-title">
      <div className="v3-scene-backdrop v3-now__backdrop" aria-hidden="true">
        <img src={appPath(night ? 'assets/v3/night-room-backdrop.webp' : 'assets/garden-world-landscape-v2.webp')} alt="" />
      </div>

      <div className="v3-now__stage">
        <p className="v3-now__hello v3-display">{greeting(hour)}，{profile.name}</p>
        <div className="v3-now__buddy">
          <button type="button" className="v3-bubble v3-now__bubble" onClick={() => speak(say, { muted: accessibility.soundOff })} aria-label={`听一听：${say}`}>
            <span><small>{candidate.context}</small>{candidate.subtitle}</span>
            <Icon name="volume" size={20} />
          </button>
          <Companion character={profile.character} mood={mood} label={`陪伴角色：${CHARACTER_ASSET_LABELS[profile.character] || '小伙伴'}`} />
        </div>
      </div>

      <article className="v3-now__card v3-felt" data-state={stateName}>
        <h1 id="v3-now-title" className="v3-display">{candidate.title}</h1>
        {candidate.paused ? <p className="v3-now__rest"><Icon name="clock" />约 <b className="v3-num">{timeLabel(candidate.laterUntil)}</b> 后再看看，也可以现在开始。</p> : null}

        {candidate.options.length ? (
          <div className="v3-tickets">
            {candidate.options.map((option, index) => (
              <button type="button" key={option.id} className={`v3-ticket ${option.action === 'complete' ? 'is-complete' : ''}`} style={{ '--i': index }} onClick={() => choose(option)}>
                <span className="v3-ticket__art"><AssetArt id={option.assetId || 'courage'} decorative /></span>
                <span className="v3-ticket__text">
                  <strong>{option.action === 'complete' ? '我做完了' : option.action === 'resume' ? `现在开始：${option.title}` : option.title}</strong>
                  <small>{option.action === 'complete' ? '把这件真实的小事收好' : option.estimatedMinutes ? `大约 ${option.estimatedMinutes} 分钟` : '按自己的节奏来'}</small>
                </span>
                <span className="v3-ticket__go" aria-hidden="true"><Icon name={option.action === 'complete' ? 'check' : 'chevron'} size={26} /></span>
              </button>
            ))}
          </div>
        ) : (
          <div className="v3-now__free">
            <button type="button" className="v3-button" onClick={() => navigate('/world')}><Icon name="sparkle" />去小队世界逛逛</button>
          </div>
        )}

        {candidate.supportActions.includes('help') || candidate.supportActions.includes('skip') ? (
          <div className="v3-now__support">
            {candidate.supportActions.includes('help') ? <button type="button" className="v3-chip" onClick={() => setHelpOpen(true)}><Icon name="heart" size={18} />需要帮助</button> : null}
            {candidate.supportActions.includes('later') ? <button type="button" className="v3-chip" onClick={later}><Icon name="clock" size={18} />稍后再做</button> : null}
            {candidate.supportActions.includes('skip') ? <button type="button" className="v3-chip v3-chip--quiet" onClick={() => { send('TODAY_SKIP'); setMessage('可以，今天先休息。成长不会被扣掉。') }}>今天先不做</button> : null}
          </div>
        ) : null}
        <p className="v3-now__status" role="status" aria-live="polite">{message}</p>
      </article>

      <div className="v3-now__side">
        <button type="button" className="v3-side-card" onClick={() => navigate(resume?.route || '/reading')}>
          <AssetArt id={resume?.assetId || 'story'} decorative />
          <span><small>{resume?.eyebrow || '还有一点自由时间？'}</small><strong>{resume?.title || '挑一本想读的书'}</strong></span>
        </button>
        {question ? (
          <button type="button" className="v3-side-card" onClick={() => navigate('/companion-question')}>
            <AssetArt id="heart" decorative />
            <span><small>{question.eyebrow}</small><strong>{question.question}</strong></span>
          </button>
        ) : null}
      </div>

      {helpOpen ? (
        <Modal title="需要哪种帮助" onClose={() => setHelpOpen(false)} className="v3-modal v3-help">
          <h2 className="v3-display">需要哪种帮助？</h2>
          <p>一起做，也是一种成长。选一个轻松的办法，再叫家长过来。</p>
          <div className="v3-help__choices">
            <button type="button" onClick={() => support('together')}><AssetArt id="heart" decorative /><strong>和家长一起做</strong></button>
            <button type="button" onClick={() => support('help')}><AssetArt id="courage" decorative /><strong>只帮我最难的一步</strong></button>
            <button type="button" onClick={later}><AssetArt id="pillow" decorative /><strong>先休息 20 分钟</strong></button>
          </div>
        </Modal>
      ) : null}
    </section>
  )
}
