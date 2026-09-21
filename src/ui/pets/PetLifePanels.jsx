import { useState } from 'react'
import { petGrowth } from '../../modules/pets/petModel.js'
import { favoriteFor } from '../../modules/pets/petLife.js'
import { getPetItem } from '../../modules/pets/petCatalog.js'
import { PetActor, PetProp, EggArt } from './PetArt.jsx'
import { PetCreature } from './PetCreature.jsx'
import { WorkPreview } from './PetStudio.jsx'

export function PetLifeSummary({pet,onPhoto,onDraw,onGarden}){
  const fav=favoriteFor(pet),stage=petGrowth(pet)
  return <section className="pet-life-summary"><div><span className="pet-eyebrow">只属于我们的生活</span><h2>{stage.label}，也有自己的小习惯</h2><div className="pet-life-row"><span className="pet-life-pill">{fav?`最近爱上了${fav.name}`:'还在发现自己喜欢的事'}</span><span className="pet-life-pill">{pet.life?.dirt?'刚才玩得很尽兴，可以梳梳毛':'毛毛软软，状态很好'}</span><span className="pet-life-pill">已经学会 {Object.values(pet.skills).filter(n=>n>=3).length} 个小本领</span></div></div><div className="pet-studio-tools"><button type="button" className="pet-button pet-button--soft" onClick={onPhoto}>留下小屋纪念画</button><button type="button" className="pet-button pet-button--soft" onClick={onDraw}>画给小伙伴</button><button type="button" className="pet-button pet-button--soft" onClick={onGarden}>去家庭花园</button></div></section>
}
export function PetSnapshot({snapshot}){
  const tones={'moon-room':['#b4bbd7','#efe5d4'],forest:['#c7d9bd','#e7d4b6'],space:['#aaaad3','#dcd9ec']}[snapshot.room]
  return <svg className="pet-work-picture" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 300" role="img" aria-label={`${snapshot.name}当时的小屋纪念画`}><rect width="420" height="300" rx="22" fill={tones[0]}/><path d="M0 205H420V300H0Z" fill={tones[1]}/><rect x="26" y="20" width="104" height="118" rx="42" fill="#e7f0ef"/><path d="M78 24V136M30 82h95" stroke="#b69c7b" strokeWidth="5"/><ellipse cx="211" cy="261" rx="113" ry="23" fill="#fff2d6" opacity=".6"/>{Object.entries(snapshot.placed).filter(([slot])=>slot!=='dress').map(([slot,item],i)=>{const p=snapshot.layout[item]||{x:slot==='rug'?50:i%2?78:20,y:slot==='rug'?86:68};return <g key={slot} transform={`translate(${p.x*4.2-28} ${p.y*3-28})`}><PetProp kind={getPetItem(item)?.art} /></g>})}<svg x="135" y="75" width="164" height="200" viewBox="0 0 280 285">{snapshot.stage==='egg'?<EggArt species={snapshot.species}/>:<PetCreature species={snapshot.species} age={snapshot.stage} dress={getPetItem(snapshot.placed.dress)?.art}/>}</svg><text x="210" y="288" textAnchor="middle" fill="#536750" fontSize="13">{snapshot.name}的小屋</text></svg>
}
export function PetCreationCabinet({pet}){
  const [limit,setLimit]=useState(4)
  const works=[...(pet.life?.creations||[])].reverse()
  return <section className="pet-panel"><h2>我们的小作品柜</h2><p>画画、积木、机器人和小剧场都可以留下来。</p>{works.length?<><div className="pet-creations-grid">{works.slice(0,limit).map(c=><article key={c.id}><WorkPreview work={c.work} pet={pet} replay/><h3>{c.work.title}</h3><small>{new Date(c.at).toLocaleDateString('zh-CN')}</small></article>)}</div>{works.length>limit&&<button className="pet-text-button" type="button" onClick={()=>setLimit(n=>n+4)}>看看更多作品</button>}</>:<div className="pet-empty"><PetProp kind="blocks"/><p>第一件作品的位置，已经留好啦。</p></div>}</section>
}
const FREE=[{id:'food',name:'小饭碗',art:'bowl'},{id:'toy',name:'常玩的玩具',art:'ball'},{id:'bed',name:'安睡小窝',art:'bed'}]
export function PetRoomArranger({pet,onSave,disabled}){
  const items=[...FREE.filter(item=>item.id!=='toy'||!pet.placed.toy),...Object.entries(pet.placed).filter(([slot])=>slot!=='dress').map(([,id])=>({...getPetItem(id)}))]
  const [selected,setSelected]=useState('food'),[point,setPoint]=useState(pet.life?.layout.food||{x:15,y:76}),[message,setMessage]=useState(''),[moving,setMoving]=useState(false)
  const coords=event=>{const box=event.currentTarget.getBoundingClientRect();return {x:Math.round(Math.max(8,Math.min(92,(event.clientX-box.left)/box.width*100))),y:Math.round(Math.max(16,Math.min(88,(event.clientY-box.top)/box.height*100)))}}
  return <section className="pet-arranger"><h3>把物件放到喜欢的位置</h3><p className="pet-small-note">先选物件，再拖动或点空位置。也能用方向按钮，不必精细拖拽。</p><div className="pet-studio-tools">{items.map(item=><button key={item.id} type="button" className="pet-button pet-button--soft" aria-pressed={selected===item.id} onClick={()=>{setSelected(item.id);setPoint(pet.life?.layout[item.id]||{x:50,y:70})}}>{item.name}</button>)}</div><div className="pet-arrange-stage" aria-label="小屋摆放区域" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);setMoving(true);setPoint(coords(e))}} onPointerMove={e=>{if(moving)setPoint(coords(e))}} onPointerUp={()=>setMoving(false)} onPointerCancel={()=>setMoving(false)}>{items.map((item,i)=>{const p=selected===item.id?point:pet.life?.layout[item.id]||{x:15+i*15%75,y:74};return <span key={item.id} className={`pet-arrange-item ${selected===item.id?'is-selected':''}`} style={{left:`${p.x}%`,top:`${p.y}%`}}><PetProp kind={item.art}/><small>{item.name}</small></span>})}</div><div className="pet-studio-tools">{[['左一点',-5,0],['右一点',5,0],['往前一点',0,5],['往后一点',0,-5]].map(([n,x,y])=><button type="button" key={n} className="pet-button pet-button--soft" onClick={()=>setPoint(p=>({x:Math.max(8,Math.min(92,p.x+x)),y:Math.max(16,Math.min(88,p.y+y))}))}>{n}</button>)}<button type="button" className="pet-button" disabled={disabled} onClick={async()=>{const ok=await onSave(selected,point);if(ok)setMessage('摆好啦，回小屋就能看到。')}}>保存摆放</button></div><p role="status">{message}</p></section>
}
