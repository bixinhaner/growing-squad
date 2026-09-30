import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { activityMomentsFor } from '../../core/activity/activitySelectors.js'
import { getActiveProfile } from '../../domain/model.js'
import { petFor } from '../../modules/pets/petModel.js'
import { useBedtimeState } from '../../store/useBedtime.js'
import { appPath } from '../../data/paths.js'
import { AssetArt } from '../../ui/AssetArt.jsx'
import { EggArt, PetActor } from '../../ui/pets/PetArt.jsx'

// Coordinates are percentages of assets/platform/squad-world-map.webp (16:9).
const PLACES = [
  { id: 'bedtime', title: '月光花园', copy: '慢慢准备，安心晚安', route: '/garden', asset: 'pillow', x: 21, y: 31 },
  { id: 'movement', title: '能量广场', copy: '选一个好玩的游戏', route: '/movement', asset: 'bicycle', x: 53, y: 35 },
  { id: 'reading', title: '故事树屋', copy: '抱一本喜欢的书', route: '/reading', asset: 'story', x: 80, y: 30 },
  { id: 'responsibility', title: '家庭小屋', copy: '一起把家照顾好', route: '/family-cottage', asset: 'heart', x: 17, y: 60 },
  { id: 'inventor', title: '发明工坊', copy: '让自己的想法长大', route: '/inventor', asset: 'craft', x: 80, y: 61 },
  { id: 'wishes', title: '愿望码头', copy: '看看攒下的愿望', route: '/wishes', asset: 'surprise', x: 77, y: 83 },
]

function usePanScroller() {
  const ref = useRef(null)
  useEffect(() => {
    const scroller = ref.current
    if (!scroller) return undefined
    scroller.scrollLeft = (scroller.scrollWidth - scroller.clientWidth) / 2
    scroller.scrollTop = (scroller.scrollHeight - scroller.clientHeight) / 2
    let drag = null
    const down = (event) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return
      drag = { x: event.clientX, y: event.clientY, left: scroller.scrollLeft, top: scroller.scrollTop, moved: false }
    }
    const move = (event) => {
      if (!drag) return
      const dx = event.clientX - drag.x
      const dy = event.clientY - drag.y
      if (Math.abs(dx) + Math.abs(dy) > 6) { drag.moved = true; scroller.classList.add('is-dragging') }
      scroller.scrollLeft = drag.left - dx
      scroller.scrollTop = drag.top - dy
    }
    const up = () => {
      if (drag?.moved) scroller.addEventListener('click', (event) => { event.stopPropagation(); event.preventDefault() }, { capture: true, once: true })
      drag = null
      scroller.classList.remove('is-dragging')
    }
    scroller.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      scroller.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [])
  return ref
}

export function WorldMap() {
  const { state } = useBedtimeState()
  const navigate = useNavigate()
  const profile = getActiveProfile(state)
  const moments = activityMomentsFor(state, profile.id)
  const pet = petFor(state)
  const scrollerRef = usePanScroller()
  const visited = (id) => moments.some((moment) => moment.sourceModule === id)
  // Wishes are a destination, not an activity, so only the five activity places count toward memories.
  const memoryPlaces = PLACES.filter((place) => place.id !== 'wishes')
  const visitedCount = memoryPlaces.filter((place) => visited(place.id)).length

  return (
    <section className="v3-world" aria-labelledby="v3-world-title">
      <header className="v3-world__title">
        <h1 id="v3-world-title" className="v3-display">今天，想去哪儿看看？</h1>
        <p>没有通关顺序，想去哪里就点哪里 · {visitedCount} / {memoryPlaces.length} 个地方留下了记忆</p>
      </header>
      <div className="v3-world__scroller" ref={scrollerRef}>
        <div className="v3-map">
          <img className="v3-map__art" src={appPath('assets/platform/squad-world-map.webp')} alt="" draggable="false" />
          {PLACES.map((place, index) => (
            <button
              type="button"
              key={place.id}
              className={`v3-place ${visited(place.id) ? 'is-visited' : ''}`}
              style={{ left: `${place.x}%`, top: `${place.y}%`, '--i': index }}
              onClick={() => navigate(place.route)}
              aria-label={`${place.title}：${place.copy}`}
            >
              <span className="v3-place__ring" aria-hidden="true" />
              <span className="v3-place__tag">
                <AssetArt id={place.asset} decorative />
                <strong>{place.title}</strong>
                {visited(place.id) ? <i className="v3-place__star" aria-hidden="true" /> : null}
              </span>
            </button>
          ))}
          <button type="button" className="v3-place v3-place--pet" style={{ left: '47%', top: '60%', '--i': 7 }} onClick={() => navigate('/pet')} aria-label={pet ? `小伙伴的家：${pet.name}在等你` : '小伙伴的家：从一颗蛋开始，养一个自己的小伙伴'}>
            <span className="v3-place__pet" aria-hidden="true">{pet?.hatchedAt ? <PetActor species={pet.species} size="baby" /> : <EggArt species={pet?.species || profile.character} />}</span>
            <span className="v3-place__tag"><strong>{pet ? pet.name : '小伙伴的家'}</strong></span>
          </button>
        </div>
      </div>
    </section>
  )
}
