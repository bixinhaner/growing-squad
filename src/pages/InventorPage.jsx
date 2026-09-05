import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { appPath } from '../data/paths.js'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { Icon } from '../ui/Icons.jsx'
import { IDEA_SEEDS, INVENTOR_STAGES, SHOWCASE_METHODS, inventorImage, inventorStage, inventorTemplate, knowledgeImage } from '../modules/inventor/inventorCatalog.js'
import { activeInventorProject, inventorProject, inventorProjects, projectArtifacts, projectStory, stageIndex } from '../modules/inventor/inventorModel.js'
import { inventorMediaBlob, saveInventorMedia } from '../modules/inventor/inventorMedia.js'
import './comfort.css'
function StageTrail({status}) {
  const current=stageIndex(status)
  return <div className="inventor-stage-trail" aria-label={`当前：${inventorStage(status).short}`}>{INVENTOR_STAGES.map((s,index) => <span key={s.id} className={index===current ? 'is-current' : index<current ? 'is-past' : ''}><b>{index+1}</b><small>{s.short}</small></span>)}</div>
}
function ArtifactPreview({artifact}) {
  const [url,setUrl]=useState('')
  useEffect(() => { let active=true, objectUrl=''; inventorMediaBlob(artifact).then((blob) => { if(!active || !blob) return; objectUrl=URL.createObjectURL(blob); setUrl(objectUrl) }).catch(() => {}); return () => {active=false; if(objectUrl) URL.revokeObjectURL(objectUrl)} },[artifact])
  if(!url) return <span className="inventor-artifact__placeholder"><Icon name="image" />资料等待加载</span>
  if(artifact.kind==='audio') return <audio src={url} controls preload="metadata" />
  if(artifact.kind==='video') return <video src={url} controls preload="metadata" />
  return <img src={url} alt={artifact.fileName || '项目资料'} />
}
function MediaDock({project,stage,versionNumber=1}) {
  const {state}=useBedtimeState(), {dispatch}=useBedtimeActions()
  const [message,setMessage]=useState('')
  const artifacts=projectArtifacts(state,project.id).filter((a) => a.stage===stage)
  const attach=async(file) => { if(!file) return; try { const draft=await saveInventorMedia({file,projectId:project.id,profileId:project.profileId,stage,versionNumber}); dispatch({type:'ADD_INVENTOR_ARTIFACT',profileId:project.profileId,projectId:project.id,versionNumber,artifact:{id:draft.id,projectId:project.id,kind:draft.kind,mediaType:draft.mediaType,fileName:draft.fileName,byteSize:draft.byteSize,stage,status:'local'}}); setMessage('已保存在本机，联网后尝试同步到家庭设备。') } catch(error) {setMessage(error.message)} }
  const choices=[{kind:'photo',label:stage==='testing' ? '拍下测试' : `拍下第${versionNumber===1 ? '一' : '二'}版`,accept:'image/jpeg,image/png,image/webp',capture:'environment',icon:'image'}, {kind:'audio',label:'添加我的语音',accept:'audio/*',capture:'user',icon:'bell'}, {kind:'video',label:'添加演示视频',accept:'video/mp4,video/webm,video/quicktime',capture:'environment',icon:'play'}]
  return <div className="inventor-media-dock"><div className="inventor-media-actions">{choices.map((c) => <label key={c.kind}><Icon name={c.icon} /><span>{c.label}</span><input type="file" accept={c.accept} capture={c.capture} aria-label={c.label} onChange={(e) => {attach(e.target.files?.[0]);e.target.value=''}} /></label>)}</div>{artifacts.length ? <div className="inventor-artifacts">{artifacts.map((a) => <figure key={a.id}><ArtifactPreview artifact={a} /><figcaption>{a.status==='synced' ? '已同步' : '等网络恢复'}</figcaption></figure>)}</div> : null}{message ? <p className="inventor-media-message" role="status">{message}</p> : null}</div>
}
export function InventorWorkshopPage() {
  const {state}=useBedtimeState(), navigate=useNavigate(), active=activeInventorProject(state), projects=inventorProjects(state)
  return <section className="inventor-workshop" aria-labelledby="inventor-workshop-title"><aside className="inventor-workshop__hero"><img src={appPath('assets/inventor/workshop-hero.webp')} alt="温暖的纸板原型工坊" /><div><span className="eyebrow">今天只往前走一小步</span><h1 id="inventor-workshop-title">发明家工坊</h1><p>从一个小麻烦开始，试出自己的办法</p></div></aside><article className="inventor-workshop__desk">{active ? <><header><div><span className="eyebrow">正在做的发明</span><h2>{active.title}</h2><p>{active.problem}</p></div><button type="button" onClick={() => navigate('/inventor/new')}>收下新想法</button></header><StageTrail status={active.status} /><button className="inventor-continue" type="button" onClick={() => navigate(active.status==='showcase' ? `/inventor/showcase/${active.id}` : `/inventor/project/${active.id}`)}><img src={inventorImage(inventorStage(active.status).image,active.seedId)} alt="" /><span><small>{inventorStage(active.status).short}</small><strong>{inventorStage(active.status).title}</strong><em>继续往前走</em></span><Icon name="chevron" /></button></> : <div className="inventor-empty"><span className="eyebrow">先从生活里找一找</span><h2>有什么小麻烦，想换个办法？</h2><p>不用先学课程，也不用一次想完整。</p><button className="inventor-primary" type="button" onClick={() => navigate('/inventor/new')}>发现我的第一个想法</button></div>}<div className="inventor-project-cards">{projects.filter((p) => p.id!==active?.id).map((p) => <button type="button" key={p.id} onClick={() => navigate(p.status==='archived' || p.status==='showcase' ? `/inventor/showcase/${p.id}` : `/inventor/project/${p.id}`)}><img src={inventorImage('showcase',p.seedId)} alt="" /><span><strong>{p.title}</strong><small>{p.status==='archived' ? '已收进工坊' : inventorStage(p.status).short}</small></span></button>)}{IDEA_SEEDS.filter((seed) => !projects.some((p) => p.seedId===seed.id)).slice(0,2).map((seed) => <button type="button" key={seed.id} onClick={() => navigate(`/inventor/new?seed=${seed.id}`)}><img src={inventorImage(seed.image,seed.id)} alt="" /><span><strong>{seed.title}</strong><small>先收下这个灵感</small></span></button>)}</div><p className="inventor-workshop__note"><Icon name="shield" />测试发现是线索，不是失败。</p></article></section>
}
export function InventorNewPage() {
  const {state}=useBedtimeState()
  return <NewIdeaContent key={state.activeProfileId} />
}
function NewIdeaContent() {
  const {state}=useBedtimeState(), {dispatch}=useBedtimeActions(), navigate=useNavigate()
  const [seedId,setSeedId]=useState(new URLSearchParams(window.location.search).get('seed') || 'hair-robot'), [helpsWho,setHelpsWho]=useState('我自己')
  const [title,setTitle]=useState(''), [problem,setProblem]=useState(''), [pendingId,setPendingId]=useState('')
  const seed=IDEA_SEEDS.find((s) => s.id===seedId) || IDEA_SEEDS[0], custom=seed.id==='my-idea'
  useEffect(() => { if(pendingId && inventorProject(state,pendingId)) navigate(`/inventor/project/${pendingId}`) },[state,pendingId,navigate])
  const create=() => { if(pendingId || (custom && (!title.trim() || !problem.trim()))) return; const projectId=`project_${crypto.randomUUID()}`; setPendingId(projectId); dispatch({type:'CREATE_INVENTOR_PROJECT',profileId:state.activeProfileId,projectId,project:{id:projectId,seedId:seed.id,title:custom ? title.trim() : seed.title,problem:custom ? problem.trim() : seed.problem,helpsWho:[helpsWho],status:'sketching',nextQuestion:'我先想到什么办法？',versions:[{number:1,idea:'先做一个能试的版本',artifactIds:[]}]}}) }
  return <section className="inventor-discover"><aside><img src={inventorImage('problem',seed.id)} alt="发明工坊的灵感示意" /><div><span>好的发明</span><strong>都从一个小麻烦开始</strong></div></aside><article><span className="eyebrow">发现一个麻烦</span><h1>我发现了什么麻烦？</h1><div className="inventor-seed-options">{IDEA_SEEDS.map((s) => <button type="button" className={seed.id===s.id ? 'is-selected' : ''} aria-pressed={seed.id===s.id} key={s.id} onClick={() => setSeedId(s.id)}><img src={inventorImage(s.image,s.id)} alt="" /><span><strong>{s.problem}</strong><small>{s.title}</small></span></button>)}</div>{custom ? <div><label className="calm-field">给想法起个名字<input maxLength={40} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="可以请家长帮忙写" /></label><label className="calm-field">我想解决的小麻烦<textarea maxLength={300} value={problem} onChange={(e) => setProblem(e.target.value)} /></label></div> : null}<h2>我想帮助谁？</h2><div className="inventor-help-who">{['我自己','家人','大家'].map((who) => <button type="button" className={helpsWho===who ? 'is-selected' : ''} key={who} onClick={() => setHelpsWho(who)}>{who}</button>)}</div><p>{inventorTemplate(seed.id).safety}</p><button className="inventor-primary" type="button" disabled={Boolean(pendingId) || (custom && (!title.trim() || !problem.trim()))} onClick={create}>{pendingId ? '正在收好想法…' : '把这个想法收进工坊'}</button><button className="inventor-text-button" type="button" onClick={() => navigate('/inventor')}>先放一放</button></article></section>
}
function ProjectShell({project,status,image,children}) {
  const navigate=useNavigate()
  return <section className="inventor-project"><aside><img src={inventorImage(image,project.seedId)} alt={`${project.title}的工坊示意`} /></aside><article><header><button type="button" onClick={() => navigate('/inventor')}><Icon name="home" />回工坊</button><span>{project.title}</span></header><StageTrail status={status} />{children}</article></section>
}
function StagePage({project}) {
  const {dispatch}=useBedtimeActions(), status=project.status
  const advance=(next) => dispatch({type:'UPDATE_INVENTOR_STAGE',profileId:project.profileId,projectId:project.id,status:next})
  if(status==='testing') return <TestingPage key={project.id} project={project} />
  if(status==='learning') return <LearningPage project={project} />
  const stage=inventorStage(status)
  const next=status==='sketching' || status==='problem_defined' ? 'prototype_1' : status==='prototype_1' ? 'testing' : 'showcase'
  return <ProjectShell project={project} status={status} image={stage.image}><h1>{status==='iteration' ? '带着线索做第二版' : stage.title}</h1><p>{status==='iteration' ? project.nextChangeTitle || '只改最想先解决的地方。' : '不用完美，能把自己的想法试出来就好。'}</p><p className="inventor-safety"><Icon name="shield" />{inventorTemplate(project.seedId).safety}</p><MediaDock project={project} stage={status} versionNumber={status==='iteration' ? 2 : 1} /><button className="inventor-primary" type="button" onClick={() => advance(next)}>{next==='prototype_1' ? '草图准备好啦' : next==='testing' ? '第一版准备试一试' : '第二版准备讲给家人听'}</button></ProjectShell>
}
function TestingPage({project}) {
  const {dispatch}=useBedtimeActions(), template=inventorTemplate(project.seedId)
  const [finding,setFinding]=useState(template.findings[0].id), [change,setChange]=useState(template.changes[0].id), [words,setWords]=useState('')
  const record=() => { const f=template.findings.find((v) => v.id===finding), c=template.changes.find((v) => v.id===change); dispatch({type:'RECORD_INVENTOR_TEST',profileId:project.profileId,projectId:project.id,finding,findingTitle:words.trim() || f.title,nextChange:change,nextChangeTitle:c.title,nextQuestion:`怎样${c.title}？`}) }
  return <ProjectShell project={project} status="testing" image="testing"><h1>这次试出了什么？</h1><p className="inventor-safety">{template.safety}</p><p>这不是失败，是第一版告诉我们的新线索</p><div className="inventor-findings">{template.findings.map((f) => <button type="button" className={finding===f.id ? 'is-selected' : ''} aria-pressed={finding===f.id} key={f.id} onClick={() => setFinding(f.id)}><strong>{f.title}</strong></button>)}</div><label className="calm-field">也可以用自己的话说（可选）<textarea maxLength={300} value={words} onChange={(e) => setWords(e.target.value)} /></label><MediaDock project={project} stage="testing" /><h2>下一版想先改哪里？</h2><div className="inventor-next-changes">{template.changes.map((c) => <button type="button" className={change===c.id ? 'is-selected' : ''} aria-pressed={change===c.id} key={c.id} onClick={() => setChange(c.id)}>{c.title}</button>)}</div><button className="inventor-primary" type="button" onClick={record}>把测试发现收好</button></ProjectShell>
}
function LearningPage({project}) {
  const {dispatch}=useBedtimeActions(), navigate=useNavigate(), template=inventorTemplate(project.seedId)
  const card=template.cards.find((c) => project.knowledgeCardIds?.includes(c.id))
  useEffect(() => () => { if('speechSynthesis' in window) window.speechSynthesis.cancel() },[])
  const iterate=() => dispatch({type:'CREATE_INVENTOR_ITERATION',profileId:project.profileId,projectId:project.id,idea:project.nextChangeTitle || card?.title || '先按自己的办法试试'})
  const speak=() => { if(!card || !('speechSynthesis' in window)) return; window.speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(`${card.title}。${card.copy}`);u.lang='zh-CN';u.rate=.86;window.speechSynthesis.speak(u) }
  return <ProjectShell project={project} status="learning" image="clue"><h1>{card ? `为了${project.nextChangeTitle}，先看一个小线索` : '新线索已经收好'}</h1><p>你发现：{project.versions[0]?.testFindingTitle}。知识不是下一关，只在需要时拿出来。</p>{card ? <div className="inventor-knowledge-card"><img src={knowledgeImage(card.image)} alt="" /><span><h2>{card.title}</h2><p>{card.copy}</p><button type="button" onClick={speak}><Icon name="bell" />听眠眠讲一遍</button></span></div> : <div className="inventor-waiting-clue"><strong>{project.nextQuestion}</strong><button className="inventor-parent-help" type="button" onClick={() => navigate('/parent/inventor')}>请家长一起看看</button></div>}<button className="inventor-primary" type="button" onClick={iterate}>{card ? '带着这个线索再改一版' : '我先按自己的办法试试'}</button></ProjectShell>
}
export function InventorProjectPage() {
  const {projectId}=useParams(), {state}=useBedtimeState(), navigate=useNavigate(), project=inventorProject(state,projectId)
  useEffect(() => {if(project?.profileId===state.activeProfileId && (project.status==='showcase' || project.status==='archived')) navigate(`/inventor/showcase/${project.id}`,{replace:true})},[navigate,project,state.activeProfileId])
  if(!project || project.profileId!==state.activeProfileId) return <section className="inventor-missing"><h1>这份发明笔记还没找到</h1><button type="button" onClick={() => navigate('/inventor')}>回发明工坊</button></section>
  return <StagePage key={project.id} project={project} />
}
export function InventorShowcasePage() {
  const {projectId}=useParams(), {state}=useBedtimeState(), {dispatch}=useBedtimeActions(), navigate=useNavigate(), project=inventorProject(state,projectId)
  const [resuming,setResuming]=useState(false)
  const story=useMemo(() => projectStory(project),[project])
  useEffect(() => { if(resuming && project?.status==='iteration') navigate(`/inventor/project/${projectId}`) },[resuming,project?.status,projectId,navigate])
  if(!project || project.profileId!==state.activeProfileId) return <section className="inventor-missing"><h1>这份发明故事还没找到</h1><button type="button" onClick={() => navigate('/inventor')}>回发明工坊</button></section>
  const method=project.showcase?.method || 'live'
  return <section className="inventor-showcase"><aside><img src={inventorImage('showcase',project.seedId)} alt="家庭发布会示意" /><div><span>家庭发布会</span><strong>讲讲怎么想、怎么试、后来怎么改</strong></div></aside><article><header><span className="eyebrow">{project.title}</span><h1>我的发明故事</h1></header><div className="inventor-story">{story.map((item,index) => <div key={item.title}><b>{index+1}</b><img src={inventorImage(item.image,project.seedId)} alt="" /><span><strong>{item.title}</strong><small>{item.copy}</small></span></div>)}</div><h2>我想怎么分享？</h2><div className="inventor-showcase-methods">{SHOWCASE_METHODS.map((m) => <button type="button" className={method===m.id ? 'is-selected' : ''} aria-pressed={method===m.id} key={m.id} onClick={() => dispatch({type:'SELECT_INVENTOR_SHOWCASE_METHOD',profileId:project.profileId,projectId,method:m.id})}>{m.title}</button>)}</div><MediaDock project={project} stage="showcase" versionNumber={2} /><button className="inventor-primary" type="button" onClick={() => {dispatch({type:'ARCHIVE_INVENTOR_PROJECT',profileId:project.profileId,projectId});navigate('/inventor')}}>把这次发明收进工坊</button><button className="inventor-text-button" type="button" disabled={resuming} onClick={() => {setResuming(true);dispatch({type:'CREATE_INVENTOR_ITERATION',profileId:project.profileId,projectId,idea:'我还想继续改'})}}>我还想继续改</button></article></section>
}
