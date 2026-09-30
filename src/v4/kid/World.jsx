import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { activityMomentsFor } from '../../core/activity/activitySelectors.js'
import { getActiveProfile, getSession, localDateKey } from '../../domain/model.js'
import { movementSessionsFor } from '../../modules/movement/movementModel.js'
import { readingSessionsFor, readingBook } from '../../modules/reading/readingModel.js'
import { activeResponsibilitySession } from '../../modules/responsibility/responsibilityModel.js'
import { activeInventorProject } from '../../modules/inventor/inventorModel.js'
import { petFor } from '../../modules/pets/petModel.js'
import { useBedtimeState } from '../../store/useBedtime.js'
import { AssetArt } from '../../ui/AssetArt.jsx'
import { EggArt, PetActor } from '../../ui/pets/PetArt.jsx'
import { Icon } from '../ui/Icon.jsx'
import { Pic, Speak } from '../ui/kit.jsx'
import { useDaypart } from '../lib/hooks.js'

const isToday = (at) => at && localDateKey(new Date(Number(at))) === localDateKey()

// Coordinates are percentages of assets/platform/squad-world-map.webp (16:9).
const PLACES = [
  { id: 'garden', title: '月光花园', to: '/garden', art: 'pillow', x: 21, y: 30 },
  { id: 'movement', title: '能量广场', to: '/movement', art: 'bicycle', x: 53, y: 32 },
  { id: 'reading', title: '故事树屋', to: '/reading', art: 'story', x: 80, y: 29 },
  { id: 'family', title: '家庭小屋', to: '/family', art: 'heart', x: 17, y: 62 },
  { id: 'inventor', title: '发明工坊', to: '/inventor', art: 'craft', x: 80, y: 60 },
  { id: 'wishes', title: '愿望码头', to: '/box?tab=wishes', art: 'surprise', x: 76, y: 85 },
]

/** One short line under each place: what is waiting there right now. */
function whatsThere(state, profileId) {
  const tonight = getSession(state, localDateKey(), profileId)
  const reads = readingSessionsFor(state, profileId)
  const openRead = reads.find((s) => ['active', 'reflection'].includes(s.status))
  const chore = activeResponsibilitySession(state, profileId)
  const project = activeInventorProject(state, profileId)
  const moments = activityMomentsFor(state, profileId).filter((moment) => isToday(moment.at))
  const went = (id) => moments.some((moment) => moment.sourceModule === id)
  return {
    garden: tonight?.status === 'goodnight' ? { text: '今晚的花开啦', done: true } : { text: '看看我的月亮花' },
    movement: movementSessionsFor(state, profileId).some((s) => isToday(s.completedAt)) ? { text: '今天动过啦', done: true } : { text: '跳一跳、跑一跑' },
    reading: openRead ? { text: `接着读《${readingBook(state, openRead.bookId)?.title || '上次的书'}》`, badge: '继续' }
      : reads.some((s) => isToday(s.completedAt)) ? { text: '今天读过啦', done: true } : { text: '抱一本喜欢的书' },
    family: chore ? { text: '有一件家务在等你', badge: '进行中' } : went('responsibility') ? { text: '今天帮过家里啦', done: true } : { text: '一起把家照顾好' },
    inventor: project ? { text: `我的发明：${project.title}`, badge: '继续' } : { text: '把好点子做出来' },
    wishes: { text: '看看攒下的愿望' },
  }
}

/** On narrow screens the map is wider than the view: start centred and let fingers pan. */
function useCentred() {
  const ref = useRef(null)
  useEffect(() => {
    const scroller = ref.current
    if (scroller) scroller.scrollLeft = (scroller.scrollWidth - scroller.clientWidth) / 2
  }, [])
  return ref
}

export function World() {
  const { state } = useBedtimeState()
  const navigate = useNavigate()
  const daypart = useDaypart()
  const profile = getActiveProfile(state)
  const info = whatsThere(state, profile.id)
  const pet = petFor(state)
  const scroller = useCentred()
  // In the evening, until tonight's flower has bloomed, the garden gently calls.
  const calling = ['evening', 'night'].includes(daypart) && !info.garden.done ? 'garden' : null
  const spoken = `星光世界。想去哪儿就点哪儿。${PLACES.map((place) => place.title).join('，')}。`

  return (
    <section className="k-world" aria-labelledby="k-world-title">
      <header className="k-world__head">
        <h1 id="k-world-title" className="u-display">星光世界</h1>
        <p>想去哪儿就点哪儿，没有先后顺序<Speak text={spoken} /></p>
      </header>
      <div className="k-world__scroll" ref={scroller}>
        <div className="k-world__map">
          <Pic className="k-world__art" src="assets/platform/squad-world-map.webp" />
          {PLACES.map((place, index) => {
            const line = info[place.id]
            return (
              <button
                type="button"
                key={place.id}
                className={`k-spot${line.done ? ' is-done' : ''}${calling === place.id ? ' is-calling' : ''}`}
                style={{ left: `${place.x}%`, top: `${place.y}%`, '--i': index }}
                onClick={() => navigate(place.to)}
                aria-label={`${place.title}：${line.text}`}
              >
                <span className="k-spot__ring" aria-hidden="true" />
                <span className="k-spot__tag">
                  <AssetArt id={place.art} decorative />
                  <span><strong>{place.title}</strong><small>{line.text}</small></span>
                  {line.done ? <i className="k-spot__seal" aria-hidden="true"><Icon name="check" size={14} strokeWidth={3} /></i> : null}
                  {line.badge ? <i className="k-spot__badge" aria-hidden="true">{line.badge}</i> : null}
                </span>
              </button>
            )
          })}
          <button type="button" className="k-spot k-spot--pet" style={{ left: '46%', top: '58%', '--i': PLACES.length }} onClick={() => navigate('/pet')} aria-label={pet ? `${pet.name}：在草地上等你` : '小伙伴：从一颗蛋开始'}>
            <span className="k-spot__pet" aria-hidden="true">{pet?.hatchedAt ? <PetActor species={pet.species} size="baby" /> : <EggArt species={pet?.species || profile.character} />}</span>
            <span className="k-spot__tag is-small"><strong>{pet ? pet.name : '小伙伴'}</strong></span>
          </button>
        </div>
      </div>
      <p className="k-world__swipe" aria-hidden="true"><Icon name="back" size={16} />左右滑一滑，看看整个世界<Icon name="chevron" size={16} /></p>
    </section>
  )
}
