import { useMemo, useState } from 'react'
import { READING_COVER_OPTIONS, readingCover, readingMode } from '../modules/reading/bookCatalog.js'
import { activeReadingBooks, readingBook, readingStats } from '../modules/reading/readingModel.js'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { Icon } from '../ui/Icons.jsx'
import { Modal } from '../ui/Shared.jsx'

const modeNames = { listen: '听家长读', together: '一起读', independent: '自己读一点' }
const noteSources = { child: '孩子原话', parent: '家长观察', unknown: '阅读笔记' }
const difficultyNames = { easy: '很轻松', 'just-right': '刚刚好', hard: '有点难' }

export function ReadingParentPage() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ title: '', author: '', coverId: READING_COVER_OPTIONS[0].id, notes: '' })
  const profileId = state.activeProfileId
  const books = activeReadingBooks(state)
  const stats = useMemo(() => readingStats(state, profileId), [profileId, state])
  const latest = stats.completed[0]
  const latestBook = latest ? readingBook(state, latest.bookId) : null
  const total = stats.completed.length || 1
  const add = (event) => {
    event.preventDefault()
    const title = draft.title.trim()
    if (!title) return
    dispatch({ type: 'ADD_READING_BOOK', profileId, book: { id: `book-${crypto.randomUUID()}`, title, author: draft.author.trim(), coverId: draft.coverId, notes: draft.notes.trim(), source: 'family-owned' } })
    setDraft({ title: '', author: '', coverId: READING_COVER_OPTIONS[(books.length + 1) % READING_COVER_OPTIONS.length].id, notes: '' })
    setAdding(false)
  }
  const insight = stats.recentHard >= 2 ? '最近读起来有点难，可以先换熟悉的书。' : stats.helpCount ? '需要帮助是有效信号，陪一下再慢慢放手。' : '完成几次阅读后，这里会给出温和建议。'
  return <section className="reading-parent"><header><div><span className="page-title__eyebrow">成长模块</span><h1>阅读桥梁</h1><p>看见陪伴方式怎么慢慢变化，不比较速度和数量。</p></div><button type="button" className="button button--primary" onClick={() => setAdding(true)}><Icon name="book" />添加家里的书</button></header>
    <div className="reading-parent-insights"><article><span>最近的阅读</span>{latestBook ? <div><img src={readingCover(latestBook.coverId).image} alt="" /><p><strong>{latestBook.title}</strong><small>{readingMode(latest.mode).title} · {difficultyNames[latest.difficulty] || '还没选择感受'}</small></p></div> : <p>孩子读完一次后，这里会出现记录。</p>}</article><article><span>陪伴方式变化</span><div className="reading-mode-path">{Object.entries(modeNames).map(([id, label], index) => <div key={id}><b>{Math.round((stats.modes[id] || 0) / total * 100)}%</b><small>{label}</small>{index < 2 ? <Icon name="chevron" /> : null}</div>)}</div></article><article><span>需要留意</span><strong>{insight}</strong><p>“有点难”不会在孩子端显示成降级。</p></article></div>
    <div className="reading-parent-grid"><section className="reading-parent-shelf"><header><div><h2>家里的书架</h2><p>管理家里已有的书，一起建立可选择范围。</p></div><button type="button" onClick={() => setAdding(true)}>+ 添加</button></header>{books.length ? <div>{books.map((book) => <article key={book.id}><img src={readingCover(book.coverId).image} alt="" /><span><strong>{book.title}</strong><small>{book.author || '未填写作者'}</small></span></article>)}</div> : <div className="reading-parent-empty">还没有书。先添加一本孩子手边能拿到的实体书。</div>}<footer><Icon name="shield" />只记录书名和陪伴方式，不上传书籍正文。</footer></section><section className="reading-history"><h2>最近的阅读记录</h2>{stats.completed.length ? stats.completed.slice(0, 7).map((session) => { const book = readingBook(state, session.bookId); return <article key={session.id}><img src={readingCover(book?.coverId).image} alt="" /><span><strong>{book?.title || '已移出的书'}</strong><small>{readingMode(session.mode).title} · {difficultyNames[session.difficulty] || '未反馈'}{session.helpRequestedAt ? ' · 请求过帮助' : ''}</small>{session.reflection?.note ? <blockquote><small>{noteSources[session.reflection.noteSource] || noteSources.unknown}</small>{session.reflection.note}</blockquote> : null}</span><em>{session.reflection?.mode === 'skip' ? '今天先不讲' : session.reflection ? '留下了故事想法' : '未复述'}</em></article> }) : <div className="reading-parent-empty">孩子读完后，陪伴方式和感受会自动出现在这里。</div>}</section></div>
    {adding ? <Modal title="添加孩子手边的书" className="reading-book-dialog" onClose={() => setAdding(false)}><form className="reading-book-modal" onSubmit={add}><header><div><span className="eyebrow">家庭书架</span><h2>添加孩子手边的书</h2></div></header><label>书名<input autoFocus value={draft.title} maxLength={40} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="例如：今天想读的故事" /></label><label>作者（可不填）<input value={draft.author} maxLength={30} onChange={(event) => setDraft({ ...draft, author: event.target.value })} /></label><fieldset><legend>选一张原创封面</legend><div>{READING_COVER_OPTIONS.map((cover) => <button type="button" key={cover.id} className={draft.coverId === cover.id ? 'is-selected' : ''} aria-label={cover.label} aria-pressed={draft.coverId === cover.id} onClick={() => setDraft({ ...draft, coverId: cover.id })}><img src={cover.image} alt="" /></button>)}</div></fieldset><p><Icon name="shield" />应用不要求上传书页或正文。</p><button className="button button--primary" type="submit" disabled={!draft.title.trim()}>放上书架</button></form></Modal> : null}
  </section>
}
