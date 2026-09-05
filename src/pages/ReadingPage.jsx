import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { localDateKey } from '../domain/model.js'
import { appPath } from '../data/paths.js'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { Icon } from '../ui/Icons.jsx'
import { DIFFICULTY_OPTIONS, READING_MODES, REFLECTION_OPTIONS, REFLECTION_PROMPTS, readingCover, readingMode } from '../modules/reading/bookCatalog.js'
import { activeReadingBooks, readingBook, readingSessionsFor, readingState } from '../modules/reading/readingModel.js'
import './comfort.css'
const createSessionId=(profileId) => `reading-${profileId}-${localDateKey()}-${crypto.randomUUID()}`
function BookCover({book,className=''}) { return <img className={className} src={readingCover(book.coverId).image} alt={`${book.title}的封面`} /> }
export function ReadingShelfPage() {
  const { state }=useBedtimeState(), navigate=useNavigate()
  const [filter,setFilter]=useState('all')
  const books=activeReadingBooks(state), sessions=readingSessionsFor(state,state.activeProfileId)
  const readIds=new Set(sessions.filter((s) => s.completedAt).map((s) => s.bookId))
  const active=sessions.find((s) => s.status==='active' || s.status==='reflection')
  const activeBook=active ? readingBook(state,active.bookId) : null
  const visible=books.filter((b) => filter==='all' || (filter==='read' ? readIds.has(b.id) : !readIds.has(b.id)))
  return <section className="reading-shelf" aria-labelledby="reading-shelf-title"><aside className="reading-treehouse-hero"><img src={appPath('assets/reading/story-treehouse-hero.webp')} alt="眠眠在故事树屋里等你" /><div><span className="eyebrow">阅读桥梁</span><h1 id="reading-shelf-title">故事树屋</h1><p>今天想和谁一起读？</p></div></aside><article className="reading-shelf__content">
    {activeBook ? <button className="reading-continue" type="button" onClick={() => navigate(`/reading/play/${active.id}`)}><BookCover book={activeBook} /><span><small>继续上次的故事</small><strong>{activeBook.title}</strong></span><Icon name="chevron" /></button> : null}
    <header><div><span className="eyebrow">家里的书</span><h2>{books.length ? '选一本想读的书' : '书架还空着'}</h2></div>{books.length ? <div className="reading-filters" aria-label="筛选书架">{[['all','全部'],['unread','想读'],['read','读过']].map(([id,label]) => <button type="button" key={id} className={filter===id ? 'is-active' : ''} aria-pressed={filter===id} onClick={() => setFilter(id)}>{label}</button>)}</div> : null}</header>
    {books.length ? <div className="reading-books">{visible.map((book) => <button type="button" key={book.id} onClick={() => navigate(`/reading/book/${book.id}`)}><BookCover book={book} /><span><strong>{book.title}</strong><small>{book.author || '家里的故事书'}{readIds.has(book.id) ? ' · 读过' : ''}</small></span></button>)}{!visible.length ? <p>这个格子还空着，去别的格子看看吧。</p> : null}</div> : <div className="reading-empty"><img src={readingCover('hedgehog-lantern').image} alt="" /><div><strong>请家长先放一本家里的书</strong><p>这里只记录书名和陪伴方式，不上传书里的内容。</p><button type="button" onClick={() => navigate('/parent/reading')}>请家长添加</button></div></div>}
    <button className="reading-parent-add" type="button" onClick={() => navigate('/parent/reading')}><Icon name="book" />请家长添加家里的书</button></article></section>
}
export function ReadingBookPage() {
  const {bookId}=useParams(), {state}=useBedtimeState()
  return <ReadingBookContent key={`${state.activeProfileId}:${bookId}`} />
}
function ReadingBookContent() {
  const {bookId}=useParams(), {state}=useBedtimeState(), {dispatch}=useBedtimeActions(), navigate=useNavigate()
  const [selected,setSelected]=useState('read-together'), [expanded,setExpanded]=useState(false)
  const book=readingBook(state,bookId)
  if(!book) return <section className="reading-missing"><h1>这本书已经放回家里啦</h1><button type="button" onClick={() => navigate('/reading')}>回到书架</button></section>
  const primary=['listen-parent','read-together','independent-short']
  const modes=READING_MODES.filter((mode) => expanded || primary.includes(mode.id))
  const start=() => { const sessionId=createSessionId(state.activeProfileId); const action={profileId:state.activeProfileId,sessionId,bookId,mode:selected,initiatedBy:'unknown'}; dispatch({type:'SELECT_READING_MODE',...action}); dispatch({type:'START_READING_SESSION',...action}); navigate(`/reading/play/${sessionId}`) }
  return <section className="reading-mode" aria-labelledby="reading-mode-title"><aside><BookCover book={book} /><h1>{book.title}</h1><p>{book.author || '家里的故事书'}</p><button type="button" onClick={() => navigate('/reading')}><Icon name="chevronBack" />换一本</button></aside><article><span className="eyebrow">选择陪伴方式</span><h2 id="reading-mode-title">这次想怎么读？</h2><p>带上纸书，和身边的家人一起读。这里不是电子书或录音播放器。</p><div className="reading-mode-grid">{modes.map((mode,index) => <button type="button" key={mode.id} className={selected===mode.id ? 'is-selected' : ''} aria-pressed={selected===mode.id} onClick={() => setSelected(mode.id)}><img src={readingCover(['cloud-whisper','talking-tree','star-path','dream-train','fox-bridge','hedgehog-lantern','pocket-ocean','singing-tree'][index]).image} alt="" /><span><strong>{mode.title}</strong><small>{mode.id==='follow-audio' ? '家长读一句，我跟一句' : mode.id==='audio-pause-read' ? '家长读一段，我接着读' : mode.subtitle}</small></span></button>)}</div><button className="calm-text-action" type="button" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>{expanded ? '收起更多方式' : '看看其他线下读法'}</button><div className="reading-mode-actions"><button className="reading-primary" type="button" onClick={start}>带我开始</button><button type="button" onClick={() => navigate('/reading')}>今天先不读</button></div></article></section>
}
export function ReadingPlayPage() {
  const {sessionId}=useParams(), {state}=useBedtimeState()
  return <ReadingPlayContent key={`${state.activeProfileId}:${sessionId}`} />
}
function ReadingPlayContent() {
  const {sessionId}=useParams(), {state}=useBedtimeState(), {dispatch}=useBedtimeActions(), navigate=useNavigate()
  const session=readingState(state).sessions[sessionId]
  const book=session ? readingBook(state,session.bookId) : null
  if(!session || !book || session.profileId!==state.activeProfileId) return <section className="reading-missing"><h1>这次阅读已经收好啦</h1><button type="button" onClick={() => navigate('/reading')}>回到书架</button></section>
  if(session.status==='reflection' || session.status==='done') return <ReadingReflection session={session} book={book} />
  const mode=readingMode(session.mode)
  const subtitle=mode.id==='follow-audio' ? '请家长读一句，你跟着读一句' : mode.id==='audio-pause-read' ? '请家长读一小段，再由你接着读' : mode.subtitle
  return <section className="reading-play"><img src={appPath('assets/reading/reading-companion.webp')} alt="眠眠抱着书，安静陪着你" /><article><span className="reading-mode-pill">{mode.title}</span><h1>故事在你手里</h1><p>{subtitle}，慢慢读就好</p><small>眠眠安静陪着你</small>{session.helpRequestedAt && !session.helpResolvedAt ? <div className="reading-helped" role="status">已记录你需要帮助，请叫家长来陪一下。</div> : null}<button className="reading-primary" type="button" onClick={() => dispatch({type:'COMPLETE_READING_SESSION',profileId:state.activeProfileId,sessionId})}>读完啦</button><button className="reading-help" type="button" onClick={() => dispatch({type:'REQUEST_READING_HELP',profileId:state.activeProfileId,sessionId})}>我需要帮助</button><button className="reading-return" type="button" onClick={() => navigate('/reading')}>先放回书架</button></article></section>
}
function ReadingReflection({session,book}) {
  const {state}=useBedtimeState(), {dispatch}=useBedtimeActions(), navigate=useNavigate()
  const [difficulty,setDifficulty]=useState(session.difficulty || ''), [reflection,setReflection]=useState(session.reflection?.mode || 'skip')
  const [note,setNote]=useState(session.reflection?.note || ''), [noteSource,setNoteSource]=useState(session.reflection?.noteSource || 'unknown')
  const prompt=useMemo(() => REFLECTION_PROMPTS[Math.abs([...session.id].reduce((sum,c) => sum+c.charCodeAt(0),0))%REFLECTION_PROMPTS.length],[session.id])
  const finish=(mode=reflection) => { const base={profileId:state.activeProfileId,sessionId:session.id}; if(difficulty) dispatch({type:'RECORD_READING_DIFFICULTY',...base,difficulty}); dispatch({type:'ADD_READING_REFLECTION',...base,mode,prompt,note:note.trim(),noteSource:note.trim() ? noteSource : 'unknown'}); navigate('/story-treehouse') }
  return <section className="reading-reflection"><aside><BookCover book={book} /><span>故事叶收好啦</span><strong>{book.title}</strong></aside><article><h1>刚才读起来怎么样？</h1><p>可以说一点，也可以什么都不填。</p><div className="reading-difficulty">{DIFFICULTY_OPTIONS.map((item) => <button type="button" key={item.id} className={difficulty===item.id ? 'is-selected' : ''} aria-pressed={difficulty===item.id} onClick={() => setDifficulty(item.id)}><strong>{item.title}</strong><small>{item.copy}</small></button>)}</div><h2>想怎样告诉眠眠这个故事？</h2><div className="reading-reflection-options">{REFLECTION_OPTIONS.map((item) => <button type="button" key={item.id} className={reflection===item.id ? 'is-selected' : ''} aria-pressed={reflection===item.id} onClick={() => setReflection(item.id)}>{item.title}</button>)}</div><p className="reading-prompt">{prompt}</p>
    <div className="calm-reflection-note"><label className="calm-field">留下一句话（可选，家长可以帮记）<textarea maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="记下真实说过的话，也可以写下刚才画了或演了什么。" /><small>{note.length} / 500 字 · 会保存在家庭成长记录中</small></label>{note ? <label className="calm-field">这段话来自谁<select value={noteSource} onChange={(e) => setNoteSource(e.target.value)}><option value="child">孩子原话，家长代记</option><option value="parent">家长的观察</option><option value="unknown">普通阅读笔记</option></select></label> : null}</div>
    <button className="reading-primary" type="button" onClick={() => finish()}>收进故事树屋</button><button className="reading-return" type="button" onClick={() => finish('skip')}>以后再说</button></article></section>
}
