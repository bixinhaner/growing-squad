import { petImage, eggImage, itemImage } from './petVisualAssets.js'
import './pet-plush.css'

/** Generated pose art plus finite motion. These are poses, not a claimed video. */
export function PlushActor({species,action='idle',age='baby',dress='',skill=3,dirt=0}) {
  const pose = ['sleep','rest'].includes(action) ? 'sleep' : ['feed','water','growth'].includes(action) ? 'eating'
    : ['wave','hello'].includes(action) ? 'wave' : ['signature','play','hop','walk'].includes(action) ? 'skill'
      : ['pat','cuddle','celebrate','bath','brush','spin','offer'].includes(action) ? 'happy' : 'idle'
  const tier = ['companion','adult'].includes(age) ? 3 : age === 'young' ? 2 : 1
  const outfit = dress.startsWith('dress-')
  return <span className={`plush-actor plush-${species} plush-motion-${action}`} data-age={age} data-skill={skill} data-tier={tier} aria-hidden="true">
    <span className="plush-ground"/>
    {tier >= 2 && <span className={`plush-growth-halo plush-growth-halo--${tier}`}/>}
    <span className="plush-figure">
      <img className="plush-body" src={petImage(species,pose)} alt="" draggable="false" decoding="async"/>
      {tier >= 2 && <svg className="plush-growth-token" viewBox="0 0 90 90"><path d={tier===3?'M8 66 5 20 28 37 45 7 64 37 86 20 81 66Z':'M45 8 57 32 84 35 64 54 69 81 45 68 21 81 26 54 6 35 33 32Z'} fill={tier===3?'#f2cc75':'#bacde8'} stroke="#fff6d6" strokeWidth="3"/><circle cx="45" cy="49" r="8" fill="#edabc5"/></svg>}
      {outfit && <img className={`plush-outfit plush-outfit-${dress}`} src={itemImage(dress)} alt=""/>}
      {dress==='raincoat' && <span className="plush-old-raincoat"/>}
      {['scarf','blue-scarf'].includes(dress) && <span className="plush-old-scarf"/>}
      {dirt>0 && !['bath','brush'].includes(action) && <span className="plush-dirt"><i/><i/></span>}
    </span>
    {action==='signature' && <span className={`plush-signature plush-signature-${species}`}><i>✦</i><i>✧</i><i>✦</i></span>}
    {action==='bath' && <span className="plush-bubbles"><i/><i/><i/><i/></span>}
    {['pat','celebrate','growth'].includes(action) && <span className="plush-love">♡</span>}
  </span>
}
export function PlushEgg({species,crack=0,label,className='',width,height}) {
  return <svg className={`pet-egg plush-egg ${className}`} role="img" aria-label={label} width={width} height={height} viewBox="0 0 280 280">
    <image href={eggImage(species)} width="280" height="280"/>
    {crack>0 && <path d={crack===1?'M130 75 119 107 148 125 135 151':'M60 145 87 130 108 150 131 129 153 153 177 132 201 152 226 133M130 75 119 107 148 125'} fill="none" stroke="#a5816b" strokeWidth="3" strokeLinecap="round"/>}
  </svg>
}
