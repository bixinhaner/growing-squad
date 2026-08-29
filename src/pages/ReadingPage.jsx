import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { localDateKey } from '../domain/model.js'
import { appPath } from '../data/paths.js'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { Icon } from '../ui/Icons.jsx'
import { DIFFICULTY_OPTIONS, READING_MODES, REFLECTION_OPTIONS, REFLECTION_PROMPTS, readingCover, readingMode } from '../modules/reading/bookCatalog.js'
import { activeReadingBooks, readingBook, readingSessionsFor, readingState } from '../modules/reading/readingModel.js'

function createSessionId(profileId) {
  return `reading-${profileId}-${localDateKey()}-${Date.now()}`
}

function BookCover({ book, className = '' }) {
  return <img className={className} src={readingCover(book.coverId).image} alt={`${book.title}的封面`} />
}

export function ReadingShelfPage() {
  const { state } = useBedtimeState()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const profileId = state.activeProfileId
  const books = activeReadingBooks(state)
  const sessions = readingSessionsFor(state, profileId)
  const readIds = new Set(sessions.filter((item) => item.completedAt).map((item) => item.bookId))
  const active = sessions.find((item) => item.status === 'active' || item.status === 'reflection')
  const activeBook = active ? readingBook(state, active.bookId) : null
  const visible = books.filter((book) => filter === 'all' || (filter === 'read' ? readIds.has(book.id) : !readIds.has(book.id)))

  return <section className="reading-shelf" aria-labelledby="reading-shelf-title">
    <aside className="reading-treehouse-hero">
      <img src={appPath('assets/reading/story-treehouse-hero.webp')} alt="眠眠在发光的故事树屋里等你" />
      <div><span className="eyebrow">阅读桥梁</span><h1 id="reading-shelf-title">故事树屋</h1><p>今天想和谁一起读？</p></div>
    </aside>
    <article className="reading-shelf__content">
      {activeBook ? <button className="reading-continue" type="button" onClick={() => navigate(`/reading/play/${active.id}`)}><BookCover book={activeBook} /><span><small>继续上次的故事</small><strong>{activeBook.title}</strong></span><Icon name="chevron" /></button> : null}
      <header><div><span className="eyebrow">家里的书</span><h2>{books.length ? '选一本想读的书' : '书架还空着'}</h2></div>{books.length ? <div className="reading-filters" aria-label="筛选书架">{[['all', '全部'], ['unread', '想读'], ['read', '读过']].map(([id, label]) => <button key={id} className={filter === id ? 'is-active' : ''} type="button" onClick={() => setFilter(id)}>{label}</button>)}</div> : null}</header>
      {books.length ? <div className="reading-books">{visible.map((book) => <button type="button" key={book.id} onClick={() => navigate(`/reading/book/${book.id}`)}><BookCover book={book} /><span><strong>{book.title}</strong><small>{book.author || '家里的故事书'}{readIds.has(book.id) ? ' · 读过' : ''}</small></span></button>)}</div> : <div className="reading-empty"><img src={readingCover('hedgehog-lantern').image} alt="等待放上书架的故事封面" /><div><strong>请家长先放一本家里的书</strong><p>这里只记录书名和陪伴方式，不会上传书里的内容。</p><button type="button" onClick={() => navigate('/parent/reading')}>请家长添加</button></div></div>}
      <button className="reading-parent-add" type="button" onClick={() => navigate('/parent/reading')}><Icon name="book" />请家长添加家里的书</button>
    </article>
  </section>
}

export function ReadingBookPage() {
  const { bookId } = useParams()
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const [selected, setSelected] = useState('read-together')
  const book = readingBook(state, bookId)
  if (!book) return <section className="reading-missing"><h1>这本书已经放回家里啦</h1><button type="button" onClick={() => navigate('/reading')}>回到书架</button></section>
  const start = () => {
    const sessionId = createSessionId(state.activeProfileId)
    dispatch({ type: 'SELECT_READING_MODE', profileId: state.activeProfileId, sessionId, bookId, mode: selected, initiatedBy: 'child' })
    dispatch({ type: 'START_READING_SESSION', profileId: state.activeProfileId, sessionId, bookId, mode: selected, initiatedBy: 'child' })
    navigate(`/reading/play/${sessionId}`)
  }
  return <section className="reading-mode" aria-labelledby="reading-mode-title">
    <aside><BookCover book={book} /><h1>{book.title}</h1><p>{book.author || '家里的故事书'}</p><button type="button" onClick={() => navigate('/reading')}><Icon name="chevronBack" />换一本</button></aside>
    <article><span className="eyebrow">选择陪伴方式</span><h2 id="reading-mode-title">这次想怎么读？</h2><div className="reading-mode-grid">{READING_MODES.map((mode, index) => <button type="button" key={mode.id} className={selected === mode.id ? 'is-selected' : ''} aria-pressed={selected === mode.id} onClick={() => setSelected(mode.id)}><img src={readingCover(['cloud-whisper', 'talking-tree', 'hedgehog-lantern', 'star-path'][index]).image} alt="" /><span><strong>{mode.title}</strong><small>{mode.subtitle}</small></span>{mode.recommended ? <em>今天试试</em> : null}</button>)}</div><div className="reading-mode-actions"><button className="reading-primary" type="button" onClick={start}>带我开始</button><button type="button" onClick={() => navigate('/reading')}>今天先不读</button></div></article>
  </section>
}

export function ReadingPlayPage() {
  const { sessionId } = useParams()
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const session = readingState(state).sessions[sessionId]
  const book = session ? readingBook(state, session.bookId) : null
  const [helped, setHelped] = useState(Boolean(session?.helpRequestedAt))
  if (!session || !book) return <section className="reading-missing"><h1>这次阅读已经收好啦</h1><button type="button" onClick={() => navigate('/reading')}>回到书架</button></section>
  if (session.status === 'reflection' || session.status === 'done') return <ReadingReflection session={session} book={book} />
  const help = () => {
    dispatch({ type: 'REQUEST_READING_HELP', profileId: state.activeProfileId, sessionId })
    setHelped(true)
  }
  return <section className="reading-play"><img src={appPath('assets/reading/reading-companion.webp')} alt="眠眠抱着书，安静陪着你" /><article><span className="reading-mode-pill">{readingMode(session.mode).title}</span><h1>故事在你手里</h1><p>{readingMode(session.mode).subtitle}，慢慢读就好</p><small>眠眠安静陪着你</small>{helped ? <div className="reading-helped" role="status">已经告诉家长，等一等就会来陪你。</div> : null}<button className="reading-primary" type="button" onClick={() => dispatch({ type: 'COMPLETE_READING_SESSION', profileId: state.activeProfileId, sessionId })}>读完啦</button><button className="reading-help" type="button" onClick={help}>我需要帮助</button><button className="reading-return" type="button" onClick={() => navigate('/reading')}>先放回书架</button></article></section>
}

function ReadingReflection({ session, book }) {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const [difficulty, setDifficulty] = useState(session.difficulty || '')
  const [reflection, setReflection] = useState(session.reflection?.mode || 'skip')
  const prompt = useMemo(() => REFLECTION_PROMPTS[Math.abs([...session.id].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % REFLECTION_PROMPTS.length], [session.id])
  const finish = (reflectionMode = reflection) => {
    if (!difficulty) return
    dispatch({ type: 'RECORD_READING_DIFFICULTY', profileId: state.activeProfileId, sessionId: session.id, difficulty })
    dispatch({ type: 'ADD_READING_REFLECTION', profileId: state.activeProfileId, sessionId: session.id, mode: reflectionMode, prompt })
    navigate('/story-treehouse')
  }
  return <section className="reading-reflection"><aside><img src={readingCover(book.coverId).image} alt="" /><span>故事叶收好啦</span><strong>{book.title}</strong></aside><article><h1>刚才读起来怎么样？</h1><div className="reading-difficulty">{DIFFICULTY_OPTIONS.map((item) => <button type="button" key={item.id} className={difficulty === item.id ? 'is-selected' : ''} onClick={() => setDifficulty(item.id)}><strong>{item.title}</strong><small>{item.copy}</small></button>)}</div><h2>想怎样告诉眠眠这个故事？</h2><div className="reading-reflection-options">{REFLECTION_OPTIONS.map((item) => <button type="button" key={item.id} className={reflection === item.id ? 'is-selected' : ''} onClick={() => setReflection(item.id)}>{item.title}</button>)}</div><p className="reading-prompt">{prompt}</p><button className="reading-primary" type="button" disabled={!difficulty} onClick={() => finish()}>收进故事树屋</button><button className="reading-return" type="button" disabled={!difficulty} onClick={() => finish('skip')}>以后再说</button></article></section>
}
