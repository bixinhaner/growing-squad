import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { AGE_BANDS, CHARACTER_OPTIONS, getAccessibility, getActiveProfile, getSchedule, THEME_OPTIONS, uid } from '../../domain/model.js'
import { createTerminalPairCode, downloadCloudArchive, eraseCloudFamilyData, fetchCloudDevices, fetchGuardianHealth, revokeCloudDevice, runGuardianCheck, unlockCloudParent, updateCloudDevice } from '../../data/cloud.js'
import { createBackup, exportData, importData, listBackups, restoreBackup, verifyPin } from '../../data/storage.js'
import { deleteInventorMedia } from '../../modules/inventor/inventorMedia.js'
import { appPath } from '../../data/paths.js'
import { useBedtimeActions, useBedtimeState } from '../../store/useBedtime.js'
import { AssetArt, CompanionArt } from '../../ui/AssetArt.jsx'
import { ThemeScene } from '../../ui/ThemeArt.jsx'
import { Icon } from '../ui/Icon.jsx'
import { Field, Sheet, Switch, Tap } from '../ui/kit.jsx'
import { useToast } from '../ui/toast.js'
import { Empty, Notice, PageHead, Panel, Segment, SettingRow, SubNav } from './pkit.jsx'

export function FamilyLayout() {
  const { cloud, syncConflicts = [] } = useBedtimeState()
  return (
    <div className="p-page">
      <SubNav label="家庭" items={[
        { to: '/parent/family', label: '孩子' },
        { to: '/parent/family/display', label: '显示与声音' },
        ...(cloud.mode === 'local' ? [] : [{ to: '/parent/family/devices', label: '设备' }]),
        { to: '/parent/family/data', label: '数据与备份' },
        ...(syncConflicts.length ? [{ to: '/parent/family/sync', label: '同步', badge: syncConflicts.length }] : []),
      ]} />
      <Outlet />
    </div>
  )
}

/* ─────────────  孩子  ───────────── */
export function FamilyKids() {
  const { state } = useBedtimeState()
  return <KidEditor key={state.activeProfileId} />
}

function KidEditor() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const toast = useToast()
  const profile = getActiveProfile(state)
  const [form, setForm] = useState(profile)
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const dirty = ['name', 'ageBand', 'companionMode', 'character', 'theme'].some((key) => form[key] !== profile[key])
  const patch = (value) => setForm((current) => ({ ...current, ...value }))
  const character = CHARACTER_OPTIONS.find((item) => item.id === form.character)
  const theme = THEME_OPTIONS.find((item) => item.id === form.theme)
  const save = () => {
    if (!form.name.trim()) { toast('名字不能空着'); return }
    dispatch({ type: 'UPDATE_PROFILE', payload: { ...form, name: form.name.trim() } })
    toast('保存好了，孩子那边马上生效')
  }
  return (
    <>
      <PageHead eyebrow="家庭 · 孩子" title="每个孩子，一份自己的节奏" lead="作息、小路、星光和记录分开保存；愿望单全家共用。">
        <Tap tone="soft" icon="plus" onClick={() => setAdding(true)}>再加一个孩子</Tap>
      </PageHead>
      <div className="p-kid-roster" role="radiogroup" aria-label="选择孩子">
        {state.profiles.map((item) => (
          <button key={item.id} type="button" role="radio" aria-checked={item.id === profile.id} onClick={() => dispatch({ type: 'SWITCH_PROFILE', profileId: item.id })}>
            <CompanionArt id={item.character} decorative />
            <strong>{item.name}</strong>
            <small>{item.ageBand} · 计划 {getSchedule(state, 'weekday', null, item.id)?.bedTime || '—'}</small>
          </button>
        ))}
      </div>
      <div className="p-cols is-wide-left">
        <Panel title={`${profile.name}的资料`}>
          <div className="p-form">
            <div className="p-grid-2">
              <Field label="名字"><input className="u-input" maxLength={8} value={form.name} onChange={(event) => patch({ name: event.target.value })} /></Field>
              <div className="u-field"><span>年龄</span><Segment label="年龄" className="p-seg--wrap" value={form.ageBand} onChange={(ageBand) => patch({ ageBand })} options={AGE_BANDS.map((age) => [age, age])} /></div>
            </div>
            <div className="u-field"><span>怎样完成小路</span><Segment label="完成方式" value={form.companionMode} onChange={(companionMode) => patch({ companionMode })} options={[['together', '和大人一起'], ['independent', '自己完成']]} /><small>只改变提示方式，不影响星光。</small></div>
            <div className="u-field"><span>陪伴的小伙伴</span>
              <div className="p-pick" role="radiogroup" aria-label="陪伴的小伙伴">
                {CHARACTER_OPTIONS.map((item) => <button type="button" role="radio" key={item.id} aria-checked={form.character === item.id} onClick={() => patch({ character: item.id })}><CompanionArt id={item.id} decorative /><span>{item.name}</span></button>)}
              </div>
            </div>
            <div className="u-field"><span>夜晚的房间</span>
              <div className="p-pick" role="radiogroup" aria-label="夜晚的房间">
                {THEME_OPTIONS.map((item) => <button type="button" role="radio" key={item.id} aria-checked={form.theme === item.id} onClick={() => patch({ theme: item.id })}><AssetArt id={item.assetId} decorative /><span>{item.name}</span></button>)}
              </div>
            </div>
          </div>
        </Panel>
        <Panel title="孩子会看到" tone="night">
          <div className="p-theme-preview">
            <ThemeScene theme={form.theme} character={form.character} pose="waiting" label={`${character?.name || '小伙伴'}在${theme?.name || '房间'}等待`} />
            <strong className="u-display">晚安，{form.name || '宝贝'}</strong>
            <small>{character?.name}在{theme?.name}等你</small>
          </div>
        </Panel>
      </div>
      {state.profiles.length > 1 ? (
        <details className="p-danger">
          <summary><Icon name="trash" size={16} /> 删除{profile.name}的档案</summary>
          <p>作息、小路、星光、愿望申请和所有记录都会永久删除，其他孩子不受影响。</p>
          <Tap tone="danger" size="s" onClick={() => setDeleting(true)}>删除{profile.name}</Tap>
        </details>
      ) : null}
      {dirty ? (
        <div className="p-savebar" role="status">
          <span>改动还没保存</span>
          <Tap tone="quiet" size="s" onClick={() => setForm(profile)}>还原</Tap>
          <Tap tone="primary" size="s" icon="check" onClick={save}>保存</Tap>
        </div>
      ) : null}
      {adding ? <AddKid onClose={() => setAdding(false)} /> : null}
      {deleting ? (
        <Sheet title={`删除${profile.name}的全部记录？`} onClose={() => setDeleting(false)}>
          <p className="p-lead">这不能撤销。</p>
          <Tap tone="danger" block onClick={() => { dispatch({ type: 'DELETE_PROFILE', profileId: profile.id }); setDeleting(false); toast('档案已删除') }}>确认删除</Tap>
          <Tap tone="soft" block onClick={() => setDeleting(false)}>保留</Tap>
        </Sheet>
      ) : null}
    </>
  )
}

function AddKid({ onClose }) {
  const { dispatch } = useBedtimeActions()
  const toast = useToast()
  const [form, setForm] = useState({ name: '', ageBand: AGE_BANDS[1], companionMode: 'together' })
  const submit = (event) => {
    event.preventDefault()
    const name = form.name.trim()
    if (!name) return
    dispatch({ type: 'ADD_PROFILE', payload: { id: uid('child'), ...form, name } })
    toast(`${name}加入了成长小队`)
    onClose()
  }
  return (
    <Sheet title="再加一个孩子" onClose={onClose}>
      <form className="p-form" onSubmit={submit}>
        <Field label="名字"><input className="u-input" autoFocus maxLength={8} placeholder="例如：小禾" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
        <div className="u-field"><span>年龄</span><Segment label="年龄" className="p-seg--wrap" value={form.ageBand} onChange={(ageBand) => setForm({ ...form, ageBand })} options={AGE_BANDS.map((age) => [age, age])} /></div>
        <div className="u-field"><span>怎样完成小路</span><Segment label="完成方式" value={form.companionMode} onChange={(companionMode) => setForm({ ...form, companionMode })} options={[['together', '和大人一起'], ['independent', '自己完成']]} /></div>
        <Tap tone="primary" size="l" block type="submit" disabled={!form.name.trim()}>建立档案</Tap>
      </form>
    </Sheet>
  )
}

/* ─────────────  显示与声音  ───────────── */
const A11Y = [
  { key: 'reduceMotion', icon: 'sparkle', title: '减少动态', copy: '少一点动画和过渡' },
  { key: 'soundOff', icon: 'mute', title: '关闭声音', copy: '不播放音效、庆祝声和晚安音乐' },
  { key: 'readTasks', icon: 'volume', title: '朗读每一步', copy: '自动读出步骤名字和完成提示' },
  { key: 'highContrast', icon: 'eye', title: '高对比度', copy: '文字和背景更分明' },
  { key: 'largeText', icon: 'search', title: '大号文字', copy: '孩子那边用更大的字' },
]
export function FamilyDisplay() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const settings = getAccessibility(state)
  const profile = getActiveProfile(state)
  return (
    <>
      <PageHead eyebrow="家庭 · 显示与声音" title="让界面适合这个孩子" lead="改动立即生效，孩子那边不需要重新打开。" />
      <div className="p-cols">
        <Panel>
          {A11Y.map((item) => (
            <SettingRow key={item.key} icon={item.icon} title={item.title} copy={item.copy}>
              <Switch label={item.title} checked={Boolean(settings[item.key])} onChange={(value) => dispatch({ type: 'UPDATE_ACCESSIBILITY', payload: { [item.key]: value } })} />
            </SettingRow>
          ))}
        </Panel>
        <Panel title="预览" tone="night">
          <div className={`p-a11y-preview${settings.largeText ? ' is-large' : ''}${settings.highContrast ? ' is-contrast' : ''}`}>
            <AssetArt id="story" decorative />
            <span><strong>读故事</strong><small>大约 10 分钟</small></span>
            {settings.readTasks ? <Icon name="volume" size={20} /> : null}
          </div>
          <ThemeScene theme={profile.theme} character={profile.character} pose="waiting" label="当前小伙伴和房间" />
        </Panel>
      </div>
    </>
  )
}

/* ─────────────  设备  ───────────── */
const timeText = (value) => new Date(value).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
export function FamilyDevices() {
  const { state, cloud } = useBedtimeState()
  const toast = useToast()
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(cloud.mode === 'connected')
  const [error, setError] = useState('')
  const [terminalFor, setTerminalFor] = useState(state.activeProfileId)
  const [terminalCode, setTerminalCode] = useState(null)
  const [revoking, setRevoking] = useState(null)
  const load = useCallback(async () => {
    setLoading(true)
    try { setDevices((await fetchCloudDevices()).devices || []); setError('') } catch (reason) { setError(reason instanceof Error ? reason.message : '设备列表暂时读不到。') } finally { setLoading(false) }
  }, [])
  useEffect(() => { if (cloud.mode === 'connected') load() }, [cloud.mode, load])
  const assign = async (device, value) => {
    const profileId = value === 'shared' ? null : value
    try { await updateCloudDevice(device.id, { mode: profileId ? 'dedicated' : 'shared', profileId }); toast(profileId ? `「${device.name}」现在只给一个孩子用` : `「${device.name}」改成全家共用`); await load() } catch (reason) { toast(reason instanceof Error ? reason.message : '没保存上。') }
  }
  const revoke = async () => {
    const device = revoking
    setRevoking(null)
    try { await revokeCloudDevice(device.id); toast(`已移除「${device.name}」`); await load() } catch (reason) { toast(reason instanceof Error ? reason.message : '没移除成功。') }
  }
  const makeCode = async () => {
    try { setTerminalCode(await createTerminalPairCode(terminalFor)) } catch (reason) { toast(reason instanceof Error ? reason.message : '暂时生成不了连接码。') }
  }
  const active = devices.filter((device) => !device.revokedAt)
  if (cloud.mode !== 'connected') {
    return (
      <>
        <PageHead eyebrow="家庭 · 设备" title="家里的设备" />
        <Panel><Empty icon="device" title={cloud.mode === 'offline' ? '现在没有联网' : '还没有连接家庭云端'}>{cloud.mode === 'offline' ? '联网后可以查看和管理设备。' : '本地模式的数据只在这个浏览器里，不需要管理设备。'}</Empty></Panel>
      </>
    )
  }
  return (
    <>
      <PageHead eyebrow="家庭 · 设备" title="家里的设备" lead="共用的设备可以切换孩子；专属设备只记录一个孩子，不会串档。">
        <Tap tone="quiet" size="s" icon="sync" onClick={load}>刷新</Tap>
      </PageHead>
      {error ? <Notice icon="info" tone="warn">{error}</Notice> : null}
      <Panel title={`已连接 ${active.length} 台`}>
        {loading ? <p className="p-fine"><span className="p-spin" /> 正在读取…</p> : null}
        {!loading && !active.length ? <Empty icon="device" title="还没有连接的设备">在孩子的设备上输入家庭连接码后，会出现在这里。</Empty> : null}
        {active.map((device) => (
          <div className="p-device" key={device.id}>
            <span className="p-device__icon"><Icon name="device" size={22} /></span>
            <span className="p-device__name"><strong>{device.name}{device.kind === 'terminal' ? ' · 口袋终端' : ''}</strong><small>最近用过 {timeText(device.lastSeenAt)}</small></span>
            {device.kind === 'terminal'
              ? <span className="p-pill is-mint"><Icon name="lock" size={13} /> 只给{state.profiles.find((item) => item.id === device.boundProfileId)?.name || '一个孩子'}</span>
              : <select className="u-input p-device__mode" aria-label={`${device.name}的使用方式`} value={device.mode === 'dedicated' ? device.boundProfileId : 'shared'} onChange={(event) => assign(device, event.target.value)}>
                  <option value="shared">全家共用</option>
                  {state.profiles.map((item) => <option key={item.id} value={item.id}>只给{item.name}</option>)}
                </select>}
            <button type="button" className="p-link is-danger" onClick={() => setRevoking(device)}>移除</button>
          </div>
        ))}
      </Panel>
      <Panel title="口袋终端" tone="warm">
        <div className="p-terminal">
          <img src={appPath('assets/assistant/pocket-terminal.webp')} alt="" />
          <div className="p-form">
            <p className="p-fine">三颗按钮，只做今天这一件事。只能看到绑定的孩子，没有聊天入口。</p>
            <div className="u-field"><span>给谁用</span><Segment label="终端绑定给" className="p-seg--wrap" value={terminalFor} onChange={(value) => { setTerminalFor(value); setTerminalCode(null) }} options={state.profiles.map((item) => [item.id, item.name])} /></div>
            {terminalCode ? (
              <div className="p-code">
                <small>在终端上输入</small>
                <strong className="u-num">{terminalCode.code}</strong>
                <small>只能用一次 · {new Date(terminalCode.expiresAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 前有效</small>
                <a className="p-link" href={appPath('terminal-simulator.html')} target="_blank" rel="noreferrer">没有真机？打开终端模拟器</a>
              </div>
            ) : <Tap tone="primary" onClick={makeCode}>生成一次性连接码</Tap>}
          </div>
        </div>
      </Panel>
      {revoking ? (
        <Sheet title={`移除「${revoking.name}」？`} onClose={() => setRevoking(null)}>
          <p className="p-lead">移除后，这台设备要重新输入家庭连接码才能使用。记录不会丢。</p>
          <Tap tone="danger" block onClick={revoke}>移除</Tap>
          <Tap tone="soft" block onClick={() => setRevoking(null)}>先不</Tap>
        </Sheet>
      ) : null}
    </>
  )
}

/* ─────────────  数据与备份  ───────────── */
const bytes = (value) => {
  const size = Number(value || 0)
  if (size < 1024) return `${size} B`
  if (size < 1024 ** 2) return `${Math.round(size / 1024)} KB`
  return `${(size / 1024 ** 2).toFixed(size < 10 * 1024 ** 2 ? 1 : 0)} MB`
}
const when = (value, fallback = '还没有') => (value ? timeText(value) : fallback)

export function FamilyData() {
  const { state, saveStatus, cloud, pendingCount = 0, legacyRecoveryItems = [] } = useBedtimeState()
  const { dispatch, replaceData, resolveLegacyOutbox, discardLegacyOutbox } = useBedtimeActions()
  const toast = useToast()
  const fileRef = useRef(null)
  const [backups, setBackups] = useState(() => listBackups())
  const [health, setHealth] = useState(null)
  const [checking, setChecking] = useState(false)
  const [erasing, setErasing] = useState(false)
  const [restoring, setRestoring] = useState(null)
  const [owners, setOwners] = useState({})
  const connected = cloud.mode === 'connected'
  const cloudBacked = connected || cloud.mode === 'offline'
  const media = Object.values(state.modules?.inventor?.artifacts || {}).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
  const mediaPending = media.filter((item) => item.status !== 'synced').length
  const report = state.meta?.timeMigrationReport

  const loadHealth = useCallback(async () => {
    if (!connected) return
    setChecking(true)
    try { setHealth(await fetchGuardianHealth()) } catch { /* shown as "waiting" */ } finally { setChecking(false) }
  }, [connected])
  useEffect(() => { loadHealth() }, [loadHealth])

  const localOk = saveStatus === 'saved' || cloud.mode === 'offline'
  const cloudOk = connected && pendingCount === 0
  const healthy = cloudBacked ? localOk && cloudOk && health?.status === 'healthy' : localOk && backups.length > 0
  const headline = healthy ? '所有记录都安全保存着' : cloud.mode === 'offline' ? '先存在这台设备上，联网后补交' : !cloudBacked && localOk && !backups.length ? '记录在这台设备上，建议备份一份' : checking ? '正在核对…' : '有一项需要看一下'

  const check = async () => {
    createBackup(state); setBackups(listBackups())
    if (!connected) { toast('本机备份好了。联网后会继续检查云端。'); return }
    setChecking(true)
    try { const result = await runGuardianCheck(); setHealth(result); toast(result.status === 'healthy' ? '检查完成：云端、每日备份和恢复文件都能正常读取。' : '有需要确认的项目，看看下面的标记。') } catch (error) { toast(error instanceof Error ? error.message : '检查没完成，请稍后再试。') } finally { setChecking(false) }
  }
  const restore = async () => {
    const key = restoring; setRestoring(null)
    try { await replaceData(restoreBackup(key)); toast('已恢复到这份备份。') } catch (error) { toast(error instanceof Error ? error.message : '恢复没成功。') }
  }
  const importFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try { await replaceData(await importData(file)); toast('导入完成。') } catch (error) { toast(error instanceof Error ? error.message : '导入失败。') }
    event.target.value = ''
  }
  const archive = async (profileId = null) => {
    if (!connected) { toast('完整档案包含云端的照片语音，请联网后导出。'); return }
    try { await downloadCloudArchive(profileId); toast('档案已导出。') } catch (error) { toast(error instanceof Error ? error.message : '导出没完成。') }
  }
  const removeMedia = async (asset) => {
    if (!connected) { toast('请联网后再删，免得云端的副本又同步回来。'); return }
    try { await deleteInventorMedia(asset); dispatch({ type: 'DELETE_INVENTOR_ARTIFACT', profileId: asset.profileId, projectId: asset.projectId, artifactId: asset.id }); toast(`「${asset.fileName || '这份资料'}」已删除`) } catch (error) { toast(error instanceof Error ? error.message : '没删成功。') }
  }

  const steps = [
    { ok: localOk, icon: 'device', title: '这台设备', copy: saveStatus === 'error' ? '保存出错，点顶部重试' : '有一份离线副本' },
    { ok: cloudOk, wait: cloud.mode === 'offline' || pendingCount > 0, icon: 'upload', title: '家庭云端', copy: connected ? (pendingCount ? `还有 ${pendingCount} 个操作在补交` : '全部送达') : cloud.mode === 'offline' ? '联网后自动继续' : '只用本机' },
    { ok: Boolean(health?.steps?.backup?.ok), wait: !cloudBacked || checking, icon: 'calendar', title: '每日备份', copy: health?.steps?.backup?.createdAt ? `最近 ${when(health.steps.backup.createdAt)}` : cloudBacked ? '等待云端确认' : '本地模式手动备份' },
    { ok: Boolean(health?.steps?.integrity?.ok), wait: !health || checking, icon: 'shield', title: '备份能打开', copy: health?.lastVerifiedAt ? `检查于 ${when(health.lastVerifiedAt)}` : '点“检查一次”' },
  ]
  return (
    <>
      <PageHead eyebrow="家庭 · 数据与备份" title={headline} lead="检查只读状态，不会改动孩子的任何记录。">
        <Tap tone="primary" icon="shield" disabled={checking} onClick={check}>{checking ? '正在检查' : '检查一次'}</Tap>
      </PageHead>
      <ol className={`p-guard${healthy ? ' is-healthy' : ''}`}>
        {steps.map((step) => <li key={step.title} className={step.ok ? 'is-ok' : step.wait ? 'is-wait' : 'is-warn'}><span><Icon name={step.ok ? 'check' : step.icon} size={18} /></span><strong>{step.title}</strong><small>{step.copy}</small></li>)}
      </ol>
      {legacyRecoveryItems.length ? (
        <Panel title="旧版有几条记录没送达" tone="warm">
          <p className="p-fine">它们发生在升级前。选好属于哪个孩子，才会补交；不会替你猜。</p>
          {legacyRecoveryItems.map((item, index) => (
            <div className="p-line" key={item.id}>
              <span><strong>{item.action?.type || '旧版操作'}</strong><small>第 {index + 1} 条</small></span>
              <select className="u-input" aria-label={`第 ${index + 1} 条记录属于哪个孩子`} value={owners[item.id] || ''} onChange={(event) => setOwners((current) => ({ ...current, [item.id]: event.target.value }))}>
                <option value="">选择孩子</option>
                {state.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
              </select>
            </div>
          ))}
          <div className="p-inline">
            <Tap tone="primary" size="s" disabled={legacyRecoveryItems.some((item) => !owners[item.id])} onClick={() => resolveLegacyOutbox(owners)}>确认并补交</Tap>
            <Tap tone="quiet" size="s" onClick={discardLegacyOutbox}>放弃这些旧操作</Tap>
          </div>
        </Panel>
      ) : null}
      <div className="p-cols">
        <Panel title="备份">
          <dl className="p-facts">
            <div><dt>云端保留</dt><dd>{health ? `${health.storage.backupCount} 份 / ${health.storage.retentionDays} 天` : '连接云端后显示'}</dd></div>
            <div><dt>本机备份</dt><dd>{backups.length} 份</dd></div>
            <div><dt>待送达</dt><dd>{pendingCount + mediaPending ? `${pendingCount} 个操作 · ${mediaPending} 份媒体` : '没有'}</dd></div>
          </dl>
          {backups.slice(0, 5).map((item) => <div className="p-line" key={item.key}><Icon name="clock" size={18} /><span><strong>{when(item.timestamp)}</strong><small>本机副本</small></span><button type="button" className="p-link" onClick={() => setRestoring(item.key)}>恢复</button></div>)}
          <Tap tone="soft" size="s" icon="download" onClick={() => { createBackup(state); setBackups(listBackups()); toast('本机备份好了') }}>现在备份一份</Tap>
        </Panel>
        <Panel title="带走和搬家">
          <button type="button" className="p-row" onClick={() => archive()}><Icon name="download" size={20} /><span><strong>全家完整档案</strong><small>记录、照片语音和校验清单</small></span><Icon name="chevron" size={16} /></button>
          <button type="button" className="p-row" onClick={() => archive(state.activeProfileId)}><Icon name="user" size={20} /><span><strong>只导出{getActiveProfile(state).name}</strong><small>不含其他孩子</small></span><Icon name="chevron" size={16} /></button>
          <button type="button" className="p-row" onClick={() => exportData(state)}><Icon name="download" size={20} /><span><strong>轻量 JSON</strong><small>设置和记录，用来迁移</small></span><Icon name="chevron" size={16} /></button>
          <button type="button" className="p-row" onClick={() => fileRef.current?.click()}><Icon name="upload" size={20} /><span><strong>从文件导入</strong><small>选择以前导出的 JSON</small></span><Icon name="chevron" size={16} /></button>
          <input ref={fileRef} type="file" hidden accept="application/json" onChange={importFile} />
        </Panel>
      </div>
      <Panel title="隐私">
        <ul className="p-privacy">
          <li><Icon name="check" size={16} /><span><strong>不上传给外部 AI</strong><small>活动、照片和语音不发给外部模型</small></span></li>
          <li><Icon name="check" size={16} /><span><strong>没有公开链接</strong><small>只有家庭设备和家长能读取</small></span></li>
          <li><Icon name="check" size={16} /><span><strong>媒体单独保存</strong><small>{health ? `${health.storage.mediaCount} 份，${bytes(health.storage.mediaBytes)}` : '不拖慢启动'}</small></span></li>
        </ul>
        {media.length ? <><h3 className="p-sub">发明项目里的照片、语音和视频</h3>{media.map((asset) => <div className="p-line" key={asset.id}><Icon name="image" size={18} /><span><strong>{asset.fileName || '项目资料'}</strong><small>{state.profiles.find((profile) => profile.id === asset.profileId)?.name || '孩子'} · {bytes(asset.byteSize)}</small></span><button type="button" className="p-link is-quiet" onClick={() => removeMedia(asset)}>删除</button></div>)}</> : null}
      </Panel>
      {report?.sourceVersion === 5 ? <Notice icon="check">数据已从旧版升级：检查了 {report.sessionsReviewed} 晚，补上 {report.inBedBackfilled} 晚上床时间；没有证据的时间保持“未记录”。</Notice> : null}
      <details className="p-danger">
        <summary><Icon name="trash" size={16} /> 删除全部数据</summary>
        <p>小路、星光、愿望和所有记录都会删除，回到首次设置。不能撤销。</p>
        <Tap tone="danger" size="s" onClick={() => setErasing(true)}>删除全部数据…</Tap>
      </details>
      {restoring ? (
        <Sheet title="恢复到这份备份？" onClose={() => setRestoring(null)}>
          <p className="p-lead">{when(Number(backups.find((item) => item.key === restoring)?.timestamp))} 之后的改动会被覆盖。</p>
          <Tap tone="primary" block onClick={restore}>恢复</Tap>
          <Tap tone="soft" block onClick={() => setRestoring(null)}>先不</Tap>
        </Sheet>
      ) : null}
      {erasing ? <EraseSheet onClose={() => setErasing(false)} /> : null}
    </>
  )
}

function EraseSheet({ onClose }) {
  const { state, cloud } = useBedtimeState()
  const { resetApp } = useBedtimeActions()
  const navigate = useNavigate()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const erase = async (event) => {
    event.preventDefault()
    setError(''); setBusy(true)
    try {
      if (cloud.mode === 'connected') { const unlocked = await unlockCloudParent(pin); await eraseCloudFamilyData(unlocked.token) }
      else if (cloud.mode === 'offline') { setError('现在没有联网。为防误删，请联网后再删除云端数据。'); setBusy(false); return }
      else if (!await verifyPin(pin, state.security.pinHash)) { setError('PIN 不对，什么都没有删除。'); setBusy(false); return }
    } catch { setError('PIN 不对，什么都没有删除。'); setBusy(false); return }
    await resetApp({ localOnly: cloud.mode === 'connected' })
    navigate('/welcome', { replace: true })
  }
  return (
    <Sheet title="删除全部数据" onClose={onClose}>
      <form className="p-form" onSubmit={erase}>
        <p className="p-lead">输入家长 PIN 确认。删除后回到首次设置，所有记录都无法恢复。</p>
        <Field label="家长 PIN"><input className="u-input u-num" autoFocus inputMode="numeric" autoComplete="off" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))} /></Field>
        {error ? <p className="p-error" role="alert">{error}</p> : null}
        <Tap tone="danger" block type="submit" disabled={pin.length < 4 || busy}>永久删除</Tap>
        <Tap tone="soft" block onClick={onClose}>保留我的数据</Tap>
      </form>
    </Sheet>
  )
}

/* ─────────────  同步  ───────────── */
const SYNC_LABELS = { 'bedtime.schedule.updated': '作息时间', 'bedtime.routine.updated': '睡前小路', 'core.profile.updated': '孩子资料', 'rewards.catalog.updated': '愿望单', 'core.routines.updated': '全天节奏' }
function describe(conflict, state) {
  const operation = conflict.item?.operation
  const type = operation?.type || 'unknown'
  const profileId = operation?.target?.profileId
  const intended = operation?.payload?.payload || operation?.payload || {}
  if (type === 'bedtime.schedule.updated') {
    const dayType = intended.dayType || 'weekday'
    const saved = state.modules?.bedtime?.schedules?.find((item) => item.profileId === profileId && item.dayType === dayType)
    const latest = saved?.pending || getSchedule(state, dayType, null, profileId)
    return { title: SYNC_LABELS[type], mine: intended.bedTime || intended.prepareTime || '这台设备的设置', latest: latest?.bedTime || latest?.prepareTime || '家里最新的设置' }
  }
  return { title: SYNC_LABELS[type] || '家庭设置', mine: '这台设备的修改', latest: '家里最新的版本' }
}
export function FamilySync() {
  const { state, syncConflicts = [] } = useBedtimeState()
  const { resolveSyncConflict } = useBedtimeActions()
  const navigate = useNavigate()
  const conflict = syncConflicts[0]
  const info = conflict ? describe(conflict, state) : null
  return (
    <>
      <PageHead eyebrow="家庭 · 同步" title={conflict ? `${syncConflicts.length} 处设置要你选一下` : '所有记录都已送达'} lead="孩子的完成记录、星光和成长都不会丢，这里只涉及设置。" />
      <div className="p-cols">
        <Panel>
          {conflict ? (
            <div className="p-conflict">
              <h3>{info.title}</h3>
              <div className="p-conflict__compare">
                <button type="button" className="is-latest" onClick={() => resolveSyncConflict(conflict.id, 'keep-latest')}><small>家里最新 · 推荐</small><strong className="u-num">{info.latest}</strong><span>保留这个</span></button>
                <button type="button" onClick={() => resolveSyncConflict(conflict.id, 'retry-local')}><small>这台设备</small><strong className="u-num">{info.mine}</strong><span>改用这个</span></button>
              </div>
              <button type="button" className="p-link is-quiet" onClick={() => navigate('/parent')}>稍后再决定</button>
              <details className="p-tech"><summary>技术记录</summary><dl className="p-facts"><div><dt>操作</dt><dd>{conflict.id}</dd></div><div><dt>本机版本</dt><dd>{conflict.rejection?.details?.expectedVersion ?? '—'}</dd></div><div><dt>家庭版本</dt><dd>{conflict.rejection?.details?.currentEntityVersion ?? '—'}</dd></div></dl></details>
            </div>
          ) : <Empty icon="check" title="没有需要处理的">设备之间的所有改动都已合并。</Empty>}
        </Panel>
        <img className="p-art" src={appPath('assets/sync/family-sync-station-hero.webp')} alt="" />
      </div>
    </>
  )
}
