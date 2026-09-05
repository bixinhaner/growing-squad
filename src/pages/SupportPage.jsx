import { useMemo, useState } from 'react'
import { getScaffoldStates, getScaffoldSuggestion, SCAFFOLD_LEVELS } from '../core/scaffold/scaffoldEngine.js'
import { unresolvedHelpFor, sessionsForProfile } from '../core/activity/activitySelectors.js'
import { getActiveProfile } from '../domain/model.js'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { AssetArt } from '../ui/AssetArt.jsx'
import { Icon } from '../ui/Icons.jsx'
import './comfort.css'
export function SupportPage() {
  const {state}=useBedtimeState()
  return <SupportContent key={state.activeProfileId} />
}
function SupportContent() {
  const {state}=useBedtimeState(),{dispatch}=useBedtimeActions(),profile=getActiveProfile(state)
  const states=useMemo(() => getScaffoldStates(state,profile.id),[profile.id,state])
  const suggestion=getScaffoldSuggestion(states),requests=unresolvedHelpFor(state,profile.id)
  const [dismissed,setDismissed]=useState('')
  const setLevel=(capability,level) => dispatch({type:'UPDATE_SCAFFOLD',profileId:profile.id,capabilityId:capability.id,capabilityKey:capability.key,level})
  const groups=[...new Set(states.map((c) => c.group))]
  const movement=sessionsForProfile(state.modules.movement?.sessions,profile.id).filter((s) => s.completedAt).sort((a,b) => b.completedAt-a.completedAt).slice(0,5)
  const observe=(capability,record,mode) => dispatch({type:'RECORD_SUPPORT_EVIDENCE',profileId:profile.id,sourceModule:capability.key.split('.')[0],sessionId:record.sessionId,capabilityKey:capability.key,mode})
  return <section className="calm-parent support-page"><header className="calm-section-head"><div><span className="calm-eyebrow">{profile.name} · 孩子与支持</span><h1>支持会跟着孩子的需要改变</h1><p>不是升级，也不是考核。不知道的事情，先保留“不确定”。</p></div></header>
    <section className="calm-parent-card"><h2>{requests.length ? `${requests.length} 个需要回应的请求` : '暂时没有求助'}</h2>{requests.map((r) => <article className="calm-help-request" key={r.id}><span><strong>{r.title}</strong><small>{new Date(r.at).toLocaleString('zh-CN')}</small></span><button className="calm-action calm-action--secondary" type="button" onClick={() => dispatch({type:'RESOLVE_SUPPORT_REQUEST',profileId:profile.id,sourceModule:r.sourceModule,sessionId:r.sessionId,decisionId:r.decisionId})}>已经陪过孩子</button></article>)}</section>
    {suggestion && dismissed!==`${suggestion.capabilityId}:${suggestion.nextLevel}` ? <aside className="calm-evidence-note"><Icon name="heart" /><div><h2>{suggestion.title}</h2><p>{suggestion.body}</p><div className="calm-parent-links"><button className="calm-action" type="button" onClick={() => {const c=states.find((s) => s.id===suggestion.capabilityId);if(c)setLevel(c,suggestion.nextLevel)}}>试一周</button><button className="calm-action calm-action--secondary" type="button" onClick={() => setDismissed(`${suggestion.capabilityId}:${suggestion.nextLevel}`)}>先不调整</button></div><small>只有家长确认后，陪伴层级才会改变。</small></div></aside> : null}
    {groups.map((group) => <section className="calm-support-group" key={group}><h2>{group}</h2>{states.filter((c) => c.group===group).map((c) => <article className="calm-parent-card" key={c.id}><header className="calm-capability"><AssetArt id={c.assetId} decorative /><div><h3>{c.title}</h3><p>{c.evidence.count ? `${c.evidence.count} 条活动记录，${c.evidence.confirmedCount} 次有明确观察，${c.evidence.unknownCount} 次尚不确定。` : '还没有对应活动记录，先按孩子的需要陪伴。'}</p></div></header><div className="calm-filter" role="group" aria-label={`${c.title}的支持方式`}>{SCAFFOLD_LEVELS.map((level) => <button type="button" key={level.id} aria-pressed={Number(c.level)===level.id} className={Number(c.level)===level.id ? 'is-active' : ''} onClick={() => setLevel(c,level.id)}>{level.label}</button>)}</div>
      {c.evidence.records.length ? <details className="calm-observations"><summary>记录这几次实际怎样完成</summary><p>只记录自己看见的情况，不需要补齐每一条。“自己开始阅读”关注是否自主发起，不是有没有家长陪读。</p>{c.evidence.records.filter((r) => r.sessionId).map((r) => {const sourceModule=c.key.split('.')[0];const s=state.modules[sourceModule]?.sessions?.[r.sessionId];const mode=s?.supportEvidence?.[`${profile.id}:${c.key}`]?.mode || s?.supportEvidence?.[c.key]?.mode || 'unknown';return <label className="calm-field" key={r.sessionId}>{new Date(r.at).toLocaleString('zh-CN')}<select aria-label={`${c.title} ${r.sessionId} 的实际陪伴`} value={mode} onChange={(e) => observe(c,r,e.target.value)}><option value="unknown">不确定 / 没有观察</option><option value="independent">家长观察：自己完成</option><option value="together">家长观察：一起完成</option><option value="helped">家长观察：有具体帮助</option></select></label>})}</details> : null}
    </article>)}</section>)}
    {movement.length ? <section className="calm-parent-card"><h2>运动是谁提议的？</h2><p>在儿童页点击“开始”不是主动性的证据。这个记录完全可选。</p>{movement.map((s) => <label className="calm-field" key={s.id}>{new Date(s.completedAt).toLocaleString('zh-CN')}<select aria-label={`运动 ${s.id} 谁提议的`} value={s.initiationEvidence?.value || 'unknown'} onChange={(e) => dispatch({type:'RECORD_SUPPORT_EVIDENCE',profileId:profile.id,sourceModule:'movement',sessionId:s.id,capabilityKey:'movement.start',mode:'unknown',initiation:e.target.value})}><option value="unknown">尚不确定</option><option value="child">孩子自己提议</option><option value="prompted">家长提醒后开始</option></select></label>)}</section> : null}
    <p className="calm-evidence-note"><Icon name="heart" />开学、生病或生活变化时，随时增加陪伴，不代表退步。</p>
  </section>
}
