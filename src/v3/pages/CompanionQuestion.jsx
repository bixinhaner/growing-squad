import { useNavigate } from 'react-router-dom'
import { getActiveProfile } from '../../domain/model.js'
import { childAssistantPrompt } from '../../modules/assistant/assistantModel.js'
import { useBedtimeActions, useBedtimeState } from '../../store/useBedtime.js'
import { Icon } from '../../ui/Icons.jsx'
import { Companion } from '../components/Companion.jsx'

const HUES = ['#f7c95a', '#9cc3e6', '#ef9f94']

export function CompanionQuestion() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const profile = getActiveProfile(state)
  const prompt = childAssistantPrompt(state, state.activeProfileId)
  const finish = (choice) => {
    if (choice) dispatch({ type: 'RECORD_ASSISTANT_REFLECTION', profileId: state.activeProfileId, reflectionId: `reflection-${crypto.randomUUID()}`, promptId: prompt.id, answerId: choice.id, answer: choice.title })
    navigate(-1)
  }

  if (!prompt) {
    return (
      <div className="companion-question v3-ask v3-ask--empty">
        <div className="v3-ask__buddy"><Companion character={profile.character} mood="calm" /></div>
        <section className="v3-ask__talk">
          <h1 className="v3-display">今天没有要回答的问题</h1>
          <p>你可以直接回去继续玩，任务和花园都不会受影响。</p>
          <button className="v3-button" type="button" onClick={() => navigate(-1)}>回到刚才</button>
        </section>
      </div>
    )
  }

  return (
    <div className="companion-question v3-ask">
      <div className="v3-ask__buddy">
        <Companion character={profile.character} mood="hello" />
      </div>
      <section className="v3-ask__talk" aria-labelledby="v3-ask-title">
        <p className="v3-ask__eyebrow">{prompt.eyebrow} · <small>不想回答可以跳过</small></p>
        <h1 id="v3-ask-title" className="v3-display v3-ask__question">{prompt.question}</h1>
        <p className="v3-ask__hint">没有标准答案，选最像你的一个。</p>
        <div className="v3-ask__choices">
          {prompt.choices.map((choice, index) => (
            <button type="button" key={choice.id} className="v3-felt" style={{ '--hue': HUES[index % HUES.length], '--i': index }} onClick={() => finish(choice)}>
              <span className="v3-ask__num v3-num" aria-hidden="true">{index + 1}</span>
              <b>{choice.title}</b>
              <small>{choice.copy}</small>
              <Icon name="chevron" />
            </button>
          ))}
        </div>
        <button className="v3-ask__skip" type="button" onClick={() => finish(null)}>这次先不回答</button>
      </section>
    </div>
  )
}
