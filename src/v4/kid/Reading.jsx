import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getActiveProfile, localDateKey } from '../../domain/model.js'
import { READING_MODES, REFLECTION_PROMPTS, readingCover, readingMode } from '../../modules/reading/bookCatalog.js'
import { activeReadingBooks, readingBook, readingSessionsFor, readingState } from '../../modules/reading/readingModel.js'
import { useBedtimeActions, useBedtimeState } from '../../store/useBedtime.js'
import { Icon } from '../ui/Icon.jsx'
import { Buddy, ChipGroup, Sheet, Speak, Tap } from '../ui/kit.jsx'
import { useToast } from '../ui/toast.js'
import { Face } from './Face.jsx'

const newSessionId = (profileId) => `reading-${profileId}-${localDateKey()}-${crypto.randomUUID()}`
const Cover = ({ book, className = '' }) => <img className={`k-cover ${className}`} src={readingCover(book.coverId).image} alt="" />

// Three ways cover almost every evening; the rest hide behind "更多读法".
const MAIN_MODES = [
  { id: 'listen-parent', title: '听家长读', art: 'cloud-whisper' },
  { id: 'read-together', title: '一起读', art: 'talking-tree' },
  { id: 'independent-short', title: '自己读一点', art: 'star-path' },
]
const HOW = {
  'follow-audio': '家长读一句，我跟一句',
  'audio-pause-read': '家长读一段，我接着读',
}

export function ReadingHome() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const profile = getActiveProfile(state)
  const books = activeReadingBooks(state)
  const sessions = readingSessionsFor(state, profile.id)
  const readIds = new Set(sessions.filter((session) => session.completedAt).map((session) => session.bookId))
  const open = sessions.find((session) => ['active', 'reflection'].includes(session.status))
  const openBook = open ? readingBook(state, open.bookId) : null
  const [filter, setFilter] = useState('all')
  const picked = readingBook(state, params.get('book'))
  const [mode, setMode] = useState('read-together')
  const [more, setMore] = useState(false)
  const shown = books.filter((book) => filter === 'all' || (filter === 'read' ? readIds.has(book.id) : !readIds.has(book.id)))
  const choose = (book) => { setMode('read-together'); setMore(false); setParams({ book: book.id }, { replace: true }) }
  const close = () => setParams({}, { replace: true })
  const start = () => {
    const sessionId = newSessionId(profile.id)
    const action = { profileId: profile.id, sessionId, bookId: picked.id, mode, initiatedBy: 'unknown' }
    dispatch({ type: 'SELECT_READING_MODE', ...action })
    dispatch({ type: 'START_READING_SESSION', ...action })
    navigate(`/reading/play/${sessionId}`)
  }

  return (
    <section className="k-place k-read" aria-labelledby="k-read-title">
      <header className="k-place__head">
        <Buddy character={profile.character} mood="calm" />
        <div>
          <h1 id="k-read-title" className="u-display">读故事</h1>
          <p className="k-place__sub">拿上家里的纸书，挑一本读吧<Speak text="读故事。拿上家里的纸书，挑一本读吧。" /></p>
        </div>
      </header>

      {openBook ? (
        <button type="button" className="k-continue" onClick={() => navigate(`/reading/play/${open.id}`)}>
          <Cover book={openBook} />
          <span><small>上次还没读完</small><strong className="u-display">{openBook.title}</strong></span>
          <span className="k-continue__go">接着读<Icon name="chevron" size={20} /></span>
        </button>
      ) : null}

      {books.length ? (
        <>
          <div className="k-move__gallery-head">
            <h2 className="k-section-title u-display">我的书架</h2>
            {readIds.size ? <ChipGroup label="书架筛选" value={filter} onChange={setFilter} options={[['all', '全部'], ['unread', '还没读'], ['read', '读过的']]} /> : null}
          </div>
          <div className="k-bookshelf">
            {shown.map((book, index) => (
              <button type="button" key={book.id} className="k-book" style={{ '--i': index }} onClick={() => choose(book)}>
                <Cover book={book} />
                {readIds.has(book.id) ? <span className="k-book__read"><Icon name="check" size={14} strokeWidth={3} />读过</span> : null}
                <strong>{book.title}</strong>
              </button>
            ))}
          </div>
          {!shown.length ? <p className="k-note">这一格还空着。</p> : null}
        </>
      ) : (
        <div className="k-empty k-panel">
          <img src={readingCover('hedgehog-lantern').image} alt="" />
          <h2 className="u-display">书架还空着</h2>
          <p>请家长在家长区放几本家里的书。这里只记书名，不放书的内容。</p>
        </div>
      )}

      {picked ? (
        <Sheet title={picked.title} onClose={close} className="k-preview">
          <div className="k-read__pick">
            <Cover book={picked} />
            <div>
              <h3 className="u-display">这次怎么读？<Speak text="这次怎么读？听家长读，一起读，还是自己读一点？" /></h3>
              <div className="k-modes" role="radiogroup" aria-label="怎么读">
                {MAIN_MODES.map((item) => (
                  <button type="button" key={item.id} role="radio" aria-checked={mode === item.id} className="k-mode" onClick={() => setMode(item.id)}>
                    <img src={readingCover(item.art).image} alt="" /><strong>{item.title}</strong>
                  </button>
                ))}
              </div>
              {more ? (
                <ChipGroup label="更多读法" value={mode} onChange={setMode} options={READING_MODES.filter((item) => !MAIN_MODES.some((main) => main.id === item.id)).map((item) => [item.id, item.title])} />
              ) : <Tap tone="quiet" size="s" onClick={() => setMore(true)}>更多读法</Tap>}
            </div>
          </div>
          <Tap tone="primary" size="l" block icon="book" onClick={start}>开始读</Tap>
        </Sheet>
      ) : null}
    </section>
  )
}

export function ReadingBookRedirect() {
  const { bookId } = useParams()
  return <Navigate to={`/reading?book=${encodeURIComponent(bookId)}`} replace />
}

export function ReadingPlay() {
  const { sessionId } = useParams()
  const { state } = useBedtimeState()
  return <ReadingPlayFor key={`${state.activeProfileId}:${sessionId}`} />
}

function ReadingPlayFor() {
  const { sessionId } = useParams()
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const toast = useToast()
  const profile = getActiveProfile(state)
  const session = readingState(state).sessions[sessionId]
  const book = session ? readingBook(state, session.bookId) : null
  if (!session || !book || session.profileId !== profile.id) {
    return <div className="k-empty k-panel"><h1 className="u-display">这次阅读已经收好啦</h1><Tap tone="primary" onClick={() => navigate('/reading')}>回到书架</Tap></div>
  }
  if (session.status === 'reflection') return <Reflect session={session} book={book} />
  if (session.status === 'done') {
    return (
      <div className="k-panel k-done">
        <span className="k-done__flower" aria-hidden="true"><Cover book={book} /><Icon name="leaf" size={34} /></span>
        <h1 className="u-display">故事叶收好啦！</h1>
        <p>「{book.title}」已经放进宝盒的回忆里。</p>
        <div className="k-done__go">
          <Tap tone="primary" size="l" onClick={() => navigate('/reading')}>再读一本</Tap>
          <Tap tone="soft" size="l" icon="home" onClick={() => navigate('/today')}>回首页</Tap>
        </div>
      </div>
    )
  }
  const mode = readingMode(session.mode)
  const how = HOW[mode.id] || mode.subtitle
  const waiting = session.helpRequestedAt && !session.helpResolvedAt
  return (
    <div className="k-panel k-reading">
      <div className="k-reading__book">
        <Cover book={book} />
        <Buddy character={profile.character} mood="calm" />
      </div>
      <div className="k-reading__body">
        <span className="k-go__eyebrow">{mode.title}</span>
        <h1 className="u-display">{book.title}</h1>
        <p className="k-reading__how">{how}，慢慢读就好。<Speak text={`${mode.title}。${how}，慢慢读就好。`} /></p>
        <p className="k-note">把平板放在旁边，看着纸书读。读完再回来点一下。</p>
        {waiting ? <p className="k-flag" role="status"><Icon name="bell" size={18} />已经告诉家长，等一等就来。</p> : null}
        <Tap tone="primary" size="xl" icon="check" onClick={() => dispatch({ type: 'COMPLETE_READING_SESSION', profileId: profile.id, sessionId: session.id })}>读完啦</Tap>
        <div className="k-go__more">
          {!waiting ? <Tap tone="soft" size="s" icon="hand" onClick={() => { dispatch({ type: 'REQUEST_READING_HELP', profileId: profile.id, sessionId: session.id }); toast('已经告诉家长了。') }}>需要帮忙</Tap> : null}
          <Tap tone="quiet" size="s" onClick={() => navigate('/reading')}>先放回书架</Tap>
        </div>
      </div>
    </div>
  )
}

const FEEL = [
  { id: 'easy', title: '很轻松', face: 'joy', tone: 'honey' },
  { id: 'just-right', title: '刚刚好', face: 'smile', tone: 'mint' },
  { id: 'hard', title: '有点难', face: 'wobble', tone: 'sky' },
]
const SHARE = [
  { id: 'tell', title: '说给小伙伴听', icon: 'mic' },
  { id: 'draw', title: '画一张图', icon: 'edit' },
  { id: 'act', title: '演一演', icon: 'sparkle' },
]

/** Reflection is a short three-card conversation instead of a form. */
function Reflect({ session, book }) {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const profile = getActiveProfile(state)
  const [step, setStep] = useState(0)
  const [difficulty, setDifficulty] = useState(session.difficulty || '')
  const [share, setShare] = useState('')
  const [note, setNote] = useState('')
  const prompt = useMemo(() => REFLECTION_PROMPTS[[...session.id].reduce((sum, c) => sum + c.charCodeAt(0), 0) % REFLECTION_PROMPTS.length], [session.id])
  const finish = (mode) => {
    const base = { profileId: profile.id, sessionId: session.id }
    if (difficulty) dispatch({ type: 'RECORD_READING_DIFFICULTY', ...base, difficulty })
    dispatch({ type: 'ADD_READING_REFLECTION', ...base, mode, prompt, note: note.trim(), noteSource: note.trim() ? 'child' : 'unknown' })
  }
  return (
    <div className="k-panel k-reflect">
      <ol className="k-dots" aria-label={`第 ${step + 1} 步，共 3 步`}>{[0, 1, 2].map((index) => <li key={index} className={index <= step ? 'is-on' : ''} />)}</ol>
      <div className="k-reflect__book"><Cover book={book} /><strong>{book.title}</strong></div>
      {step === 0 ? (
        <>
          <h1 className="u-display">读起来怎么样？<Speak text="读起来怎么样？很轻松，刚刚好，还是有点难？" /></h1>
          <div className="k-feel__faces">
            {FEEL.map((item) => (
              <button type="button" key={item.id} className={`k-face-btn is-${item.tone}`} aria-pressed={difficulty === item.id} onClick={() => { setDifficulty(item.id); setStep(1) }}>
                <Face kind={item.face} /><strong>{item.title}</strong>
              </button>
            ))}
          </div>
          <Tap tone="quiet" size="s" onClick={() => setStep(1)}>跳过</Tap>
        </>
      ) : step === 1 ? (
        <>
          <h1 className="u-display">{prompt}<Speak text={`${prompt}想怎么告诉小伙伴？`} /></h1>
          <p>想怎么告诉小伙伴？</p>
          <div className="k-choices">
            {SHARE.map((item) => (
              <button type="button" key={item.id} className="u-tile" aria-pressed={share === item.id} onClick={() => { setShare(item.id); setStep(2) }}>
                <Icon name={item.icon} size={40} /><strong>{item.title}</strong>
              </button>
            ))}
          </div>
          <Tap tone="quiet" size="s" onClick={() => finish('skip')}>今天先不讲</Tap>
        </>
      ) : (
        <>
          <h1 className="u-display">{share === 'draw' ? '画好了吗？' : share === 'act' ? '演给家人看吧！' : '说给我听吧！'}</h1>
          <p>想留一句话的话，请家长帮你记下来。不写也可以。</p>
          <label className="u-field k-reflect__note"><span>我说的一句话（可以不写）</span>
            <textarea maxLength={300} rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="比如：我最喜欢小刺猬的灯笼" />
          </label>
          <Tap tone="primary" size="l" icon="leaf" onClick={() => finish(share || 'tell')}>收进宝盒</Tap>
        </>
      )}
    </div>
  )
}
