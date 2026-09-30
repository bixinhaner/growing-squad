import { useEffect, useRef, useState } from 'react'
import { useBedtimeActions, useBedtimeState } from '../../store/useBedtime.js'
import { getAccessibility, getActiveProfile, uid } from '../../domain/model.js'
import { appPath } from '../../data/paths.js'
import { getThemePack } from '../../domain/themePacks.js'
import { activityMomentsFor } from '../../core/activity/activitySelectors.js'
import { badgeBalance, levelProgress, signatureFor } from '../../modules/pets/petEconomy.js'
import { idleBehavior } from '../../modules/pets/petLife.js'
import { PET_ACTIONS, PET_GAMES, PET_ITEMS, PET_ROOMS, PET_SKILLS, getPetItem, getSpecies } from '../../modules/pets/petCatalog.js'
import { eggProgress, isPetQuiet, petBalance, petFor, petGameUnlocked, petGrowth, petPlayTimeLeft, petRoundsLeft, petSettingsFor } from '../../modules/pets/petModel.js'
import { BadgeItemDialog, BadgeShop, CultivationPanel, EggMeadow, GrowthCelebration } from '../../ui/pets/PetEconomyPanels.jsx'
import { FamilyGarden, PetStudio, WorkPreview } from '../../ui/pets/PetStudio.jsx'
import { PetCreationCabinet, PetRoomArranger, PetSnapshot } from '../../ui/pets/PetLifePanels.jsx'
import { PetMediaPreview, PetMediaRecorder } from '../../ui/pets/PetMedia.jsx'
import { discardPetMediaDraft, savePetMedia, syncPetMedia } from '../../ui/pets/petMediaStore.js'
import { petSound, speakPet, stopPetAudio } from '../../ui/pets/petAudio.js'
import { EggArt, PetActor, PetProp } from '../../ui/pets/PetArt.jsx'
import { PetPlay } from '../../ui/pets/PetPlay.jsx'
import { Icon } from '../ui/Icon.jsx'
import { ChipGroup, Sheet, Tap } from '../ui/kit.jsx'
import '../../ui/pets/pet-home.css'
import '../../ui/pets/pet-complete.css'
import './pet.css'

const DOCK = [
  { id: 'room', title: '小屋', art: 'heart' },
  { id: 'play', title: '一起玩', art: 'ball' },
  { id: 'dress', title: '布置', art: 'rug' },
  { id: 'album', title: '相册', art: 'book' },
]
const MEMORY_NAMES = { milestone: '成长时刻', play: '伙伴游戏', story: '想象故事', life: '来自生活', note: '我说的话', purchase: '小屋新物件', creation: '我的作品', snapshot: '小屋纪念画', media: '家庭资料' }
const MEMORY_FILTERS = [['all', '全部'], ['milestone', '成长'], ['play', '游戏'], ['story', '故事'], ['life', '生活'], ['note', '我说的话'], ['purchase', '物件'], ['creation', '作品'], ['snapshot', '纪念画'], ['media', '照片与语音']]
const dateLabel = (at) => new Date(at).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })

export function Pet() {
  const { state } = useBedtimeState()
  return <PetHome key={state.activeProfileId} />
}

function PetHome() {
  const { state, cloud } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const profile = getActiveProfile(state)
  const accessibility = getAccessibility(state)
  const pet = petFor(state, profile.id)
  const settings = petSettingsFor(state, profile.id)
  const [now, setNow] = useState(Date.now)
  const [view, setView] = useState('room')
  const [species, setSpecies] = useState(profile.character || 'bear')
  const [name, setName] = useState(getSpecies(profile.character).defaultName)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [motion, setMotion] = useState('idle')
  const [motionKey, setMotionKey] = useState(0)
  const [position, setPosition] = useState('middle')
  const [lightOn, setLightOn] = useState(true)
  const [shopItem, setShopItem] = useState(null)
  const [sheet, setSheet] = useState('')
  const [draftName, setDraftName] = useState('')
  const [progressResult, setProgressResult] = useState(null)
  const [note, setNote] = useState('')
  const [memoryFilter, setMemoryFilter] = useState('all')
  const [memoryLimit, setMemoryLimit] = useState(12)
  const feedbackTimer = useRef(null)
  const pending = useRef(false)
  const lifeCycle = useRef(0)
  const live = useRef(null)
  const mediaSyncing = useRef(false)

  const activeSession = Object.values(pet?.playSessions || {}).filter((session) => !session.endedAt).sort((a, b) => b.startedAt - a.startedAt)[0]
  useEffect(() => { live.current = { pet, view, motion, state, profileId: profile.id, modalOpen: Boolean(shopItem || sheet), isPlaying: Boolean(activeSession) } })

  // The pet wanders and does small things on its own while the child watches the room.
  useEffect(() => {
    const timer = setInterval(() => {
      const now = live.current
      if (!now?.pet?.hatchedAt || now.view !== 'room' || now.motion !== 'idle' || now.modalOpen || now.isPlaying || document.hidden) return
      if (isPetQuiet(now.state, now.profileId, Date.now()) || (now.pet.lastAction === 'sleep' && Date.now() - now.pet.lastActionAt < 30 * 60000)) return
      if (getAccessibility(now.state).reduceMotion || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return
      const action = idleBehavior(now.pet, lifeCycle.current++)
      setMotion(action.action); setMotionKey((key) => key + 1); setPosition(action.spot); setMessage(action.message)
      clearTimeout(feedbackTimer.current)
      feedbackTimer.current = setTimeout(() => setMotion('idle'), 2800)
    }, 25000)
    const quietAudio = () => { if (document.hidden) stopPetAudio() }
    document.addEventListener('visibilitychange', quietAudio)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', quietAudio); stopPetAudio() }
  }, [profile.id])

  // Photos and voice clips stay on this device until the family cloud is reachable.
  useEffect(() => {
    let alive = true
    const sync = () => {
      const current = live.current?.pet
      if (!current || cloud.mode === 'local' || mediaSyncing.current) return
      mediaSyncing.current = true
      syncPetMedia(current, async (mediaId) => {
        const result = await dispatch({ type: 'PET_SYNC_MEDIA', profileId: current.profileId, mediaId })
        if (result?.ok === false) throw new Error(result.message)
      }).catch((error) => { if (alive) setMessage(`${error.message}，原文件仍在本机。`) }).finally(() => { mediaSyncing.current = false })
    }
    sync()
    const timer = setInterval(sync, 15000)
    window.addEventListener('online', sync)
    return () => { alive = false; clearInterval(timer); window.removeEventListener('online', sync) }
  }, [cloud.mode, profile.id, dispatch])

  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => { clearInterval(timer); clearTimeout(feedbackTimer.current) } }, [])
  const quiet = isPetQuiet(state, profile.id, now)
  useEffect(() => { if (quiet || accessibility.soundOff) stopPetAudio() }, [quiet, accessibility.soundOff])

  const growth = petGrowth(pet)
  const progress = eggProgress(pet, now)
  const roundsLeft = petRoundsLeft(state, profile.id, now)
  const timeLeft = petPlayTimeLeft(state, profile.id, now)
  const canPlay = !quiet && roundsLeft > 0 && timeLeft > 0

  const animate = (kind) => {
    clearTimeout(feedbackTimer.current)
    petSound(kind, pet?.species, accessibility.soundOff)
    setMotion(kind); setMotionKey((value) => value + 1)
    feedbackTimer.current = setTimeout(() => setMotion('idle'), 2600)
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
    if (!activeSession) return false
    const next = await send('PET_END_PLAY', { sessionId: activeSession.id, completed, choices, ...(work ? { work } : {}) })
    if (next) {
      animate(completed ? 'celebrate' : 'idle')
      setMessage(next.modules.pets.byProfile[profile.id].playSessions[activeSession.id].completed ? '这一小轮，收进你们的生活里啦。' : '玩具收好啦，下次再继续。')
      setView('room')
    }
    return Boolean(next)
  }
  async function buy(item) {
    const next = await send('PET_EXCHANGE_BADGES', { itemId: item.id, requestId: uid('badge') })
    if (next) { setShopItem(null); setMessage(`${item.name}已经收到，花了 ${item.badgePrice} 枚徽章，星光没有减少。`); animate('celebrate') }
  }
  const go = (next) => { setView(next); stopPetAudio(); window.scrollTo({ top: 0 }) }
  const listen = () => {
    if (accessibility.soundOff) { setMessage('声音已关闭，可以请家长在设置里打开。'); return }
    if (!speakPet(line)) setMessage('这台设备不能朗读中文，可以看图和文字。')
  }

  if (!pet) {
    return (
      <div className="k-pet k-pet--adopt pet-home">
        <EggMeadow species={species} name={name} onName={setName} onSpecies={(option) => { setSpecies(option.id); setName(option.defaultName) }} busy={busy} message={message}
          onAdopt={async () => { const next = await send('PET_ADOPT', { species, name: name.trim(), economyVersion: 2 }); if (next) setMessage('蛋已经安好家，来和它打个招呼吧。') }} />
      </div>
    )
  }

  const stageSize = settings.keepSmall ? 'baby' : growth.stage === 'companion' ? 'adult' : growth.stage === 'young' ? 'young' : 'baby'
  const asleep = quiet || (pet.lastAction === 'sleep' && now - pet.lastActionAt < 30 * 60000 && motion === 'idle')
  const itemStyle = (id) => (pet.life?.layout?.[id] ? { left: `${pet.life.layout[id].x}%`, right: 'auto', top: `${pet.life.layout[id].y}%`, bottom: 'auto', transform: 'translate(-50%,-50%)' } : undefined)
  const actorPose = asleep ? 'sleep' : ['feed', 'water', 'brush', 'pat', 'blanket'].includes(motion) ? 'waiting' : motion === 'celebrate' ? 'celebrate' : 'wave'
  const line = message || (!pet.hatchedAt ? (progress.ready ? '里面的小伙伴准备好啦！' : '小小的蛋，正在认识这个家。') : asleep ? '嘘，它睡着了。' : '你好呀，来和我玩一会儿吧！')
  const level = levelProgress(pet)

  return (
    <section className="k-pet pet-home" data-simple={settings.simpleMode} aria-labelledby="k-pet-title" data-stage={growth.stage}>
      <header className="k-pet__head">
        <div className="k-pet__name">
          <span className="k-go__eyebrow">{profile.name}的小伙伴 · {growth.label}</span>
          <div className="k-pet__title">
            <h1 id="k-pet-title" className="u-display">{pet.name}</h1>
            <button type="button" className="k-pet__rename" aria-label="给小伙伴改名字" onClick={() => { setDraftName(pet.name); setSheet('rename') }}><Icon name="edit" size={18} /></button>
          </div>
        </div>
        <div className="k-pet__wallet">
          <button type="button" onClick={() => go('grow')} aria-label={`成长：${level.level} 级，${petBalance(state, profile.id)} 点星光，去培养`}><Icon name="star" size={20} /><b className="u-num">{petBalance(state, profile.id)}</b><small>Lv.{level.level}</small></button>
          <button type="button" onClick={() => go('shop')} aria-label={`徽章小铺：${badgeBalance(pet)} 枚徽章`}><PetProp kind="badge" /><b className="u-num">{badgeBalance(pet)}</b><small>小铺</small></button>
        </div>
      </header>

      {activeSession ? (
        <div className="k-pet__view">
          <PetPlay key={activeSession.id} pet={pet} session={activeSession} others={Object.values(state.modules.pets.byProfile).filter((item) => item.id !== pet.id && item.hatchedAt)} onFinish={endPlay}
            onDraft={(work) => dispatch({ type: 'PET_SAVE_PLAY_DRAFT', profileId: profile.id, sessionId: activeSession.id, work })} quiet={quiet} timeLeft={timeLeft} />
        </div>
      ) : (
        <>
          <nav className="k-pet__dock" aria-label="小伙伴的家">
            {DOCK.map((item) => (
              <button type="button" key={item.id} aria-pressed={view === item.id} onClick={() => go(item.id)}>
                <PetProp kind={item.art} /><span>{item.title}</span>
              </button>
            ))}
          </nav>

          <p className="k-pet__line" role="status" aria-live="polite">
            <span>{line}</span>
            <button type="button" className="u-speak" aria-label="听一听" onClick={listen}><Icon name="volume" size={22} /></button>
          </p>

          {view === 'room' ? (
            <div className="k-pet__view">
              <div className={`pet-room pet-room--${pet.room} k-pet__room${asleep ? ' is-quiet' : ''}`} aria-label={`${pet.name}的${PET_ROOMS.find((room) => room.id === pet.room)?.name || '小屋'}`}>
                <img className="pet-room-background" src={appPath(getThemePack(pet.room).asset)} alt="" />
                <div className="pet-room-floor">
                  {pet.placed.rug ? <PetProp kind="rug" className="pet-floor-rug" style={itemStyle(pet.placed.rug)} /> : null}
                  <div className={`pet-resident pet-resident--${position} ${asleep ? 'is-in-bed' : ''}`} style={asleep ? { left: `${Math.max(20, Math.min(80, pet.life?.layout?.bed?.x || 76))}%`, bottom: `${Math.max(0, 88 - (pet.life?.layout?.bed?.y || 75))}%` } : undefined}>
                    {!pet.hatchedAt
                      ? <button type="button" disabled={busy} className={`pet-egg-touch pet-egg-touch--${motion}`} key={`egg:${motionKey}`} aria-label="轻轻摸摸星光蛋" onClick={() => care('hello')}><EggArt species={pet.species} crack={progress.crack} /><span className="pet-nest" /></button>
                      : <button type="button" className="pet-touch" aria-label={`摸摸${pet.name}`} onClick={() => { animate(asleep ? 'rest' : 'pat'); setMessage(asleep ? '它睡得很安心，轻轻看一眼就好。' : '它蹭了蹭你的手。') }}>
                        <PetActor key={motionKey} species={pet.species} size={stageSize} pose={actorPose} motion={asleep ? 'rest' : motion} dirt={pet.life?.dirt || 0} dress={getPetItem(pet.placed.dress)?.art || ''} />
                      </button>}
                    {['feed', 'water', 'brush'].includes(motion) ? <PetProp kind={PET_ACTIONS[motion].art} className="pet-care-effect" /> : null}
                    {['pat', 'celebrate'].includes(motion) ? <span key={`spark:${motionKey}`} className="pet-heart-pop" aria-hidden="true">♡</span> : null}
                  </div>
                  {pet.hatchedAt ? (
                    <>
                      <button type="button" className="pet-room-object pet-room-object--food" style={itemStyle('food')} onClick={() => care('feed')} disabled={busy} aria-label="给小伙伴准备食物"><PetProp kind="bowl" /><span>小饭碗</span></button>
                      <button type="button" className="pet-room-object pet-room-object--toy" style={itemStyle(pet.placed.toy || 'toy')} onClick={() => go('play')} aria-label="打开玩具篮"><PetProp kind={pet.placed.toy ? getPetItem(pet.placed.toy).art : 'ball'} /><span>玩具们</span></button>
                      <button type="button" className="pet-room-object pet-room-object--bed" style={itemStyle(pet.placed.bed || 'bed')} aria-label="请伙伴回小窝休息" onClick={() => { setPosition('right'); care('sleep') }}><PetProp kind={pet.placed.bed ? getPetItem(pet.placed.bed).art : 'bed'} /><span>小窝</span></button>
                    </>
                  ) : null}
                  {pet.placed.house ? <button type="button" className="pet-room-house" style={itemStyle(pet.placed.house)} aria-label={`住进${getPetItem(pet.placed.house).name}`} onClick={() => { setPosition('right'); care('sleep') }}><PetProp kind={getPetItem(pet.placed.house).art} /><span>回小房子休息</span></button> : null}
                  {['lamp', 'decor'].map((slot) => (pet.placed[slot] ? (
                    <button key={slot} type="button" className={`pet-room-decoration pet-room-decoration--${slot} pet-decoration-position--${pet.positions[slot] || 'right'} ${slot === 'lamp' && lightOn ? 'is-lit' : ''}`} style={itemStyle(pet.placed[slot])} aria-pressed={slot === 'lamp' ? lightOn : undefined} aria-label={`看看${getPetItem(pet.placed[slot]).name}`}
                      onClick={() => {
                        if (slot === 'lamp') { setLightOn((on) => !on); setMessage(lightOn ? '小灯休息了。再点一下就会亮。' : '一颗温暖的小星星，亮起来了。') }
                        else if (pet.placed[slot] === 'tent') { if (canPlay) beginPlay('hide'); else setMessage('小帐篷里软软的，明天再来躲猫猫。') }
                        else if (pet.placed[slot] === 'memory-frame') go('album')
                        else { animate('look'); setMessage(`这是你给小屋挑的${getPetItem(pet.placed[slot]).name}。`) }
                      }}><PetProp kind={getPetItem(pet.placed[slot]).art} /></button>
                  ) : null))}
                </div>
                {pet.hatchedAt && !asleep ? (
                  <div className="pet-walk-spots" role="group" aria-label="请伙伴走过来">
                    {[['left', '左边'], ['middle', '中间'], ['right', '右边']].map(([value, label]) => <button key={value} type="button" aria-pressed={position === value} aria-label={`请伙伴走到${label}`} onClick={() => { setPosition(value); animate('walk') }}>·</button>)}
                  </div>
                ) : null}
                {pet.pinnedMemoryId ? <div className="pet-pinned"><Icon name="heart" size={16} /><span>{pet.memories.find((memory) => memory.id === pet.pinnedMemoryId)?.title}</span></div> : null}
              </div>

              {!pet.hatchedAt ? (
                <div className="k-pet__care">
                  <h2 className="u-display">陪它准备第一次见面 <small className="u-num">{progress.steps} / 3</small></h2>
                  <div className="k-pet__actions">
                    {['hello', 'blanket', 'hum'].map((action) => (
                      <button type="button" key={action} className="k-pet__act" disabled={busy} onClick={() => care(action)} aria-pressed={pet.eggCare[action] !== undefined}>
                        <PetProp kind={PET_ACTIONS[action].art} /><span>{PET_ACTIONS[action].name}</span>{pet.eggCare[action] !== undefined ? <i><Icon name="check" size={16} strokeWidth={3} /></i> : null}
                      </button>
                    ))}
                  </div>
                  {progress.ready
                    ? <Tap tone="primary" size="xl" icon="sparkle" disabled={busy} onClick={async () => { const next = await send('PET_HATCH'); if (next) { petSound('hatch', pet.species, accessibility.soundOff); setSheet('hatch'); setMessage('这是你们的第一次见面。') } }}>一起迎接破壳</Tap>
                    : <p className="k-note">{progress.steps === 3 ? `小问候都收到啦。大约 ${progress.minutes} 分钟后就能破壳，不用守着。` : '做三个不同的小问候，它很快就会准备好。'}不花星光，也不会错过。</p>}
                </div>
              ) : (
                <div className="k-pet__care">
                  <h2 className="u-display">照顾它</h2>
                  <div className="k-pet__actions">
                    {(settings.simpleMode ? ['feed', 'brush', 'sleep'] : ['feed', 'water', 'brush', 'bath', 'sleep']).map((action) => (
                      <button type="button" key={action} className="k-pet__act" disabled={busy} onClick={() => care(action)}><PetProp kind={PET_ACTIONS[action].art} /><span>{PET_ACTIONS[action].name}</span></button>
                    ))}
                  </div>
                  <div className="k-pet__extras">
                    <button type="button" onClick={() => send('PET_SNAPSHOT').then((next) => { if (next) setMessage('此刻的小屋已经画进相册。') })}><PetProp kind="camera" /><span>给小屋画张画</span></button>
                    <button type="button" onClick={() => go('drawing')}><PetProp kind="brush" /><span>画画送给它</span></button>
                    <button type="button" onClick={() => go('garden')}><PetProp kind="flower" /><span>家庭小花园</span></button>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {view === 'grow' ? <Drawer title="培养成长" onBack={() => go('room')}><CultivationPanel state={state} pet={pet} profileId={profile.id} now={now} onSend={send} onProgress={setProgressResult} busy={busy} standalone /></Drawer> : null}
          {view === 'shop' ? <Drawer title="徽章小铺" onBack={() => go('room')}><BadgeShop pet={pet} busy={busy} onItem={setShopItem} onGoal={(itemId) => send('PET_SELECT_GOAL', { itemId })} onCancelGoal={() => send('PET_SELECT_GOAL', { itemId: null })} /></Drawer> : null}
          {view === 'garden' ? <Drawer title="家庭小花园" onBack={() => go('room')}><FamilyGarden pet={pet} pets={Object.values(state.modules.pets.byProfile)} disabled={busy} onSave={(garden) => send('PET_GARDEN', { garden }).then((next) => { if (next) setMessage('你的花已经种好。') })} /></Drawer> : null}
          {view === 'drawing' ? <Drawer title="画一张画" onBack={() => go('room')}><PetStudio kind="drawing" pet={pet} disabled={busy} onSave={(work) => send('PET_SAVE_WORK', { work }).then((next) => { if (next) { go('album'); setMessage('你的画已经收好了。') } })} /></Drawer> : null}

          {view === 'play' ? (
            <Drawer title="一起玩" onBack={() => go('room')} note={quiet ? '现在是安静时间' : `今天还能玩 ${roundsLeft} 轮`}>
              {!pet.hatchedAt ? (
                <div className="k-empty"><EggArt species={pet.species} /><h2 className="u-display">等小伙伴破壳再一起玩</h2><Tap tone="soft" onClick={() => go('room')}>回去看看蛋</Tap></div>
              ) : (
                <>
                  <div className="k-pet__games">
                    {PET_GAMES.map((game) => {
                      const unlocked = petGameUnlocked(pet, game.id)
                      return (
                        <button type="button" key={game.id} className={`k-pet__game${unlocked ? '' : ' is-locked'}`} disabled={busy || (unlocked && !canPlay)} onClick={() => (unlocked ? beginPlay(game.id) : setShopItem(getPetItem(game.itemId)))}>
                          <PetProp kind={game.art} /><strong>{game.name}</strong>
                          <small>{unlocked ? (quiet ? '明天再玩' : canPlay ? game.copy : '今天先收好') : `小铺 · ${getPetItem(game.itemId).badgePrice} 枚徽章`}</small>
                          {!unlocked ? <span className="k-pet__lock"><Icon name="lock" size={16} /></span> : null}
                        </button>
                      )
                    })}
                  </div>
                  <h3 className="k-pet__sub u-display">教它小本领</h3>
                  <div className="k-pet__games">
                    {PET_SKILLS.map((base) => {
                      const skill = base.id === 'signature' ? { ...base, ...signatureFor(pet) } : base
                      const unlocked = petGameUnlocked(pet, `skill-${skill.id}`)
                      const count = pet.skills[skill.id] || 0
                      return (
                        <button type="button" key={skill.id} className={`k-pet__game${unlocked ? '' : ' is-locked'}`} disabled={busy || (!skill.itemId && !unlocked) || (unlocked && !canPlay)} onClick={() => (unlocked ? beginPlay(`skill-${skill.id}`) : setShopItem(getPetItem(skill.itemId)))}>
                          <PetProp kind={skill.art} /><strong>{skill.name}</strong>
                          <small>{unlocked ? `${['还没学', '第一次试', '更熟练啦', '已经学会'][Math.min(3, count)]} · ${count}/3` : !skill.itemId ? `${skill.minLevel} 级开放` : '看看本领道具'}</small>
                          <span className="k-pet__meter" aria-hidden="true"><i style={{ width: `${Math.min(1, count / 3) * 100}%` }} /></span>
                        </button>
                      )
                    })}
                  </div>
                  <p className="k-note">每轮小游戏最多一分钟，画画最多三分钟。小游戏不产星光，不用拼手速。</p>
                </>
              )}
            </Drawer>
          ) : null}

          {view === 'dress' ? (
            <Drawer title="布置小屋" onBack={() => go('room')}>
              <h3 className="k-pet__sub u-display">住在哪里</h3>
              <div className="k-pet__rooms" role="group" aria-label="选择小屋">
                {PET_ROOMS.map((room) => {
                  const owned = !room.itemId || pet.inventory[room.itemId]
                  return (
                    <button type="button" key={room.id} aria-pressed={pet.room === room.id} onClick={async () => { if (!owned) { setShopItem(getPetItem(room.itemId)); return } const next = await send('PET_ROOM', { room: room.id }); if (next) setMessage(`已经换成${room.name}，东西都还在。`) }}>
                      <img src={appPath(getThemePack(room.id).asset)} alt="" />
                      <span><strong>{room.name}</strong><small>{pet.room === room.id ? '正在住' : owned ? '搬到这里' : `${getPetItem(room.itemId).badgePrice} 枚徽章`}</small></span>
                    </button>
                  )
                })}
              </div>
              <h3 className="k-pet__sub u-display">摆一摆</h3>
              <PetRoomArranger pet={pet} disabled={busy} onSave={(itemId, point) => send('PET_MOVE_OBJECT', { itemId, point })} />
              <h3 className="k-pet__sub u-display">我的东西</h3>
              {PET_ITEMS.some((item) => item.slot && pet.inventory[item.id]) ? (
                <div className="k-pet__games">
                  {PET_ITEMS.filter((item) => item.slot && pet.inventory[item.id]).map((item) => {
                    const placed = pet.placed[item.slot] === item.id
                    return (
                      <div key={item.id} className={`k-pet__game is-item${placed ? ' is-on' : ''}`}>
                        <PetProp kind={item.art} /><strong>{item.name}</strong>
                        <Tap tone={placed ? 'soft' : 'primary'} size="s" disabled={busy} onClick={async () => { const next = await send('PET_PLACE', { slot: item.slot, itemId: placed ? '' : item.id }); if (next) setMessage(placed ? '已经收好，随时可以再摆上。' : `已经摆上${item.name}。`) }}>
                          {placed ? '收起来' : item.slot === 'dress' ? '穿上试试' : '摆出来'}
                        </Tap>
                        {['decor', 'lamp'].includes(item.slot) && placed
                          ? <ChipGroup label="摆在哪里" value={pet.positions[item.slot] || 'right'} onChange={(value) => send('PET_PLACE', { slot: item.slot, itemId: item.id, position: value })} options={[['left', '左'], ['middle', '中'], ['right', '右']]} />
                          : null}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="k-empty"><PetProp kind="rug" /><p>小窝已经很舒服啦。以后可以用徽章换小地毯、星星灯。</p><Tap tone="soft" onClick={() => go('shop')}>逛逛徽章小铺</Tap></div>
              )}
            </Drawer>
          ) : null}

          {view === 'album' ? (
            <Drawer title="我们的相册" onBack={() => go('room')}>
              <div className="k-pet__album-tools">
                <Tap tone="soft" size="s" icon="heart" onClick={() => setSheet('share')}>讲一件生活里的事</Tap>
                <Tap tone="soft" size="s" icon="edit" onClick={() => setSheet('note')}>留一句话</Tap>
              </div>
              <PetCreationCabinet pet={pet} />
              {settings.allowMedia ? (
                <PetMediaRecorder onSave={async (file) => {
                  const draft = await savePetMedia(file, pet)
                  const { id, kind, mediaType, fileName, byteSize, status } = draft
                  const next = await send('PET_ATTACH_MEDIA', { media: { id, kind, mediaType, fileName, byteSize, status } })
                  if (!next) { await discardPetMediaDraft(id); throw new Error('这份资料暂未加入相册，请稍后重试') }
                }} />
              ) : null}
              <ChipGroup className="k-pet__filters" label="回忆分类" value={memoryFilter} onChange={(value) => { setMemoryFilter(value); setMemoryLimit(12) }} options={MEMORY_FILTERS} />
              <div className="k-pet__album">
                {[...pet.memories].reverse().filter((memory) => memoryFilter === 'all' || memory.kind === memoryFilter).slice(0, memoryLimit).map((memory) => {
                  const savedWork = memory.work || pet.life?.creations.find((creation) => creation.id === memory.workId)?.work
                  return (
                    <article key={memory.id} className="k-pet__photo">
                      <div className="k-pet__photo-pic">
                        {memory.media ? <PetMediaPreview media={memory.media} pet={pet} /> : memory.snapshot ? <PetSnapshot snapshot={memory.snapshot} /> : savedWork ? <WorkPreview work={savedWork} pet={pet} replay /> : memory.art === 'egg' ? <EggArt species={pet.species} crack={memory.id === 'hatch' ? 2 : 0} /> : <PetProp kind={memory.art} />}
                      </div>
                      <small>{MEMORY_NAMES[memory.kind]} · {dateLabel(memory.at)}</small>
                      <strong>{memory.title}</strong>
                      {memory.note ? <p>{memory.note}</p> : null}
                      <div className="k-pet__photo-do">
                        {memory.id === 'hatch' ? <button type="button" onClick={() => setSheet('hatch')}>重看破壳</button> : null}
                        <button type="button" aria-pressed={pet.pinnedMemoryId === memory.id} onClick={() => send('PET_PIN', { memoryId: pet.pinnedMemoryId === memory.id ? null : memory.id })}>{pet.pinnedMemoryId === memory.id ? '从墙上取下' : '挂到墙上'}</button>
                      </div>
                    </article>
                  )
                })}
              </div>
              {pet.memories.filter((memory) => memoryFilter === 'all' || memory.kind === memoryFilter).length > memoryLimit ? <Tap tone="soft" onClick={() => setMemoryLimit((count) => count + 12)}>看看更早的</Tap> : null}
              <p className="k-note">“想象故事”是游戏里的经历，不算真的阅读、运动或家务。</p>
            </Drawer>
          ) : null}
        </>
      )}

      <p className="k-pet__promise">放心离开，它不会饿坏，也不会忘记你。</p>

      {shopItem ? <BadgeItemDialog item={shopItem} pet={pet} busy={busy} onClose={() => setShopItem(null)} onBuy={buy} onUse={(item) => { go(item.slot || item.room ? 'dress' : 'play'); setShopItem(null) }} onGoal={async (itemId) => { const next = await send('PET_SELECT_GOAL', { itemId }); if (next) setShopItem(null) }} /> : null}
      {progressResult ? <GrowthCelebration result={progressResult} onClose={() => setProgressResult(null)} /> : null}
      {sheet === 'hatch' ? (
        <Sheet title={`你好呀，${pet.name}`} onClose={() => setSheet('')}>
          <div className="pet-hatch-scene k-pet__hatch" data-reduced={accessibility.reduceMotion}>
            <PetActor species={pet.species} pose="wave" size="baby" />
            <div className="pet-hatch-shell pet-hatch-shell--top"><EggArt species={pet.species} crack={2} /></div>
            <div className="pet-hatch-shell pet-hatch-shell--bottom"><EggArt species={pet.species} crack={2} /></div>
          </div>
          <p className="k-sheet-lead">{getSpecies(pet.species).name}从你选的蛋里，来到了这个小家。</p>
          <Tap tone="primary" size="l" block onClick={() => setSheet('')}>抱抱我的小伙伴</Tap>
        </Sheet>
      ) : null}
      {sheet === 'rename' ? (
        <Sheet title="小伙伴的名字" onClose={() => setSheet('')}>
          <form className="k-pet__form" onSubmit={async (event) => { event.preventDefault(); const next = await send('PET_RENAME', { name: draftName.trim() }); if (next) setSheet('') }}>
            <label className="u-field"><span>还是那个熟悉的小伙伴，换个名字</span><input className="u-input" maxLength={12} required value={draftName} onChange={(event) => setDraftName(event.target.value)} /></label>
            <Tap tone="primary" size="l" block type="submit" disabled={busy || !draftName.trim()}>保存名字</Tap>
          </form>
        </Sheet>
      ) : null}
      {sheet === 'note' ? (
        <Sheet title="留一句话" onClose={() => setSheet('')}>
          <form className="k-pet__form" onSubmit={async (event) => { event.preventDefault(); const next = await send('PET_NOTE', { note: note.trim() }); if (next) { setNote(''); setSheet(''); setMessage('这句话，已经放进相册。') } }}>
            <label className="u-field"><span>今天想记住什么？（可以请家长帮忙写）</span><textarea className="u-input" rows={3} maxLength={400} value={note} onChange={(event) => setNote(event.target.value)} /></label>
            <Tap tone="primary" size="l" block type="submit" disabled={!note.trim() || busy}>收进相册</Tap>
          </form>
        </Sheet>
      ) : null}
      {sheet === 'share' ? <ShareLife pet={pet} now={now} busy={busy} onClose={() => setSheet('')} onShare={async (id) => { const next = await send('PET_SHARE_LIFE', { sourceId: id }); if (next) { setSheet(''); setMessage('小伙伴听到了。这件事仍然只记一次。') } }} /> : null}
    </section>
  )
}

function Drawer({ title, onBack, note, children }) {
  return (
    <div className="k-pet__view k-pet__drawer">
      <header>
        <Tap tone="soft" size="s" icon="back" onClick={onBack}>回小屋</Tap>
        <h2 className="u-display">{title}</h2>
        {note ? <span className="k-pet__chip">{note}</span> : null}
      </header>
      {children}
    </div>
  )
}

function ShareLife({ pet, now, busy, onClose, onShare }) {
  const { state } = useBedtimeState()
  const moments = activityMomentsFor(state, pet.profileId).filter((moment) => moment.at <= now).slice(0, 20)
  return (
    <Sheet title="讲一件生活里的事" onClose={onClose}>
      <p className="k-sheet-lead">挑一件真的发生过的事讲给它听。不会再加星光，也不会多记一次。</p>
      {moments.length ? (
        <div className="k-pet__life">
          {moments.map((moment) => {
            const told = pet.memories.some((saved) => saved.sourceId === moment.id)
            return <button type="button" key={moment.id} className="u-chip" disabled={busy || told} onClick={() => onShare(moment.id)}>{moment.title}{told ? ' · 讲过啦' : ''}</button>
          })}
        </div>
      ) : <p className="k-note">还没有记录也没关系，可以照顾它、陪它玩。</p>}
    </Sheet>
  )
}
