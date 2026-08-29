import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AssetArt } from '../ui/AssetArt.jsx'
import { appPath } from '../data/paths.js'

const areas = [
  { id: 'garden', title: '月光花园', copy: '种下想法，收获光芒', assetId: 'lamp', route: '/garden' },
  { id: 'movement', title: '能量广场', copy: '动一动，充满能量', assetId: 'bicycle' },
  { id: 'reading', title: '故事树屋', copy: '读一读，发现世界', assetId: 'story' },
  { id: 'family', title: '家庭小屋', copy: '一起做，分享温暖', assetId: 'heart' },
  { id: 'inventor', title: '发明工坊', copy: '想一想，创造惊喜', assetId: 'craft' },
  { id: 'memory', title: '记忆码头', copy: '看一看，珍藏美好', assetId: 'outing' },
]

export function WorldPage() {
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  return (
    <section className="world-page" aria-labelledby="world-title">
      <header><span>每一次探索，都是成长的足迹</span><h1 id="world-title">小队世界</h1></header>
      <div className="world-map">
        <img className="world-map__art" src={appPath('assets/platform/squad-world-map.webp')} alt="" />
        {areas.map((area) => (
          <button key={area.id} className={`world-area world-area--${area.id}`} type="button" onClick={() => area.route ? navigate(area.route) : setMessage(`${area.title}正在准备新的探索，很快就能进去啦。`)}>
            <AssetArt id={area.assetId} decorative />
            <span><strong>{area.title}</strong><small>{area.copy}</small></span>
          </button>
        ))}
        <div className="world-guide"><span>今天想去哪里看看？</span><img src={appPath('assets/mascot-garden.webp')} alt="" /></div>
        {message ? <div className="world-message" role="status">{message}</div> : null}
      </div>
    </section>
  )
}
