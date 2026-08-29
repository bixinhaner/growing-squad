import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { appPath } from '../data/paths.js'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { Icon } from '../ui/Icons.jsx'
import { IDEA_SEEDS, INVENTOR_STAGES, NEXT_CHANGES, SHOWCASE_METHODS, TEST_FINDINGS, inventorImage, inventorStage, knowledgeCard, knowledgeImage } from '../modules/inventor/inventorCatalog.js'
import { activeInventorProject, inventorProject, inventorProjects, projectArtifacts, projectStory, stageIndex } from '../modules/inventor/inventorModel.js'
import { inventorMediaBlob, saveInventorMedia } from '../modules/inventor/inventorMedia.js'

function StageTrail({ status }) {
  const current = stageIndex(status)
  return <div className="inventor-stage-trail" aria-label={`当前：${inventorStage(status).short}`}>{INVENTOR_STAGES.map((stage, index) => <span key={stage.id} className={index === current ? 'is-current' : index < current ? 'is-past' : ''}><b>{index + 1}</b><small>{stage.short}</small></span>)}</div>
}

function ArtifactPreview({ artifact }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    let active = true
    let objectUrl = ''
    inventorMediaBlob(artifact).then((blob) => {
      if (!active || !blob) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    }).catch(() => {})
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [artifact])
  if (!url) return <span className="inventor-artifact__placeholder"><Icon name={artifact.kind === 'audio' ? 'bell' : artifact.kind === 'video' ? 'play' : 'image'} /></span>
  if (artifact.kind === 'audio') return <audio src={url} controls preload="metadata" />
  if (artifact.kind === 'video') return <video src={url} controls preload="metadata" />
  return <img src={url} alt={artifact.fileName || '项目资料'} />
}

function MediaDock({ project, stage, versionNumber = 1, compact = false }) {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const [message, setMessage] = useState('')
  const artifacts = projectArtifacts(state, project.id).filter((item) => item.stage === stage)
  const attach = async (file) => {
    if (!file) return
    try {
      const draft = await saveInventorMedia({ file, projectId: project.id, profileId: state.activeProfileId, stage, versionNumber })
      dispatch({ type: 'ADD_INVENTOR_ARTIFACT', profileId: state.activeProfileId, projectId: project.id, versionNumber, artifact: { id: draft.id, projectId: project.id, kind: draft.kind, mediaType: draft.mediaType, fileName: draft.fileName, byteSize: draft.byteSize, stage, status: 'local' } })
      setMessage('已经保存在这台设备，联网后会自动同步。')
    } catch (error) { setMessage(error.message) }
  }
  const choices = [
    { kind: 'photo', label: stage === 'testing' ? '拍下测试' : `拍下第${versionNumber === 1 ? '一' : '二'}版`, accept: 'image/jpeg,image/png,image/webp', capture: 'environment', icon: 'image' },
    { kind: 'audio', label: stage === 'testing' ? '录下发现' : '说说我是怎么做的', accept: 'audio/*', capture: 'user', icon: 'bell' },
    { kind: 'video', label: '拍30秒演示', accept: 'video/mp4,video/webm,video/quicktime', capture: 'environment', icon: 'play' },
  ]
  return <div className={`inventor-media-dock ${compact ? 'is-compact' : ''}`}><div className="inventor-media-actions">{choices.map((choice) => <label key={choice.kind}><Icon name={choice.icon} /><span>{choice.label}</span><input type="file" accept={choice.accept} capture={choice.capture} aria-label={choice.label} onChange={(event) => { attach(event.target.files?.[0]); event.target.value = '' }} /></label>)}</div>{artifacts.length ? <div className="inventor-artifacts">{artifacts.map((artifact) => <figure key={artifact.id}><ArtifactPreview artifact={artifact} /><figcaption>{artifact.status === 'synced' ? '已同步' : '等网络恢复'}</figcaption></figure>)}</div> : null}{message ? <p className="inventor-media-message" role="status">{message}</p> : null}</div>
}

export function InventorWorkshopPage() {
  const { state } = useBedtimeState()
  const navigate = useNavigate()
  const active = activeInventorProject(state)
  const projects = inventorProjects(state)
  const currentStage = active ? inventorStage(active.status) : null
  return <section className="inventor-workshop" aria-labelledby="inventor-workshop-title"><aside className="inventor-workshop__hero"><img src={appPath('assets/inventor/workshop-hero.webp')} alt="眠眠和孩子在温暖的阁楼工坊做纸板原型" /><div><span className="eyebrow">今天只往前走一小步</span><h1 id="inventor-workshop-title">发明家工坊</h1><p>从一个小麻烦开始，慢慢做出自己的办法</p></div></aside><article className="inventor-workshop__desk">{active ? <><header><div><span className="eyebrow">正在做的发明</span><h2>{active.title}</h2><p>{active.problem}</p></div><button type="button" onClick={() => navigate('/inventor/new')}>收下新想法</button></header><StageTrail status={active.status} /><button className="inventor-continue" type="button" onClick={() => navigate(active.status === 'showcase' ? `/inventor/showcase/${active.id}` : `/inventor/project/${active.id}`)}><img src={inventorImage(currentStage.image)} alt="" /><span><small>{currentStage.short}</small><strong>{currentStage.title}</strong><em>继续往前走</em></span><Icon name="chevron" /></button></> : <div className="inventor-empty"><span className="eyebrow">先从生活里找一找</span><h2>有什么小麻烦，想换个办法？</h2><p>不用先学课程，也不用一次想完整。</p><button className="inventor-primary" type="button" onClick={() => navigate('/inventor/new')}>发现我的第一个想法</button></div>}<div className="inventor-project-cards">{projects.filter((item) => item.id !== active?.id).slice(0, 2).map((project) => <button type="button" key={project.id} onClick={() => navigate(project.status === 'showcase' ? `/inventor/showcase/${project.id}` : `/inventor/project/${project.id}`)}><img src={inventorImage(project.status === 'archived' ? 'showcase' : inventorStage(project.status).image)} alt="" /><span><strong>{project.title}</strong><small>{project.status === 'archived' ? '已经收进工坊' : inventorStage(project.status).short}</small></span></button>)}{IDEA_SEEDS.filter((seed) => !projects.some((project) => project.seedId === seed.id)).slice(0, Math.max(1, 2 - projects.length)).map((seed) => <button type="button" key={seed.id} onClick={() => navigate(`/inventor/new?seed=${seed.id}`)}><img src={inventorImage(seed.image)} alt="" /><span><strong>{seed.title}</strong><small>先收下这个灵感</small></span></button>)}</div><p className="inventor-workshop__note"><Icon name="shield" />测试发现会留下来，不会被写成失败</p></article></section>
}

export function InventorNewPage() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const initialSeed = new URLSearchParams(window.location.search).get('seed') || 'hair-robot'
  const [seedId, setSeedId] = useState(initialSeed)
  const [helpsWho, setHelpsWho] = useState('我自己')
  const seed = IDEA_SEEDS.find((item) => item.id === seedId) || IDEA_SEEDS[0]
  const create = () => {
    const projectId = `project_${crypto.randomUUID()}`
    dispatch({ type: 'CREATE_INVENTOR_PROJECT', profileId: state.activeProfileId, projectId, project: { id: projectId, seedId: seed.id, title: seed.title, problem: seed.problem, helpsWho: [helpsWho], status: 'sketching', nextQuestion: '我先想到什么办法？', versions: [{ number: 1, idea: '先做一个能试的版本', artifactIds: [] }] } })
    navigate(`/inventor/project/${projectId}`)
  }
  return <section className="inventor-discover"><aside><img src={inventorImage('problem')} alt="孩子发现洗头时水会靠近眼睛" /><div><span>好的发明</span><strong>都从一个小麻烦开始</strong></div></aside><article><span className="eyebrow">发现一个麻烦</span><h1>我发现了什么麻烦？</h1><div className="inventor-seed-options">{IDEA_SEEDS.map((item) => <button type="button" className={seedId === item.id ? 'is-selected' : ''} key={item.id} onClick={() => setSeedId(item.id)}><img src={inventorImage(item.image)} alt="" /><span><strong>{item.problem}</strong><small>{item.title}</small></span></button>)}</div><h2>我想帮助谁？</h2><div className="inventor-help-who">{['我自己', '家人', '大家'].map((item) => <button type="button" className={helpsWho === item ? 'is-selected' : ''} key={item} onClick={() => setHelpsWho(item)}>{item}</button>)}</div><div className="inventor-my-words"><Icon name="bell" /><span><strong>用我的话说</strong><small>可以说给家长听，也可以先用上面的选择</small></span></div><button className="inventor-primary" type="button" onClick={create}>把这个想法收进工坊</button><button className="inventor-text-button" type="button" onClick={() => navigate('/inventor')}>先放一放</button></article></section>
}

function StagePage({ project, status }) {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const advance = (next) => dispatch({ type: 'UPDATE_INVENTOR_STAGE', profileId: state.activeProfileId, projectId: project.id, status: next })
  if (status === 'sketching') return <ProjectShell project={project} status={status} image="sketch"><h1>先把办法画下来</h1><p>画得像不像不重要，只要能看出你想怎么做。</p><div className="inventor-illustrated-steps"><div><img src={inventorImage('problem')} alt="" /><b>再看一眼麻烦</b></div><div><img src={inventorImage('sketch')} alt="" /><b>把想到的办法画出来</b></div><div><img src={inventorImage('building-v1')} alt="" /><b>请家长帮你找安全材料</b></div></div><MediaDock project={project} stage="sketching" /><button className="inventor-primary" type="button" onClick={() => advance('prototype_1')}>草图准备好啦</button></ProjectShell>
  if (status === 'prototype_1') return <ProjectShell project={project} status={status} image="building-v1"><h1>先做一个能试的版本</h1><p>不用完美，能试一试就够了。</p><div className="inventor-illustrated-steps"><div><img src={inventorImage('building-v1')} alt="" /><b>找安全材料</b></div><div><img src={inventorImage('sketch')} alt="" /><b>照着草图搭起来</b></div><div><img src={inventorImage('prototype-v1')} alt="" /><b>请家长一起试</b></div></div><MediaDock project={project} stage="prototype_1" /><button className="inventor-primary" type="button" onClick={() => advance('testing')}>第一版准备试一试</button></ProjectShell>
  if (status === 'testing') return <TestingPage project={project} />
  if (status === 'learning') return <LearningPage project={project} />
  if (status === 'iteration') return <ProjectShell project={project} status={status} image="prototype-v2"><h1>带着线索做第二版</h1><p>{project.nextChangeTitle || '这一次，只改最想先解决的地方。'}</p><div className="inventor-version-compare"><span><small>第一版</small><img src={inventorImage('prototype-v1')} alt="" /></span><Icon name="chevron" /><span><small>第二版</small><img src={inventorImage('prototype-v2')} alt="" /></span></div><MediaDock project={project} stage="iteration" versionNumber={2} /><button className="inventor-primary" type="button" onClick={() => { advance('showcase'); navigate(`/inventor/showcase/${project.id}`) }}>第二版准备讲给家人听</button></ProjectShell>
  return null
}

function ProjectShell({ project, status, image, children }) {
  const navigate = useNavigate()
  return <section className="inventor-project"><aside><img src={inventorImage(image)} alt={`${project.title}的${inventorStage(status).short}画面`} /></aside><article><header><button type="button" onClick={() => navigate('/inventor')}><Icon name="home" />回工坊</button><span>{project.title}</span></header><StageTrail status={status} />{children}</article></section>
}

function TestingPage({ project }) {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const [finding, setFinding] = useState('side-leaks')
  const [nextChange, setNextChange] = useState('wrap-sides')
  const record = () => {
    const findingItem = TEST_FINDINGS.find((item) => item.id === finding)
    const changeItem = NEXT_CHANGES.find((item) => item.id === nextChange)
    dispatch({ type: 'RECORD_INVENTOR_TEST', profileId: state.activeProfileId, projectId: project.id, finding, findingTitle: findingItem.title, nextChange, nextChangeTitle: changeItem.title, nextQuestion: nextChange === 'wrap-sides' ? '怎样挡住两边的水？' : `怎样${changeItem.title}？` })
  }
  return <ProjectShell project={project} status="testing" image="testing"><h1>这次试出了什么？</h1><div className="inventor-findings">{TEST_FINDINGS.map((item, index) => <button type="button" className={finding === item.id ? 'is-selected' : ''} key={item.id} onClick={() => setFinding(item.id)}><img src={inventorImage(['prototype-v1', 'testing', 'clue'][index])} alt="" /><strong>{item.title}</strong></button>)}</div><p className="inventor-evidence"><Icon name="search" />这不是失败，是第一版告诉我们的新线索</p><h2>下一版想先改哪里？</h2><div className="inventor-next-changes">{NEXT_CHANGES.map((item) => <button type="button" className={nextChange === item.id ? 'is-selected' : ''} key={item.id} onClick={() => setNextChange(item.id)}>{item.title}</button>)}</div><MediaDock project={project} stage="testing" compact /><button className="inventor-primary" type="button" onClick={record}>把测试发现收好</button></ProjectShell>
}

function LearningPage({ project }) {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const cardId = project.knowledgeCardIds?.at(-1)
  const card = cardId ? knowledgeCard(cardId) : null
  const speakCard = () => {
    if (!card || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(`${card.title}。${card.copy}`)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.86
    utterance.pitch = 1.08
    window.speechSynthesis.speak(utterance)
  }
  if (!card) return <ProjectShell project={project} status="learning" image="clue"><h1>新线索已经收好</h1><p>你发现：{project.versions[0]?.testFindingTitle}。接下来可以请家长一起看看，要不要学一个刚好用得上的小线索。</p><div className="inventor-waiting-clue"><img src={inventorImage('clue')} alt="" /><span><strong>{project.nextQuestion}</strong><small>知识不是下一关，只在需要时拿出来。</small></span></div><button className="inventor-primary" type="button" onClick={() => dispatch({ type: 'CREATE_INVENTOR_ITERATION', profileId: state.activeProfileId, projectId: project.id, idea: project.nextChangeTitle || '带着测试发现再改一版' })}>我先按自己的办法试试</button><button className="inventor-parent-help" type="button" onClick={() => navigate('/parent/inventor')}>请家长一起看看</button></ProjectShell>
  return <ProjectShell project={project} status="learning" image="clue"><h1>为了{project.nextChangeTitle}，先看一个小线索</h1><div className="inventor-knowledge-card"><img src={knowledgeImage(card.image)} alt="" /><span><h2>{card.title}</h2><p>{card.copy}</p><button type="button" onClick={speakCard}><Icon name="bell" />听眠眠讲一遍</button></span></div><div className="inventor-version-compare"><span><small>第一版</small><img src={inventorImage('prototype-v1')} alt="" /></span><Icon name="chevron" /><span><small>第二版想改成</small><img src={inventorImage('prototype-v2')} alt="" /></span></div><button className="inventor-primary" type="button" onClick={() => dispatch({ type: 'CREATE_INVENTOR_ITERATION', profileId: state.activeProfileId, projectId: project.id, idea: project.nextChangeTitle || card.title })}>带着这个线索再改一版</button></ProjectShell>
}

export function InventorProjectPage() {
  const { projectId } = useParams()
  const { state } = useBedtimeState()
  const navigate = useNavigate()
  const project = inventorProject(state, projectId)
  useEffect(() => { if (project?.status === 'showcase') navigate(`/inventor/showcase/${project.id}`, { replace: true }) }, [navigate, project])
  if (!project) return <section className="inventor-missing"><h1>这份发明笔记还没找到</h1><button type="button" onClick={() => navigate('/inventor')}>回发明工坊</button></section>
  return <StagePage project={project} status={project.status} />
}

export function InventorShowcasePage() {
  const { projectId } = useParams()
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const project = inventorProject(state, projectId)
  const [method, setMethod] = useState(project?.showcase?.method || 'live')
  const story = useMemo(() => projectStory(project), [project])
  if (!project) return <section className="inventor-missing"><h1>这份发明故事还没找到</h1><button type="button" onClick={() => navigate('/inventor')}>回发明工坊</button></section>
  const selectMethod = (value) => { setMethod(value); dispatch({ type: 'SELECT_INVENTOR_SHOWCASE_METHOD', profileId: state.activeProfileId, projectId, method: value }) }
  const archive = () => { dispatch({ type: 'ARCHIVE_INVENTOR_PROJECT', profileId: state.activeProfileId, projectId }); navigate('/inventor') }
  const keepIterating = () => {
    dispatch({ type: 'CREATE_INVENTOR_ITERATION', profileId: state.activeProfileId, projectId, idea: '我还想继续改' })
    navigate(`/inventor/project/${projectId}`)
  }
  return <section className="inventor-showcase"><aside><img src={inventorImage('showcase')} alt="孩子向家人介绍第一版和第二版" /><div><span>家庭发布会</span><strong>讲的是怎么想、怎么试、后来怎么改</strong></div></aside><article><header><span className="eyebrow">{project.title}</span><h1>我的发明故事</h1></header><div className="inventor-story">{story.map((item, index) => <div key={item.title}><b>{index + 1}</b><img src={inventorImage(item.image)} alt="" /><span><strong>{item.title}</strong><small>{item.copy}</small></span></div>)}</div><h2>我想怎么分享？</h2><div className="inventor-showcase-methods">{SHOWCASE_METHODS.map((item) => <button type="button" className={method === item.id ? 'is-selected' : ''} key={item.id} onClick={() => selectMethod(item.id)}>{item.title}</button>)}</div><div className="inventor-world-memory"><img src={appPath('assets/inventor/workshop-hero.webp')} alt="" /><span><small>小队世界</small><strong>工坊记住了你的工作台和新齿轮</strong></span></div><button className="inventor-primary" type="button" onClick={archive}>把这次发明收进工坊</button><button className="inventor-text-button" type="button" onClick={keepIterating}>我还想继续改</button></article></section>
}
