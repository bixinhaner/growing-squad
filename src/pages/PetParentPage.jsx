import { ParentEconomyInbox } from '../ui/pets/PetEconomyPanels.jsx'
import { badgeBalance, levelProgress } from '../modules/pets/petEconomy.js'
import { removePetMedia, exportPetKeepsakes } from '../ui/pets/petMediaStore.js'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { PetActor, PetProp } from '../ui/pets/PetArt.jsx'
import { SaveIndicator } from '../ui/Shared.jsx'
import { PET_SKILLS } from '../modules/pets/petCatalog.js'
import { petBalance, petFor, petGrowth, petSettingsFor } from '../modules/pets/petModel.js'
import '../ui/pets/pet-home.css'
import '../ui/pets/pet-complete.css'

export function PetParentPage() {
  const { state } = useBedtimeState()
  return <PetParent key={state.activeProfileId} />
}
function PetParent() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const profile = state.profiles.find((p) => p.id === state.activeProfileId) || state.profiles[0]
  const pet = petFor(state, profile.id)
  const [settings, setSettings] = useState(() => petSettingsFor(state, profile.id))
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(Date.now)
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer) }, [])
  const requests = Object.values(state.modules?.pets?.requests || {}).filter((r) => r.profileId === profile.id).sort((a,b) => b.requestedAt - a.requestedAt)

  const growth = petGrowth(pet)
  async function send(type, payload, feedback) {
    if (busy) return
    setBusy(true)
    try {
      const result = await dispatch({ type, profileId: profile.id, ...payload })
      setMessage(result?.ok ? feedback : result?.message || '暂时没有保存，请稍后重试。')
    } catch(error) {setMessage(error.message || '暂时没有保存，请稍后重试。')} finally {setBusy(false)}
  }
  return <section className="pet-home pet-parent">
    <header className="pet-heading"><div><span className="pet-eyebrow">家长区 · {profile.name}</span><h1>星光培养与徽章</h1><p>把照顾留给喜欢，把额度交给家长。</p></div><Link className="pet-button pet-button--soft" to="/pet">看看小伙伴的家</Link></header>
    <div className="pet-parent-overview"><div className="pet-parent-pet"><PetActor species={pet?.species || profile.character} pose="wave" size="baby" /><div><h2>{pet ? pet.name : '还没有领养星光蛋'}</h2><p>{pet ? `${growth.label} · 已留下 ${pet.memories.length} 个小片段` : '领养免费，孩子可以自己选择蛋的种类。'}</p></div></div><div><span className="pet-eyebrow">现有可用星光</span><strong className="pet-balance-number">{petBalance(state,profile.id)}</strong><small>与现实愿望共用余额</small><p>徽章：<strong>{badgeBalance(pet)}</strong> 枚 · 伙伴 Lv.{levelProgress(pet).level}</p></div></div>
    <p role="status" className="pet-parent-message">{message}</p><SaveIndicator />
    <div className="pet-parent-columns"><form className="pet-panel" onSubmit={(event) => { event.preventDefault(); send('PET_UPDATE_SETTINGS', { settings }, '伙伴设置已保存。') }}><h2>玩耍和兑换的约定</h2><label className="pet-field">星光培养方式<select value={settings.spending} onChange={(event) => setSettings((v) => ({...v,spending:event.target.value}))}><option value="ask">每次请家长同意（默认）</option><option value="allowance">小额度自己培养，超过再请家长同意</option></select></label><label className="pet-field">每天自主培养额度（星光）<input type="number" min="0" max="200" step="1" value={settings.dailyAllowance} onChange={(e) => setSettings((v) => ({...v,dailyAllowance:Number(e.target.value)}))} /></label><p className="pet-small-note">1 颗现有星光 = 1 点宠物成长。每天额度不是赠送星光，超额需审批；培养会减少现实愿望可用余额。每级发 15 枚徽章；普通裙子 1 枚、房子 2 枚。</p><label className="pet-field">每天最多几个小游戏回合<input type="number" min="1" max="30" step="1" value={settings.roundsPerDay} onChange={(e) => setSettings((v) => ({...v,roundsPerDay:Number(e.target.value)}))} /></label><p className="pet-small-note">普通小游戏最多一分钟，积木／机器人／小剧场最多三分钟，开始就计一轮。提前退出会保留作品，不返还名额。这不是对整个应用的屏幕时间统计。</p><label className="pet-field">每天玩耍与创作时间（分钟，0 表示不限）<input type="number" min="0" max="120" step="1" value={settings.playMinutesPerDay} onChange={e=>setSettings(v=>({...v,playMinutesPerDay:Number(e.target.value)}))}/></label><p className="pet-small-note">只统计小游戏、画画和创作回合；照顾、相册回看和家庭花园不计入。达到约定时会保留草稿并收尾，不扣星光。</p><div className="pet-time-fields"><label className="pet-field">安静时间开始<input type="time" required value={settings.quietStart} onChange={(e) => setSettings((v) => ({...v,quietStart:e.target.value}))} /></label><label className="pet-field">早上恢复玩耍<input type="time" required value={settings.quietEnd} onChange={(e) => setSettings((v) => ({...v,quietEnd:e.target.value}))} /></label></div><p className="pet-small-note">按家庭时区生效。两个时间相同表示不设置安静时段。安静时段不玩小游戏与创作回合，基础照顾、相册和孵化仍可用。</p><label className="pet-checkbox"><input type="checkbox" checked={settings.keepSmall} onChange={(e) => setSettings((v) => ({...v,keepSmall:e.target.checked}))} />保留幼崽大小，不影响成长和本领</label><label className="pet-checkbox"><input type="checkbox" checked={settings.simpleMode} onChange={e=>setSettings(v=>({...v,simpleMode:e.target.checked}))}/>简易玩法：更大的图片、更少的选择</label><label className="pet-checkbox"><input type="checkbox" checked={settings.allowMedia} onChange={e=>setSettings(v=>({...v,allowMedia:e.target.checked}))}/>允许主动添加照片和30秒语音</label><p className="pet-small-note">麦克风只在孩子主动点击并获设备许可后开启；录音先试听、再确认保存。不识别、不评分，不调用外部 AI。联网后同步到家庭服务，撤销此项不删除已经保存的资料。</p><button className="pet-button" type="submit" disabled={busy}>保存伙伴设置</button></form>
    <ParentEconomyInbox pet={pet} requests={requests} stars={petBalance(state,profile.id)} busy={busy} now={now} onAction={send}/></div>
    {pet?<section className="pet-panel"><h2>作品和家庭记录</h2><button type="button" className="pet-button pet-button--soft" disabled={busy} onClick={async()=>{setBusy(true);try{await exportPetKeepsakes(pet);setMessage('伙伴作品与媒体已导出。完整恢复备份请使用数据与安全中的家庭档案。')}catch(e){setMessage(e.message)}finally{setBusy(false)}}}>导出伙伴作品与媒体</button><p className="pet-small-note">只导出当前孩子的伙伴记录。照片和语音需已在本机保存，或能够从家庭服务读取；普通 JSON 备份不包含媒体本体。</p>{(pet.life?.creations||[]).slice(-12).reverse().map(c=><div className="pet-receipt" key={c.id}><span>{c.work.title}</span><button type="button" className="pet-text-button" disabled={busy} onClick={()=>{if(window.confirm('确定从作品柜和相册移除这件作品？'))send('PET_REMOVE_MEMORY',{memoryId:c.id},'这件作品已移除，其他回忆和成长仍保留。')}}>移除这件作品</button></div>)}</section>:null}
    {pet?.memories.some(m=>m.media)?<section className="pet-panel"><h2>家庭照片与语音管理</h2><p>删除后会移除相册记录与相应资料，请先保留需要的家庭备份。</p>{pet.memories.filter(m=>m.media).map(m=><div className="pet-receipt" key={m.id}><span>{m.media.fileName}</span><button type="button" className="pet-text-button" disabled={busy} onClick={async()=>{if(!window.confirm('确定删除这份照片或语音？'))return;try{await removePetMedia(m.media);await send('PET_REMOVE_MEMORY',{memoryId:m.id},'资料已删除。')}catch(e){setMessage(e.message)}}}>删除这份资料</button></div>)}</section>:null}
    <section className="pet-panel"><h2>看见相处，不给孩子打分</h2>{pet?.hatchedAt ? <p>{PET_SKILLS.filter((skill) => pet.skills[skill.id] >= 3).map((skill) => skill.name).join('、') || '还在一起尝试最初的小本领。'}这些是游戏里的技能，不是孩子的能力评分。升级开放新本领后，练习不再额外花星光。</p> : <p>最快两分钟和三个不同问候后可以孵化；离开也会在领养六小时后准备好，由孩子亲自点开，不会错过。</p>}<p>不掉亲密度，不因缺席生病、死亡或逃跑；没有陌生人互动、公开排名、充值、盲盒或外部 AI 上传。道具用徽章兑换，不能换回星光。旧物品、回忆和外形保留，新规则不补发历史等级徽章。</p><p>八种蛋可以免费预览，选定后对应固定伙伴；没有付费重抽，不会因换设备重领升级徽章。</p><div className="pet-parent-links"><Link className="pet-button pet-button--soft" to="/parent/accessibility">声音与减少动态</Link><Link className="pet-button pet-button--soft" to="/parent/data">导出家庭与伙伴备份</Link></div></section>
  </section>
}
