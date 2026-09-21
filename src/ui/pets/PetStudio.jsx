import { useEffect, useRef, useState } from 'react'
import { ACTS, robotResult } from '../../modules/pets/petLife.js'
import { PetActor, PetProp } from './PetArt.jsx'
import './pet-studio.css'

const ACT_NAMES={wave:'挥挥手',hop:'跳一下',spin:'转个圈',bow:'鞠个躬',cuddle:'抱抱自己',sleep:'盖被子'}
const COLOR_NAMES={yellow:'黄色',green:'绿色',blue:'蓝色',pink:'粉色'}
export function WorkPreview({ work, pet, replay=false }) {
  const [playing,setPlaying]=useState(false), [frame,setFrame]=useState(0)
  useEffect(()=>{ if(!playing || work.kind!=='theater') return; const timer=setInterval(()=>setFrame(i=>{if(i+1>=work.acts.length){setPlaying(false);return 0}return i+1}),1600);return()=>clearInterval(timer) },[playing,work])
  if(work.kind==='blocks') return <svg className="pet-work-picture" viewBox="0 0 360 250" role="img" aria-label={`${work.title}，${work.blocks.length}块积木`}><rect width="360" height="250" rx="20" fill="#f7efe0" /><path d="M0 232H360" stroke="#c9b99c" strokeWidth="4" />{work.blocks.map((b,i)=><g key={i} transform={`translate(${b.x*55+40} ${b.y*51+30}) rotate(${b.turn*90})`} className={`pet-block-fill pet-block-fill--${b.color}`}>{b.shape==='roof'?<path d="M-24 21 0-22 24 21Z" />:b.shape==='circle'?<circle r="23" />:<rect x="-23" y="-23" width="46" height="46" rx="7" />}</g>)}</svg>
  if(work.kind==='robot') return <RobotScene config={work.robot} running={false} result={robotResult(work.robot)} />
  if(work.kind==='drawing') return <svg className="pet-work-picture" viewBox="0 0 100 100" role="img" aria-label={work.title}><rect width="100" height="100" fill="#fff7e7" />{work.strokes.map((s,i)=><polyline key={i} points={s.points.map(p=>p.join(',')).join(' ')} fill="none" stroke={{brown:'#785842',blue:'#6c9fb9',green:'#739478',pink:'#dba0ab',yellow:'#eac15f'}[s.color]} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />)}</svg>
  return <div className={`pet-theater-preview pet-theater-preview--${work.scene}`}><PetActor key={playing?frame:'still'} species={pet.species} motion={playing?work.acts[frame]:'idle'} size="young" /><div className="pet-act-list">{work.acts.map((a,i)=><span key={i} data-current={playing&&frame===i}>{i+1}. {ACT_NAMES[a]}</span>)}</div>{replay&&<button type="button" className="pet-text-button" disabled={!work.acts.length} onClick={()=>{setPlaying(!playing);setFrame(0)}}>{playing?'停止演出':'重看我的小剧场'}</button>}</div>
}
function RobotScene({ config,running,result }) {
  return <div className={`pet-robot-track ${running?'is-running':''}`} data-outcome={result.delivered?'delivered':result.crossing?'spill':'stuck'}>
    <span className="pet-robot-obstacle">小台阶</span><span className="pet-robot-destination">玩具的家</span>
    <div className={`pet-built-robot pet-built-robot--${config.wheels} pet-built-robot--${config.wall}`} style={{'--robot-duration':config.speed==='fast'?'1.8s':'3s'}}>
      <div className="pet-robot-load">●</div><div className="pet-robot-box"><span>◕ ◕</span><small>⌣</small></div><i className="pet-wheel pet-wheel--one"/><i className="pet-wheel pet-wheel--two"/>{config.extra==='solar'?<div className="pet-solar-panel"/>:config.extra==='hook'?<span className="pet-robot-hook">J</span>:null}
    </div>
    {running&&<span className="pet-robot-outcome" role="status">{result.message}</span>}
  </div>
}
export function PetStudio({ kind,pet,onChange,onSave,disabled=false,initialWork }) {
  const previous=[...(pet.life?.creations||[])].reverse().find(c=>c.work.kind===kind)?.work
  const initial=initialWork || previous || (kind==='blocks'?{kind,title:'我搭的小房子',blocks:[]}:kind==='robot'?{kind,title:'我的运输机器人',robot:{wheels:'small',wall:'low',speed:'fast',extra:'none'},trials:0}:kind==='drawing'?{kind,title:'送给伙伴的一幅画',strokes:[]}:{kind:'theater',title:'我们的第一场演出',scene:'forest',acts:[]})
  const [work,setWork]=useState(()=>structuredClone(initial)),[selected,setSelected]=useState(null),[color,setColor]=useState('yellow'),[shape,setShape]=useState('square'),[running,setRunning]=useState(false),[sceneKey,setSceneKey]=useState(0),[history,setHistory]=useState([])
  const onChangeRef=useRef(onChange),drawing=useRef(false),[drawColor,setDrawColor]=useState('brown')
  useEffect(()=>{onChangeRef.current=onChange},[onChange])
  useEffect(()=>{onChangeRef.current?.(work)},[work])
  useEffect(()=>{if(!running)return;const t=setTimeout(()=>setRunning(false),kind==='robot'?3800:12000);return()=>clearTimeout(t)},[running,sceneKey,kind])
  const update=(next)=>{setHistory(h=>[...h.slice(-19),work]);setWork(next)}
  const add=(x,y,c=color)=>{const i=work.blocks.findIndex(b=>b.x===x&&b.y===y);if(i>=0){setSelected(i);return}update({...work,blocks:[...work.blocks,{x,y,color:c,shape,turn:0}]});setSelected(work.blocks.length)}
  const quick=(c)=>{for(let y=3;y>=0;y--)for(let x=0;x<6;x++)if(!work.blocks.some(b=>b.x===x&&b.y===y)){add(x,y,c);return}}
  const ready=kind==='blocks'?work.blocks.length>0:kind==='robot'?work.trials>0:kind==='drawing'?work.strokes.length>0:work.acts.length>0
  return <section className="pet-studio" aria-label={kind==='blocks'?'自由搭积木':kind==='robot'?'机器人试验场':kind==='drawing'?'画给小伙伴':'我的小剧场'}>
    <label className="pet-field">作品名字<input value={work.title} maxLength={40} onChange={e=>setWork({...work,title:e.target.value})}/></label>
    {kind==='blocks'?<>
      <div className="pet-block-palette" role="group" aria-label="积木颜色">{Object.keys(COLOR_NAMES).map(c=><button type="button" className="pet-button pet-button--soft" key={c} aria-pressed={color===c} aria-label={`放一块${COLOR_NAMES[c]}积木`} onClick={()=>{setColor(c);quick(c)}}><span className={`pet-block pet-block--${c}`} />{COLOR_NAMES[c]}</button>)}</div>
      <div className="pet-studio-tools">{[['square','方块'],['roof','屋顶'],['circle','圆形']].map(([v,n])=><button type="button" className="pet-button pet-button--soft" key={v} aria-pressed={shape===v} onClick={()=>setShape(v)}>{n}</button>)}</div>
      <p className="pet-small-note">点空格放积木；点已有积木可旋转或移走。换个颜色，再搭一层。</p>
      <div className="pet-block-board" aria-label="积木画板">{Array.from({length:24},(_,cell)=>{const x=cell%6,y=Math.floor(cell/6),index=work.blocks.findIndex(b=>b.x===x&&b.y===y),b=work.blocks[index];return <button type="button" key={cell} aria-label={`第${y+1}行第${x+1}格${b?'，'+COLOR_NAMES[b.color]+'积木':''}`} aria-pressed={index>=0&&selected===index} onClick={()=>add(x,y)}>{b?<span className={`pet-block pet-block--${b.color} pet-block-shape--${b.shape}`} style={{transform:`rotate(${b.turn*90}deg)`}}/>:<span className="pet-empty-dot">·</span>}</button>})}</div>
      <div className="pet-studio-tools"><button className="pet-button pet-button--soft" type="button" disabled={selected===null||!work.blocks[selected]} onClick={()=>update({...work,blocks:work.blocks.map((b,i)=>i===selected?{...b,turn:(b.turn+1)%4}:b)})}>旋转这块</button><button className="pet-button pet-button--soft" type="button" disabled={selected===null||!work.blocks[selected]} onClick={()=>{update({...work,blocks:work.blocks.filter((_,i)=>i!==selected)});setSelected(null)}}>移走这块</button></div>
    </>:kind==='robot'?<>
      <RobotScene key={sceneKey} config={work.robot} running={running} result={robotResult(work.robot)}/>
      <div className="pet-robot-options">{[['wheels','轮子',[['small','小轮子'],['large','大轮子']]],['wall','挡板',[['low','矮挡板'],['high','高挡板']]],['speed','速度',[['fast','快一点'],['slow','慢一点']]],['extra','小发明',[['none','先不装'],['hook','小钩子'],['solar','太阳能板']]]].map(([key,label,options])=><fieldset key={key}><legend>{label}</legend>{options.map(([v,n])=><button type="button" key={v} className="pet-button pet-button--soft" disabled={running} aria-pressed={work.robot[key]===v} onClick={()=>update({...work,robot:{...work.robot,[key]:v}})}>{n}</button>)}</fieldset>)}</div>
      <button className="pet-button" type="button" disabled={running} onClick={()=>{update({...work,trials:Math.min(100,work.trials+1)});setSceneKey(k=>k+1);setRunning(true)}}>{running?'看看它怎么运过去…':'试着送一次玩具'}</button><p className="pet-small-note">没送到也能保存；改一个地方再试，不扣分。</p>
    </>:kind==='theater'?<>
      <div className="pet-studio-tools">{[['forest','森林'],['moon-room','月光'],['space','太空']].map(([v,n])=><button type="button" key={v} className="pet-button pet-button--soft" aria-pressed={work.scene===v} onClick={()=>update({...work,scene:v})}>{n}</button>)}</div>
      <WorkPreview key={sceneKey} work={work} pet={pet} replay />
      <div className="pet-studio-tools" role="group" aria-label="添加演出动作">{ACTS.map(a=><button type="button" key={a} className="pet-button pet-button--soft" disabled={work.acts.length>=6} onClick={()=>{update({...work,acts:[...work.acts,a]});setSceneKey(k=>k+1)}}>{ACT_NAMES[a]}</button>)}</div>
      <p className="pet-small-note">最多六个动作。排好顺序，就能演出你的故事；随时可以停止。</p>
    </>:<>
      <div className="pet-studio-tools">{[['brown','棕色'],['green','绿色'],['blue','蓝色'],['pink','粉色'],['yellow','黄色']].map(([v,n])=><button type="button" className="pet-button pet-button--soft" key={v} aria-pressed={drawColor===v} onClick={()=>setDrawColor(v)}>{n}</button>)}</div>
      <svg className="pet-drawing-board" viewBox="0 0 100 100" role="img" aria-label="给伙伴画画的画布" onPointerDown={e=>{if(work.strokes.length>=80)return;drawing.current=true;e.currentTarget.setPointerCapture(e.pointerId);const b=e.currentTarget.getBoundingClientRect(),p=[Math.max(0,Math.min(100,(e.clientX-b.left)/b.width*100)),Math.max(0,Math.min(100,(e.clientY-b.top)/b.height*100))];update({...work,strokes:[...work.strokes,{color:drawColor,points:[p]}]})}} onPointerMove={e=>{if(!drawing.current)return;const b=e.currentTarget.getBoundingClientRect(),p=[Math.max(0,Math.min(100,(e.clientX-b.left)/b.width*100)),Math.max(0,Math.min(100,(e.clientY-b.top)/b.height*100))];setWork(w=>{const strokes=[...w.strokes],last=strokes.at(-1);if(!last||last.points.length>=180)return w;strokes[strokes.length-1]={...last,points:[...last.points,p]};return {...w,strokes}})}} onPointerUp={()=>{drawing.current=false}} onPointerCancel={()=>{drawing.current=false}}><rect width="100" height="100" fill="#fff7e7" />{work.strokes.map((s,i)=><polyline key={i} points={s.points.map(p=>p.join(',')).join(' ')} fill="none" stroke={{brown:'#785842',blue:'#6c9fb9',green:'#739478',pink:'#dba0ab',yellow:'#eac15f'}[s.color]} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />)}</svg>
      <button type="button" className="pet-button pet-button--soft" onClick={()=>{if(work.strokes.length<80)update({...work,strokes:[...work.strokes,{color:drawColor,points:[[30,60],[50,30],[70,60],[30,60]]}]})}}>也可以贴一座小山</button>
    </>}
    <div className="pet-studio-tools"><button type="button" className="pet-text-button" disabled={!history.length} onClick={()=>{setWork(history.at(-1));setHistory(h=>h.slice(0,-1));setSelected(null)}}>撤销上一步</button><button type="button" className="pet-button" disabled={disabled||!ready||!work.title.trim()} onClick={()=>onSave(work)}>保存这件作品</button></div>
  </section>
}

export function FamilyGarden({ pet,pets,onSave,disabled }) {
  const [garden,setGarden]=useState(pet.life?.garden || {flower:'daisy',color:'yellow',place:'middle',note:''})
  return <section className="pet-family-garden"><h2>我们一起种的花园</h2><p>每人布置自己的小花圃，另一位晚些来也能接着添。</p><div className="pet-family-beds">{pets.filter(p=>p.hatchedAt).map(p=><article key={p.id}><PetActor species={p.species} size="baby" /><strong>{p.name}的小花圃</strong>{p.life?.garden?<><div className={`pet-garden-flower pet-garden-flower--${p.life.garden.color}`} data-flower={p.life.garden.flower} style={{textAlign:{left:'left',middle:'center',right:'right'}[p.life.garden.place]}}>{p.life.garden.flower==='star'?'✦':p.life.garden.flower==='tulip'?'♧':'✿'}</div><p>{p.life.garden.note || '留下了一朵小花'}</p></>:<p>还没有布置，不会代替这位孩子记录参与。</p>}</article>)}</div><div className="pet-studio-tools">{[['daisy','小雏菊'],['tulip','郁金香'],['star','星星花']].map(([v,n])=><button type="button" className="pet-button pet-button--soft" key={v} aria-pressed={garden.flower===v} onClick={()=>setGarden({...garden,flower:v})}>{n}</button>)}</div><div className="pet-studio-tools">{['yellow','pink','blue'].map(v=><button type="button" className="pet-button pet-button--soft" key={v} aria-pressed={garden.color===v} onClick={()=>setGarden({...garden,color:v})}>{COLOR_NAMES[v]}</button>)}</div><label className="pet-field">给家人留一句话<input maxLength={60} value={garden.note} onChange={e=>setGarden({...garden,note:e.target.value})}/></label><button type="button" className="pet-button" disabled={disabled} onClick={()=>onSave(garden)}>把我的小花种好</button></section>
}
