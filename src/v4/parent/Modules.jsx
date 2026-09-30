import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getActiveProfile } from '../../domain/model.js'
import { MOVEMENT_FILTERS, filterMovementActivities } from '../../modules/movement/activityCatalog.js'
import { movementState, movementStats } from '../../modules/movement/movementModel.js'
import { READING_COVER_OPTIONS, readingCover, readingMode } from '../../modules/reading/bookCatalog.js'
import { activeReadingBooks, readingBook, readingStats } from '../../modules/reading/readingModel.js'
import { RESPONSIBILITY_ACTIVITIES, RESPONSIBILITY_SCAFFOLDS, responsibilityActivity, responsibilityRole } from '../../modules/responsibility/responsibilityCatalog.js'
import { responsibilityAssignments, responsibilityRoutines, responsibilityState, responsibilityStats } from '../../modules/responsibility/responsibilityModel.js'
import { inventorImage, inventorStage, inventorTemplate, knowledgeImage } from '../../modules/inventor/inventorCatalog.js'
import { activeInventorProject, inventorProjects, projectArtifacts, projectStory } from '../../modules/inventor/inventorModel.js'
import { exportInventorProject } from '../../modules/inventor/inventorMedia.js'
import { badgeBalance, levelProgress } from '../../modules/pets/petEconomy.js'
import { PET_SKILLS } from '../../modules/pets/petCatalog.js'
import { petBalance, petFor, petGrowth, petSettingsFor } from '../../modules/pets/petModel.js'
import { exportPetKeepsakes, removePetMedia } from '../../ui/pets/petMediaStore.js'
import { ParentEconomyInbox } from '../../ui/pets/PetEconomyPanels.jsx'
import { PetActor } from '../../ui/pets/PetArt.jsx'
import { CharacterPose } from '../../ui/ThemeArt.jsx'
import { appPath } from '../../data/paths.js'
import { useBedtimeActions, useBedtimeState } from '../../store/useBedtime.js'
import { Icon } from '../ui/Icon.jsx'
import { Field, Sheet, Switch, Tap } from '../ui/kit.jsx'
import { useToast } from '../ui/toast.js'
import { Empty, Notice, PageHead, Panel, Segment, SettingRow, Stat } from './pkit.jsx'
import { dateLabel } from './format.js'
import '../../ui/pets/pet-home.css'
import '../../ui/pets/pet-complete.css'

/* ─────────────  运动  ───────────── */
const PEOPLE = { solo: '自己', parent: '家长', sibling: '兄弟姐妹' }
export function ModuleMovement() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const [filter, setFilter] = useState('all')
  const profile = getActiveProfile(state)
  const stats = useMemo(() => movementStats(state, profile.id), [profile.id, state])
  const preferences = movementState(state).preferencesByProfile[profile.id] || {}
  return (
    <>
      <PageHead eyebrow={`${profile.name} · 运动`} title="愿意试什么，比动了多少更重要" lead="这里不比较运动量，只看孩子喜欢和觉得难的。" />
      <div className="p-stats">
        <Stat label="玩过" value={stats.completed.length} unit="次" note={stats.observedCount ? `${stats.observedCount} 次有观察，${stats.autonomous} 次自己提议` : '点“开始”不能说明是主动的'} />
        <Stat label="最喜欢" value={stats.favorite?.title || '还在发现'} note="根据孩子说“还想玩”" />
        <Stat label="觉得有点难" value={stats.feedbackCounts.hard || 0} unit="次" note="推荐按最新一次感受调整" />
      </div>
      <Panel>
        <SettingRow icon="leaf" title="雨天模式" copy="只推荐室内活动"><Switch label="雨天模式" checked={preferences.rainMode === true} onChange={(rainMode) => dispatch({ type: 'UPDATE_MOVEMENT_PREFERENCES', profileId: profile.id, preferences: { rainMode } })} /></SettingRow>
      </Panel>
      <Panel title="全部运动游戏" aside={<Segment label="筛选" value={filter} onChange={setFilter} options={MOVEMENT_FILTERS.map((item) => [item.id, item.label])} />}>
        <div className="p-gallery">
          {filterMovementActivities(filter).map((activity) => (
            <figure key={activity.id}><img src={activity.image} alt="" /><figcaption><strong>{activity.title}</strong><small>{activity.environment === 'indoor' ? '室内' : '户外'} · {activity.participants.map((item) => PEOPLE[item]).join(' / ')}</small></figcaption></figure>
          ))}
        </div>
      </Panel>
    </>
  )
}

/* ─────────────  阅读  ───────────── */
const MODE_NAMES = { listen: '听家长读', together: '一起读', independent: '自己读一点' }
const NOTE_SOURCES = { child: '孩子原话', parent: '家长观察', unknown: '阅读笔记' }
const DIFFICULTY = { easy: '很轻松', 'just-right': '刚刚好', hard: '有点难' }
export function ModuleReading() {
  const { state } = useBedtimeState()
  const [params, setParams] = useSearchParams()
  const profile = getActiveProfile(state)
  const books = activeReadingBooks(state)
  const stats = useMemo(() => readingStats(state, profile.id), [profile.id, state])
  const total = stats.completed.length || 1
  const adding = params.get('add') === '1'
  const insight = stats.recentHard >= 2 ? '最近读起来有点难，可以先换熟悉的书。' : stats.helpCount ? '需要帮助是有效信号，陪一下再慢慢放手。' : '读过几次之后，这里会有温和的建议。'
  return (
    <>
      <PageHead eyebrow={`${profile.name} · 阅读`} title="陪读方式怎样慢慢变化" lead="不比较速度和数量。“有点难”不会在孩子那边显示成降级。">
        <Tap tone="primary" icon="book" onClick={() => setParams({ add: '1' })}>添一本家里的书</Tap>
      </PageHead>
      <div className="p-cols">
        <Panel title="陪读方式">
          <div className="p-modes">
            {Object.entries(MODE_NAMES).map(([id, label]) => {
              const share = Math.round(((stats.modes[id] || 0) / total) * 100)
              return <div key={id}><span>{label}</span><i><b style={{ width: `${share}%` }} /></i><strong className="u-num">{share}%</strong></div>
            })}
          </div>
          <Notice icon="leaf">{insight}</Notice>
        </Panel>
        <Panel title="家里的书架" aside={<span className="p-pill">{books.length} 本</span>}>
          {books.length ? <div className="p-books">{books.map((book) => <figure key={book.id}><img src={readingCover(book.coverId).image} alt="" /><figcaption><strong>{book.title}</strong><small>{book.author || '　'}</small></figcaption></figure>)}</div> : <Empty icon="book" title="书架还空着">先添一本孩子手边能拿到的实体书。</Empty>}
          <small className="p-fine"><Icon name="shield" size={14} /> 只记书名和陪读方式，不上传书的内容。</small>
        </Panel>
      </div>
      <Panel title="最近的阅读">
        {stats.completed.length ? stats.completed.slice(0, 10).map((session) => {
          const book = readingBook(state, session.bookId)
          return (
            <div className="p-line is-top" key={session.id}>
              <img className="p-line__cover" src={readingCover(book?.coverId).image} alt="" />
              <span>
                <strong>{book?.title || '已移出的书'}</strong>
                <small>{dateLabel(session.completedAt)} · {readingMode(session.mode).title} · {DIFFICULTY[session.difficulty] || '没说感受'}{session.helpRequestedAt ? ' · 请求过帮助' : ''}</small>
                {session.reflection?.note ? <blockquote><small>{NOTE_SOURCES[session.reflection.noteSource] || NOTE_SOURCES.unknown}</small>{session.reflection.note}</blockquote> : null}
              </span>
              <em className="p-pill">{session.reflection?.mode === 'skip' ? '今天先不讲' : session.reflection ? '讲了故事' : '未复述'}</em>
            </div>
          )
        }) : <Empty icon="book" title="还没有读完的记录">孩子读完一本，陪读方式和感受会自动出现在这里。</Empty>}
      </Panel>
      {adding ? <AddBook onClose={() => setParams({})} nextCover={READING_COVER_OPTIONS[books.length % READING_COVER_OPTIONS.length].id} /> : null}
    </>
  )
}

function AddBook({ onClose, nextCover }) {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const toast = useToast()
  const [draft, setDraft] = useState({ title: '', author: '', coverId: nextCover })
  const add = (event) => {
    event.preventDefault()
    const title = draft.title.trim()
    if (!title) return
    dispatch({ type: 'ADD_READING_BOOK', profileId: state.activeProfileId, book: { id: `book-${crypto.randomUUID()}`, title, author: draft.author.trim(), coverId: draft.coverId, notes: '', source: 'family-owned' } })
    toast(`《${title}》放上书架了`)
    onClose()
  }
  return (
    <Sheet title="添一本家里的书" onClose={onClose}>
      <form className="p-form" onSubmit={add}>
        <Field label="书名"><input className="u-input" autoFocus maxLength={40} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="例如：月亮，晚安" /></Field>
        <Field label="作者（可不填）"><input className="u-input" maxLength={30} value={draft.author} onChange={(event) => setDraft({ ...draft, author: event.target.value })} /></Field>
        <div className="u-field"><span>选一张封面</span>
          <div className="p-covers" role="radiogroup" aria-label="封面">
            {READING_COVER_OPTIONS.map((cover) => <button type="button" role="radio" key={cover.id} aria-checked={draft.coverId === cover.id} aria-label={cover.label} onClick={() => setDraft({ ...draft, coverId: cover.id })}><img src={cover.image} alt="" /></button>)}
          </div>
        </div>
        <Tap tone="primary" size="l" block type="submit" disabled={!draft.title.trim()}>放上书架</Tap>
      </form>
    </Sheet>
  )
}

/* ─────────────  家务  ───────────── */
function Member({ participant }) {
  return (
    <span className="p-member">
      {participant.kind === 'child' ? <CharacterPose character={participant.character} pose="celebrate" decorative /> : <span className="p-member__adult"><Icon name="user" size={26} /></span>}
      <strong>{participant.name}</strong>
    </span>
  )
}
export function ModuleChores() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const profile = getActiveProfile(state)
  const routines = responsibilityRoutines(state)
  const primary = routines[0]
  const current = useMemo(() => responsibilityAssignments(state, primary), [primary, state])
  const next = useMemo(() => responsibilityAssignments(state, primary, 1), [primary, state])
  const stats = responsibilityStats(state, profile.id)
  const module = responsibilityState(state)
  const moments = state.growth.moments.filter((item) => item.type === 'responsibility.shared-completed').sort((a, b) => b.createdAt - a.createdAt).slice(0, 5)
  const rotate = () => {
    if (module.routines.some((item) => item.id === primary.id)) dispatch({ type: 'ROTATE_RESPONSIBILITY_ROLES', profileId: profile.id, routineId: primary.id, rotationOffset: Number(primary.rotationOffset || 0) + 1 })
    else dispatch({ type: 'UPSERT_RESPONSIBILITY_ROUTINE', profileId: profile.id, routine: { ...primary, rotationOffset: Number(primary.rotationOffset || 0) + 1 } })
    toast('角色轮换好了')
  }
  return (
    <>
      <PageHead eyebrow={`${profile.name} · 家务`} title="每个人一个真实的小角色" lead="看见孩子怎样慢慢少一点提醒。不做孩子之间的比较或排名。">
        <Tap tone="primary" icon="plus" onClick={() => setAdding(true)}>安排一件家务</Tap>
      </PageHead>
      <Panel title={`${primary.title}${primary.timeLabel ? ` · ${primary.timeLabel}` : ''}`} aside={<Tap tone="soft" size="s" icon="swap" onClick={rotate}>轮换一次</Tap>}>
        <div className="p-rotation">
          <div className="p-rotation__row is-head"><span>家人</span><span>现在</span><span>换一次后</span></div>
          {current.map((participant, index) => (
            <div className="p-rotation__row" key={participant.id}>
              <Member participant={participant} />
              <span className="p-pill is-mint">{participant.roleTitle || responsibilityRole(participant.roleId).title}</span>
              <span className="p-pill">{next[index]?.roleTitle || responsibilityRole(next[index]?.roleId).title}</span>
            </div>
          ))}
        </div>
        <small className="p-fine">{primary.rotation === 'weekly' ? '每周自动换一次。' : '需要时手动换。'}热的、高的、重的角色一直由大人承担。</small>
      </Panel>
      <Panel title="陪伴正在变化">
        <Segment label="家务陪伴方式" value={stats.scaffold} onChange={(stage) => dispatch({ type: 'UPDATE_RESPONSIBILITY_SCAFFOLD', profileId: profile.id, stage })} options={RESPONSIBILITY_SCAFFOLDS.map((item) => [item.id, item.title])} />
      </Panel>
      <Panel title="一起完成的时刻">
        {moments.length ? moments.map((moment) => (
          <div className="p-line" key={moment.id}>
            <img className="p-line__cover" src={responsibilityRole(responsibilityActivity(moment.activityId).imageRoleId).image} alt="" />
            <span><strong>{responsibilityActivity(moment.activityId).title}</strong><small>{moment.participants.map((item) => `${item.name} · ${item.roleTitle || responsibilityRole(item.roleId).title}`).join(' / ')}</small></span>
          </div>
        )) : <Empty icon="home" title="还没有">完成一次家务后，会出现“我们一起完成”的记录。</Empty>}
      </Panel>
      {adding ? <AddChore onClose={() => setAdding(false)} /> : null}
    </>
  )
}

function AddChore({ onClose }) {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const [draft, setDraft] = useState({ activityId: RESPONSIBILITY_ACTIVITIES[0].id, timeLabel: '18:30', rotation: 'weekly' })
  const save = (event) => {
    event.preventDefault()
    const activity = responsibilityActivity(draft.activityId)
    dispatch({ type: 'UPSERT_RESPONSIBILITY_ROUTINE', profileId: state.activeProfileId, routine: { id: `responsibility-routine-${crypto.randomUUID()}`, activityId: activity.id, title: activity.title, timeLabel: draft.timeLabel, rotation: draft.rotation, rotationOffset: 0, active: true } })
    onClose()
  }
  return (
    <Sheet title="安排一件家务" onClose={onClose}>
      <form className="p-form" onSubmit={save}>
        <div className="p-chore-pick" role="radiogroup" aria-label="选择家务">
          {RESPONSIBILITY_ACTIVITIES.map((activity) => <button type="button" role="radio" key={activity.id} aria-checked={draft.activityId === activity.id} onClick={() => setDraft({ ...draft, activityId: activity.id })}><img src={responsibilityRole(activity.imageRoleId).image} alt="" /><span>{activity.title}</span></button>)}
        </div>
        <div className="p-grid-2">
          <Field label="大约什么时候"><input className="u-input" type="time" value={draft.timeLabel} onChange={(event) => setDraft({ ...draft, timeLabel: event.target.value })} /></Field>
          <div className="u-field"><span>角色轮换</span><Segment label="角色轮换" value={draft.rotation} onChange={(rotation) => setDraft({ ...draft, rotation })} options={[['weekly', '每周换'], ['manual', '我来换']]} /></div>
        </div>
        <div className="p-members">{responsibilityAssignments(state, { ...draft, id: 'preview' }).map((item) => <span key={item.id} className="p-member-role"><Member participant={item} /><small>{item.roleTitle || responsibilityRole(item.roleId).title}</small></span>)}</div>
        <Tap tone="primary" size="l" block type="submit">保存</Tap>
      </form>
    </Sheet>
  )
}

/* ─────────────  发明  ───────────── */
export function ModuleInventor() {
  const { state } = useBedtimeState()
  const project = activeInventorProject(state)
  return <InventorBody key={`${state.activeProfileId}:${project?.id || 'none'}`} project={project} />
}
function InventorBody({ project }) {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const toast = useToast()
  const profile = getActiveProfile(state)
  const [note, setNote] = useState('')
  const [exporting, setExporting] = useState(false)
  if (!project) {
    return (
      <>
        <PageHead eyebrow={`${profile.name} · 发明`} title="从孩子发现的真实麻烦开始" lead="不提前塞一套课程。" />
        <Panel><div className="p-empty"><img src={appPath('assets/inventor/workshop-hero.webp')} width="180" alt="" /><strong>还没有进行中的发明</strong><p>先听听孩子想解决什么。</p><Tap tone="primary" onClick={() => navigate('/inventor/new')}>陪孩子收下一个想法</Tap></div></Panel>
      </>
    )
  }
  const template = inventorTemplate(project.seedId)
  const artifacts = projectArtifacts(state, project.id)
  const addNote = () => {
    if (!note.trim()) return
    dispatch({ type: 'ADD_INVENTOR_PARENT_NOTE', profileId: project.profileId, projectId: project.id, noteId: `note_${crypto.randomUUID()}`, text: note.trim() })
    setNote(''); toast('孩子的原话记进项目了。')
  }
  const exportProject = async () => {
    setExporting(true)
    try { await exportInventorProject(project, artifacts); toast('项目资料已打包下载。') } catch (error) { toast(error instanceof Error ? error.message : '导出没完成，请再试一次。') } finally { setExporting(false) }
  }
  return (
    <>
      <PageHead eyebrow={`${profile.name} · 发明 · ${inventorProjects(state).length} 个想法`} title={project.title} lead={project.problem}>
        <Tap tone="soft" icon="download" disabled={exporting} onClick={exportProject}>{exporting ? '正在打包' : '导出项目'}</Tap>
        <Tap tone="primary" onClick={() => navigate(project.status === 'showcase' ? `/inventor/showcase/${project.id}` : `/inventor/project/${project.id}`)}>{project.status === 'showcase' ? '打开发布会' : '陪孩子继续'}</Tap>
      </PageHead>
      <Notice icon="shield">{template.safety}</Notice>
      <div className="p-cols">
        <Panel title={`过程 · ${inventorStage(project.status).short}`}>
          <ol className="p-story">
            {projectStory(project).map((item) => <li key={item.title}><img src={inventorImage(item.image, project.seedId)} alt="" /><span><strong>{item.title}</strong><small>{item.copy}</small></span></li>)}
          </ol>
          <h3 className="p-sub">资料</h3>
          {artifacts.length ? artifacts.map((artifact) => <div className="p-line" key={artifact.id}><Icon name="image" size={18} /><span><strong>{artifact.fileName}</strong><small>{artifact.status === 'synced' ? '已同步' : '在这台设备上，等待同步'}</small></span></div>) : <p className="p-fine">还没有照片、语音或视频。没有附件也可以推进。</p>}
          {(project.parentNotes || []).length ? <><h3 className="p-sub">帮孩子记下的话</h3>{project.parentNotes.map((item) => <blockquote className="p-quote" key={item.id}>{item.text}</blockquote>)}</> : null}
        </Panel>
        <Panel title="需要时加一张知识卡">
          <p className="p-fine">只放和这个项目有关的线索，不用全学。</p>
          {template.cards.map((card) => {
            const added = project.knowledgeCardIds?.includes(card.id)
            return (
              <div className="p-line is-top" key={card.id}>
                <img className="p-line__cover" src={knowledgeImage(card.image)} alt="" />
                <span><strong>{card.title}</strong><small>{card.copy}</small></span>
                <Tap tone={added ? 'soft' : 'primary'} size="s" disabled={added} onClick={() => { dispatch({ type: 'ADD_INVENTOR_KNOWLEDGE', profileId: project.profileId, projectId: project.id, cardId: card.id }); toast('这张线索放进孩子的下一步了。') }}>{added ? '已加入' : '加入'}</Tap>
              </div>
            )
          })}
          <Field label="帮孩子记下原话" hint="只记孩子说过的，不替孩子写标准答案。"><textarea className="u-input" rows={3} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} /></Field>
          <Tap tone="soft" size="s" disabled={!note.trim()} onClick={addNote}>记进项目</Tap>
        </Panel>
      </div>
    </>
  )
}

/* ─────────────  小伙伴  ───────────── */
export function ModulePet() {
  const { state } = useBedtimeState()
  return <PetBody key={state.activeProfileId} />
}
function PetBody() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const toast = useToast()
  const navigate = useNavigate()
  const profile = getActiveProfile(state)
  const pet = petFor(state, profile.id)
  const [settings, setSettings] = useState(() => petSettingsFor(state, profile.id))
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(Date.now)
  const [confirm, setConfirm] = useState(null)
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 5000); return () => window.clearInterval(timer) }, [])
  const requests = Object.values(state.modules?.pets?.requests || {}).filter((request) => request.profileId === profile.id).sort((a, b) => b.requestedAt - a.requestedAt)
  const set = (key, value) => setSettings((current) => ({ ...current, [key]: value }))
  async function send(type, payload, feedback) {
    if (busy) return
    setBusy(true)
    try { const result = await dispatch({ type, profileId: profile.id, ...payload }); toast(result?.ok ? feedback : result?.message || '没保存上，请稍后再试。') } catch (error) { toast(error.message || '没保存上，请稍后再试。') } finally { setBusy(false) }
  }
  const mastered = pet?.hatchedAt ? PET_SKILLS.filter((skill) => pet.skills[skill.id] >= 3).map((skill) => skill.name).join('、') : ''
  return (
    <>
      <PageHead eyebrow={`${profile.name} · 小伙伴`} title="照顾交给喜欢，额度交给家长" lead="不掉亲密度，不会生病或离开。没有陌生人、排名、充值或盲盒。">
        <Tap tone="soft" onClick={() => navigate('/pet')}>看看小伙伴的家</Tap>
      </PageHead>
      <div className="p-pet-hero">
        <PetActor species={pet?.species || profile.character} pose="wave" size="baby" />
        <span><strong>{pet ? pet.name : '还没领养'}</strong><small>{pet ? `${petGrowth(pet).label} · ${pet.memories.length} 个片段${mastered ? ` · 会了${mastered}` : ''}` : '领养免费，孩子可以自己挑蛋。'}</small></span>
        <Stat label="可用星光" value={petBalance(state, profile.id)} note="和现实愿望共用" />
        <Stat label="徽章" value={badgeBalance(pet)} note={`伙伴 Lv.${levelProgress(pet).level}`} />
      </div>
      <div className="p-cols">
        <Panel title="玩耍和培养的约定">
          <form className="p-form" onSubmit={(event) => { event.preventDefault(); send('PET_UPDATE_SETTINGS', { settings }, '约定已保存。') }}>
            <div className="u-field"><span>星光培养</span><Segment label="星光培养方式" value={settings.spending} onChange={(value) => set('spending', value)} options={[['ask', '每次都问我'], ['allowance', '小额度自己来']]} /><small>1 颗星光 = 1 点成长。培养会减少现实愿望可用的星光。</small></div>
            {settings.spending === 'allowance' ? <Field label="每天自己培养的额度（星光）"><input className="u-input" type="number" min="0" max="200" value={settings.dailyAllowance} onChange={(event) => set('dailyAllowance', Number(event.target.value))} /></Field> : null}
            <div className="p-grid-2">
              <Field label="每天小游戏几轮" hint="开始就算一轮"><input className="u-input" type="number" min="1" max="30" value={settings.roundsPerDay} onChange={(event) => set('roundsPerDay', Number(event.target.value))} /></Field>
              <Field label="每天玩耍分钟（0 不限）" hint="只算游戏和创作"><input className="u-input" type="number" min="0" max="120" value={settings.playMinutesPerDay} onChange={(event) => set('playMinutesPerDay', Number(event.target.value))} /></Field>
            </div>
            <div className="p-grid-2">
              <Field label="安静时间开始"><input className="u-input" type="time" required value={settings.quietStart} onChange={(event) => set('quietStart', event.target.value)} /></Field>
              <Field label="早上恢复玩耍" hint="两个时间相同 = 不设安静时间"><input className="u-input" type="time" required value={settings.quietEnd} onChange={(event) => set('quietEnd', event.target.value)} /></Field>
            </div>
            <SettingRow title="一直保持幼崽大小" copy="不影响成长和本领"><Switch label="保持幼崽大小" checked={settings.keepSmall} onChange={(value) => set('keepSmall', value)} /></SettingRow>
            <SettingRow title="简单玩法" copy="更大的图，更少的选择"><Switch label="简单玩法" checked={settings.simpleMode} onChange={(value) => set('simpleMode', value)} /></SettingRow>
            <SettingRow title="允许添加照片和语音" copy="孩子主动点击、设备允许后才开麦克风；先试听再保存"><Switch label="允许照片和语音" checked={settings.allowMedia} onChange={(value) => set('allowMedia', value)} /></SettingRow>
            <Tap tone="primary" block type="submit" disabled={busy}>保存约定</Tap>
          </form>
        </Panel>
        <div className="p-panel p-pet-inbox pet-home"><ParentEconomyInbox pet={pet} requests={requests} stars={petBalance(state, profile.id)} busy={busy} now={now} onAction={send} /></div>
      </div>
      {pet ? (
        <Panel title="作品和家庭资料" aside={<Tap tone="soft" size="s" icon="download" disabled={busy} onClick={async () => { setBusy(true); try { await exportPetKeepsakes(pet); toast('伙伴作品和资料已导出。') } catch (error) { toast(error.message) } finally { setBusy(false) } }}>导出</Tap>}>
          {(pet.life?.creations || []).slice(-12).reverse().map((creation) => <div className="p-line" key={creation.id}><Icon name="image" size={18} /><span><strong>{creation.work.title}</strong></span><button type="button" className="p-link is-quiet" onClick={() => setConfirm({ kind: 'work', id: creation.id, title: creation.work.title })}>移除</button></div>)}
          {pet.memories.filter((memory) => memory.media).map((memory) => <div className="p-line" key={memory.id}><Icon name={memory.media.kind === 'audio' ? 'mic' : 'camera'} size={18} /><span><strong>{memory.media.fileName}</strong></span><button type="button" className="p-link is-quiet" onClick={() => setConfirm({ kind: 'media', id: memory.id, media: memory.media, title: memory.media.fileName })}>删除</button></div>)}
          {!(pet.life?.creations || []).length && !pet.memories.some((memory) => memory.media) ? <p className="p-fine">还没有作品或照片语音。</p> : null}
        </Panel>
      ) : null}
      {confirm ? (
        <Sheet title={`移除「${confirm.title}」？`} onClose={() => setConfirm(null)}>
          <p className="p-lead">{confirm.kind === 'media' ? '会删除相册记录和这份照片或语音。' : '会从作品柜和相册移除，其他回忆和成长都保留。'}</p>
          <Tap tone="danger" block disabled={busy} onClick={async () => {
            try { if (confirm.kind === 'media') await removePetMedia(confirm.media); await send('PET_REMOVE_MEMORY', { memoryId: confirm.id }, '已移除。') } catch (error) { toast(error.message) }
            setConfirm(null)
          }}>移除</Tap>
          <Tap tone="soft" block onClick={() => setConfirm(null)}>保留</Tap>
        </Sheet>
      ) : null}
    </>
  )
}
