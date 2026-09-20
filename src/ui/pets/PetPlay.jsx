import { useEffect, useRef, useState } from 'react'
import { PET_GAMES, PET_SKILLS, PET_STORIES } from '../../modules/pets/petCatalog.js'
import { PLAY_MS } from '../../modules/pets/petModel.js'
import { PetActor, PetProp } from './PetArt.jsx'

export function PetPlay({ pet, session, others = [], onFinish, quiet = false }) {
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [response, setResponse] = useState('')
  const [choices, setChoices] = useState([])
  const [elapsed, setElapsed] = useState(() => Math.max(0, Date.now() - session.startedAt))
  const finished = useRef(false)
  const timeoutRef = useRef(null)
  const finishRef = useRef(onFinish)
  useEffect(() => { finishRef.current = onFinish }, [onFinish])
  useEffect(() => {
    const end = () => { if (!finished.current) { finished.current = true; Promise.resolve(finishRef.current(false, [])).then((ok) => { if (ok === false) finished.current = false }) } }
    const timer = window.setInterval(() => { const ms = Math.max(0, Date.now() - session.startedAt); setElapsed(ms); if (ms >= PLAY_MS) end() }, 500)
    const hide = () => { if (document.hidden) end() }
    if (quiet) end()
    document.addEventListener('visibilitychange', hide)
    return () => { window.clearInterval(timer); window.clearTimeout(timeoutRef.current); document.removeEventListener('visibilitychange', hide) }
  }, [session.startedAt, quiet])
  const skill = PET_SKILLS.find((s) => session.game === `skill-${s.id}`)
  const game = PET_GAMES.find((g) => g.id === session.game)
  const story = session.game.startsWith('story-') ? PET_STORIES[session.game.slice(6)] : null
  const title = skill?.name || game?.name || '一起玩一小轮'
  const finish = (complete) => { if (finished.current) return; finished.current = true; Promise.resolve(onFinish(complete, choices)).then((ok) => { if (ok === false) finished.current = false }) }
  const animate = (message, choice) => {
    if (busy) return
    setBusy(true); setResponse(message)
    if (choice) setChoices((items) => [...items, choice])
    timeoutRef.current = window.setTimeout(() => { setStep((s) => s + 1); setBusy(false) }, 1100)
  }
  const target = (session.id.charCodeAt(session.id.length - 1) + step) % 3
  const achieved = story ? step >= story.length : skill ? step >= 3 : session.game === 'blocks' ? choices.length >= 3 : step >= 3
  return <section className="pet-play" aria-label={title}>
    <div className="pet-play-heading"><div><span className="pet-eyebrow">一小轮，不赶时间</span><h2>{title}</h2></div><span className="pet-chip">最多 1 分钟</span></div>
    <div className={`pet-play-stage pet-play-stage--${session.game}`}>
      {session.game === 'hide' && !achieved ? <div className="pet-hide-places">{[0,1,2].map((index) => <button key={index} type="button" aria-label={`找找第 ${index + 1} 个小窝`} onClick={() => { if (index === target) animate('找到啦！再换个地方。', `找到了第${index + 1}个小窝`); else setResponse(`听，${['左边', '中间', '右边'][target]}有轻轻的动静。`) }} disabled={busy}>
        {index === target ? <PetActor species={pet.species} size="baby" motion="peek" /> : null}<PetProp kind="tent" /><span>{index + 1}</span>
      </button>)}</div> : <>
        <PetActor species={pet.species} pose={achieved ? 'celebrate' : busy ? 'celebrate' : 'wave'} motion={busy ? skill?.id === 'spin' ? 'spin' : skill?.id === 'tidy' ? 'tidy' : 'play' : 'idle'} size="young" />
        {session.game === 'ball' ? <PetProp kind="ball" className={`pet-play-ball ${pet.placed.toy === 'star-ball' ? 'pet-play-ball--star' : 'pet-play-ball--plain'} ${busy ? 'is-rolling' : ''}`} /> : null}
        {session.game === 'blocks' ? <div className="pet-built-blocks" aria-label={`已经放了 ${choices.length} 块积木`}>{choices.map((color, index) => <span key={index} className={`pet-block pet-block--${color}`} />)}</div> : null}
        {skill?.id === 'tidy' ? <PetProp kind="basket" className="pet-play-ball" /> : null}
        {skill?.id === 'spin' ? <PetProp kind="ribbon" className="pet-play-ball" /> : null}
        {story ? <PetProp kind={game.art} className="pet-play-ball" /> : null}
        {session.game === 'family' ? <div className="pet-visitors">{others.length ? others.slice(0, 2).map((other) => <span key={other.id}><PetActor species={other.species} pose="wave" size="baby" /><small>{other.name}</small></span>) : <PetProp kind="heart" />}</div> : null}
      </>}
    </div>
    <p className="pet-play-response" role="status">{response || (achieved ? '这一小轮收好啦。下次从这里继续。' : game?.copy || skill?.copy)}</p>
    {!achieved ? <div className="pet-play-controls">
      {session.game === 'ball' ? <button className="pet-button" type="button" disabled={busy} onClick={() => animate('接住啦，轻轻推回来！', '一起滚球')}>{busy ? '球滚回来了…' : '把球轻轻推过去'}</button> : null}
      {session.game === 'blocks' ? <>{['yellow', 'green', 'blue'].map((color, index) => <button key={color} className="pet-button pet-button--soft" type="button" onClick={() => { setChoices((items) => [...items, color]); setResponse('这块稳稳地放上去了。') }} aria-label={`放一块${['黄色', '绿色', '蓝色'][index]}积木`}><span className={`pet-block pet-block--${color}`} />{['黄色', '绿色', '蓝色'][index]}</button>)}</> : null}
      {skill ? <><div className="pet-practice-dots" aria-label={`这一轮试了 ${step} 次，共 3 次`}>{[0,1,2].map((i) => <span key={i} data-done={i < step}>✦</span>)}</div><button className="pet-button" type="button" disabled={busy} onClick={() => animate(['先看一看，再跟着试。','这一回更稳啦。','记住这个小动作啦。'][step], `练习${skill.name}`)}>{busy ? '它正在试…' : step ? '再一起试一下' : '一起学这个动作'}</button></> : null}
      {story ? <div className="pet-story-choice"><h3>{story[step].title}</h3>{response ? <button type="button" className="pet-button" onClick={() => { setResponse(''); setStep((s) => s + 1) }}>接着看</button> : story[step].choices.map((choice, index) => <button className="pet-button pet-button--soft" key={choice} type="button" onClick={() => { setChoices((old) => [...old, choice]); setResponse(story[step].response[index]) }}>{choice}</button>)}</div> : null}
      {session.game === 'family' ? <><p>{others.length ? '伙伴们一起演一段小故事；这里只记录你这次的参与。' : '其他伙伴破壳后也能来见面，今天先布置花园吧。'}</p><button className="pet-button" type="button" disabled={busy} onClick={() => animate(['先铺好一块小毯子。','小点心摆好了。','大家挥挥手，下次再来。'][step], ['铺毯子','摆点心','打招呼'][step])}>{['一起铺毯子','摆上小点心','挥手打招呼'][step]}</button></> : null}
    </div> : <button className="pet-button" type="button" disabled={elapsed < 3000} onClick={() => finish(true)}>{story ? '收下这段故事' : skill ? '收下这次小进步' : '这一轮玩好啦'}</button>}
    <footer className="pet-play-footer"><span>{elapsed >= 45000 ? '这一轮快到收尾时间啦。' : '随时可以停，不扣星光，也不会难过。'}</span><button className="pet-text-button" type="button" onClick={() => finish(false)}>现在回小屋</button></footer>
  </section>
}
