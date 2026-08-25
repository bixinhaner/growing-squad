import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createBackup, exportData, hashPin, importData, listBackups, restoreBackup } from '../data/storage.js'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { Icon } from '../ui/Icons.jsx'
import { Modal, PageTitle } from '../ui/Shared.jsx'

export function DataPage() {
  const { state, saveStatus, cloud } = useBedtimeState()
  const { replaceData, resetApp } = useBedtimeActions()
  const [backups, setBackups] = useState(() => listBackups())
  const [message, setMessage] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePin, setDeletePin] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const fileRef = useRef(null)
  const navigate = useNavigate()
  const cloudBacked = cloud.mode === 'connected' || cloud.mode === 'offline'
  const refresh = () => setBackups(listBackups())
  const migrationReport = state.meta?.timeMigrationReport
  const backup = () => { createBackup(state); refresh(); setMessage('已创建一份本地备份。') }
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
  const removeAll = async () => {
    const hash = await hashPin(deletePin)
    if (hash !== state.security.pinHash) { setDeleteError('PIN 不正确，数据没有删除。'); return }
    await resetApp()
    navigate('/welcome', { replace: true })
  }

  return (
    <section>
      <PageTitle title="数据与隐私" subtitle={cloudBacked ? (cloud.mode === 'connected' ? '家庭云端自动同步；这台设备仍保留一份离线副本。' : '云端暂时离线；操作已留在这台设备，联网后自动同步。') : '当前使用本地模式，数据只保存在这台设备。'} icon="shield" />
      <div className="data-layout">
        <article className="data-card">
          <div className="storage-health"><span><Icon name="shield" size={28} /></span><div><strong>{saveStatus === 'saved' ? (cloudBacked ? '家庭云端同步正常' : '本地保存正常') : cloud.mode === 'offline' ? '已保存在 iPad，等待联网' : '正在确认保存状态'}</strong><small>{cloudBacked ? '断网时继续使用，联网后自动补交操作。' : '数据仅保存在这个浏览器中。'}</small></div></div>
          <button className="data-row" type="button" onClick={backup}><span><Icon name="database" /></span><div><strong>创建备份</strong><small>立即保存一份可恢复副本</small></div><Icon name="chevron" /></button>
          <button className="data-row" type="button" onClick={() => exportData(state)}><span><Icon name="download" /></span><div><strong>导出数据</strong><small>下载为 JSON 备份文件</small></div><Icon name="chevron" /></button>
          <button className="data-row" type="button" onClick={() => fileRef.current?.click()}><span><Icon name="upload" /></span><div><strong>导入备份</strong><small>从这台设备选择备份文件</small></div><Icon name="chevron" /></button>
          <input ref={fileRef} type="file" hidden accept="application/json" onChange={importFile} />
          {message ? <div className="form-success" role="status">{message}</div> : null}
        </article>
        <aside className="backup-card"><div className="card-heading"><h2>最近备份</h2><span>{backups.length} 份</span></div>{backups.length ? backups.map((item) => <div className="backup-row" key={item.key}><div><strong>{new Date(item.timestamp).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong><small>本地备份</small></div><button type="button" onClick={() => restore(item.key)}>恢复</button></div>) : <div className="empty-state"><Icon name="database" size={42} /><strong>还没有手动备份</strong><p>建议完成首次设置后创建一份。</p></div>}</aside>
      </div>
      <details className="ipad-install-guide">
        <summary><Icon name="download" /> 把成长小队放到 iPad 主屏幕</summary>
        <ol><li>使用 Safari 打开这个页面。</li><li>点按工具栏中的“分享”。</li><li>选择“添加到主屏幕”，并开启“作为 Web App 打开”。</li><li>以后让孩子直接点按“成长小队”图标。</li></ol>
      </details>
      {migrationReport?.sourceVersion === 5 ? <section className="migration-report"><div><Icon name="check" size={26} /><span><strong>时间数据已升级到 v6</strong><small>原星光账本完整保留；没有证据的时间保持“未记录”。</small></span></div><dl><div><dt>检查记录</dt><dd>{migrationReport.sessionsReviewed} 晚</dd></div><div><dt>回填实际上床</dt><dd>{migrationReport.inBedBackfilled} 晚</dd></div><div><dt>任务完成未知</dt><dd>{migrationReport.completionLeftUnknown} 晚</dd></div><div><dt>入睡时间未知</dt><dd>{migrationReport.sleepLeftUnknown} 晚</dd></div></dl></section> : null}
      <section className="danger-zone"><div><h2>删除全部数据</h2><p>会删除流程、星星、愿望和历史记录，且无法撤销。</p></div><button className="button button--danger" type="button" onClick={() => setDeleteOpen(true)}><Icon name="trash" /> 删除全部数据</button></section>
      {deleteOpen ? <Modal title="删除全部数据" onClose={() => setDeleteOpen(false)} className="delete-modal"><div className="danger-icon"><Icon name="trash" size={32} /></div><h2>确定删除全部数据吗？</h2><p>请输入家长 PIN。删除后将返回首次设置，所有记录都无法恢复。</p><label>家长 PIN<input inputMode="numeric" value={deletePin} maxLength={4} onChange={(event) => setDeletePin(event.target.value.replace(/\D/g, ''))} /></label>{deleteError ? <div className="form-error" role="alert">{deleteError}</div> : null}<button className="button button--danger button--wide" type="button" onClick={removeAll}>确认永久删除</button><button className="button button--secondary button--wide" type="button" onClick={() => setDeleteOpen(false)}>保留我的数据</button></Modal> : null}
    </section>
  )
}
