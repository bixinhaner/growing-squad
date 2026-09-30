import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getActiveProfile } from '../../domain/model.js'
import { useBedtimeActions, useBedtimeState } from '../../store/useBedtime.js'
import { Buddy, Speak, Tap } from '../ui/kit.jsx'
import { openQuestion } from '../lib/kidModel.js'

const TONES = ['honey', 'sky', 'coral']

export function Ask() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const profile = getActiveProfile(state)
  const [prompt] = useState(() => openQuestion(state, profile.id))
  const [answer, setAnswer] = useState(null)
  const choose = (choice) => {
    dispatch({ type: 'RECORD_ASSISTANT_REFLECTION', profileId: profile.id, reflectionId: `reflection-${crypto.randomUUID()}`, promptId: prompt.id, answerId: choice.id, answer: choice.title })
    setAnswer(choice)
  }

  if (!prompt || answer) {
    return (
      <div className="k-panel k-ask is-done">
        <Buddy character={profile.character} mood={answer ? 'cheer' : 'calm'} />
        <h1 className="u-display">{answer ? `「${answer.title}」，我记住啦！` : '今天没有要问的问题'}</h1>
        <p>{answer ? '谢谢你告诉我。家长也会看到这句话。' : '去玩吧，想做什么都可以。'}</p>
        <Tap tone="primary" size="l" icon="home" onClick={() => navigate('/today')}>回首页</Tap>
      </div>
    )
  }
  return (
    <div className="k-panel k-ask">
      <div className="k-ask__who">
        <Buddy character={profile.character} mood="hello" />
        <p className="k-bubble"><span>{prompt.question}</span><Speak text={`${prompt.question}${prompt.choices.map((choice) => choice.title).join('，')}`} /></p>
      </div>
      <p className="k-note">没有标准答案，选最像你的一个。</p>
      <div className="k-ask__choices">
        {prompt.choices.map((choice, index) => (
          <button type="button" key={choice.id} className={`k-ask__choice is-${TONES[index % TONES.length]}`} onClick={() => choose(choice)}>
            <strong className="u-display">{choice.title}</strong>
            <small>{choice.copy}</small>
          </button>
        ))}
      </div>
      <Tap tone="quiet" size="s" onClick={() => navigate('/today')}>这次先不回答</Tap>
    </div>
  )
}
