import { useNavigate } from 'react-router-dom'
import { AssetArt } from '../ui/AssetArt.jsx'
import { getActiveProfile } from '../domain/model.js'
import { useBedtimeState } from '../store/useBedtime.js'
import { appPath } from '../data/paths.js'

const pockets = [
  { title: '我的愿望', assetId: 'star', fallback: 'surprise', route: '/wishes' },
  { title: '喜欢的活动', assetId: 'bicycle' },
  { title: '读过的故事', assetId: 'story' },
  { title: '我的小发明', assetId: 'craft' },
  { title: '成长纪念', assetId: 'courage', route: '/garden' },
]

export function MePage() {
  const { state } = useBedtimeState()
  const navigate = useNavigate()
  const profile = getActiveProfile(state)
  const latest = state.rewardMoments.filter((moment) => moment.profileId === profile.id).at(-1)
  return (
    <section className="me-page" aria-labelledby="me-title">
      <img className="me-page__background" src={appPath('assets/platform/growth-backpack-room.webp')} alt="" />
      <header><h1 id="me-title">{profile.name}的成长背包</h1><p>每一件小小的宝贝，都是成长的礼物</p></header>
      <div className="me-pockets">
        {pockets.map((pocket) => (
          <button key={pocket.title} type="button" onClick={() => pocket.route && navigate(pocket.route)}>
            <span>{pocket.title}</span><AssetArt id={pocket.fallback || pocket.assetId} decorative />
          </button>
        ))}
      </div>
      <article className="me-memory"><AssetArt id={latest?.assetId || 'backpack'} decorative /><div><span>最近的成长记忆</span><strong>{latest?.title || '我自己想起来收书包了'}</strong><small>成长不会因为休息而消失</small></div></article>
    </section>
  )
}
