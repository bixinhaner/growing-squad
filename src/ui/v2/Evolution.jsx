import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { appPath } from '../../data/paths.js'
import { useBedtimeActions, useBedtimeState } from '../../store/useBedtime.js'
import { AssetArt } from '../AssetArt.jsx'
import { Icon } from '../Icons.jsx'
import { familyPulse } from './evolutionModel.js'

export function JourneySteps({ current }) {
  return <ol className="v2-journey" aria-label="阅读旅程">{['挑一本', '陪着读', '留句话'].map((label, index) => <li key={label} aria-current={index === current ? 'step' : undefined} className={index < current ? 'is-past' : ''}><span aria-hidden="true">{index < current ? <Icon name="check" size={14} /> : `0${index + 1}`}</span>{label}</li>)}</ol>
}
export function QuietEmpty({ title = '留一点空白，等一件小事发生', body = '不用为了留下记录而完成任务。准备好了，再慢慢开始。', asset = 'courage' }) {
  return <div className="v2-empty"><div className="v2-empty-art"><AssetArt id={asset} decorative /></div><h2>{title}</h2><p>{body}</p></div>
}
export function FamilyPulse({ now }) {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const cards = useMemo(() => familyPulse(state, now), [state, now])
  return <section className="v2-family-pulse" aria-label="家庭近况"><header><div><span className="v2-eyebrow">一家人，各有自己的节奏</span><h2>把陪伴留给眼前的人</h2></div><span>切换孩子，查看与回应</span></header><div>{cards.map(({ profile, help, wishes, latest }) => <button key={profile.id} type="button" aria-pressed={state.activeProfileId === profile.id} onClick={() => dispatch({ type: 'SWITCH_PROFILE', profileId: profile.id })}>
    <span className="v2-profile-initial" aria-hidden="true">{profile.name.slice(0, 1)}</span><span><strong>{profile.name}</strong><small>{help ? `${help} 个请求需要陪伴` : wishes ? `${wishes} 个愿望等你回应` : '没有待回应的事项'} </small><em>{latest?.title || '还没有成长片段，不作推断'}</em></span><Icon name={state.activeProfileId === profile.id ? 'check' : 'chevron'} size={18} />
  </button>)}</div></section>
}
export function ParentQuickActions() {
  const navigate = useNavigate()
  return <nav className="v2-quick-actions" aria-label="家长快捷操作">{[
    ['heart', '记一条观察', '/parent/support'], ['moon', '补记入睡', '/parent/overview?view=bedtime'],
    ['book', '添加一本书', '/parent/reading'], ['clock', '安排今天', '/parent/timeline'],
  ].map(([icon, title, to]) => <button key={to} type="button" onClick={() => navigate(to)}><span><Icon name={icon} /></span>{title}<Icon name="chevron" size={16} /></button>)}</nav>
}
export function WorldLandscape() {
  const [failed, setFailed] = useState(false)
  return <figure className="v2-world-landscape"><img className="calm-map" src={appPath(failed ? 'assets/platform/squad-world-map.webp' : 'assets/redesign-v1/child-world-map.png')} onError={() => setFailed(true)} alt="山谷里的花园、故事树屋、能量广场、家庭小屋和发明工坊" /><figcaption><span className="v2-eyebrow">每个小地方，都可以慢慢探索</span><strong>这里没有通关顺序</strong><span>挑一个喜欢的地方，去生活里玩一会儿。</span></figcaption></figure>
}
