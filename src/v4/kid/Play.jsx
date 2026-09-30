import { useNavigate } from 'react-router-dom'
import { getActiveProfile, localDateKey } from '../../domain/model.js'
import { movementSessionsFor } from '../../modules/movement/movementModel.js'
import { readingSessionsFor, readingBook } from '../../modules/reading/readingModel.js'
import { activeResponsibilitySession } from '../../modules/responsibility/responsibilityModel.js'
import { activeInventorProject } from '../../modules/inventor/inventorModel.js'
import { useBedtimeState } from '../../store/useBedtime.js'
import { Icon } from '../ui/Icon.jsx'
import { Buddy, Pic, Speak } from '../ui/kit.jsx'

const today = (at) => at && localDateKey(new Date(Number(at))) === localDateKey()

function hints(state, profileId) {
  const moves = movementSessionsFor(state, profileId).filter((s) => s.completedAt)
  const reads = readingSessionsFor(state, profileId)
  const openRead = reads.find((s) => ['active', 'reflection'].includes(s.status))
  const family = activeResponsibilitySession(state, profileId)
  const project = activeInventorProject(state, profileId)
  return {
    movement: moves.some((s) => today(s.completedAt)) ? { text: '今天已经动过啦', done: true } : { text: '跳一跳、跑一跑' },
    reading: openRead ? { text: `接着读《${readingBook(state, openRead.bookId)?.title || '上次的书'}》`, badge: '继续' }
      : reads.some((s) => today(s.completedAt)) ? { text: '今天已经读过啦', done: true } : { text: '挑一本喜欢的书' },
    family: family ? { text: '有一件家务在等你', badge: '进行中' } : { text: '和家人一起做家务' },
    inventor: project ? { text: `我的发明：${project.title}`, badge: '继续' } : { text: '把好点子做出来' },
  }
}

const DOORS = [
  { id: 'movement', title: '动一动', to: '/movement', art: 'assets/movement/energy-plaza-hero.webp', tone: 'coral' },
  { id: 'reading', title: '读故事', to: '/reading', art: 'assets/reading/story-treehouse-hero.webp', tone: 'sky' },
  { id: 'family', title: '帮家里', to: '/family', art: 'assets/responsibility/family-cottage-hero.webp', tone: 'mint' },
  { id: 'inventor', title: '小发明', to: '/inventor', art: 'assets/inventor/workshop-hero.webp', tone: 'lilac' },
]

export function Play() {
  const { state } = useBedtimeState()
  const navigate = useNavigate()
  const profile = getActiveProfile(state)
  const hint = hints(state, profile.id)
  return (
    <section className="k-play" aria-labelledby="k-play-title">
      <header className="k-play__head">
        <Buddy character={profile.character} mood="garden" />
        <div>
          <h1 id="k-play-title" className="u-display">想玩什么？</h1>
          <p className="k-play__sub">选一扇门进去看看<Speak text="想玩什么？选一扇门进去看看。动一动，读故事，帮家里，小发明。" /></p>
        </div>
      </header>
      <div className="k-doors">
        {DOORS.map((door, index) => {
          const info = hint[door.id]
          return (
            <button type="button" key={door.id} className={`k-door is-${door.tone}`} style={{ '--i': index }} onClick={() => navigate(door.to)} aria-label={`${door.title}：${info.text}`}>
              <span className="k-door__pic"><Pic src={door.art} /></span>
              <span className="k-door__label">
                <strong className="u-display">{door.title}</strong>
                <small>{info.done ? <Icon name="check" size={16} strokeWidth={3} /> : null}{info.text}</small>
              </span>
              {info.badge ? <span className="k-door__badge">{info.badge}</span> : null}
            </button>
          )
        })}
      </div>
      <button type="button" className="k-play__wish" onClick={() => navigate('/box?tab=wishes')}>
        <Pic src="assets/v3/star-jar.webp" />
        <span><strong>攒星光换愿望</strong><small>看看我的愿望单</small></span>
        <Icon name="chevron" />
      </button>
    </section>
  )
}
