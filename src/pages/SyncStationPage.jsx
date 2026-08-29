import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSchedule } from '../domain/model.js'
import { appPath } from '../data/paths.js'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { Icon } from '../ui/Icons.jsx'

const TYPE_LABELS = {
  'bedtime.schedule.updated': '作息时间',
  'bedtime.routine.updated': '睡前流程',
  'core.profile.updated': '孩子资料',
  'rewards.catalog.updated': '奖励清单',
  'core.routines.updated': '今日安排',
}

function describeConflict(conflict, state) {
  const operation = conflict.item?.operation
  const type = operation?.type || 'unknown'
  const profileId = operation?.target?.profileId
  const intended = operation?.payload?.payload || operation?.payload || {}
  if (type === 'bedtime.schedule.updated') {
    const dayType = intended.dayType || 'weekday'
    const saved = state.modules?.bedtime?.schedules?.find((item) => item.profileId === profileId && item.dayType === dayType)
    const latest = saved?.pending || getSchedule(state, dayType, null, profileId)
    return {
      title: TYPE_LABELS[type],
      localValue: intended.bedTime || intended.prepareTime || '这台设备的设置',
      latestValue: latest?.bedTime || latest?.prepareTime || '家庭最新设置',
    }
  }
  return { title: TYPE_LABELS[type] || '家庭设置', localValue: '这台设备的修改', latestValue: '家庭云端最新版本' }
}

export function SyncStationPage() {
  const { state, syncConflicts } = useBedtimeState()
  const { resolveSyncConflict } = useBedtimeActions()
  const navigate = useNavigate()
  const conflict = syncConflicts[0]
  const description = useMemo(() => conflict ? describeConflict(conflict, state) : null, [conflict, state])

  return <section className="sync-station">
    <header className="sync-station__title"><span><Icon name="moon" /></span><div><small>家庭设备之间</small><h1>家庭同步站</h1></div></header>
    <div className="sync-station__layout">
      <aside className="sync-station__story"><img src={appPath('assets/sync/family-sync-station-hero.png')} alt="两位月光邮差正在安全合并两份成长记录" /><span>月光邮局会保留每一份成长</span></aside>
      <article className="sync-station__panel">
        {conflict ? <>
          <div className="sync-station__notice"><span><Icon name="user" /></span><div><h2>{syncConflicts.length} 项需要家长确认</h2><p>孩子的记录都在，只需决定保留哪一个设置。</p></div></div>
          <section className="sync-conflict-card">
            <header><span><Icon name="clock" /></span><h2>{description.title}</h2></header>
            <div className="sync-conflict-compare">
              <div><small>这台 iPad</small><strong>{description.localValue}</strong></div>
              <span><Icon name="chevron" /><small>对比</small></span>
              <div className="is-latest"><small>家庭最新版本</small><strong>{description.latestValue}</strong><em>更新</em></div>
            </div>
            <div className="sync-conflict-actions"><small><Icon name="star" />推荐</small><button type="button" className="sync-conflict-primary" onClick={() => resolveSyncConflict(conflict.id, 'keep-latest')}>保留最新的 {description.latestValue}</button><button type="button" onClick={() => resolveSyncConflict(conflict.id, 'retry-local')}>改用这台 iPad 的 {description.localValue}</button><button type="button" onClick={() => navigate('/parent/overview')}>稍后再决定</button></div>
          </section>
          <details className="sync-technical"><summary><Icon name="database" /><span>查看技术记录</span><Icon name="chevron" /></summary><dl><div><dt>操作编号</dt><dd>{conflict.id}</dd></div><div><dt>本机版本</dt><dd>{conflict.rejection?.details?.expectedVersion ?? '未记录'}</dd></div><div><dt>家庭版本</dt><dd>{conflict.rejection?.details?.currentEntityVersion ?? '未记录'}</dd></div></dl></details>
        </> : <div className="sync-station__empty"><span><Icon name="check" /></span><h2>所有记录都已安全送达</h2><p>任务、成就、阅读记录和家庭设置没有需要处理的冲突。</p></div>}
      </article>
    </div>
    <footer className="sync-station__delivered"><span><Icon name="check" /></span><div><h2>其他成长记录都已安全送达</h2><p>日常任务、成就、阅读记录等内容已经同步完成，无需额外操作。</p></div></footer>
  </section>
}
