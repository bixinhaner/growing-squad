import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { appPath } from '../../data/paths.js'
import { useBedtimeActions, useBedtimeState } from '../../store/useBedtime.js'
import { Icon } from '../../ui/Icons.jsx'
import { IDEA_SEEDS, INVENTOR_STAGES, SHOWCASE_METHODS, inventorImage, inventorStage, inventorTemplate, knowledgeImage } from '../../modules/inventor/inventorCatalog.js'
import { activeInventorProject, inventorProject, inventorProjects, projectArtifacts, projectStory, stageIndex } from '../../modules/inventor/inventorModel.js'
import { inventorMediaBlob, saveInventorMedia } from '../../modules/inventor/inventorMedia.js'

function StageTrail({ status }) {
  const current = stageIndex(status)
  return (
    <ol className="v3-trail" aria-label={`当前：${inventorStage(status).short}`}>
      {INVENTOR_STAGES.map((stage, index) => (
        <li key={stage.id} className={index === current ? 'is-current' : index < current ? 'is-past' : ''} aria-current={index === current ? 'step' : undefined}>
          <b className="v3-num">{index < current ? <Icon name="check" size={14} /> : index + 1}</b><small>{stage.short}</small>
        </li>
      ))}
    </ol>
  )
}

function ArtifactPreview({ artifact }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    let active = true
    let objectUrl = ''
    inventorMediaBlob(artifact).then((blob) => { if (!active || !blob) return; objectUrl = URL.createObjectURL(blob); setUrl(objectUrl) }).catch(() => {})
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [artifact])
  if (!url) return <span className="v3-media__placeholder"><Icon name="image" />资料等待加载</span>
  if (artifact.kind === 'audio') return <audio src={url} controls preload="metadata" />
  if (artifact.kind === 'video') return <video src={url} controls preload="metadata" />
  return <img src={url} alt={artifact.fileName || '项目资料'} />
}

function MediaDock({ project, stage, versionNumber = 1 }) {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const [message, setMessage] = useState('')
  const artifacts = projectArtifacts(state, project.id).filter((a) => a.stage === stage)
  const attach = async (file) => {
    if (!file) return
    try {
      const draft = await saveInventorMedia({ file, projectId: project.id, profileId: project.profileId, stage, versionNumber })
      dispatch({ type: 'ADD_INVENTOR_ARTIFACT', profileId: project.profileId, projectId: project.id, versionNumber, artifact: { id: draft.id, projectId: project.id, kind: draft.kind, mediaType: draft.mediaType, fileName: draft.fileName, byteSize: draft.byteSize, stage, status: 'local' } })
      setMessage('已保存在本机，联网后尝试同步到家庭设备。')
    } catch (error) { setMessage(error.message) }
  }
  const choices = [
    { kind: 'photo', label: stage === 'testing' ? '拍下测试' : `拍下第${versionNumber === 1 ? '一' : '二'}版`, accept: 'image/jpeg,image/png,image/webp', capture: 'environment', icon: 'image' },
    { kind: 'audio', label: '添加我的语音', accept: 'audio/*', capture: 'user', icon: 'bell' },
    { kind: 'video', label: '添加演示视频', accept: 'video/mp4,video/webm,video/quicktime', capture: 'environment', icon: 'play' },
  ]
  return (
    <div className="v3-media">
      <div className="v3-media__actions">
        {choices.map((choice) => (
          <label key={choice.kind}>
            <Icon name={choice.icon} /><span>{choice.label}</span>
            <input type="file" accept={choice.accept} capture={choice.capture} aria-label={choice.label} onChange={(e) => { attach(e.target.files?.[0]); e.target.value = '' }} />
          </label>
        ))}
      </div>
      {artifacts.length ? <div className="v3-media__list">{artifacts.map((a) => <figure key={a.id}><ArtifactPreview artifact={a} /><figcaption>{a.status === 'synced' ? '已同步' : '等网络恢复'}</figcaption></figure>)}</div> : null}
      {message ? <p className="v3-status" role="status">{message}</p> : null}
    </div>
  )
}

export function InventorWorkshop() {
  const { state } = useBedtimeState()
  const navigate = useNavigate()
  const active = activeInventorProject(state)
  const projects = inventorProjects(state)
  const openProject = (p) => navigate(p.status === 'archived' || p.status === 'showcase' ? `/inventor/showcase/${p.id}` : `/inventor/project/${p.id}`)
  const fresh = IDEA_SEEDS.filter((seed) => !projects.some((p) => p.seedId === seed.id)).slice(0, 2)
  return (
    <div className="v3-room v3-inv" aria-labelledby="inventor-workshop-title">
      <header className="v3-room__banner">
        <img className="v3-room__art" src={appPath('assets/inventor/workshop-hero.webp')} alt="温暖的纸板原型工坊" />
        <div className="v3-room__copy">
          <span className="v3-eyebrow">今天只往前走一小步</span>
          <h1 id="inventor-workshop-title" className="v3-display">发明家工坊</h1>
          <p>从一个小麻烦开始，试出自己的办法。测试发现是线索，不是失败。</p>
        </div>
      </header>

      {active ? (
        <section className="v3-inv__bench v3-felt" aria-label="正在做的发明">
          <div className="v3-inv__bench-head">
            <div><span className="v3-eyebrow">正在做的发明</span><h2 className="v3-display">{active.title}</h2><p>{active.problem}</p></div>
            <button className="v3-button v3-button--wool" type="button" onClick={() => navigate('/inventor/new')}>收下新想法</button>
          </div>
          <StageTrail status={active.status} />
          <button className="v3-feature" type="button" onClick={() => navigate(active.status === 'showcase' ? `/inventor/showcase/${active.id}` : `/inventor/project/${active.id}`)}>
            <img src={inventorImage(inventorStage(active.status).image, active.seedId)} alt="" />
            <span><small>{inventorStage(active.status).short} · {inventorStage(active.status).title}</small><strong className="v3-display">继续往前走</strong></span>
            <Icon name="chevron" />
          </button>
        </section>
      ) : (
        <section className="v3-inv__start v3-felt">
          <span className="v3-eyebrow">先从生活里找一找</span>
          <h2 className="v3-display">有什么小麻烦，想换个办法？</h2>
          <p>不用先学课程，也不用一次想完整。</p>
          <button className="v3-button" type="button" onClick={() => navigate('/inventor/new')}><Icon name="sparkle" />发现我的第一个想法</button>
        </section>
      )}

      {projects.some((p) => p.id !== active?.id) || fresh.length ? (
        <>
          <h2 className="v3-room__label">工坊架子上</h2>
          <div className="v3-tiles">
            {projects.filter((p) => p.id !== active?.id).map((p, index) => (
              <button type="button" className="v3-tile" key={p.id} style={{ '--i': index }} onClick={() => openProject(p)}>
                <img src={inventorImage('showcase', p.seedId)} alt="" />
                <strong>{p.title}</strong><small>{p.status === 'archived' ? '已收进工坊' : inventorStage(p.status).short}</small>
              </button>
            ))}
            {fresh.map((seed, index) => (
              <button type="button" className="v3-tile v3-tile--seed" key={seed.id} style={{ '--i': index + 2 }} onClick={() => navigate(`/inventor/new?seed=${seed.id}`)}>
                <img src={inventorImage(seed.image, seed.id)} alt="" />
                <strong>{seed.title}</strong><small>先收下这个灵感</small>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

export function InventorNew() {
  const { state } = useBedtimeState()
  return <NewIdea key={state.activeProfileId} />
}

function NewIdea() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const [seedId, setSeedId] = useState(new URLSearchParams(window.location.search).get('seed') || 'hair-robot')
  const [helpsWho, setHelpsWho] = useState('我自己')
  const [title, setTitle] = useState('')
  const [problem, setProblem] = useState('')
  const [pendingId, setPendingId] = useState('')
  const seed = IDEA_SEEDS.find((s) => s.id === seedId) || IDEA_SEEDS[0]
  const custom = seed.id === 'my-idea'
  useEffect(() => { if (pendingId && inventorProject(state, pendingId)) navigate(`/inventor/project/${pendingId}`) }, [state, pendingId, navigate])
  const create = () => {
    if (pendingId || (custom && (!title.trim() || !problem.trim()))) return
    const projectId = `project_${crypto.randomUUID()}`
    setPendingId(projectId)
    dispatch({ type: 'CREATE_INVENTOR_PROJECT', profileId: state.activeProfileId, projectId, project: { id: projectId, seedId: seed.id, title: custom ? title.trim() : seed.title, problem: custom ? problem.trim() : seed.problem, helpsWho: [helpsWho], status: 'sketching', nextQuestion: '我先想到什么办法？', versions: [{ number: 1, idea: '先做一个能试的版本', artifactIds: [] }] } })
  }
  return (
    <div className="v3-room v3-inv-page">
      <header className="v3-inv-page__head">
        <img src={inventorImage('problem', seed.id)} alt="发明工坊的灵感示意" />
        <div><span className="v3-eyebrow">好的发明都从一个小麻烦开始</span><h1 className="v3-display">我发现了什么麻烦？</h1></div>
      </header>
      <div className="v3-pick" role="group" aria-label="小麻烦">
        {IDEA_SEEDS.map((s) => (
          <button type="button" className={seed.id === s.id ? 'is-selected' : ''} aria-pressed={seed.id === s.id} key={s.id} onClick={() => setSeedId(s.id)}>
            <img src={inventorImage(s.image, s.id)} alt="" />
            <span><strong>{s.problem}</strong><small>{s.title}</small></span>
          </button>
        ))}
      </div>
      {custom ? (
        <div className="v3-inv-page__custom">
          <label className="v3-field">给想法起个名字<input maxLength={40} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="可以请家长帮忙写" /></label>
          <label className="v3-field">我想解决的小麻烦<textarea maxLength={300} value={problem} onChange={(e) => setProblem(e.target.value)} /></label>
        </div>
      ) : null}
      <h2 className="v3-room__label">我想帮助谁？</h2>
      <div className="v3-chips" role="group" aria-label="我想帮助谁">
        {['我自己', '家人', '大家'].map((who) => <button type="button" aria-pressed={helpsWho === who} key={who} onClick={() => setHelpsWho(who)}>{who}</button>)}
      </div>
      <p className="v3-note"><Icon name="shield" size={18} />{inventorTemplate(seed.id).safety}</p>
      <div className="v3-actions v3-actions--row">
        <button className="v3-button" type="button" disabled={Boolean(pendingId) || (custom && (!title.trim() || !problem.trim()))} onClick={create}>{pendingId ? '正在收好想法…' : '把这个想法收进工坊'}</button>
        <button className="v3-textlink" type="button" onClick={() => navigate('/inventor')}>先放一放</button>
      </div>
    </div>
  )
}

function ProjectShell({ project, status, image, children }) {
  const navigate = useNavigate()
  return (
    <div className="v3-room v3-inv-project">
      <div className="v3-inv-project__top">
        <button className="v3-button v3-button--wool v3-inv-project__home" type="button" onClick={() => navigate('/inventor')}><Icon name="home" size={18} />回工坊</button>
        <span className="v3-inv-project__name">{project.title}</span>
      </div>
      <StageTrail status={status} />
      <div className="v3-inv-project__body">
        <img className="v3-inv-project__art" src={inventorImage(image, project.seedId)} alt={`${project.title}的工坊示意`} />
        <section className="v3-inv-project__sheet">{children}</section>
      </div>
    </div>
  )
}

function StagePage({ project }) {
  const { dispatch } = useBedtimeActions()
  const status = project.status
  const advance = (next) => dispatch({ type: 'UPDATE_INVENTOR_STAGE', profileId: project.profileId, projectId: project.id, status: next })
  if (status === 'testing') return <TestingPage key={project.id} project={project} />
  if (status === 'learning') return <LearningPage project={project} />
  const stage = inventorStage(status)
  const next = status === 'sketching' || status === 'problem_defined' ? 'prototype_1' : status === 'prototype_1' ? 'testing' : 'showcase'
  return (
    <ProjectShell project={project} status={status} image={stage.image}>
      <h1 className="v3-display">{status === 'iteration' ? '带着线索做第二版' : stage.title}</h1>
      <p className="v3-split__lead">{status === 'iteration' ? project.nextChangeTitle || '只改最想先解决的地方。' : '不用完美，能把自己的想法试出来就好。'}</p>
      <p className="v3-inv-safety"><Icon name="shield" size={18} />{inventorTemplate(project.seedId).safety}</p>
      <MediaDock project={project} stage={status} versionNumber={status === 'iteration' ? 2 : 1} />
      <button className="v3-button v3-inv-next" type="button" onClick={() => advance(next)}>{next === 'prototype_1' ? '草图准备好啦' : next === 'testing' ? '第一版准备试一试' : '第二版准备讲给家人听'}</button>
    </ProjectShell>
  )
}

function TestingPage({ project }) {
  const { dispatch } = useBedtimeActions()
  const template = inventorTemplate(project.seedId)
  const [finding, setFinding] = useState(template.findings[0].id)
  const [change, setChange] = useState(template.changes[0].id)
  const [words, setWords] = useState('')
  const record = () => {
    const f = template.findings.find((v) => v.id === finding)
    const c = template.changes.find((v) => v.id === change)
    dispatch({ type: 'RECORD_INVENTOR_TEST', profileId: project.profileId, projectId: project.id, finding, findingTitle: words.trim() || f.title, nextChange: change, nextChangeTitle: c.title, nextQuestion: `怎样${c.title}？` })
  }
  return (
    <ProjectShell project={project} status="testing" image="testing">
      <h1 className="v3-display">这次试出了什么？</h1>
      <p className="v3-split__lead">这不是失败，是第一版告诉我们的新线索</p>
      <p className="v3-inv-safety"><Icon name="shield" size={18} />{template.safety}</p>
      <div className="v3-chips v3-chips--big" role="group" aria-label="测试发现">
        {template.findings.map((f) => <button type="button" aria-pressed={finding === f.id} key={f.id} onClick={() => setFinding(f.id)}>{f.title}</button>)}
      </div>
      <label className="v3-field">也可以用自己的话说（可选）<textarea maxLength={300} value={words} onChange={(e) => setWords(e.target.value)} /></label>
      <MediaDock project={project} stage="testing" />
      <h2 className="v3-room__label">下一版想先改哪里？</h2>
      <div className="v3-chips v3-chips--big" role="group" aria-label="下一版想先改哪里">
        {template.changes.map((c) => <button type="button" aria-pressed={change === c.id} key={c.id} onClick={() => setChange(c.id)}>{c.title}</button>)}
      </div>
      <button className="v3-button v3-inv-next" type="button" onClick={record}>把测试发现收好</button>
    </ProjectShell>
  )
}

function LearningPage({ project }) {
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const template = inventorTemplate(project.seedId)
  const card = template.cards.find((c) => project.knowledgeCardIds?.includes(c.id))
  useEffect(() => () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel() }, [])
  const iterate = () => dispatch({ type: 'CREATE_INVENTOR_ITERATION', profileId: project.profileId, projectId: project.id, idea: project.nextChangeTitle || card?.title || '先按自己的办法试试' })
  const speak = () => {
    if (!card || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(`${card.title}。${card.copy}`)
    utterance.lang = 'zh-CN'; utterance.rate = 0.86
    window.speechSynthesis.speak(utterance)
  }
  return (
    <ProjectShell project={project} status="learning" image="clue">
      <h1 className="v3-display">{card ? `为了${project.nextChangeTitle}，先看一个小线索` : '新线索已经收好'}</h1>
      <p className="v3-split__lead">你发现：{project.versions[0]?.testFindingTitle}。知识不是下一关，只在需要时拿出来。</p>
      {card ? (
        <div className="v3-clue v3-felt">
          <img src={knowledgeImage(card.image)} alt="" />
          <div><h2>{card.title}</h2><p>{card.copy}</p><button className="v3-button v3-button--wool" type="button" onClick={speak}><Icon name="bell" size={18} />听眠眠讲一遍</button></div>
        </div>
      ) : (
        <div className="v3-clue v3-clue--wait v3-felt">
          <div><h2>{project.nextQuestion}</h2><p>家长可以帮你找一张小线索卡。</p><button className="v3-button v3-button--wool" type="button" onClick={() => navigate('/parent/inventor')}>请家长一起看看</button></div>
        </div>
      )}
      <button className="v3-button v3-inv-next" type="button" onClick={iterate}>{card ? '带着这个线索再改一版' : '我先按自己的办法试试'}</button>
    </ProjectShell>
  )
}

function Missing({ title }) {
  const navigate = useNavigate()
  return <div className="v3-room v3-empty"><h1 className="v3-display">{title}</h1><button className="v3-button" type="button" onClick={() => navigate('/inventor')}>回发明工坊</button></div>
}

export function InventorProject() {
  const { projectId } = useParams()
  const { state } = useBedtimeState()
  const navigate = useNavigate()
  const project = inventorProject(state, projectId)
  useEffect(() => { if (project?.profileId === state.activeProfileId && (project.status === 'showcase' || project.status === 'archived')) navigate(`/inventor/showcase/${project.id}`, { replace: true }) }, [navigate, project, state.activeProfileId])
  if (!project || project.profileId !== state.activeProfileId) return <Missing title="这份发明笔记还没找到" />
  return <StagePage key={project.id} project={project} />
}

export function InventorShowcase() {
  const { projectId } = useParams()
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const project = inventorProject(state, projectId)
  const [resuming, setResuming] = useState(false)
  const story = useMemo(() => projectStory(project), [project])
  useEffect(() => { if (resuming && project?.status === 'iteration') navigate(`/inventor/project/${projectId}`) }, [resuming, project?.status, projectId, navigate])
  if (!project || project.profileId !== state.activeProfileId) return <Missing title="这份发明故事还没找到" />
  const method = project.showcase?.method || 'live'
  return (
    <div className="v3-room v3-inv-show">
      <header className="v3-inv-page__head">
        <img src={inventorImage('showcase', project.seedId)} alt="家庭发布会示意" />
        <div><span className="v3-eyebrow">家庭发布会 · {project.title}</span><h1 className="v3-display">我的发明故事</h1><p>讲讲怎么想、怎么试、后来怎么改</p></div>
      </header>
      <ol className="v3-strip v3-inv-story">
        {story.map((item, index) => (
          <li key={item.title} className="v3-felt" style={{ '--i': index }}>
            <b className="v3-num">{index + 1}</b>
            <img src={inventorImage(item.image, project.seedId)} alt="" />
            <span>{item.title}<small>{item.copy}</small></span>
          </li>
        ))}
      </ol>
      <h2 className="v3-room__label">我想怎么分享？</h2>
      <div className="v3-chips v3-chips--big" role="group" aria-label="我想怎么分享">
        {SHOWCASE_METHODS.map((m) => <button type="button" aria-pressed={method === m.id} key={m.id} onClick={() => dispatch({ type: 'SELECT_INVENTOR_SHOWCASE_METHOD', profileId: project.profileId, projectId, method: m.id })}>{m.title}</button>)}
      </div>
      <MediaDock project={project} stage="showcase" versionNumber={2} />
      <div className="v3-actions v3-actions--row">
        <button className="v3-button" type="button" onClick={() => { dispatch({ type: 'ARCHIVE_INVENTOR_PROJECT', profileId: project.profileId, projectId }); navigate('/inventor') }}>把这次发明收进工坊</button>
        <button className="v3-textlink" type="button" disabled={resuming} onClick={() => { setResuming(true); dispatch({ type: 'CREATE_INVENTOR_ITERATION', profileId: project.profileId, projectId, idea: '我还想继续改' }) }}>我还想继续改</button>
      </div>
    </div>
  )
}
