import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getActiveProfile, getStarBalance } from '../../domain/model.js'
import { activityMomentsFor, unresolvedHelpFor } from '../../core/activity/activitySelectors.js'
import { getPetItem } from '../../modules/pets/petCatalog.js'
import { petBalance, petFor } from '../../modules/pets/petModel.js'
import { useBedtimeActions, useBedtimeState } from '../../store/useBedtime.js'
import { AssetArt, CompanionArt } from '../../ui/AssetArt.jsx'
import { PetProp } from '../../ui/pets/PetArt.jsx'
import { Icon } from '../ui/Icon.jsx'
import { Sheet, Tap } from '../ui/kit.jsx'
import { useToast } from '../ui/toast.js'
import { useNow } from '../lib/hooks.js'
import { inboxFor, tonightFor } from './parentModel.js'
import { Empty, PageHead, Panel } from './pkit.jsx'
import { clock, dateLabel } from './format.js'
import { RewardSheet } from './RewardSheet.jsx'
import { SleepEntry } from './SleepEntry.jsx'

const SOURCE = { reading: '读故事', movement: '动一动', responsibility: '帮家里', core: '日常小事' }

export function ParentNow() {
  const now = useNow(30000)
  const { state, syncConflicts } = useBedtimeState()
  const navigate = useNavigate()
  const profile = getActiveProfile(state)
  const [sheet, setSheet] = useState('')
  const inbox = inboxFor(state, profile.id, syncConflicts)
  const tonight = tonightFor(state, now)
  const moments = activityMomentsFor(state, profile.id).filter((moment) => moment.at <= now).slice(0, 6)
  const siblings = state.profiles.filter((child) => child.id !== profile.id)

  return (
    <div className="p-page p-now">
      <PageHead eyebrow={new Date(now).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })} title={inbox.length ? `有 ${inbox.length} 件事等你` : '现在没什么要处理的'} lead={inbox.length ? '都可以在这里直接处理，处理完就会消失。' : '可以只是陪孩子待一会儿。'} />

      <div className="p-now__grid">
        <section className="p-inbox" aria-label="待回应">
          {inbox.length ? inbox.map((item) => <InboxCard key={item.id} item={item} childName={profile.name} />) : (
            <Panel><Empty icon="check" title="全部处理好了">孩子新的求助、愿望和培养申请会第一时间出现在这里。</Empty></Panel>
          )}
        </section>

        <aside className="p-now__side">
          <TonightCard tonight={tonight} profile={profile} onAdjust={() => setSheet('tonight')} />

          <Panel title="顺手记一下">
            <div className="p-quick">
              <button type="button" onClick={() => setSheet('reward')}><Icon name="gift" size={22} /><span>记一份奖励</span></button>
              <button type="button" onClick={() => navigate('/parent/growth/support')}><Icon name="eye" size={22} /><span>记一条观察</span></button>
              <button type="button" onClick={() => navigate('/parent/growth/reading?add=1')}><Icon name="book" size={22} /><span>添一本书</span></button>
              <button type="button" onClick={() => navigate('/parent/growth/sleep')}><Icon name="moon" size={22} /><span>看看睡眠</span></button>
            </div>
          </Panel>

          {siblings.length ? <FamilyStrip /> : null}
        </aside>
      </div>

      <Panel title="最近的真实片段" aside={<button type="button" className="p-link" onClick={() => navigate('/parent/growth')}>全部记录<Icon name="chevron" size={16} /></button>}>
        {moments.length ? (
          <ol className="p-moments">
            {moments.map((moment) => <li key={moment.id}><time>{dateLabel(moment.at)}</time><AssetArt id={moment.assetId} decorative /><span>{moment.title}</span></li>)}
          </ol>
        ) : <Empty icon="leaf" title="还没有片段">没有记录的时候，我们不做推断。</Empty>}
      </Panel>

      {sheet === 'reward' ? <RewardSheet childName={profile.name} onClose={() => setSheet('')} /> : null}
      {sheet === 'tonight' ? <TonightSheet tonight={tonight} onClose={() => setSheet('')} onSchedule={() => navigate('/parent/plan')} /> : null}
    </div>
  )
}

function InboxCard({ item, childName }) {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const at = item.at ? `${dateLabel(item.at)} ${clock(item.at)}` : ''

  if (item.kind === 'help') {
    const { help } = item
    return (
      <article className="p-card is-warm">
        <span className="p-card__icon"><Icon name="hand" size={24} /></span>
        <div className="p-card__body">
          <small>{SOURCE[help.sourceModule] || '求助'} · {at}</small>
          <h3>{childName}{help.title.replace(/^.*?(需要|想)/, '$1')}</h3>
          <p>不需要找出问题，先一起待一会儿。</p>
        </div>
        <div className="p-card__do">
          <Tap tone="primary" size="s" icon="check" onClick={() => { dispatch({ type: 'RESOLVE_SUPPORT_REQUEST', profileId: help.profileId || state.activeProfileId, sourceModule: help.sourceModule, sessionId: help.sessionId, decisionId: help.decisionId }); toast('好的，已经标记为陪过了。') }}>已经陪过</Tap>
          <Tap tone="quiet" size="s" onClick={() => navigate('/parent/growth/support')}>陪伴方式</Tap>
        </div>
      </article>
    )
  }

  if (item.kind === 'wish') {
    const { request, wish } = item
    const balance = getStarBalance(state)
    const left = balance - (wish?.cost || 0)
    return (
      <article className="p-card is-honey">
        <span className="p-card__art"><AssetArt id={wish?.assetId || 'gift'} decorative /></span>
        <div className="p-card__body">
          <small>愿望 · {at}</small>
          <h3>{wish?.name || '一个愿望'}</h3>
          <p className="u-num">现有 {balance} 点 − {wish?.cost} 点 = 剩 {Math.max(0, left)} 点</p>
        </div>
        <div className="p-card__do">
          <Tap tone="primary" size="s" icon="check" disabled={left < 0} onClick={() => {
            dispatch({ type: 'APPROVE_REWARD', requestId: request.id, timestamp: Date.now() })
            toast(`已同意「${wish?.name}」`, { duration: 30000, action: { label: '撤销', onClick: () => dispatch({ type: 'UNDO_REWARD', requestId: request.id }) } })
          }}>同意兑换</Tap>
          {left < 0 ? <small className="p-card__why">星光还不够</small> : null}
        </div>
      </article>
    )
  }

  if (item.kind === 'pet') {
    const { request } = item
    const pet = petFor(state, request.profileId)
    const stars = petBalance(state, request.profileId)
    const title = request.kind === 'growth' ? `培养${pet?.name || '小伙伴'} ${request.amount} 颗星光` : getPetItem(request.itemId)?.name || '一件物品'
    const act = async (type, done) => {
      setBusy(true)
      try { const result = await dispatch({ type, profileId: request.profileId, requestId: request.id }); toast(result?.ok === false ? result.message : done) } finally { setBusy(false) }
    }
    return (
      <article className="p-card is-lilac">
        <span className="p-card__art"><PetProp kind={request.kind === 'growth' ? 'star' : getPetItem(request.itemId)?.art} /></span>
        <div className="p-card__body">
          <small>小伙伴 · {at}</small>
          <h3>{title}</h3>
          <p>{request.cost} {request.currency === 'badge' ? '枚徽章' : '颗星光'} · 现有 {stars} 颗星光，会和现实愿望共用</p>
        </div>
        <div className="p-card__do">
          <Tap tone="primary" size="s" disabled={busy || stars < request.cost} onClick={() => act('PET_APPROVE_ITEM', '已同意，这次培养记下了。')}>同意</Tap>
          <Tap tone="soft" size="s" disabled={busy} onClick={() => act('PET_DECLINE_ITEM', '这次先不培养，没有扣星光。')}>先不</Tap>
        </div>
      </article>
    )
  }

  if (item.kind === 'role') {
    return (
      <article className="p-card is-mint">
        <span className="p-card__icon"><Icon name="swap" size={24} /></span>
        <div className="p-card__body">
          <small>帮家里 · {at}</small>
          <h3>{childName}想换个角色</h3>
          <p>{item.activity.title} · 现在是「{item.role.title}」。一起商量，不直接替孩子决定。</p>
        </div>
        <div className="p-card__do">
          <Tap tone="primary" size="s" icon="check" onClick={() => { dispatch({ type: 'RESOLVE_RESPONSIBILITY_REQUEST', profileId: item.request.profileId, kind: 'change', requestId: item.request.id }); toast('已经标记为商量过。') }}>商量好了</Tap>
          <Tap tone="quiet" size="s" onClick={() => navigate('/parent/growth/chores')}>调整角色</Tap>
        </div>
      </article>
    )
  }

  if (item.kind === 'sleep') {
    return (
      <article className="p-card is-night">
        <span className="p-card__icon"><Icon name="moon" size={24} /></span>
        <div className="p-card__body">
          <small>睡眠 · 只用来观察节奏，不影响星光</small>
          <SleepEntry session={item.session} />
        </div>
      </article>
    )
  }

  return (
    <article className="p-card">
      <span className="p-card__icon"><Icon name="sync" size={24} /></span>
      <div className="p-card__body"><small>同步</small><h3>{item.count} 项设置需要你选一个版本</h3><p>孩子的记录都在，只是两台设备改了同一个设置。</p></div>
      <div className="p-card__do"><Tap tone="primary" size="s" onClick={() => navigate('/parent/family/sync')}>去确认</Tap></div>
    </article>
  )
}

function TonightCard({ tonight, profile, onAdjust }) {
  return (
    <article className={`p-tonight is-${tonight.status}`}>
      <header>
        <CompanionArt id={profile.character} decorative />
        <span><small>{profile.name}的今晚</small><strong className="u-num">{tonight.schedule.prepareTime} → {tonight.schedule.bedTime}</strong></span>
      </header>
      <p className="p-tonight__status">{tonight.label}{tonight.session?.routineCompletedAt ? ` · ${clock(tonight.session.routineCompletedAt)} 完成` : ''}</p>
      <ol className="p-tonight__steps" aria-label="今晚的小路">
        {tonight.steps.map((step) => {
          const status = tonight.statuses[step.id] || 'todo'
          return <li key={step.id} className={`is-${status}`} title={`${step.title}：${status === 'done' ? '做好了' : status === 'skipped' ? '今晚跳过' : '还没做'}`}><AssetArt id={step.icon} decorative /></li>
        })}
      </ol>
      <Tap tone="ghost" size="s" icon="edit" onClick={onAdjust}>今晚临时调整</Tap>
    </article>
  )
}

function TonightSheet({ tonight, onClose, onSchedule }) {
  const { dispatch } = useBedtimeActions()
  return (
    <Sheet title="今晚临时调整" onClose={onClose}>
      <p className="p-lead">跳过只影响今晚，明天会恢复。</p>
      <div className="p-skip-list">
        {tonight.steps.map((step) => {
          const status = tonight.statuses[step.id] || 'todo'
          return (
            <button type="button" key={step.id} aria-pressed={status === 'skipped'} disabled={status === 'done'} onClick={() => dispatch({ type: status === 'skipped' ? 'RESET_TASK' : 'SKIP_TASK', stepId: step.id })}>
              <AssetArt id={step.icon} decorative />
              <span><strong>{step.title}</strong><small>{status === 'done' ? '已经做好了' : status === 'skipped' ? '今晚跳过 · 点一下恢复' : '点一下，今晚先跳过'}</small></span>
            </button>
          )
        })}
      </div>
      <Tap tone="soft" block icon="clock" onClick={onSchedule}>改今晚的时间</Tap>
    </Sheet>
  )
}

function FamilyStrip() {
  const { state, syncConflicts } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  return (
    <Panel title="一家人">
      <div className="p-family">
        {state.profiles.map((child) => {
          const waiting = inboxFor(state, child.id, syncConflicts).length
          const help = unresolvedHelpFor(state, child.id).length
          return (
            <button type="button" key={child.id} aria-pressed={child.id === state.activeProfileId} onClick={() => dispatch({ type: 'SWITCH_PROFILE', profileId: child.id })}>
              <CompanionArt id={child.character} decorative />
              <span><strong>{child.name}</strong><small>{help ? `${help} 个求助` : waiting ? `${waiting} 件待回应` : '都好'}</small></span>
            </button>
          )
        })}
      </div>
    </Panel>
  )
}
