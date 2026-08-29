import { useNavigate } from 'react-router-dom'
import { appPath } from '../data/paths.js'
import { childAssistantPrompt } from '../modules/assistant/assistantModel.js'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { Icon } from '../ui/Icons.jsx'

export function CompanionQuestionPage() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const prompt = childAssistantPrompt(state, state.activeProfileId)
  const finish = (choice) => {
    if (choice) dispatch({ type: 'RECORD_ASSISTANT_REFLECTION', profileId: state.activeProfileId, reflectionId: `reflection-${crypto.randomUUID()}`, promptId: prompt.id, answerId: choice.id, answer: choice.title })
    navigate(-1)
  }
  if (!prompt) return <main className="companion-question companion-question--empty"><img src={appPath('assets/assistant/assistant-hero.webp')} alt="眠眠在家庭观察台旁等待" /><h1>今天没有要回答的问题</h1><p>你可以直接回去继续玩，任务和花园都不会受影响。</p><button className="button button--primary" type="button" onClick={() => navigate(-1)}>回到刚才</button></main>
  return <main className="companion-question">
    <header><button type="button" aria-label="返回" onClick={() => finish(null)}><Icon name="close" /></button><span>{prompt.eyebrow}</span><small>不想回答可以跳过</small></header>
    <div className="companion-question__art"><img src={appPath('assets/assistant/assistant-hero.webp')} alt="眠眠带着一个小问题来陪你" /></div>
    <section><h1>{prompt.question}</h1><p>没有标准答案，选最像你的一个。</p><div>{prompt.choices.map((choice, index) => <button type="button" key={choice.id} onClick={() => finish(choice)}><span>{index + 1}</span><b>{choice.title}</b><small>{choice.copy}</small><Icon name="chevron" /></button>)}</div><button className="companion-question__skip" type="button" onClick={() => finish(null)}>这次先不回答</button></section>
  </main>
}
