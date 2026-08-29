import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deriveTodayCandidate } from '../core/today/todayEngine.js'
import { localDateKey } from '../domain/model.js'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { AssetArt } from '../ui/AssetArt.jsx'
import { Icon } from '../ui/Icons.jsx'
import { appPath } from '../data/paths.js'
import { childAssistantPrompt } from '../modules/assistant/assistantModel.js'

const supportCopy = {
  together: { label: '和家长一起', icon: 'heart' },
  help: { label: '需要帮助', icon: 'bell' },
  skip: { label: '今天先不做', icon: 'home' },
}

export function TodayPage() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const profileId = state.activeProfileId
  const candidate = useMemo(() => deriveTodayCandidate(state, profileId), [profileId, state])
  const companionPrompt = useMemo(() => childAssistantPrompt(state, profileId), [profileId, state])
  const dateKey = localDateKey()

  const choose = (option) => {
    if (option.route) return navigate(option.route)
    if (option.action === 'complete') {
      dispatch({ type: 'TODAY_COMPLETE_ITEM', profileId, dateKey })
      setMessage('记下啦，接下来是你的时间。')
      return
    }
    dispatch({ type: 'TODAY_CHOOSE_ITEM', profileId, dateKey, routineId: candidate.routineId, itemId: option.id })
    setMessage(`好，我们先做“${option.title}”。`)
  }

  const support = (mode) => {
    if (mode === 'skip') {
      dispatch({ type: 'TODAY_SKIP', profileId, dateKey, routineId: candidate.routineId })
      setMessage('可以，今天先不做。不会扣掉任何东西。')
      return
    }
    dispatch({ type: 'TODAY_CHOOSE_SUPPORT', profileId, dateKey, supportMode: mode })
    setMessage(mode === 'help' ? '已经告诉家长：你需要一点帮助。' : '好，和家长一起开始。')
  }

  const later = () => {
    dispatch({ type: 'TODAY_LATER', profileId, dateKey, laterMinutes: 20 })
    setMessage('好，先休息一会儿，20 分钟后再看看。')
  }

  return (
    <section className={`today-page today-page--${candidate.period}`} aria-labelledby="today-title">
      <aside className="today-scene" aria-hidden="true">
        <img src={appPath('assets/platform/today-companion-scene.webp')} alt="" />
        <span>慢慢来，一次只做一件</span>
      </aside>
      <article className={`today-card ${candidate.free ? 'today-card--free' : ''}`}>
        <div className="today-module-entries" aria-label="成长探索">
          <button className="today-movement-entry" type="button" onClick={() => navigate('/movement')}><img src={appPath('assets/movement/balloon-keep-up.webp')} alt="" /><span><small>运动小队</small><strong>选一个好玩的活动</strong></span><Icon name="chevron" /></button>
          <button className="today-reading-entry" type="button" onClick={() => navigate('/reading')}><img src={appPath('assets/reading/hedgehog-lantern.webp')} alt="" /><span><small>故事树屋</small><strong>选一本家里的书</strong></span><Icon name="chevron" /></button>
          <button className="today-responsibility-entry" type="button" onClick={() => navigate('/family-cottage')}><img src={appPath('assets/responsibility/place-settings.webp')} alt="" /><span><small>家庭小屋</small><strong>看看我的小角色</strong></span><Icon name="chevron" /></button>
          <button className="today-inventor-entry" type="button" onClick={() => navigate('/inventor')}><img src={appPath('assets/inventor/hair-robot-prototype-v1.webp')} alt="" /><span><small>发明家工坊</small><strong>让我的想法往前走一步</strong></span><Icon name="chevron" /></button>
        </div>
        {companionPrompt ? <button className="today-companion-question" type="button" onClick={() => navigate('/companion-question')}><img src={appPath('assets/assistant/assistant-hero.webp')} alt="" /><span><small>{companionPrompt.eyebrow}</small><strong>{companionPrompt.question}</strong></span><Icon name="chevron" /></button> : null}
        <span className="today-context">{candidate.context}</span>
        <h1 id="today-title">{candidate.title}</h1>
        <p>{candidate.subtitle}</p>
        {candidate.options.length ? (
          <div className={`today-options ${candidate.options.length === 1 ? 'today-options--single' : ''}`}>
            {candidate.options.map((option) => (
              <button key={option.id} type="button" onClick={() => choose(option)}>
                <AssetArt id={option.assetId} label="" decorative />
                <strong>{option.action === 'complete' ? '我做完了' : option.title}</strong>
                {option.estimatedMinutes ? <small>大约 {option.estimatedMinutes} 分钟</small> : null}
              </button>
            ))}
          </div>
        ) : <div className="today-free-art"><AssetArt id={candidate.completed ? 'courage' : 'park'} decorative /><strong>{candidate.completed ? '这次成长已经装进背包' : '去做喜欢的事吧'}</strong></div>}
        {candidate.options.length > 1 ? <div className="today-choice-hint"><Icon name="sparkle" size={17} /> 选一个就好</div> : null}
        {candidate.supportActions.some((action) => supportCopy[action]) ? (
          <div className="today-supports" aria-label="需要其他方式吗">
            {candidate.supportActions.filter((action) => supportCopy[action]).map((action) => (
              <button key={action} type="button" onClick={() => support(action)}><Icon name={supportCopy[action].icon} /><span>{supportCopy[action].label}</span></button>
            ))}
          </div>
        ) : null}
        {candidate.supportActions.includes('later') ? <button type="button" className="today-later" onClick={later}>稍后再看</button> : null}
        <img className="today-card__mobile-mascot" src={appPath('assets/mascot-garden.webp')} alt="" />
        <div className="sr-live" aria-live="polite">{message}</div>
        {message ? <div className="today-toast" role="status">{message}</div> : null}
      </article>
    </section>
  )
}
