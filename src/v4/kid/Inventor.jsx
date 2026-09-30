import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getActiveProfile } from '../../domain/model.js'
import { IDEA_SEEDS, INVENTOR_STAGES, SHOWCASE_METHODS, inventorImage, inventorStage, inventorTemplate, knowledgeImage } from '../../modules/inventor/inventorCatalog.js'
import { activeInventorProject, inventorProject, inventorProjects, projectArtifacts, projectStory, stageIndex } from '../../modules/inventor/inventorModel.js'
import { inventorMediaBlob, saveInventorMedia } from '../../modules/inventor/inventorMedia.js'
import { useBedtimeActions, useBedtimeState } from '../../store/useBedtime.js'
import { Icon } from '../ui/Icon.jsx'
import { Buddy, ChipGroup, Speak, Tap } from '../ui/kit.jsx'

const projectRoute = (project) => (['showcase', 'archived'].includes(project.status) ? `/inventor/showcase/${project.id}` : `/inventor/project/${project.id}`)

/** The seven stages as a ribbon of badges; the child always sees where they are. */
function Ribbon({ status }) {
  const current = stageIndex(status)
  return (
    <ol className="k-ribbon" aria-label={`发明进度：${inventorStage(status).short}`}>
      {INVENTOR_STAGES.map((stage, index) => (
        <li key={stage.id} className={index === current ? 'is-now' : index < current ? 'is-past' : ''} aria-current={index === current ? 'step' : undefined}>
          <b className="u-num">{index < current ? <Icon name="check" size={14} strokeWidth={3} /> : index + 1}</b>
          <small>{stage.short}</small>
        </li>
      ))}
    </ol>
  )
}

export function InventorHome() {
  const { state } = useBedtimeState()
  const navigate = useNavigate()
  const profile = getActiveProfile(state)
  const active = activeInventorProject(state, profile.id)
  const projects = inventorProjects(state, profile.id)
  const shelf = projects.filter((project) => project.id !== active?.id)
  const seeds = IDEA_SEEDS.filter((seed) => seed.id === 'my-idea' || !projects.some((project) => project.seedId === seed.id))
  return (
    <section className="k-place k-inv" aria-labelledby="k-inv-title">
      <header className="k-place__head">
        <Buddy character={profile.character} mood="cheer" />
        <div>
          <h1 id="k-inv-title" className="u-display">小发明</h1>
          <p className="k-place__sub">找到一个小麻烦，想办法解决它<Speak text="小发明。找到一个小麻烦，想办法解决它。试出来的问题是线索，不是失败。" /></p>
        </div>
      </header>

      {active ? (
        <article className="k-bench">
          <img className="k-bench__pic" src={inventorImage(inventorStage(active.status).image, active.seedId)} alt="" />
          <div className="k-bench__body">
            <span className="k-go__eyebrow">正在做的发明</span>
            <h2 className="u-display">{active.title}</h2>
            <p>{active.problem}</p>
            <Ribbon status={active.status} />
            <Tap tone="primary" size="l" icon="chevron" onClick={() => navigate(projectRoute(active))}>接着做：{inventorStage(active.status).short}</Tap>
          </div>
        </article>
      ) : null}

      <h2 className="k-section-title u-display">{active ? '新点子' : '从一个小麻烦开始'}</h2>
      <div className="k-cards">
        {seeds.map((seed) => (
          <button type="button" key={seed.id} className="k-card" onClick={() => navigate(`/inventor/new?seed=${seed.id}`)}>
            <span className="k-card__pic"><img src={inventorImage(seed.image, seed.id)} alt="" /></span>
            <span className="k-card__body"><strong>{seed.id === 'my-idea' ? '我有自己的想法' : seed.problem}</strong><small>{seed.id === 'my-idea' ? '请家长帮忙写下来' : seed.title}</small></span>
          </button>
        ))}
      </div>

      {shelf.length ? (
        <>
          <h2 className="k-section-title u-display"><Icon name="star" size={22} />我的发明架</h2>
          <div className="k-cards">
            {shelf.map((project) => (
              <button type="button" key={project.id} className="k-card" onClick={() => navigate(projectRoute(project))}>
                <span className="k-card__pic"><img src={inventorImage('showcase', project.seedId)} alt="" /></span>
                <span className="k-card__tag">{project.status === 'archived' ? '完成啦' : inventorStage(project.status).short}</span>
                <span className="k-card__body"><strong>{project.title}</strong><small>{project.problem}</small></span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </section>
  )
}

export function InventorNew() {
  const { state } = useBedtimeState()
  return <NewIdea key={state.activeProfileId} />
}

const WHO = [
  { id: '我自己', icon: 'user' },
  { id: '家人', icon: 'users' },
  { id: '大家', icon: 'heart' },
]

/** A three-card start: which trouble → who it helps → (own idea only) name it. */
function NewIdea() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const profile = getActiveProfile(state)
  const initial = IDEA_SEEDS.find((seed) => seed.id === params.get('seed'))
  const [seedId, setSeedId] = useState(initial?.id || '')
  const [step, setStep] = useState(initial ? 1 : 0)
  const [who, setWho] = useState('')
  const [title, setTitle] = useState('')
  const [problem, setProblem] = useState('')
  const [pendingId, setPendingId] = useState('')
  const seed = IDEA_SEEDS.find((item) => item.id === seedId) || IDEA_SEEDS[0]
  const custom = seed.id === 'my-idea'
  useEffect(() => { if (pendingId && inventorProject(state, pendingId)) navigate(`/inventor/project/${pendingId}`, { replace: true }) }, [state, pendingId, navigate])
  const create = (helpsWho = who) => {
    if (pendingId || (custom && (!title.trim() || !problem.trim()))) return
    const projectId = `project_${crypto.randomUUID()}`
    setPendingId(projectId)
    dispatch({ type: 'CREATE_INVENTOR_PROJECT', profileId: profile.id, projectId, project: { id: projectId, seedId: seed.id, title: custom ? title.trim() : seed.title, problem: custom ? problem.trim() : seed.problem, helpsWho: [helpsWho || '我自己'], status: 'sketching', nextQuestion: '我先想到什么办法？', versions: [{ number: 1, idea: '先做一个能试的版本', artifactIds: [] }] } })
  }
  const pickWho = (value) => { setWho(value); if (custom) setStep(2); else create(value) }
  return (
    <div className="k-panel k-wizard">
      <ol className="k-dots" aria-label={`第 ${step + 1} 步`}>{[0, 1, ...(custom ? [2] : [])].map((index) => <li key={index} className={index <= step ? 'is-on' : ''} />)}</ol>
      {step === 0 ? (
        <>
          <h1 className="u-display">你发现了什么小麻烦？<Speak text="你发现了什么小麻烦？" /></h1>
          <div className="k-cards">
            {IDEA_SEEDS.map((item) => (
              <button type="button" key={item.id} className="k-card" aria-pressed={seedId === item.id} onClick={() => { setSeedId(item.id); setStep(1) }}>
                <span className="k-card__pic"><img src={inventorImage(item.image, item.id)} alt="" /></span>
                <span className="k-card__body"><strong>{item.id === 'my-idea' ? '我有自己的想法' : item.problem}</strong><small>{item.title}</small></span>
              </button>
            ))}
          </div>
        </>
      ) : step === 1 ? (
        <>
          <img className="k-wizard__pic" src={inventorImage(seed.image, seed.id)} alt="" />
          <h1 className="u-display">想帮谁解决？<Speak text={`${custom ? '' : seed.problem + '。'}想帮谁解决？`} /></h1>
          {!custom ? <p>{seed.problem}</p> : null}
          <div className="k-choices">
            {WHO.map((item) => (
              <button type="button" key={item.id} className="u-tile" aria-pressed={who === item.id} disabled={Boolean(pendingId)} onClick={() => pickWho(item.id)}>
                <Icon name={item.icon} size={40} /><strong>{item.id}</strong>
              </button>
            ))}
          </div>
          <Tap tone="quiet" size="s" onClick={() => setStep(0)}>换一个麻烦</Tap>
        </>
      ) : (
        <>
          <h1 className="u-display">请家长帮你写下来</h1>
          <label className="u-field"><span>给想法起个名字</span><input className="u-input" maxLength={40} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="比如：不会湿的书包" /></label>
          <label className="u-field"><span>想解决什么小麻烦</span><textarea className="u-input" maxLength={300} rows={3} value={problem} onChange={(event) => setProblem(event.target.value)} /></label>
          <Tap tone="primary" size="l" icon="sparkle" disabled={Boolean(pendingId) || !title.trim() || !problem.trim()} onClick={() => create()}>{pendingId ? '正在收好…' : '收进工坊'}</Tap>
        </>
      )}
      <p className="k-safety"><Icon name="shield" size={18} />{inventorTemplate(seed.id).safety}</p>
    </div>
  )
}

/* ─────────────  Photos, voice and video the child attaches to a stage  ───────────── */
function Artifact({ artifact }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    let alive = true
    let objectUrl = ''
    inventorMediaBlob(artifact).then((blob) => { if (!alive || !blob) return; objectUrl = URL.createObjectURL(blob); setUrl(objectUrl) }).catch(() => {})
    return () => { alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [artifact])
  if (!url) return <span className="k-media__wait"><Icon name="image" />正在打开</span>
  if (artifact.kind === 'audio') return <audio src={url} controls preload="metadata" />
  if (artifact.kind === 'video') return <video src={url} controls preload="metadata" />
  return <img src={url} alt={artifact.fileName || '发明资料'} />
}

function MediaDock({ project, stage, versionNumber = 1 }) {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const [message, setMessage] = useState('')
  const artifacts = projectArtifacts(state, project.id).filter((artifact) => artifact.stage === stage)
  const attach = async (file) => {
    if (!file) return
    try {
      const draft = await saveInventorMedia({ file, projectId: project.id, profileId: project.profileId, stage, versionNumber })
      dispatch({ type: 'ADD_INVENTOR_ARTIFACT', profileId: project.profileId, projectId: project.id, versionNumber, artifact: { id: draft.id, projectId: project.id, kind: draft.kind, mediaType: draft.mediaType, fileName: draft.fileName, byteSize: draft.byteSize, stage, status: 'local' } })
      setMessage('收好啦！')
    } catch (error) { setMessage(error.message) }
  }
  const options = [
    { kind: 'photo', label: '拍张照片', accept: 'image/jpeg,image/png,image/webp', capture: 'environment', icon: 'camera' },
    { kind: 'audio', label: '录一段话', accept: 'audio/*', capture: 'user', icon: 'mic' },
    { kind: 'video', label: '拍段视频', accept: 'video/mp4,video/webm,video/quicktime', capture: 'environment', icon: 'play' },
  ]
  return (
    <div className="k-media">
      <div className="k-media__add">
        {options.map((option) => (
          <label key={option.kind} className="k-media__btn">
            <Icon name={option.icon} size={26} /><span>{option.label}</span>
            <input type="file" accept={option.accept} capture={option.capture} aria-label={option.label} onChange={(event) => { attach(event.target.files?.[0]); event.target.value = '' }} />
          </label>
        ))}
      </div>
      {artifacts.length ? <div className="k-media__list">{artifacts.map((artifact) => <figure key={artifact.id}><Artifact artifact={artifact} /><figcaption>{artifact.status === 'synced' ? '已同步' : '存在这台设备上'}</figcaption></figure>)}</div> : null}
      {message ? <p className="k-note" role="status">{message}</p> : null}
    </div>
  )
}

/* ─────────────  One stage at a time  ───────────── */
export function InventorProject() {
  const { projectId } = useParams()
  const { state } = useBedtimeState()
  const project = inventorProject(state, projectId)
  if (!project || project.profileId !== state.activeProfileId) return <Missing title="这份发明笔记还没找到" />
  if (['showcase', 'archived'].includes(project.status)) return <Navigate to={`/inventor/showcase/${project.id}`} replace />
  return <Stage key={`${project.id}:${project.status}`} project={project} />
}

function Missing({ title }) {
  const navigate = useNavigate()
  return <div className="k-empty k-panel"><h1 className="u-display">{title}</h1><Tap tone="primary" onClick={() => navigate('/inventor')}>回到小发明</Tap></div>
}

function Frame({ project, image, children }) {
  return (
    <div className="k-panel k-stage">
      <header className="k-stage__head">
        <span className="k-go__eyebrow">{project.title}</span>
        <Ribbon status={project.status} />
      </header>
      <div className="k-stage__body">
        <img className="k-stage__pic" src={inventorImage(image, project.seedId)} alt="" />
        <section className="k-stage__task">{children}</section>
      </div>
    </div>
  )
}

function Stage({ project }) {
  const { dispatch } = useBedtimeActions()
  const status = project.status
  if (status === 'testing') return <Testing project={project} />
  if (status === 'learning') return <Learning project={project} />
  const stage = inventorStage(status)
  const next = ['sketching', 'problem_defined'].includes(status) ? 'prototype_1' : status === 'prototype_1' ? 'testing' : 'showcase'
  const title = status === 'iteration' ? '带着线索做第二版' : stage.title
  const lead = status === 'iteration' ? (project.nextChangeTitle ? `这次先改：${project.nextChangeTitle}` : '只改最想先解决的地方。') : status === 'prototype_1' ? '用纸板、胶带、玩偶，做一个能试的版本。' : '画出来就好，画得不像也没关系。'
  return (
    <Frame project={project} image={stage.image}>
      <h1 className="u-display">{title}<Speak text={`${title}。${lead}`} /></h1>
      <p className="k-stage__lead">{lead}</p>
      <MediaDock project={project} stage={status} versionNumber={status === 'iteration' ? 2 : 1} />
      <p className="k-safety"><Icon name="shield" size={18} />{inventorTemplate(project.seedId).safety}</p>
      <Tap tone="primary" size="l" icon="chevron" onClick={() => dispatch({ type: 'UPDATE_INVENTOR_STAGE', profileId: project.profileId, projectId: project.id, status: next })}>
        {next === 'prototype_1' ? '画好啦，开始做' : next === 'testing' ? '做好了，去试一试' : '第二版做好啦，准备发布会'}
      </Tap>
    </Frame>
  )
}

function Testing({ project }) {
  const { dispatch } = useBedtimeActions()
  const template = inventorTemplate(project.seedId)
  const [finding, setFinding] = useState('')
  const [words, setWords] = useState('')
  const record = (change) => {
    const found = template.findings.find((item) => item.id === finding) || template.findings[0]
    const next = template.changes.find((item) => item.id === change)
    dispatch({ type: 'RECORD_INVENTOR_TEST', profileId: project.profileId, projectId: project.id, finding: found.id, findingTitle: words.trim() || found.title, nextChange: next.id, nextChangeTitle: next.title, nextQuestion: `怎样${next.title}？` })
  }
  return (
    <Frame project={project} image="testing">
      {!finding ? (
        <>
          <h1 className="u-display">试一试，发现了什么？<Speak text="试一试，发现了什么？试出来的问题是线索，不是失败。" /></h1>
          <p className="k-stage__lead">试出来的问题是线索，不是失败。</p>
          <div className="k-answer">
            {template.findings.map((item) => <button type="button" key={item.id} className="k-answer__btn" onClick={() => setFinding(item.id)}><Icon name="search" size={22} />{item.title}</button>)}
          </div>
          <MediaDock project={project} stage="testing" />
        </>
      ) : (
        <>
          <h1 className="u-display">第二版想先改哪里？</h1>
          <p className="k-stage__lead">发现：{template.findings.find((item) => item.id === finding)?.title}</p>
          <label className="u-field"><span>想用自己的话说说发现吗？（可以不写）</span><textarea className="u-input" rows={2} maxLength={300} value={words} onChange={(event) => setWords(event.target.value)} /></label>
          <div className="k-answer">
            {template.changes.map((item) => <button type="button" key={item.id} className="k-answer__btn is-go" onClick={() => record(item.id)}><Icon name="edit" size={22} />{item.title}</button>)}
          </div>
          <Tap tone="quiet" size="s" onClick={() => setFinding('')}>重新选发现</Tap>
        </>
      )}
    </Frame>
  )
}

function Learning({ project }) {
  const { dispatch } = useBedtimeActions()
  const template = inventorTemplate(project.seedId)
  const card = template.cards.find((item) => project.knowledgeCardIds?.includes(item.id))
  const iterate = () => dispatch({ type: 'CREATE_INVENTOR_ITERATION', profileId: project.profileId, projectId: project.id, idea: project.nextChangeTitle || card?.title || '先按自己的办法试试' })
  return (
    <Frame project={project} image="clue">
      <h1 className="u-display">{card ? '一张小线索卡' : '线索收好啦'}</h1>
      <p className="k-stage__lead">你发现：{project.versions[0]?.testFindingTitle}</p>
      {card ? (
        <div className="k-clue">
          <img src={knowledgeImage(card.image)} alt="" />
          <div><strong>{card.title}</strong><p>{card.copy}</p><Speak text={`${card.title}。${card.copy}`} label="读给我听" /></div>
        </div>
      ) : <p className="k-note">{project.nextQuestion} 可以请家长帮你找一张线索卡，也可以先按自己的办法试。</p>}
      <Tap tone="primary" size="l" icon="edit" onClick={iterate}>{card ? '带着线索改第二版' : '先按自己的办法试'}</Tap>
    </Frame>
  )
}

/* ─────────────  Family launch: flip through the invention story  ───────────── */
export function InventorShowcase() {
  const { projectId } = useParams()
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const project = inventorProject(state, projectId)
  const story = useMemo(() => projectStory(project), [project])
  const [page, setPage] = useState(0)
  const [resuming, setResuming] = useState(false)
  useEffect(() => { if (resuming && project?.status === 'iteration') navigate(`/inventor/project/${projectId}`) }, [resuming, project?.status, projectId, navigate])
  if (!project || project.profileId !== state.activeProfileId) return <Missing title="这份发明故事还没找到" />
  const item = story[page]
  const last = page === story.length - 1
  const method = project.showcase?.method || 'live'
  return (
    <div className="k-panel k-show">
      <header className="k-show__head">
        <span className="k-go__eyebrow">家庭发布会</span>
        <h1 className="u-display">{project.title}</h1>
      </header>
      <article className="k-story" key={page}>
        <img src={inventorImage(item.image, project.seedId)} alt="" />
        <div>
          <span className="k-story__num u-num">{page + 1} / {story.length}</span>
          <h2 className="u-display">{item.title}</h2>
          <p>{item.copy}<Speak text={`${item.title}。${item.copy}`} /></p>
        </div>
      </article>
      <div className="k-story__nav">
        <Tap tone="soft" round icon="back" aria-label="上一页" disabled={page === 0} onClick={() => setPage((value) => value - 1)} />
        <ol className="k-dots">{story.map((entry, index) => <li key={entry.title} className={index <= page ? 'is-on' : ''} />)}</ol>
        <Tap tone={last ? 'soft' : 'primary'} round icon="chevron" aria-label="下一页" disabled={last} onClick={() => setPage((value) => value + 1)} />
      </div>
      {last ? (
        <div className="k-show__end">
          <ChipGroup label="我想怎么分享" value={method} onChange={(value) => dispatch({ type: 'SELECT_INVENTOR_SHOWCASE_METHOD', profileId: project.profileId, projectId, method: value })} options={SHOWCASE_METHODS.map((entry) => [entry.id, entry.title])} />
          <MediaDock project={project} stage="showcase" versionNumber={2} />
          <div className="k-done__go">
            {project.status !== 'archived' ? <Tap tone="primary" size="l" icon="star" onClick={() => { dispatch({ type: 'ARCHIVE_INVENTOR_PROJECT', profileId: project.profileId, projectId }); navigate('/inventor') }}>放上发明架</Tap> : null}
            <Tap tone="soft" size="l" icon="edit" disabled={resuming} onClick={() => { setResuming(true); dispatch({ type: 'CREATE_INVENTOR_ITERATION', profileId: project.profileId, projectId, idea: '我还想继续改' }) }}>我还想继续改</Tap>
          </div>
        </div>
      ) : null}
    </div>
  )
}
