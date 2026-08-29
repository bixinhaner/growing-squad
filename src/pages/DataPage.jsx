import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { downloadCloudArchive, eraseCloudFamilyData, fetchGuardianHealth, runGuardianCheck, unlockCloudParent } from '../data/cloud.js'
import { appPath } from '../data/paths.js'
import { createBackup, exportData, importData, listBackups, restoreBackup, verifyPin } from '../data/storage.js'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { Icon } from '../ui/Icons.jsx'
import { Modal, PageTitle } from '../ui/Shared.jsx'
import { deleteInventorMedia } from '../modules/inventor/inventorMedia.js'

const formatBytes = (value) => {
  const bytes = Number(value || 0)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 ** 2).toFixed(bytes < 10 * 1024 ** 2 ? 1 : 0)} MB`
}

const formatTime = (value, fallback = '还没有记录') => value ? new Date(value).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : fallback

function GuardianStep({ ok, waiting, icon, title, copy }) {
  return <article className={`guardian-step ${ok ? 'is-done' : waiting ? 'is-waiting' : 'is-attention'}`}><span><Icon name={ok ? 'check' : icon} /></span><div><strong>{title}</strong><small>{copy}</small></div></article>
}

export function DataPage() {
  const { state, saveStatus, cloud, pendingCount, legacyRecoveryItems = [] } = useBedtimeState()
  const { dispatch, replaceData, resetApp, resolveLegacyOutbox, discardLegacyOutbox } = useBedtimeActions()
  const [backups, setBackups] = useState(() => listBackups())
  const [health, setHealth] = useState(null)
  const [healthLoading, setHealthLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePin, setDeletePin] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [legacyAssignments, setLegacyAssignments] = useState({})
  const fileRef = useRef(null)
  const navigate = useNavigate()
  const cloudBacked = cloud.mode === 'connected' || cloud.mode === 'offline'
  const mediaPending = Object.values(state.modules?.inventor?.artifacts || {}).filter((item) => item.status !== 'synced').length
  const refresh = () => setBackups(listBackups())
  const migrationReport = state.meta?.timeMigrationReport
  const mediaAssets = Object.values(state.modules?.inventor?.artifacts || {}).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))

  const loadHealth = useCallback(async () => {
    if (cloud.mode !== 'connected') return
    setHealthLoading(true)
    try { setHealth(await fetchGuardianHealth()) }
    catch (error) { setMessage(error instanceof Error ? error.message : '暂时无法读取云端守护状态。') }
    finally { setHealthLoading(false) }
  }, [cloud.mode])
  useEffect(() => { loadHealth() }, [loadHealth])

  const backup = () => { createBackup(state); refresh(); setMessage('已在这台设备创建一份可恢复备份。') }
  const checkNow = async () => {
    createBackup(state)
    refresh()
    if (cloud.mode !== 'connected') { setMessage('本地备份已完成。联网后会继续检查云端和每日备份。'); return }
    setHealthLoading(true)
    setMessage('')
    try {
      const result = await runGuardianCheck()
      setHealth(result)
      setMessage(result.status === 'healthy' ? '安全检查完成：云端数据、每日备份和恢复文件都可以正常读取。' : '检查发现需要处理的项目，请查看下面标为“需要确认”的步骤。')
    } catch (error) { setMessage(error instanceof Error ? error.message : '安全检查暂时没有完成，请稍后重试。') }
    finally { setHealthLoading(false) }
  }
  const restore = async (key) => {
    try { await replaceData(restoreBackup(key)); setMessage('备份已经恢复并同步到家庭云端。') }
    catch (error) { setMessage(error instanceof Error ? error.message : '备份恢复失败。') }
  }
  const importFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try { await replaceData(await importData(file)); setMessage('数据导入完成并同步到家庭云端。') } catch (error) { setMessage(error instanceof Error ? error.message : '导入失败') }
    event.target.value = ''
  }
  const exportArchive = async (profileId = null) => {
    if (cloud.mode !== 'connected') { setMessage('完整档案包含云端媒体，请联网后再导出。'); return }
    try { await downloadCloudArchive(profileId); setMessage(profileId ? '这个孩子的成长档案和媒体已经导出。' : '全家成长档案、媒体和校验清单已经导出。') }
    catch (error) { setMessage(error instanceof Error ? error.message : '档案导出没有完成。') }
  }
  const removeMedia = async (asset) => {
    if (cloud.mode !== 'connected') { setMessage('为了避免云端重新出现这份资料，请联网后再删除。'); return }
    try {
      await deleteInventorMedia(asset)
      dispatch({ type: 'DELETE_INVENTOR_ARTIFACT', profileId: asset.profileId, projectId: asset.projectId, artifactId: asset.id })
      setMessage(`“${asset.fileName || '这份资料'}”已经从本机和云端删除。`)
    } catch (error) { setMessage(error instanceof Error ? error.message : '资料删除没有完成。') }
  }
  const removeAll = async () => {
    setDeleteError('')
    try {
      if (cloud.mode === 'connected') {
        const unlocked = await unlockCloudParent(deletePin)
        await eraseCloudFamilyData(unlocked.token)
      }
      else if (cloudBacked) { setDeleteError('当前没有联网。为了防止误删，请联网后再删除云端数据。'); return }
      else {
        if (!await verifyPin(deletePin, state.security.pinHash)) { setDeleteError('PIN 不正确，数据没有删除。'); return }
      }
    } catch { setDeleteError('PIN 不正确，数据没有删除。'); return }
    await resetApp({ localOnly: cloud.mode === 'connected' })
    navigate('/welcome', { replace: true })
  }

  const localOk = saveStatus === 'saved' || cloud.mode === 'offline'
  const cloudOk = cloud.mode === 'connected' && pendingCount === 0
  const localProtected = localOk && backups.length > 0
  const overallHealthy = cloudBacked ? localOk && cloudOk && health?.status === 'healthy' : localProtected
  const overallTitle = overallHealthy ? '全部成长记录已安全保存' : cloud.mode === 'offline' ? '已保存在 iPad，等待联网' : !cloudBacked && localOk && !backups.length ? '记录已保存在本机，建议创建备份' : healthLoading ? '正在核对每一份成长记录' : '有一项保存状态需要确认'
  const overallCopy = overallHealthy ? '孩子的任务、成长片段和家庭设置都有可恢复的副本。' : cloud.mode === 'offline' ? '孩子可以继续使用；重新联网后会自动补交，不会要求重做。' : !cloudBacked && localOk && !backups.length ? '创建第一份本机备份后，即使浏览器数据意外丢失也能恢复。' : '系统会指出下一步，不需要你判断技术原因。'

  return <section className="guardian-page">
    <PageTitle title="家庭守护中心" subtitle="不用理解技术细节，也能知道记录保存在哪里、备份能不能恢复、哪些内容没有离开家庭。" icon="shield" />
    <div className={`guardian-hero ${overallHealthy ? 'is-healthy' : ''}`}>
      <img src={appPath('assets/guardian/family-archive-hero.webp')} alt="眠眠在家庭记忆档案室里检查成长记录" />
      <div className="guardian-hero__copy"><span>{overallHealthy ? '家庭记忆档案室 · 状态良好' : '家庭记忆档案室 · 正在守护'}</span><h2>{overallTitle}</h2><p>{overallCopy}</p><button className="button button--primary" type="button" disabled={healthLoading} onClick={checkNow}>{healthLoading ? <><span className="spinner" />正在检查</> : <><Icon name="shield" />立即做一次安全检查</>}</button><small>检查只读取状态，不会修改孩子的任务、星光或成长记录。</small></div>
    </div>

    <section className="guardian-path" aria-label="记录守护路径">
      <GuardianStep ok={localOk} icon="device" title="本机已保存" copy={saveStatus === 'error' ? '请点页面顶部的重试保存' : '这个浏览器有离线副本'} />
      <GuardianStep ok={cloudOk} waiting={cloud.mode === 'offline' || pendingCount > 0} icon="upload" title="云端已同步" copy={cloud.mode === 'connected' ? pendingCount ? `还有 ${pendingCount} 个操作正在补交` : '没有等待同步的操作' : cloud.mode === 'offline' ? '联网后自动继续' : '当前只使用本机'} />
      <GuardianStep ok={Boolean(health?.steps?.backup?.ok)} waiting={!cloudBacked || healthLoading} icon="database" title="每日备份已完成" copy={health?.steps?.backup?.createdAt ? `最近：${formatTime(health.steps.backup.createdAt)}` : cloudBacked ? '等待云端确认' : '本地模式使用手动备份'} />
      <GuardianStep ok={Boolean(health?.steps?.integrity?.ok)} waiting={!health || healthLoading} icon="shield" title="备份校验通过" copy={health?.lastVerifiedAt ? `最近检查：${formatTime(health.lastVerifiedAt)}` : '点上方按钮做第一次检查'} />
    </section>

    {message ? <div className="guardian-message" role="status"><Icon name={health?.status === 'attention' ? 'bell' : 'check'} /><span>{message}</span></div> : null}

    <div className="guardian-grid">
      <article className="guardian-panel guardian-panel--sync"><header><span><Icon name="upload" /></span><div><small>同步队列</small><h2>{pendingCount || mediaPending ? '还有内容正在安全送达' : '全部已经送达'}</h2></div><b>{pendingCount + mediaPending}</b></header><p>{pendingCount ? `${pendingCount} 个操作会按原顺序补交。` : '任务和设置没有等待同步。'}{mediaPending ? `另有 ${mediaPending} 份照片或语音只保存在本机，联网后继续。` : ' 可选照片和语音也没有积压。'}</p><div className="guardian-record-counts"><span><strong>{health?.records?.profiles ?? state.profiles.length}</strong><small>孩子档案</small></span><span><strong>{health?.records?.sessions ?? Object.keys(state.sessions || {}).length}</strong><small>睡前记录</small></span><span><strong>{health?.records?.growthMoments ?? (state.rewardMoments || []).length}</strong><small>成长片段</small></span></div></article>

      <article className="guardian-panel guardian-panel--backup"><header><span><Icon name="database" /></span><div><small>最近一次完整备份</small><h2>{health?.steps?.backup?.createdAt ? formatTime(health.steps.backup.createdAt) : backups[0] ? formatTime(backups[0].timestamp) : '还没有备份'}</h2></div>{health?.steps?.backup?.ok ? <b>已校验</b> : null}</header><p>{health?.steps?.backup?.ok ? '备份文件已经实际打开检查，不只是“文件存在”。' : '先创建一份本地备份；连接云端后还会每天自动备份。'}</p><dl><div><dt>云端保留</dt><dd>{health ? `${health.storage.backupCount} / ${health.storage.retentionDays} 天` : '连接后显示'}</dd></div><div><dt>本机手动备份</dt><dd>{backups.length} 份</dd></div><div><dt>最新文件</dt><dd>{formatBytes(health?.storage?.latestBackupBytes)}</dd></div></dl><button type="button" onClick={backup}><Icon name="database" />创建本机备份</button></article>

      <article className="guardian-panel guardian-panel--privacy"><header><span><Icon name="shield" /></span><div><small>数据只属于这个家庭</small><h2>没有公开分享和儿童追踪</h2></div></header><ul><li><Icon name="check" /><span><strong>外部 AI 上传关闭</strong><small>活动数据、照片和语音不会发给外部模型</small></span></li><li><Icon name="check" /><span><strong>没有公开链接</strong><small>成长记录只能由家庭设备和家长会话读取</small></span></li><li><Icon name="check" /><span><strong>媒体不进主数据包</strong><small>{health ? `${health.storage.mediaCount} 份媒体，占用 ${formatBytes(health.storage.mediaBytes)}` : '照片和语音独立保存，避免拖慢启动'}</small></span></li></ul></article>
    </div>

    <details className="guardian-tools"><summary><span><Icon name="database" /><b>备份、导入与 iPad 安装</b><small>需要时再展开，不打扰日常使用</small></span><Icon name="chevron" /></summary><div className="guardian-tools__body"><section><h3>本机备份</h3>{backups.length ? backups.slice(0, 5).map((item) => <div className="backup-row" key={item.key}><div><strong>{formatTime(item.timestamp)}</strong><small>可恢复副本</small></div><button type="button" onClick={() => restore(item.key)}>恢复</button></div>) : <p>还没有手动备份。</p>}</section><section><h3>完整隐私档案</h3><button className="data-row" type="button" onClick={() => exportArchive()}><span><Icon name="download" /></span><div><strong>导出全家完整档案</strong><small>包含 JSON、照片语音和校验清单</small></div><Icon name="chevron" /></button><button className="data-row" type="button" onClick={() => exportArchive(state.activeProfileId)}><span><Icon name="user" /></span><div><strong>只导出当前孩子</strong><small>不包含其他孩子的活动记录</small></div><Icon name="chevron" /></button></section><section><h3>迁移与 iPad</h3><button className="data-row" type="button" onClick={() => exportData(state)}><span><Icon name="download" /></span><div><strong>导出轻量 JSON</strong><small>用于快速迁移设置和记录</small></div><Icon name="chevron" /></button><button className="data-row" type="button" onClick={() => fileRef.current?.click()}><span><Icon name="upload" /></span><div><strong>导入备份</strong><small>选择以前导出的文件</small></div><Icon name="chevron" /></button><input ref={fileRef} type="file" hidden accept="application/json" onChange={importFile} /><ol><li>Safari 打开成长小队。</li><li>点“分享”并添加到主屏幕。</li></ol></section>{mediaAssets.length ? <section className="media-privacy-list"><h3>照片、语音与视频</h3><p>可以单独删除一份资料，不影响整份发明记录。</p>{mediaAssets.map((asset) => <div key={asset.id}><span><strong>{asset.fileName || '项目资料'}</strong><small>{state.profiles.find((profile) => profile.id === asset.profileId)?.name || '孩子'} · {formatBytes(asset.byteSize)}</small></span><button type="button" onClick={() => removeMedia(asset)}>删除</button></div>)}</section> : null}</div></details>

    {migrationReport?.sourceVersion === 5 ? <section className="migration-report"><div><Icon name="check" size={26} /><span><strong>时间记录和家庭数据已升级到 v7</strong><small>原星光账本、愿望和晚间历史完整保留；没有证据的时间保持“未记录”。</small></span></div><dl><div><dt>检查记录</dt><dd>{migrationReport.sessionsReviewed} 晚</dd></div><div><dt>回填实际上床</dt><dd>{migrationReport.inBedBackfilled} 晚</dd></div><div><dt>任务完成未知</dt><dd>{migrationReport.completionLeftUnknown} 晚</dd></div><div><dt>入睡时间未知</dt><dd>{migrationReport.sleepLeftUnknown} 晚</dd></div></dl></section> : null}

    {legacyRecoveryItems.length ? <section className="migration-recovery" aria-labelledby="legacy-recovery-title"><header><span><Icon name="shield" /></span><div><h2 id="legacy-recovery-title">确认旧版未同步记录属于谁</h2><p>这些操作发生在升级前。系统不会猜孩子，确认后才会补交。</p></div></header>{legacyRecoveryItems.map((item, index) => <label key={item.id}><span><strong>{item.action?.type || '旧版操作'}</strong><small>第 {index + 1} 条 · 原始记录已安全保留</small></span><select aria-label={`第 ${index + 1} 条记录属于哪个孩子`} value={legacyAssignments[item.id] || ''} onChange={(event) => setLegacyAssignments((current) => ({ ...current, [item.id]: event.target.value }))}><option value="">请选择孩子</option>{state.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label>)}<div><button className="button button--primary" type="button" disabled={legacyRecoveryItems.some((item) => !legacyAssignments[item.id])} onClick={() => resolveLegacyOutbox(legacyAssignments)}>确认归属并补交</button><button className="button button--secondary" type="button" onClick={discardLegacyOutbox}>放弃这些旧操作</button></div></section> : null}

    <details className="guardian-danger"><summary><span><Icon name="trash" /><b>危险操作</b><small>删除全部数据不会放在日常操作旁边</small></span><Icon name="chevron" /></summary><div className="danger-zone"><div><h2>删除全部数据</h2><p>会删除流程、星星、愿望和历史记录，且无法撤销。</p></div><button className="button button--danger" type="button" onClick={() => setDeleteOpen(true)}><Icon name="trash" />删除全部数据</button></div></details>
    {deleteOpen ? <Modal title="删除全部数据" onClose={() => setDeleteOpen(false)} className="delete-modal"><div className="danger-icon"><Icon name="trash" size={32} /></div><h2>确定删除全部数据吗？</h2><p>请输入家长 PIN。删除后将返回首次设置，所有记录都无法恢复。</p><label>家长 PIN<input inputMode="numeric" value={deletePin} maxLength={4} onChange={(event) => setDeletePin(event.target.value.replace(/\D/g, ''))} /></label>{deleteError ? <div className="form-error" role="alert">{deleteError}</div> : null}<button className="button button--danger button--wide" type="button" onClick={removeAll}>确认永久删除</button><button className="button button--secondary button--wide" type="button" onClick={() => setDeleteOpen(false)}>保留我的数据</button></Modal> : null}
  </section>
}
