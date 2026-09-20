import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { PetActor, PetProp } from '../ui/pets/PetArt.jsx'
import { SaveIndicator } from '../ui/Shared.jsx'
import { getPetItem, PET_SKILLS } from '../modules/pets/petCatalog.js'
import { petBalance, petFor, petGrowth, petSettingsFor } from '../modules/pets/petModel.js'
import '../ui/pets/pet-home.css'

export function PetParentPage() {
  const { state } = useBedtimeState()
  return <PetParent key={state.activeProfileId} />
}
function PetParent() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const profile = state.profiles.find((p) => p.id === state.activeProfileId)
  const pet = petFor(state, profile.id)
  const [settings, setSettings] = useState(() => petSettingsFor(state, profile.id))
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(Date.now)
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer) }, [])
  const requests = Object.values(state.modules?.pets?.requests || {}).filter((r) => r.profileId === profile.id).sort((a,b) => b.requestedAt - a.requestedAt)
  const pending = requests.filter((r) => r.status === 'pending')
  const growth = petGrowth(pet)
  async function send(type, payload, feedback) {
    if (busy) return
    setBusy(true)
    const result = await dispatch({ type, profileId: profile.id, ...payload })
    setBusy(false)
    setMessage(result?.ok ? feedback : result?.message || '暂时没有保存，请稍后重试。')
  }
  return <section className="pet-home pet-parent">
    <header className="pet-heading"><div><span className="pet-eyebrow">家长区 · {profile.name}</span><h1>小伙伴与星光</h1><p>把照顾留给喜欢，把额度交给家长。</p></div><Link className="pet-button pet-button--soft" to="/pet">看看小伙伴的家</Link></header>
    <div className="pet-parent-overview"><div className="pet-parent-pet"><PetActor species={pet?.species || profile.character} pose="wave" size="baby" /><div><h2>{pet ? pet.name : '还没有领养星光蛋'}</h2><p>{pet ? `${growth.label} · 已留下 ${pet.memories.length} 个小片段` : '领养免费，孩子可以自己选择蛋的种类。'}</p></div></div><div><span className="pet-eyebrow">现有可用星光</span><strong className="pet-balance-number">{petBalance(state,profile.id)}</strong><small>与现实愿望共用余额，不另造货币</small></div></div>
    <p role="status" className="pet-parent-message">{message}</p><SaveIndicator />
    <div className="pet-parent-columns"><form className="pet-panel" onSubmit={(event) => { event.preventDefault(); send('PET_UPDATE_SETTINGS', { settings }, '伙伴设置已保存。') }}><h2>玩耍和兑换的约定</h2><label className="pet-field">星光兑换方式<select value={settings.spending} onChange={(event) => setSettings((v) => ({...v,spending:event.target.value}))}><option value="ask">每次请家长同意（默认）</option><option value="allowance">小额度自己选，超过再请家长同意</option></select></label><label className="pet-field">每天自主兑换额度（星光）<input type="number" min="0" max="200" step="1" value={settings.dailyAllowance} onChange={(e) => setSettings((v) => ({...v,dailyAllowance:Number(e.target.value)}))} /></label><p className="pet-small-note">只允许花已经拥有的星光，不会每天凭空发放。超额申请不会自动扣星；家长批准仍需足够余额。</p><label className="pet-field">每天最多几个小游戏回合<input type="number" min="1" max="30" step="1" value={settings.roundsPerDay} onChange={(e) => setSettings((v) => ({...v,roundsPerDay:Number(e.target.value)}))} /></label><p className="pet-small-note">每轮最多一分钟，开始就计一轮，提前退出不返还名额。这不是对整个应用的屏幕时间统计。</p><div className="pet-time-fields"><label className="pet-field">安静时间开始<input type="time" required value={settings.quietStart} onChange={(e) => setSettings((v) => ({...v,quietStart:e.target.value}))} /></label><label className="pet-field">早上恢复玩耍<input type="time" required value={settings.quietEnd} onChange={(e) => setSettings((v) => ({...v,quietEnd:e.target.value}))} /></label></div><p className="pet-small-note">按家庭时区生效。两个时间相同表示不设置安静时段。安静时段不玩小游戏，基础照顾、相册和孵化仍可用。</p><label className="pet-checkbox"><input type="checkbox" checked={settings.keepSmall} onChange={(e) => setSettings((v) => ({...v,keepSmall:e.target.checked}))} />保留幼崽大小，不影响成长和本领</label><button className="pet-button" type="submit" disabled={busy}>保存伙伴设置</button></form>
    <section className="pet-panel"><h2>{pending.length ? `${pending.length} 个小心愿等你回应` : '暂时没有待回应的申请'}</h2><p>批准时扣星光，取消或暂不同意都不扣。物件永久保留，不影响宠物的基础生活。</p>{pending.map((r) => <article className="pet-approval" key={r.id}><PetProp kind={getPetItem(r.itemId)?.art} /><div><h3>{getPetItem(r.itemId)?.name || '小物件'}</h3><p>{r.cost} 星光 · 当前余额 {petBalance(state,profile.id)}</p></div><div className="pet-approval-actions"><button type="button" className="pet-button" disabled={busy || petBalance(state,profile.id) < r.cost} onClick={() => send('PET_APPROVE_ITEM',{requestId:r.id},'已批准，小伙伴收到新物件了。')}>同意兑换</button><button type="button" className="pet-button pet-button--soft" disabled={busy} onClick={() => send('PET_DECLINE_ITEM',{requestId:r.id},'已记下这次回应，没有扣星光。')}>先不兑换</button></div></article>)}<h3>最近的兑换记录</h3>{requests.slice(0,12).map((r) => <div className="pet-receipt" key={r.id}><span><strong>{getPetItem(r.itemId)?.name}</strong><small>{({pending:'等待回应',approved:`已兑换 · −${r.cost} 星光`,declined:'这次先不兑换',cancelled:'孩子已取消',refunded:`已撤销 · 返还 ${r.cost} 星光`})[r.status]}</small></span>{r.status === 'approved' && now >= r.approvedAt && now - r.approvedAt <= 30000 ? <button type="button" className="pet-text-button" disabled={busy} onClick={() => send('PET_REFUND_ITEM',{requestId:r.id},'已撤销兑换并返还星光，物件收回小铺。')}>撤销兑换</button> : null}</div>)}{!requests.length ? <div className="pet-empty"><PetProp kind="star" /><p>还没有兑换记录。星光可以慢慢攒。</p></div> : null}<p className="pet-small-note">批准或自主兑换后 30 秒内可在这里撤销。在线以服务器确认时间为准。</p><Link to="/parent/rewards" className="pet-text-button">查看原有愿望与星光奖励 →</Link></section></div>
    <section className="pet-panel"><h2>看见相处，不给孩子打分</h2>{pet?.hatchedAt ? <p>{PET_SKILLS.filter((skill) => pet.skills[skill.id] >= 3).map((skill) => skill.name).join('、') || '还在一起尝试最初的小本领。'}这些是游戏里的技能，不是孩子的能力评分。</p> : <p>最快两分钟和三个不同问候后可以孵化；离开也会在领养六小时后准备好，由孩子亲自点开，不会错过。</p>}<p>不掉亲密度，不因缺席生病、死亡或逃跑；没有陌生人互动、公开排名、充值、盲盒或外部 AI 上传。购买道具不能直接跳过成长。</p><p>蛋种类与伙伴固定对应：森林蛋→眠眠熊，月光蛋→月兔，云朵蛋→云朵，太空蛋→太空猫。</p><div className="pet-parent-links"><Link className="pet-button pet-button--soft" to="/parent/accessibility">声音与减少动态</Link><Link className="pet-button pet-button--soft" to="/parent/data">导出家庭与伙伴备份</Link></div></section>
  </section>
}
