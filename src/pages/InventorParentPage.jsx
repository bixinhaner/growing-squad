import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { appPath } from '../data/paths.js'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { Icon } from '../ui/Icons.jsx'
import { inventorImage, inventorStage, inventorTemplate, knowledgeImage } from '../modules/inventor/inventorCatalog.js'
import { activeInventorProject, inventorProjects, projectArtifacts, projectStory } from '../modules/inventor/inventorModel.js'
import { exportInventorProject } from '../modules/inventor/inventorMedia.js'
import './comfort.css'
export function InventorParentPage() {
  const { state } = useBedtimeState()
  const project = activeInventorProject(state)
  return <InventorParentContent key={`${state.activeProfileId}:${project?.id || 'empty'}`} project={project} />
}
function InventorParentContent({ project }) {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')
  const [exporting, setExporting] = useState(false)
  const projects = inventorProjects(state)
  const artifacts = project ? projectArtifacts(state, project.id) : []
  if (!project) return <section className="calm-parent inventor-parent"><header className="calm-section-head"><div><span className="calm-eyebrow">长期项目</span><h1>发明家工坊</h1><p>从孩子发现的真实麻烦开始，不提前塞进一套课程。</p></div></header><div className="calm-empty"><img src={appPath('assets/inventor/workshop-hero.webp')} width="180" alt="空着的发明工作台" /><h2>还没有正在进行的发明</h2><p>先听听孩子想解决什么。</p><button className="calm-action" type="button" onClick={() => navigate('/inventor/new')}>陪孩子收下一个想法</button></div></section>
  const template = inventorTemplate(project.seedId)
  const addKnowledge = (cardId) => {
    if (!template.cards.some((card) => card.id === cardId)) return
    dispatch({ type: 'ADD_INVENTOR_KNOWLEDGE', profileId: project.profileId, projectId: project.id, cardId })
    setMessage('这张小线索已经放进孩子的下一步。')
  }
  const addNote = () => {
    if (!note.trim()) return
    dispatch({ type: 'ADD_INVENTOR_PARENT_NOTE', profileId: project.profileId, projectId: project.id, noteId: `note_${crypto.randomUUID()}`, text: note.trim() })
    setNote(''); setMessage('原话已提交保存。不会替孩子写标准答案。')
  }
  const exportProject = async () => {
    setExporting(true)
    try { await exportInventorProject(project, artifacts); setMessage('项目资料已经整理成压缩包。') }
    catch (error) { setMessage(error instanceof Error ? error.message : '导出暂未完成，请重试。') }
    finally { setExporting(false) }
  }
  return <section className="calm-parent inventor-parent"><header className="calm-section-head"><div><span className="calm-eyebrow">长期项目 · {projects.length} 个想法</span><h1>发明家工坊</h1><p>保留孩子怎么想、怎么试、后来怎么改。</p></div><button className="calm-action" type="button" disabled={exporting} onClick={exportProject}><Icon name="download" />{exporting ? '正在整理资料' : '导出项目'}</button></header>
    <article className="calm-parent-card"><span className="calm-eyebrow">{inventorStage(project.status).short}</span><h2>{project.title}</h2><p>{project.problem}</p><p>{template.safety}</p></article>
    <div className="calm-inventor-parent-grid"><section className="calm-parent-card"><h2>项目过程</h2>{projectStory(project).map((item) => <article className="calm-project-story" key={item.title}><img src={inventorImage(item.image, project.seedId)} alt="" /><div><strong>{item.title === '测试告诉我' ? '测试发现' : item.title}</strong><p>{item.copy}</p></div></article>)}<h3>项目资料</h3>{artifacts.length ? artifacts.map((artifact) => <p key={artifact.id}>{artifact.fileName} · {artifact.status === 'synced' ? '已同步' : '本机资料，待同步'}</p>) : <p>还没有添加照片、语音或视频。没有附件也可以推进项目。</p>}
      {(project.parentNotes || []).length ? <details><summary>查看家长帮记的话</summary>{project.parentNotes.map((item) => <blockquote key={item.id}>{item.text}</blockquote>)}</details> : null}</section>
    <section className="calm-parent-card"><h2>按需要加入知识卡</h2><p>这里只展示与当前项目相关的线索，不需要全学。</p>{template.cards.map((card) => <article className="calm-knowledge" key={card.id}><img src={knowledgeImage(card.image)} alt="" /><div><h3>{card.title}</h3><p>{card.copy}</p><button type="button" className="calm-action calm-action--secondary" disabled={project.knowledgeCardIds?.includes(card.id)} onClick={() => addKnowledge(card.id)}>{project.knowledgeCardIds?.includes(card.id) ? '已经加入' : '放进孩子的下一步'}</button></div></article>)}
      <label className="calm-field">请家长帮孩子记下原话<textarea value={note} maxLength={1000} onChange={(event) => setNote(event.target.value)} placeholder="只记录孩子说过的话，不替孩子写标准答案" /></label><button className="calm-action" type="button" onClick={addNote} disabled={!note.trim()}>记进项目</button></section></div>
    <p className="calm-status" role="status">{message}</p><nav className="calm-parent-links" aria-label="项目操作"><button className="calm-action calm-action--secondary" type="button" onClick={() => navigate(`/inventor/project/${project.id}`)}>陪孩子继续探索</button><button className="calm-action" type="button" disabled={project.status !== 'showcase'} onClick={() => navigate(`/inventor/showcase/${project.id}`)}>{project.status === 'showcase' ? '打开发布会' : '发布会还在准备'}</button></nav>
  </section>
}
