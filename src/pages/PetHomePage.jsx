import { EggMeadow, PetWallets, CultivationPanel, GrowthCelebration, BadgeShop, BadgeItemDialog } from '../ui/pets/PetEconomyPanels.jsx'
import { badgeBalance, levelProgress, signatureFor } from '../modules/pets/petEconomy.js'
import { idleBehavior } from '../modules/pets/petLife.js'
import { PetStudio, FamilyGarden, WorkPreview } from '../ui/pets/PetStudio.jsx'
import { PetLifeSummary, PetSnapshot, PetRoomArranger, PetCreationCabinet } from '../ui/pets/PetLifePanels.jsx'
import { PetMediaPreview, PetMediaRecorder } from '../ui/pets/PetMedia.jsx'
import { savePetMedia, syncPetMedia, discardPetMediaDraft } from '../ui/pets/petMediaStore.js'
import { petSound, speakPet, stopPetAudio } from '../ui/pets/petAudio.js'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { getActiveProfile, getAccessibility, uid } from '../domain/model.js'
import { appPath } from '../data/paths.js'
import { getThemePack } from '../domain/themePacks.js'
import { activityMomentsFor } from '../core/activity/activitySelectors.js'
import { Modal, SaveIndicator } from '../ui/Shared.jsx'
import { Icon } from '../ui/Icons.jsx'
import { PetActor, EggArt, PetProp } from '../ui/pets/PetArt.jsx'
import { PetPlay } from '../ui/pets/PetPlay.jsx'
import { PET_ACTIONS, PET_GAMES, PET_ITEMS, PET_ROOMS, PET_SKILLS, PET_SPECIES, getPetItem, getSpecies } from '../modules/pets/petCatalog.js'
import { eggProgress, isPetQuiet, petBalance, petFor, petGameUnlocked, petGrowth, petRoundsLeft, petSettingsFor, petPlayTimeLeft } from '../modules/pets/petModel.js'
import '../ui/pets/pet-home.css'
import '../ui/pets/pet-complete.css'

const TABS = [['home', '照顾', 'heart'], ['grow','成长','star'], ['play', '玩耍', 'ball'], ['dress', '布置', 'rug'], ['memories', '回忆', 'book']]
const MEMORY_NAMES = { milestone: '成长时刻', play: '伙伴游戏', story: '想象故事', life: '来自生活', note: '我记的话', purchase: '小屋新物件',creation:'我的作品',snapshot:'小屋纪念画',media:'家庭资料' }
const dateLabel = (at) => new Date(at).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })

export function PetHomePage() {
  const { state } = useBedtimeState()
  return <PetHome key={state.activeProfileId} />
}
function PetHome() {
  const { state, cloud, saveStatus } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const profile = getActiveProfile(state)
  const pet = petFor(state, profile.id)
  const settings = petSettingsFor(state, profile.id)
  const [now, setNow] = useState(Date.now)
  const [tab, setTab] = useState('home')
  const [species, setSpecies] = useState(profile.character || 'bear')
  const [name, setName] = useState(getSpecies(profile.character).defaultName)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [motion, setMotion] = useState('idle')
  const [motionKey, setMotionKey] = useState(0)
  const [position, setPosition] = useState('middle')
  const [lightOn, setLightOn] = useState(true)
  const [shopItem, setShopItem] = useState(null)
  const [hatching, setHatching] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [progressResult, setProgressResult] = useState(null)
  const [note, setNote] = useState('')
  const [memoryFilter, setMemoryFilter] = useState('all')
  const [memoryLimit, setMemoryLimit] = useState(12)
  const [shareOpen, setShareOpen] = useState(false)
  const feedbackTimer = useRef(null)
  const pending = useRef(false)
  const lifeCycle=useRef(0), currentLife=useRef(null), mediaSyncing=useRef(false)
  const [expandedGames,setExpandedGames]=useState(false)
  useEffect(()=>{currentLife.current={pet,tab,motion,state,profileId:profile.id,modalOpen: Boolean(shopItem||hatching||renameOpen||shareOpen),isPlaying: Object.values(pet?.playSessions||{}).some(s=>!s.endedAt)}},[pet,tab,motion,state,profile.id,shopItem,hatching,renameOpen,shareOpen])
  useEffect(()=>{const timer=setInterval(()=>{const live=currentLife.current;if(!live?.pet?.hatchedAt||live.tab!=='home'||live.motion!=='idle'||live.modalOpen||live.isPlaying||document.hidden||isPetQuiet(live.state,live.profileId,Date.now())||(live.pet.lastAction==='sleep'&&Date.now()-live.pet.lastActionAt<30*60000)||getAccessibility(live.state).reduceMotion||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;const action=idleBehavior(live.pet,lifeCycle.current++);setMotion(action.action);setMotionKey(k=>k+1);setPosition(action.spot);setMessage(action.message);clearTimeout(feedbackTimer.current);feedbackTimer.current=setTimeout(()=>setMotion('idle'),2800)},25000);const quietAudio=()=>{if(document.hidden)stopPetAudio()};document.addEventListener('visibilitychange',quietAudio);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',quietAudio);stopPetAudio()}},[profile.id])
  useEffect(()=>{let live=true;const sync=()=>{const current=currentLife.current?.pet;if(!current||cloud.mode==='local'||mediaSyncing.current)return;mediaSyncing.current=true;syncPetMedia(current,async(mediaId)=>{const result=await dispatch({type:'PET_SYNC_MEDIA',profileId:current.profileId,mediaId});if(result?.ok===false)throw new Error(result.message)}).catch(e=>{if(live)setMessage(`${e.message}，原文件仍在本机。`)}).finally(()=>{mediaSyncing.current=false})};sync();const timer=setInterval(sync,15000);window.addEventListener('online',sync);return()=>{live=false;clearInterval(timer);window.removeEventListener('online',sync)}},[cloud.mode,profile.id,dispatch])

  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => { window.clearInterval(timer); window.clearTimeout(feedbackTimer.current) } }, [])
  const growth = petGrowth(pet)
  const progress = eggProgress(pet, now)
  const quiet = isPetQuiet(state, profile.id, now)
  useEffect(()=>{if(quiet||getAccessibility(state).soundOff)stopPetAudio()},[quiet,state])
  const roundsLeft = petRoundsLeft(state, profile.id, now)
  const timeLeft = petPlayTimeLeft(state, profile.id, now)
  const activeSession = Object.values(pet?.playSessions || {}).filter((session) => !session.endedAt).sort((a,b) => b.startedAt - a.startedAt)[0]
  const animate = (kind) => {
    window.clearTimeout(feedbackTimer.current)
    petSound(kind,pet?.species,getAccessibility(state).soundOff)
    setMotion(kind); setMotionKey((value) => value + 1)
    feedbackTimer.current = window.setTimeout(() => setMotion('idle'), 2600)
  }
  async function send(type, payload = {}) {
    if (pending.current) return null
    pending.current = true; setBusy(true)
    try {
      const result = await dispatch({ type, profileId: profile.id, ...payload })
      if (result?.ok === false) { setMessage(result.message); return null }
      return result?.state || null
    } finally { pending.current = false; setBusy(false) }
  }
  async function care(action) {
    const next = await send('PET_CARE', { action })
    if (next) { animate(action); setMessage(PET_ACTIONS[action].message) }
  }
  async function beginPlay(game) {
    stopPetAudio()
    const next = await send('PET_BEGIN_PLAY', { sessionId: uid('petplay'), game })
    if (next) setMessage('一起玩一小轮，随时可以回家。')
  }
  async function endPlay(completed, choices, work) {
    if (!activeSession) return
    const next = await send('PET_END_PLAY', { sessionId: activeSession.id, completed, choices, ...(work?{work}:{}) })
    if (next) { animate(completed ? 'celebrate' : 'idle'); setMessage(next.modules.pets.byProfile[profile.id].playSessions[activeSession.id].completed ? '这一小轮，收进你们的生活里啦。' : '玩具收好啦，下次再继续。') }
    return Boolean(next)
  }
  async function buy(item) {
    const next=await send('PET_EXCHANGE_BADGES',{itemId:item.id,requestId:uid('badge')})
    if(next){setShopItem(null);setMessage(`${item.name}已经收到，花了 ${item.badgePrice} 枚徽章，星光没有减少。`);animate('celebrate')}
  }

  const lifeMoments = activityMomentsFor(state, profile.id).filter((m) => m.at <= now).slice(0, 20)
  const stageSize = settings.keepSmall ? 'baby' : growth.stage === 'companion' ? 'adult' : growth.stage === 'young' ? 'young' : 'baby'
  const asleep = quiet || pet?.lastAction === 'sleep' && now - pet.lastActionAt < 30 * 60000 && motion === 'idle'
  const itemStyle=(id)=>pet?.life?.layout?.[id]?{left:`${pet.life.layout[id].x}%`,right:'auto',top:`${pet.life.layout[id].y}%`,bottom:'auto',transform:'translate(-50%,-50%)'}:undefined
  const actorPose = asleep ? 'sleep' : ['feed', 'water', 'brush', 'pat', 'blanket'].includes(motion) ? 'waiting' : motion === 'celebrate' ? 'celebrate' : 'wave'

  const petNavigation=<nav className="pet-action-nav" aria-label="小伙伴的家功能">{TABS.map(([value,label,art])=><button type="button" key={value} aria-pressed={tab===value} onClick={()=>{setTab(value);stopPetAudio()}}><PetProp kind={art}/><span>{label}</span></button>)}</nav>

  if (!pet) return <EggMeadow species={species} name={name} onName={setName} onSpecies={option=>{setSpecies(option.id);setName(option.defaultName)}} busy={busy} message={message} onAdopt={async()=>{const next=await send('PET_ADOPT',{species,name:name.trim(),economyVersion:2});if(next)setMessage('蛋已经安好家，来和它打个招呼吧。')}}/>

  return <section className="pet-home" aria-labelledby="pet-home-title" data-stage={growth.stage} data-simple={settings.simpleMode}>
    <header className="pet-heading"><div className="pet-title-group"><span className="pet-avatar"><PetActor species={pet.species} size="baby" /></span><div><span className="pet-eyebrow">{profile.name}的小伙伴</span><h1 id="pet-home-title" aria-label={pet.name}>{pet.name}<button className="pet-text-button" type="button" aria-label="给小伙伴改名字" onClick={() => { setDraftName(pet.name); setRenameOpen(true) }}><Icon name="edit" size={17} /></button></h1><span className="pet-small-note">{growth.label} · Lv.{levelProgress(pet).level}</span></div></div>
      <div className="pet-heading-actions"><PetWallets stars={petBalance(state,profile.id)} badges={badgeBalance(pet)} onShop={()=>setTab('shop')} onGrow={()=>setTab('grow')}/><button type="button" className="pet-icon-button" aria-label="伙伴的家长设置" onClick={() => navigate('/parent/pet')}><Icon name="shield" /></button></div>
    </header>
    <div className="pet-home-status"><span role="status" aria-live="polite">{message || '星光陪我长大，徽章换来喜欢的小物件。'}</span><button type="button" className="pet-text-button pet-listen" aria-label="听听这句话" onClick={()=>{if(getAccessibility(state).soundOff){setMessage('声音已关闭，可以在家长设置里开启。');return}if(!speakPet(message||'你好呀，来和我玩一会儿吧'))setMessage('这台设备没有可用的本地中文朗读，仍然可以看图和文字。')}}><Icon name="bell" size={16}/></button></div>
    {!activeSession ? petNavigation : null}
    {activeSession ? <PetPlay key={activeSession.id} pet={pet} session={activeSession} others={Object.values(state.modules.pets.byProfile).filter((p) => p.id !== pet.id && p.hatchedAt)} onFinish={endPlay} onDraft={(work)=>dispatch({type:'PET_SAVE_PLAY_DRAFT',profileId:profile.id,sessionId:activeSession.id,work})} quiet={quiet} timeLeft={timeLeft} /> : <>
      {tab === 'home' ? <>
        <div className={`pet-room pet-room--${pet.room} ${asleep ? 'is-quiet' : ''}`} aria-label={`${pet.name}的${PET_ROOMS.find((r) => r.id === pet.room).name}`}>
          <img className="pet-room-background" src={appPath(getThemePack(pet.room).asset)} alt="" />
          <div className="pet-room-speech"><span className="pet-status-dot" /><div><strong>{!pet.hatchedAt ? progress.ready ? '里面的小伙伴准备好啦' : '小小的蛋，正在认识这个家' : asleep ? '小屋安静下来啦' : '你好呀，来和我玩一会儿吧'}</strong><small>{!pet.hatchedAt ? progress.ready ? '等你一起迎接破壳，不会错过。' : '轻轻摸一摸，也可以先去忙自己的事。' : asleep ? '安静时间不开放小游戏，照顾和回忆仍然可以用。' : '点点我，或者把球轻轻推过来。'}</small></div></div>
          <div className="pet-room-floor">
            {pet.placed.rug ? <PetProp kind="rug" className="pet-floor-rug" style={itemStyle(pet.placed.rug)} /> : null}
            <div className={`pet-resident pet-resident--${position} ${asleep?'is-in-bed':''}`} style={asleep?{left:`${Math.max(20,Math.min(80,pet.life?.layout?.bed?.x||76))}%`,bottom:`${Math.max(0,88-(pet.life?.layout?.bed?.y||75))}%`}:undefined}>
              {!pet.hatchedAt ? <button type="button" disabled={busy} className={`pet-egg-touch pet-egg-touch--${motion}`} key={`egg:${motionKey}`} aria-label="轻轻摸摸星光蛋" onClick={() => care('hello')}><EggArt species={pet.species} crack={progress.crack} /><span className="pet-nest" /></button> : <button type="button" className="pet-touch" aria-label={`摸摸${pet.name}`} onClick={() => { animate(asleep ? 'rest' : 'pat'); setMessage(asleep ? '它睡得很安心，轻轻看一眼就好。' : '它蹭了蹭你的手。') }}><PetActor key={motionKey} species={pet.species} size={stageSize} pose={actorPose} motion={asleep ? 'rest' : motion} dirt={pet.life?.dirt || 0} dress={getPetItem(pet.placed.dress)?.art || ''} /></button>}
              {['feed','water','brush'].includes(motion) ? <PetProp kind={PET_ACTIONS[motion].art} className="pet-care-effect" /> : null}
              {['pat', 'celebrate'].includes(motion) ? <span key={`spark:${motionKey}`} className="pet-heart-pop" aria-hidden="true">♡</span> : null}
            </div>
            {pet.hatchedAt ? <><button type="button" className="pet-room-object pet-room-object--food" style={itemStyle('food')} onClick={() => care('feed')} disabled={busy} aria-label="给小伙伴准备食物"><PetProp kind="bowl" /><span>小饭碗</span></button><button type="button" className="pet-room-object pet-room-object--toy" style={itemStyle(pet.placed.toy || 'toy')} onClick={() => setTab('play')} aria-label="打开玩具篮"><PetProp kind={pet.placed.toy ? getPetItem(pet.placed.toy).art : 'ball'} /><span>玩具们</span></button><button type="button" className="pet-room-object pet-room-object--bed" style={itemStyle(pet.placed.bed||'bed')} aria-label="请伙伴回小窝休息" onClick={()=>{setPosition('right');care('sleep')}}><PetProp kind={pet.placed.bed?getPetItem(pet.placed.bed).art:"bed"}/><span>小窝</span></button></> : null}
            {pet.placed.house?<button type="button" className="pet-room-house" style={itemStyle(pet.placed.house)} aria-label={`住进${getPetItem(pet.placed.house).name}`} onClick={()=>{setPosition('right');care('sleep')}}><PetProp kind={getPetItem(pet.placed.house).art}/><span>回小房子休息</span></button>:null}
            {['lamp', 'decor'].map((slot) => pet.placed[slot] ? <button key={slot} type="button" className={`pet-room-decoration pet-room-decoration--${slot} pet-decoration-position--${pet.positions[slot] || 'right'} ${slot === 'lamp' && lightOn ? 'is-lit' : ''}`} style={itemStyle(pet.placed[slot])} aria-pressed={slot === 'lamp' ? lightOn : undefined} aria-label={`看看${getPetItem(pet.placed[slot]).name}`} onClick={() => { if (slot === 'lamp') { setLightOn((on) => !on); setMessage(lightOn ? '小灯休息了。再点一下就会亮。' : '一颗温暖的小星星，亮起来了。') } else if(pet.placed[slot]==='tent'){if(!quiet&&roundsLeft&&timeLeft>0)beginPlay('hide');else setMessage('小帐篷里软软的，明天再来躲猫猫。')} else if(pet.placed[slot]==='memory-frame'){setTab('memories')} else { animate('look'); setMessage(`这是你给小屋挑的${getPetItem(pet.placed[slot]).name}。`) } }}><PetProp kind={getPetItem(pet.placed[slot]).art} /></button> : null)}
          </div>
          {pet.hatchedAt && !asleep ? <div className="pet-walk-spots" role="group" aria-label="请伙伴走过来">{[['left','左边'],['middle','中间'],['right','右边']].map(([value,label]) => <button key={value} type="button" aria-pressed={position === value} aria-label={`请伙伴走到${label}`} onClick={() => { setPosition(value); animate('walk') }}>·</button>)}</div> : null}
          {pet.pinnedMemoryId ? <div className="pet-pinned"><Icon name="heart" size={16} /><span>{pet.memories.find((m) => m.id === pet.pinnedMemoryId)?.title}</span></div> : null}
        </div>
        {!pet.hatchedAt ? <div className="pet-egg-care"><div className="pet-egg-care-head"><h2>陪它准备第一次见面</h2><span>{progress.steps} / 3 个小问候</span></div><div className="pet-care-actions">{['hello','blanket','hum'].map((action) => <button className="pet-action-card" type="button" key={action} disabled={busy} onClick={() => care(action)} aria-pressed={pet.eggCare[action] !== undefined}><PetProp kind={PET_ACTIONS[action].art} /><span>{PET_ACTIONS[action].name}</span>{pet.eggCare[action] !== undefined ? <Icon name="check" size={17} /> : null}</button>)}</div>{progress.ready ? <button className="pet-button pet-button--hatch" type="button" disabled={busy} onClick={async () => { const next = await send('PET_HATCH'); if (next) { petSound('hatch',pet.species,getAccessibility(state).soundOff);setHatching(true); setMessage('这是你们的第一次见面。') } }}>一起迎接破壳<Icon name="sparkle" /></button> : <p className="pet-small-note">{progress.steps === 3 ? `小问候都收到啦。约 ${progress.minutes} 分钟后就能迎接破壳，不用守着页面。` : '三个不同的小问候后，最快 2 分钟准备好；不操作也会在领养 6 小时后准备好。'}不会花星光，不会错过出生。</p>}</div> : <><div className="pet-care-actions">{(settings.simpleMode?['feed','brush','sleep']:['feed', 'water', 'brush', 'bath', 'sleep']).map((action) => <button className="pet-action-card" type="button" key={action} disabled={busy} onClick={() => care(action)}><PetProp kind={PET_ACTIONS[action].art} /><span>{PET_ACTIONS[action].name}</span></button>)}</div><div className="pet-home-bottom"><div><span className="pet-eyebrow">每一点变化，都有来处</span><h2>{growth.stage === 'baby' ? '开始学着一起生活' : growth.stage === 'young' ? '小伙伴越来越熟练啦' : '我们的老朋友'}</h2><p>{growth.stage === 'baby' ? '一起照顾、玩耍，小习惯会慢慢增加；星光培养可以升级。' : '共同经历都还在；几天不来，也不会退步。'}</p></div><button type="button" className="pet-button pet-button--soft" onClick={() => setTab('play')}>看看小本领<Icon name="chevron" /></button></div></>}
      </> : null}
      {tab==='home'&&pet.hatchedAt?<CultivationPanel state={state} pet={pet} profileId={profile.id} now={now} onSend={send} onProgress={setProgressResult} busy={busy}/>:null}
      {tab==='home'&&pet.hatchedAt?<PetLifeSummary pet={pet} onPhoto={()=>send('PET_SNAPSHOT').then(next=>{if(next)setMessage('此刻的小屋已经画进相册，之后换装也不会改变它。')})} onDraw={()=>beginPlay('drawing')} onGarden={()=>setTab('garden')}/>:null}
      {tab==='garden'?<FamilyGarden pet={pet} pets={Object.values(state.modules.pets.byProfile)} disabled={busy} onSave={garden=>send('PET_GARDEN',{garden}).then(next=>{if(next)setMessage('你的花已经种好，其他孩子的小花圃没有改变。')})}/>:null}
      {tab==='drawing'?<PetStudio kind="drawing" pet={pet} disabled={busy} onSave={work=>send('PET_SAVE_WORK',{work}).then(next=>{if(next){setTab('memories');setMessage('你的画已经收好了。')}})}/>:null}
      {tab==='grow'?<CultivationPanel state={state} pet={pet} profileId={profile.id} now={now} onSend={send} onProgress={setProgressResult} busy={busy} standalone/>:null}
      {tab === 'play' ? <section className="pet-panel"><header className="pet-section-head"><div><span className="pet-eyebrow">一起玩 · 一起长大</span><h2>今天想玩什么？</h2></div><span className="pet-chip">{quiet ? '现在是安静时间' : `今天还可玩 ${roundsLeft} 个小回合`}</span></header>{!pet.hatchedAt ? <div className="pet-empty"><EggArt species={pet.species} /><h3>玩具准备好了，等小伙伴破壳</h3><button className="pet-button" type="button" onClick={() => setTab('home')}>回去看看蛋</button></div> : <><div className="pet-catalog">{PET_GAMES.filter((game)=>!settings.simpleMode||expandedGames||['ball','hide','story-welcome'].includes(game.id)).map((game) => <article key={game.id} className="pet-item-card"><PetProp kind={game.art} /><h3>{game.name}</h3><p>{game.copy}</p><button type="button" className="pet-button pet-button--soft" disabled={busy || petGameUnlocked(pet, game.id) && (quiet || !roundsLeft || timeLeft <= 0)} onClick={() => petGameUnlocked(pet, game.id) ? beginPlay(game.id) : setShopItem(getPetItem(game.itemId))}>{petGameUnlocked(pet, game.id) ? quiet ? '明天再一起玩' : roundsLeft && timeLeft > 0 ? '一起玩一轮' : '今天先收好玩具' : `到小铺看看 · ${getPetItem(game.itemId).badgePrice} 枚徽章`}</button></article>)}</div>{settings.simpleMode?<button type="button" className="pet-text-button" onClick={()=>setExpandedGames(v=>!v)}>{expandedGames?'收起其他玩法':'看看更多玩法'}</button>:null}<h2 className="pet-subheading">我教会它的小本领</h2><div className="pet-skills">{PET_SKILLS.map((base) => {const skill=base.id==='signature'?{...base,...signatureFor(pet)}:base;return <article key={skill.id}><PetProp kind={skill.art} /><div><h3>{skill.name}</h3><p>{skill.copy}</p><span className="pet-skill-progress">{['第一次试','更熟练啦','已经学会'][Math.max(0,(pet.skills[skill.id] || 0)-1)]} · {pet.skills[skill.id] || 0} / 3 次练习</span></div><button className="pet-button pet-button--soft" type="button" disabled={busy || (!skill.itemId && !petGameUnlocked(pet, `skill-${skill.id}`)) || petGameUnlocked(pet, `skill-${skill.id}`) && (quiet || !roundsLeft || timeLeft <= 0)} onClick={() => petGameUnlocked(pet, `skill-${skill.id}`) ? beginPlay(`skill-${skill.id}`) : setShopItem(getPetItem(skill.itemId))}>{petGameUnlocked(pet, `skill-${skill.id}`) ? (pet.skills[skill.id] || 0) >= 3 ? '再演给我看' : '一起学' : !skill.itemId ? `${skill.minLevel} 级开放` : '看看本领道具'}</button></article>})}</div></>}<p className="pet-small-note">小游戏每轮最多一分钟，创作最多三分钟；开始一轮就使用一个回合名额。提前退出不扣星光，已用回合不返还；小游戏不产星光，不用拼手速。</p></section> : null}
      {tab === 'dress' ? <section className="pet-panel"><header className="pet-section-head"><div><span className="pet-eyebrow">按自己的喜欢来</span><h2>布置我们的小屋</h2></div><button className="pet-button pet-button--soft" type="button" onClick={() => setTab('home')}>回小屋看看</button></header><div className="pet-room-picker" role="group" aria-label="选择小屋">{PET_ROOMS.map((room) => <button type="button" key={room.id} aria-pressed={pet.room === room.id} onClick={async () => { if (room.itemId && !pet.inventory[room.itemId]) { setShopItem(getPetItem(room.itemId)); return } const next = await send('PET_ROOM', { room: room.id }); if (next) setMessage(`已经换成${room.name}，原有物件都还在。`) }}><img src={appPath(getThemePack(room.id).asset)} alt="" /><span>{room.name}<small>{pet.room === room.id ? '正在住' : !room.itemId || pet.inventory[room.itemId] ? '换到这里' : `${getPetItem(room.itemId).badgePrice} 枚徽章解锁`}</small></span></button>)}</div><PetRoomArranger pet={pet} disabled={busy} onSave={(itemId,point)=>send('PET_MOVE_OBJECT',{itemId,point})}/><h3>我已经拥有的物件</h3>{Object.keys(pet.inventory).some((id) => getPetItem(id)?.slot) ? <div className="pet-inventory">{PET_ITEMS.filter((item) => item.slot && pet.inventory[item.id]).map((item) => <article key={item.id}><PetProp kind={item.art} /><h3>{item.name}</h3><button className="pet-button pet-button--soft" type="button" aria-pressed={pet.placed[item.slot] === item.id} disabled={busy} onClick={async () => { const placed = pet.placed[item.slot] === item.id; const next = await send('PET_PLACE', { slot: item.slot, itemId: placed ? '' : item.id }); if (next) setMessage(placed ? '已经收好，随时可以再摆上。' : `已经摆上${item.name}。`) }}>{pet.placed[item.slot] === item.id ? '收进柜子' : item.slot === 'dress' ? '穿上试试' : '摆到小屋'}</button>{['decor','lamp'].includes(item.slot) && pet.placed[item.slot] === item.id ? <label className="pet-field">摆在哪里<select value={pet.positions[item.slot] || 'right'} onChange={(e) => send('PET_PLACE', { slot: item.slot, itemId: item.id, position: e.target.value })}><option value="left">靠左</option><option value="middle">中间</option><option value="right">靠右</option></select></label> : null}</article>)}</div> : <div className="pet-empty"><PetProp kind="rug" /><h3>小窝已经很舒服啦</h3><p>以后可以添个小花地毯或星星灯。买过的物件一直属于你。</p><button className="pet-button pet-button--soft" type="button" onClick={() => setTab('shop')}>逛逛徽章小铺</button></div>}</section> : null}
      {tab==='shop'?<BadgeShop pet={pet} busy={busy} onItem={setShopItem} onGoal={itemId=>send('PET_SELECT_GOAL',{itemId})} onCancelGoal={()=>send('PET_SELECT_GOAL',{itemId:null})}/>:null}
      {tab === 'memories' ? <section className="pet-panel"><header className="pet-section-head"><div><span className="pet-eyebrow">不打分的小相册</span><h2>我们的小片段</h2></div><button className="pet-button pet-button--soft" type="button" onClick={() => setShareOpen(true)}>讲一件生活里的事</button></header><PetCreationCabinet pet={pet}/>{settings.allowMedia?<PetMediaRecorder onSave={async(file)=>{const draft=await savePetMedia(file,pet);const {id,kind,mediaType,fileName,byteSize,status}=draft;const next=await send('PET_ATTACH_MEDIA',{media:{id,kind,mediaType,fileName,byteSize,status}});if(!next){await discardPetMediaDraft(id);throw new Error('这份资料暂未加入相册，请稍后重试')}}}/>:null}<div className="pet-memory-compose"><label className="pet-field">留一句自己的话<textarea maxLength={400} value={note} onChange={(event) => setNote(event.target.value)} placeholder="今天想记住什么？也可以不写。" /></label><button className="pet-button" type="button" disabled={!note.trim() || busy} onClick={async () => { const next = await send('PET_NOTE',{note:note.trim()}); if (next) { setNote(''); setMessage('这句话，已经放进相册。') } }}>把这句话收好</button></div><div className="pet-filters" role="group" aria-label="伙伴回忆分类">{[['all','全部'],['milestone','成长'],['play','游戏'],['story','故事'],['life','生活'],['note','我说的话'],['purchase','物件'],['creation','作品'],['snapshot','纪念画'],['media','照片与语音']].map(([value,label]) => <button type="button" key={value} aria-pressed={memoryFilter === value} onClick={() => {setMemoryFilter(value);setMemoryLimit(12)}}>{label}</button>)}</div><div className="pet-memory-grid">{[...pet.memories].reverse().filter((m) => memoryFilter === 'all' || m.kind === memoryFilter).slice(0,memoryLimit).map((m) => {const savedWork=m.work||pet.life?.creations.find(c=>c.id===m.workId)?.work;return <article key={m.id}><div className="pet-memory-image">{m.media?<PetMediaPreview media={m.media} pet={pet}/>:m.snapshot?<PetSnapshot snapshot={m.snapshot}/>:savedWork?<WorkPreview work={savedWork} pet={pet} replay/>:m.art === 'egg' ? <EggArt species={pet.species} crack={m.id === 'hatch' ? 2 : 0} /> : <PetProp kind={m.art} />}</div><span className="pet-eyebrow">{MEMORY_NAMES[m.kind]} · {dateLabel(m.at)}</span><h3>{m.title}</h3>{m.note ? <p>{m.note}</p> : null}<div>{m.id === 'hatch' ? <button type="button" className="pet-text-button" onClick={() => setHatching(true)}>重看破壳</button> : null}<button type="button" className="pet-text-button" aria-pressed={pet.pinnedMemoryId === m.id} onClick={() => send('PET_PIN',{memoryId:pet.pinnedMemoryId === m.id ? null : m.id})}>{pet.pinnedMemoryId === m.id ? '从小屋墙上取下' : '挂到小屋墙上'}</button></div></article>})}</div>{pet.memories.filter((m) => memoryFilter === 'all' || m.kind === memoryFilter).length > memoryLimit ? <button type="button" className="pet-button pet-button--soft" onClick={() => setMemoryLimit((n) => n + 12)}>看看更早的回忆</button> : null}<p className="pet-small-note">“想象故事”是游戏里的经历，不会算成真实阅读、运动或家庭任务。</p></section> : null}

    </>}
    <div className="pet-save-note"><SaveIndicator />{saveStatus === 'error' ? <span>这次操作未保存，请重试。</span> : null}<small>放心离开，不会饿坏，也不会忘记你。</small></div>
    {shopItem?<BadgeItemDialog item={shopItem} pet={pet} busy={busy} onClose={()=>setShopItem(null)} onBuy={buy} onUse={item=>{setTab(item.slot||item.room?'dress':'play');setShopItem(null)}} onGoal={async(itemId)=>{const next=await send('PET_SELECT_GOAL',{itemId});if(next)setShopItem(null)}}/>:null}
    {progressResult?<GrowthCelebration result={progressResult} onClose={()=>setProgressResult(null)}/>:null}
    {hatching ? <Modal title="我们的第一次见面" onClose={() => setHatching(false)} className="pet-modal pet-hatch-modal"><span className="pet-eyebrow">可以重看，不用重新孵蛋</span><h2>你好呀，{pet.name}</h2><div className="pet-hatch-scene" data-reduced={getAccessibility(state).reduceMotion}><PetActor species={pet.species} pose="wave" size="baby" /><div className="pet-hatch-shell pet-hatch-shell--top"><EggArt species={pet.species} crack={2}/></div><div className="pet-hatch-shell pet-hatch-shell--bottom"><EggArt species={pet.species} crack={2}/></div><span className="pet-hatch-sparkles" aria-hidden="true">✦ ✧ ✦</span></div><p>{getSpecies(pet.species).name}从你选的蛋里，来到了这个小家。</p><button className="pet-button" type="button" onClick={() => setHatching(false)}>抱抱我的小伙伴</button></Modal> : null}
    {renameOpen ? <Modal title="小伙伴的名字" onClose={() => setRenameOpen(false)} className="pet-modal"><form onSubmit={async (event) => { event.preventDefault(); const next = await send('PET_RENAME',{name:draftName.trim()}); if(next) setRenameOpen(false) }}><h2>还是那个熟悉的小伙伴</h2><label className="pet-field">小伙伴的名字<input maxLength={12} required value={draftName} onChange={(event) => setDraftName(event.target.value)} /></label><button className="pet-button" type="submit" disabled={busy || !draftName.trim()}>保存名字</button></form></Modal> : null}
    {shareOpen ? <Modal title="讲一件生活里的事" onClose={() => setShareOpen(false)} className="pet-modal"><h2>挑一份真实的小记忆</h2><p>只把已经记录的经历讲给伙伴听，不会再次加星光或记一次完成。</p>{lifeMoments.length ? <div className="pet-life-list">{lifeMoments.map((m) => <button className="pet-button pet-button--soft" type="button" key={m.id} disabled={busy || pet.memories.some((saved) => saved.sourceId === m.id)} onClick={async () => {const next=await send('PET_SHARE_LIFE',{sourceId:m.id});if(next){setShareOpen(false);setMessage('小伙伴听到了，这份真实经历仍只记一次。')}}}>{m.title}{pet.memories.some((saved) => saved.sourceId === m.id) ? ' · 已经讲过' : ''}</button>)}</div> : <p>还没有记录也没关系，你仍然可以自由讲故事、照顾和玩耍。</p>}</Modal> : null}
  </section>
}
