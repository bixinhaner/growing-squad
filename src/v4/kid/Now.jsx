import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getActiveProfile, getSession, localDateKey } from '../../domain/model.js'
import { deriveTodayCandidate } from '../../core/today/todayEngine.js'
import { resumeActivity } from '../../core/activity/activitySelectors.js'
import { petFor } from '../../modules/pets/petModel.js'
import { useBedtimeActions, useBedtimeState } from '../../store/useBedtime.js'
import { AssetArt } from '../../ui/AssetArt.jsx'
import { Icon } from '../ui/Icon.jsx'
import { Buddy, Sheet, Speak, Tap } from '../ui/kit.jsx'
import { useToast } from '../ui/toast.js'
import { clockLabel, useDaypart, useNow } from '../lib/hooks.js'
import { TonightPath } from './TonightPath.jsx'
import { openQuestion } from '../lib/kidModel.js'

const HELLO = { morning: '早上好', afternoon: '下午好', evening: '晚上好', night: '晚上好' }

export function Now() {
  const { state } = useBedtimeState()
  return <NowFor key={state.activeProfileId} />
}

function NowFor() {
  const { state } = useBedtimeState()
  const now = useNow()
  const profile = getActiveProfile(state)
  const candidate = useMemo(() => deriveTodayCandidate(state, profile.id, new Date(now)), [state, profile.id, now])
  // In the evening the bedtime path *is* the home screen: one less tap for a sleepy child.
  if (candidate.moduleId === 'bedtime') return <TonightPath home />
  return <DayMoment candidate={candidate} now={now} />
}

function DayMoment({ candidate, now }) {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const toast = useToast()
  const daypart = useDaypart()
  const profile = getActiveProfile(state)
  const resume = resumeActivity(state, profile.id)
  const question = openQuestion(state, profile.id)
  const pet = petFor(state, profile.id)
  const [helpOpen, setHelpOpen] = useState(false)
  const settled = getSession(state, localDateKey(new Date(now)))?.status === 'goodnight'
  const mood = settled ? 'sleepy' : candidate.completed ? 'cheer' : candidate.paused ? 'calm' : candidate.free ? 'garden' : 'hello'
  const bubble = settled ? '今晚已经准备好了，放下屏幕，安心休息吧。'
    : candidate.inProgress ? `去做吧：${candidate.options[0]?.title}。做完回来告诉我。`
      : candidate.free ? '现在是你的自由时间。想玩什么都可以。'
        : candidate.subtitle

  const send = (type, extra = {}) => dispatch({ type, profileId: profile.id, dateKey: localDateKey(new Date(now)), routineId: candidate.routineId, ...extra })
  const choose = (option) => {
    if (option.action === 'complete') { send('TODAY_COMPLETE_ITEM'); toast('做好啦！这件事收进你的宝盒了。'); return }
    if (option.route) { navigate(option.route); return }
    send('TODAY_CHOOSE_ITEM', { itemId: option.id, itemTitle: option.title })
  }
  const later = () => { send('TODAY_LATER', { laterMinutes: 20 }); setHelpOpen(false); toast('先休息一下，20 分钟后再来看看。') }
  const support = (mode) => { send('TODAY_CHOOSE_SUPPORT', { supportMode: mode }); setHelpOpen(false); toast('已经告诉家长了，请叫家长过来一下。') }
  const skip = () => { send('TODAY_SKIP'); toast('好的，今天先休息。不会扣掉任何东西。') }

  const doing = candidate.inProgress ? candidate.options[0] : null
  const also = [
    { id: 'world', title: '星光世界', art: 'park', to: '/world' },
    { id: 'pet', title: pet ? pet.name : '小伙伴', art: 'heart', to: '/pet' },
    { id: 'box', title: '我的宝盒', art: 'surprise', to: '/box' },
  ]

  return (
    <section className="k-now" data-state={settled ? 'settled' : candidate.completed ? 'done' : candidate.paused ? 'paused' : candidate.free ? 'free' : doing ? 'doing' : 'choose'} aria-labelledby="k-now-title">
      <div className="k-now__buddy">
        <p className="k-bubble">
          <span>{bubble}</span>
          <Speak text={bubble} />
        </p>
        <Buddy character={profile.character} mood={mood} label={`${profile.name}的小伙伴`} />
      </div>

      <article className="k-focus">
        <span className="k-focus__when">{HELLO[daypart]}，{profile.name} · {candidate.context}</span>
        <h1 id="k-now-title" className="u-display">{doing ? doing.title : candidate.title}</h1>

        {doing ? (
          <div className="k-doing">
            <span className="k-doing__art"><AssetArt id={doing.assetId || 'courage'} decorative /></span>
            <Tap tone="primary" size="xl" block icon="check" onClick={() => choose({ ...doing, action: 'complete' })}>我做完了</Tap>
          </div>
        ) : candidate.options.length ? (
          <>
            {candidate.paused ? <p className="k-focus__note"><Icon name="clock" size={18} />休息到 <b className="u-num">{clockLabel(candidate.laterUntil)}</b>，也可以现在就开始</p> : null}
            <div className="k-pick" data-count={candidate.options.length}>
              {candidate.options.map((option) => (
                <button type="button" key={option.id} className="u-tile k-pick__tile" onClick={() => choose(option)}>
                  <AssetArt id={option.assetId || 'courage'} decorative />
                  <strong>{option.title}</strong>
                  <small>{option.estimatedMinutes ? `大约 ${option.estimatedMinutes} 分钟` : '按自己的节奏来'}</small>
                </button>
              ))}
            </div>
          </>
        ) : settled ? (
          <div className="k-focus__actions">
            <Tap tone="night" size="l" icon="moon" onClick={() => navigate('/goodnight')}>去说晚安</Tap>
            <Tap tone="soft" size="l" onClick={() => navigate('/garden')}>看看月亮花</Tap>
          </div>
        ) : (
          <div className="k-focus__actions">
            <Tap tone="primary" size="l" icon="sparkle" onClick={() => navigate('/world')}>去玩一会儿</Tap>
          </div>
        )}

        {candidate.supportActions.length ? (
          <div className="k-focus__support">
            {candidate.supportActions.includes('help') ? <Tap tone="soft" size="s" icon="hand" onClick={() => setHelpOpen(true)}>需要帮忙</Tap> : null}
            {candidate.supportActions.includes('later') ? <Tap tone="soft" size="s" icon="clock" onClick={later}>等一会儿</Tap> : null}
            {candidate.supportActions.includes('skip') ? <Tap tone="quiet" size="s" onClick={skip}>今天先不做</Tap> : null}
          </div>
        ) : null}
      </article>

      <nav className="k-also" aria-label="我还可以">
        {resume ? (
          <button type="button" className="k-also__resume" onClick={() => navigate(resume.route)}>
            <AssetArt id={resume.assetId} decorative />
            <span><small>{resume.eyebrow}</small><strong>{resume.title}</strong></span>
            <Icon name="chevron" />
          </button>
        ) : null}
        {question ? (
          <button type="button" className="k-also__resume is-question" onClick={() => navigate('/ask')}>
            <AssetArt id="heart" decorative />
            <span><small>小伙伴想问你</small><strong>{question.question}</strong></span>
            <Icon name="chevron" />
          </button>
        ) : null}
        <div className="k-also__doors">
          {also.map((item) => (
            <button type="button" key={item.id} className="u-tile k-also__door" onClick={() => navigate(item.to)}>
              <AssetArt id={item.art} decorative />
              <strong>{item.title}</strong>
            </button>
          ))}
        </div>
      </nav>

      {helpOpen ? (
        <Sheet title="需要哪种帮忙？" onClose={() => setHelpOpen(false)}>
          <p className="k-sheet-lead">选一个，再去叫家长。一起做也是长大。</p>
          <div className="k-choices">
            <button type="button" className="u-tile" onClick={() => support('together')}><AssetArt id="heart" decorative /><strong>和家长一起做</strong></button>
            <button type="button" className="u-tile" onClick={() => support('help')}><AssetArt id="courage" decorative /><strong>只帮我最难的一步</strong></button>
            <button type="button" className="u-tile" onClick={later}><AssetArt id="pillow" decorative /><strong>先休息 20 分钟</strong></button>
          </div>
        </Sheet>
      ) : null}
    </section>
  )
}
