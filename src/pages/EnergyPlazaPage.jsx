import { useNavigate } from 'react-router-dom'
import { appPath } from '../data/paths.js'
import { useBedtimeState } from '../store/useBedtime.js'
import { movementSessionsFor } from '../modules/movement/movementModel.js'
import { getMovementActivity } from '../modules/movement/activityCatalog.js'
import { Icon } from '../ui/Icons.jsx'

const feeling = { again: '还想玩', 'just-right': '刚刚好', hard: '有点难', change: '下次换一种' }

export function EnergyPlazaPage() {
  const { state } = useBedtimeState()
  const navigate = useNavigate()
  const sessions = movementSessionsFor(state, state.activeProfileId).filter((item) => item.completedAt).slice(0, 6)
  return <section className="energy-plaza">
    <div className="energy-plaza__hero"><img src={appPath('assets/movement/energy-plaza-hero.webp')} alt="发光花朵围绕的能量广场" /><div><button type="button" onClick={() => navigate('/world')}><Icon name="chevronBack" />回到世界</button><span>每次动一动，都会点亮一种新的快乐</span><h1>能量广场</h1></div></div>
    <div className="energy-memories">
      {sessions.length ? sessions.map((session) => { const activity = getMovementActivity(session.activityId); return activity ? <article key={session.id}><img src={activity.image} alt="" /><span><strong>{activity.title}</strong><small>{feeling[session.feedback] || '完成了一次探索'}</small></span><Icon name="star" /></article> : null }) : <article className="energy-empty"><span><strong>第一朵能量花在等你</strong><small>选一个喜欢的活动，回来后它就会亮起来</small></span></article>}
    </div>
    <button className="energy-plaza__start" type="button" onClick={() => navigate('/movement')}><Icon name="star" />再选一个活动</button>
  </section>
}
