import { useCallback, useEffect, useState } from 'react'
import { createTerminalPairCode, fetchCloudDevices, revokeCloudDevice, updateCloudDevice } from '../data/cloud.js'
import { appPath } from '../data/paths.js'
import { useBedtimeState } from '../store/useBedtime.js'
import { Icon } from '../ui/Icons.jsx'
import { PageTitle } from '../ui/Shared.jsx'

export function DevicesPage() {
  const { state, cloud } = useBedtimeState()
  const [devices, setDevices] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [terminalProfileId, setTerminalProfileId] = useState(state.activeProfileId)
  const [terminalCode, setTerminalCode] = useState(null)
  const load = useCallback(async () => {
    setLoading(true)
    try { setDevices((await fetchCloudDevices()).devices || []); setMessage('') }
    catch (error) { setMessage(error instanceof Error ? error.message : '设备列表暂时无法读取。') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => {
    if (cloud.mode === 'connected') load()
    else setLoading(false)
  }, [cloud.mode, load])

  const update = async (device, value) => {
    const profileId = value === 'shared' ? null : value
    try {
      await updateCloudDevice(device.id, { mode: profileId ? 'dedicated' : 'shared', profileId })
      setMessage(profileId ? `“${device.name}”现在只显示指定孩子。` : `“${device.name}”已改为家庭共享设备。`)
      await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : '设备设置没有保存。') }
  }

  const revoke = async (device) => {
    if (!window.confirm(`移除“${device.name}”后，这台设备需要重新输入家庭连接码。`)) return
    try { await revokeCloudDevice(device.id); setMessage(`已移除“${device.name}”。`); await load() }
    catch (error) { setMessage(error instanceof Error ? error.message : '设备没有移除。') }
  }

  const createTerminalCode = async () => {
    try {
      const result = await createTerminalPairCode(terminalProfileId)
      setTerminalCode(result)
      setMessage('口袋终端连接码已生成，只能使用一次，10 分钟后失效。')
    } catch (error) { setMessage(error instanceof Error ? error.message : '暂时不能生成终端连接码。') }
  }

  return (
    <section>
      <PageTitle title="家庭设备" subtitle="共享设备可以切换孩子；专属 iPad 只能记录绑定孩子，避免多设备串档。" icon="device" />
      {message ? <div className="form-success" role="status">{message}</div> : null}
      {cloud.mode === 'connected' ? <article className="terminal-pair-panel">
        <img src={appPath('assets/assistant/pocket-terminal.webp')} alt="成长小队口袋终端" />
        <div><span>专属口袋终端</span><h2>三颗按钮，只做今天这一件事</h2><p>终端只能看到绑定孩子，不支持切换账号，也没有开放聊天入口。</p><label><small>绑定给</small><select value={terminalProfileId} onChange={(event) => { setTerminalProfileId(event.target.value); setTerminalCode(null) }}>{state.profiles.map((profile) => <option value={profile.id} key={profile.id}>{profile.name}</option>)}</select></label><button type="button" className="button button--primary" onClick={createTerminalCode}>生成一次性连接码</button>{terminalCode ? <div className="terminal-pair-code"><small>在终端输入</small><strong>{terminalCode.code}</strong><span>只显示这一次 · {new Date(terminalCode.expiresAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 前有效</span><a href={appPath('terminal-simulator.html')} target="_blank" rel="noreferrer">没有真机？打开终端模拟器验证</a></div> : null}</div>
      </article> : null}
      <div className="device-settings-list">
        {cloud.mode !== 'connected' ? <article className="device-settings-card"><span className="device-settings-card__icon"><Icon name="device" size={28} /></span><div><strong>连接家庭云端后管理设备</strong><small>本地模式的数据只属于当前浏览器，不需要设置设备绑定。</small></div></article> : null}
        {loading ? <article className="device-settings-card"><span className="spinner" /><strong>正在读取家庭设备…</strong></article> : null}
        {!loading && !devices.length ? <article className="device-settings-card"><Icon name="device" size={36} /><strong>还没有已连接设备</strong><small>在孩子的 iPad 输入家庭连接码后，会显示在这里。</small></article> : null}
        {devices.map((device) => (
          <article className={`device-settings-card${device.revokedAt ? ' is-revoked' : ''}`} key={device.id}>
            <span className="device-settings-card__icon"><Icon name="device" size={28} /></span>
            <div><strong>{device.name}{device.kind === 'terminal' ? ' · 口袋终端' : ''}</strong><small>{device.revokedAt ? '已移除' : `最近使用：${new Date(device.lastSeenAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}</small></div>
            {!device.revokedAt && device.kind !== 'terminal' ? <label><span>使用方式</span><select value={device.mode === 'dedicated' ? device.boundProfileId : 'shared'} onChange={(event) => update(device, event.target.value)}><option value="shared">家庭共享，可切换孩子</option>{state.profiles.map((profile) => <option key={profile.id} value={profile.id}>只给 {profile.name} 使用</option>)}</select></label> : null}
            {!device.revokedAt && device.kind === 'terminal' ? <div className="terminal-device-lock"><Icon name="shield" /><span><strong>专属绑定</strong><small>只能记录 {state.profiles.find((profile) => profile.id === device.boundProfileId)?.name || '指定孩子'}</small></span></div> : null}
            {!device.revokedAt ? <button type="button" className="device-revoke" onClick={() => revoke(device)}>移除设备</button> : null}
          </article>
        ))}
      </div>
    </section>
  )
}
