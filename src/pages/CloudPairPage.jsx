import { useState } from 'react'
import { pairDevice } from '../data/cloud.js'
import { appPath } from '../data/paths.js'
import { Brand } from '../ui/Shared.jsx'
import { Icon } from '../ui/Icons.jsx'

export function CloudPairPage({ onPaired }) {
  const [code, setCode] = useState('')
  const [deviceName, setDeviceName] = useState(() => /iPad/i.test(navigator.userAgent) ? '孩子的 iPad' : '家庭设备')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  const connect = async (event) => {
    event.preventDefault()
    if (code.trim().length < 6 || status === 'connecting') return
    setStatus('connecting')
    setError('')
    try {
      const result = await pairDevice(code.trim().toUpperCase(), deviceName.trim() || '家庭设备')
      onPaired(result)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '暂时无法连接家庭')
      setStatus('idle')
    }
  }

  return (
    <main className="cloud-pair-page">
      <section className="cloud-pair-scene" aria-hidden="true">
        <Brand />
        <img src={appPath('assets/mascot-night.webp')} alt="" />
        <div><span></span><span></span><span></span></div>
      </section>
      <section className="cloud-pair-card" aria-labelledby="cloud-pair-title">
        <span className="cloud-pair-card__badge"><Icon name="shield" size={24} /> 家庭私有空间</span>
        <h1 id="cloud-pair-title">把这台 iPad<br />带回成长小队</h1>
        <p>只需由家长连接一次。以后孩子打开主屏幕图标，就会直接进入自己的成长小队。</p>
        <form onSubmit={connect}>
          <label htmlFor="device-name">设备名字</label>
          <input id="device-name" name="deviceName" value={deviceName} maxLength={40} autoComplete="off" onChange={(event) => setDeviceName(event.target.value)} />
          <label htmlFor="family-code">家庭连接码</label>
          <input id="family-code" name="familyCode" className="cloud-code-input" inputMode="text" autoCapitalize="characters" autoCorrect="off" spellCheck={false} placeholder="例如 MOON-1234" value={code} onChange={(event) => setCode(event.target.value.replace(/[^A-Za-z0-9-]/g, '').toUpperCase())} />
          {error ? <div className="form-error" role="alert">{error}</div> : null}
          <button className="button button--primary button--wide" type="submit" disabled={code.trim().length < 6 || status === 'connecting'}>
            {status === 'connecting' ? <><span className="spinner" /> 正在连接…</> : <><Icon name="moon" /> 连接我的家庭</>}
          </button>
        </form>
        <small><Icon name="shield" size={15} /> 孩子的记录只在已连接的家庭设备间同步</small>
      </section>
    </main>
  )
}
