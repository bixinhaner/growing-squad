import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { localDateKey } from '../../domain/model.js'
import { appPath } from '../../data/paths.js'
import { useBedtimeActions, useBedtimeState } from '../../store/useBedtime.js'
import { Icon } from '../../ui/Icons.jsx'
import { DIFFICULTY_OPTIONS, READING_MODES, REFLECTION_OPTIONS, REFLECTION_PROMPTS, readingCover, readingMode } from '../../modules/reading/bookCatalog.js'
import { activeReadingBooks, readingBook, readingSessionsFor, readingState } from '../../modules/reading/readingModel.js'

const createSessionId = (profileId) => `reading-${profileId}-${localDateKey()}-${crypto.randomUUID()}`
const MODE_ART = ['cloud-whisper', 'talking-tree', 'star-path', 'dream-train', 'fox-bridge', 'hedgehog-lantern', 'pocket-ocean', 'singing-tree']

function Cover({ book, className = '' }) {
  return <img className={className} src={readingCover(book.coverId).image} alt={`${book.title}的封面`} />
}

function Journey({ current }) {
  return (
    <ol className="v3-trail v3-journey" aria-label="阅读旅程">
      {['挑一本', '陪着读', '留句话'].map((label, index) => (
        <li key={label} aria-current={index === current ? 'step' : undefined} className={index === current ? 'is-current' : index < current ? 'is-past' : ''}>
          <b className="v3-num" aria-hidden="true">{index < current ? <Icon name="check" size={14} /> : index + 1}</b><small>{label}</small>
        </li>
      ))}
    </ol>
  )
}

function Missing({ title }) {
  const navigate = useNavigate()
  return <div className="v3-room v3-empty"><h1 className="v3-display">{title}</h1><button className="v3-button" type="button" onClick={() => navigate('/reading')}>回到书架</button></div>
}

export function StoryShelf() {
  const { state } = useBedtimeState()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const books = activeReadingBooks(state)
  const sessions = readingSessionsFor(state, state.activeProfileId)
  const readIds = new Set(sessions.filter((s) => s.completedAt).map((s) => s.bookId))
  const active = sessions.find((s) => s.status === 'active' || s.status === 'reflection')
  const activeBook = active ? readingBook(state, active.bookId) : null
  const needle = query.trim().toLocaleLowerCase('zh-CN')
  const visible = books.filter((b) => (filter === 'all' || (filter === 'read' ? readIds.has(b.id) : !readIds.has(b.id))) && `${b.title} ${b.author || ''}`.toLocaleLowerCase('zh-CN').includes(needle))
  return (
    <div className="v3-room v3-tree" aria-labelledby="reading-shelf-title">
      <header className="v3-room__banner">
        <img className="v3-room__art" src={appPath('assets/reading/story-treehouse-hero.webp')} alt="小伙伴在故事树屋里等你" />
        <div className="v3-room__copy">
          <span className="v3-eyebrow">带上纸书，和家人一起读</span>
          <h1 id="reading-shelf-title" className="v3-display">故事树屋</h1>
          <p>今天想和谁一起读？</p>
          <Journey current={0} />
        </div>
      </header>

      {activeBook ? (
        <button className="v3-feature" type="button" onClick={() => navigate(`/reading/play/${active.id}`)}>
          <Cover book={activeBook} />
          <span><small>继续上次的故事</small><strong className="v3-display">{activeBook.title}</strong></span>
          <Icon name="chevron" />
        </button>
      ) : null}

      <div className="v3-tree__bar">
        <h2 className="v3-room__label">{books.length ? '选一本想读的书' : '书架还空着'}</h2>
        {books.length ? (
          <div className="v3-chips" role="group" aria-label="筛选书架">
            {[['all', '全部'], ['unread', '想读'], ['read', '读过']].map(([id, label]) => <button type="button" key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}
          </div>
        ) : null}
        {books.length > 3 ? <label className="v3-search"><Icon name="search" size={18} /><input type="search" aria-label="找一本书" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="找找书名或作者" /></label> : null}
      </div>

      {books.length ? (
        <div className="v3-shelf">
          <div className="v3-shelf__books">
            {visible.map((book, index) => (
              <button type="button" key={book.id} style={{ '--i': index }} onClick={() => navigate(`/reading/book/${book.id}`)}>
                <Cover book={book} />
                {readIds.has(book.id) ? <i className="v3-shelf__leaf" aria-hidden="true" /> : null}
                <strong>{book.title}</strong>
                <small>{book.author || '家里的故事书'}{readIds.has(book.id) ? ' · 读过' : ''}</small>
              </button>
            ))}
          </div>
          {!visible.length ? <p className="v3-note">这个格子还空着，去别的格子看看吧。</p> : null}
        </div>
      ) : (
        <div className="v3-tree__empty v3-felt">
          <img src={readingCover('hedgehog-lantern').image} alt="" />
          <div><strong className="v3-display">请家长先放一本家里的书</strong><p>这里只记录书名和陪伴方式，不上传书里的内容。</p></div>
        </div>
      )}
      <div className="v3-actions v3-actions--row">
        <button className="v3-button v3-button--wool" type="button" onClick={() => navigate('/parent/reading')}><Icon name="book" size={20} />请家长添加家里的书</button>
      </div>
    </div>
  )
}

export function StoryBook() {
  const { bookId } = useParams()
  const { state } = useBedtimeState()
  return <StoryBookContent key={`${state.activeProfileId}:${bookId}`} />
}

function StoryBookContent() {
  const { bookId } = useParams()
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const [selected, setSelected] = useState('read-together')
  const [expanded, setExpanded] = useState(false)
  const book = readingBook(state, bookId)
  if (!book) return <Missing title="这本书已经放回家里啦" />
  const primary = ['listen-parent', 'read-together', 'independent-short']
  const modes = READING_MODES.filter((mode) => expanded || primary.includes(mode.id))
  const start = () => {
    const sessionId = createSessionId(state.activeProfileId)
    const action = { profileId: state.activeProfileId, sessionId, bookId, mode: selected, initiatedBy: 'unknown' }
    dispatch({ type: 'SELECT_READING_MODE', ...action })
    dispatch({ type: 'START_READING_SESSION', ...action })
    navigate(`/reading/play/${sessionId}`)
  }
  return (
    <div className="v3-room v3-book" aria-labelledby="reading-mode-title">
      <aside className="v3-book__cover">
        <Cover book={book} />
        <h1 className="v3-display">{book.title}</h1>
        <p>{book.author || '家里的故事书'}</p>
        <button className="v3-textlink" type="button" onClick={() => navigate('/reading')}>换一本</button>
      </aside>
      <section className="v3-book__modes">
        <Journey current={1} />
        <h2 id="reading-mode-title" className="v3-display">这次想怎么读？</h2>
        <p className="v3-split__lead">带上纸书，和身边的家人一起读。这里不是电子书或录音播放器。</p>
        <div className="v3-modes" role="group" aria-label="陪伴方式">
          {modes.map((mode, index) => (
            <button type="button" key={mode.id} aria-pressed={selected === mode.id} className={selected === mode.id ? 'is-selected' : ''} onClick={() => setSelected(mode.id)}>
              <img src={readingCover(MODE_ART[index]).image} alt="" />
              <span><strong>{mode.title}</strong><small>{mode.id === 'follow-audio' ? '家长读一句，我跟一句' : mode.id === 'audio-pause-read' ? '家长读一段，我接着读' : mode.subtitle}</small></span>
              <i aria-hidden="true">{selected === mode.id ? <Icon name="check" size={16} /> : null}</i>
            </button>
          ))}
        </div>
        <button className="v3-textlink" type="button" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>{expanded ? '收起更多方式' : '看看其他线下读法'}</button>
        <div className="v3-actions v3-actions--row">
          <button className="v3-button" type="button" onClick={start}><Icon name="book" size={20} />带我开始</button>
          <button className="v3-textlink" type="button" onClick={() => navigate('/reading')}>今天先不读</button>
        </div>
      </section>
    </div>
  )
}

export function StoryPlay() {
  const { sessionId } = useParams()
  const { state } = useBedtimeState()
  return <StoryPlayContent key={`${state.activeProfileId}:${sessionId}`} />
}

function StoryPlayContent() {
  const { sessionId } = useParams()
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const session = readingState(state).sessions[sessionId]
  const book = session ? readingBook(state, session.bookId) : null
  if (!session || !book || session.profileId !== state.activeProfileId) return <Missing title="这次阅读已经收好啦" />
  if (session.status === 'reflection' || session.status === 'done') return <StoryReflection session={session} book={book} />
  const mode = readingMode(session.mode)
  const subtitle = mode.id === 'follow-audio' ? '请家长读一句，你跟着读一句' : mode.id === 'audio-pause-read' ? '请家长读一小段，再由你接着读' : mode.subtitle
  return (
    <div className="v3-room v3-split v3-read">
      <img className="v3-split__art" src={appPath('assets/reading/reading-companion.webp')} alt="小伙伴抱着书，安静陪着你" />
      <section className="v3-split__sheet">
        <Journey current={1} />
        <span className="v3-eyebrow">{mode.title}</span>
        <h1 className="v3-display">故事在你手里</h1>
        <p className="v3-split__lead">{subtitle}，慢慢读就好</p>
        <div className="v3-read__book"><Cover book={book} /><span><strong>{book.title}</strong><small>小伙伴安静陪着你</small></span></div>
        {session.helpRequestedAt && !session.helpResolvedAt ? <p className="v3-status" role="status">已记录你需要帮助，请叫家长来陪一下。</p> : null}
        <div className="v3-actions">
          <button className="v3-button v3-button--sage" type="button" onClick={() => dispatch({ type: 'COMPLETE_READING_SESSION', profileId: state.activeProfileId, sessionId })}><Icon name="check" />读完啦</button>
          <button className="v3-button v3-button--wool" type="button" onClick={() => dispatch({ type: 'REQUEST_READING_HELP', profileId: state.activeProfileId, sessionId })}>我需要帮助</button>
          <button className="v3-textlink" type="button" onClick={() => navigate('/reading')}>先放回书架</button>
        </div>
      </section>
    </div>
  )
}

function StoryReflection({ session, book }) {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const [difficulty, setDifficulty] = useState(session.difficulty || '')
  const [reflection, setReflection] = useState(session.reflection?.mode || 'skip')
  const [note, setNote] = useState(session.reflection?.note || '')
  const [noteSource, setNoteSource] = useState(session.reflection?.noteSource || 'unknown')
  const prompt = useMemo(() => REFLECTION_PROMPTS[Math.abs([...session.id].reduce((sum, c) => sum + c.charCodeAt(0), 0)) % REFLECTION_PROMPTS.length], [session.id])
  const finish = (mode = reflection) => {
    const base = { profileId: state.activeProfileId, sessionId: session.id }
    if (difficulty) dispatch({ type: 'RECORD_READING_DIFFICULTY', ...base, difficulty })
    dispatch({ type: 'ADD_READING_REFLECTION', ...base, mode, prompt, note: note.trim(), noteSource: note.trim() ? noteSource : 'unknown' })
    navigate('/story-treehouse')
  }
  return (
    <div className="v3-room v3-book v3-reflect">
      <aside className="v3-book__cover">
        <Cover book={book} />
        <span className="v3-eyebrow">故事叶收好啦</span>
        <h1 className="v3-display">{book.title}</h1>
      </aside>
      <section className="v3-book__modes">
        <Journey current={2} />
        <h2 className="v3-display">刚才读起来怎么样？</h2>
        <p className="v3-split__lead">可以说一点，也可以什么都不填。</p>
        <div className="v3-chips v3-chips--big v3-reflect__difficulty" role="group" aria-label="读起来怎么样">
          {DIFFICULTY_OPTIONS.map((item) => <button type="button" key={item.id} aria-pressed={difficulty === item.id} onClick={() => setDifficulty(item.id)}><strong>{item.title}</strong><small>{item.copy}</small></button>)}
        </div>
        <h3 className="v3-room__label">想怎样告诉眠眠这个故事？</h3>
        <div className="v3-chips" role="group" aria-label="怎样分享">
          {REFLECTION_OPTIONS.map((item) => <button type="button" key={item.id} aria-pressed={reflection === item.id} onClick={() => setReflection(item.id)}>{item.title}</button>)}
        </div>
        <p className="v3-reflect__prompt">{prompt}</p>
        <label className="v3-field">留下一句话（可选，家长可以帮记）
          <textarea maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="记下真实说过的话，也可以写下刚才画了或演了什么。" />
          <small>{note.length} / 500 字 · 会保存在家庭成长记录中</small>
        </label>
        {note ? (
          <label className="v3-field">这段话来自谁
            <select value={noteSource} onChange={(e) => setNoteSource(e.target.value)}><option value="child">孩子原话，家长代记</option><option value="parent">家长的观察</option><option value="unknown">普通阅读笔记</option></select>
          </label>
        ) : null}
        <div className="v3-actions v3-actions--row">
          <button className="v3-button" type="button" onClick={() => finish()}>收进故事树屋</button>
          <button className="v3-textlink" type="button" onClick={() => finish('skip')}>以后再说</button>
        </div>
      </section>
    </div>
  )
}
