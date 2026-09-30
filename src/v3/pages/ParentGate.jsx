import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useBedtimeActions } from '../../store/useBedtime.js'
import { appPath } from '../../data/paths.js'
import { Icon } from '../../ui/Icons.jsx'
import '../tokens.css'
import '../parent.css'

export function ParentGate() {
  const { unlockParent } = useBedtimeActions()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const next = new URLSearchParams(location.search).get('next') || '/parent/overview'

  const verify = async (value = pin) => {
    if (value.length !== 4 || checking) return
    setChecking(true)
    try {
      if (await unlockParent(value)) navigate(next, { replace: true })
      else { setError('PIN 不正确，请再试一次。'); setPin('') }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '暂时无法验证，请稍后再试。')
      setPin('')
    } finally {
      setChecking(false)
    }
  }
  const press = (number) => {
    if (pin.length >= 4) return
    const value = `${pin}${number}`
    setPin(value)
    setError('')
    if (value.length === 4) verify(value)
  }

  return (
    <main className="v3-gate">
      <img className="v3-gate__bg" src={appPath('assets/v3/night-room-backdrop.webp')} alt="" />
      <section className={`v3-gate__card ${error ? 'is-wrong' : ''}`} aria-labelledby="gate-title">
        <img className="v3-gate__moon" src={appPath('assets/v3/moon-buddy.webp')} alt="" />
        <h1 id="gate-title" className="v3-display">进入家长区</h1>
        <p>这里可以调整作息、奖励和家庭数据。</p>
        <div className="v3-pin-dots" aria-label={`已输入 ${pin.length} 位`}>{[0, 1, 2, 3].map((index) => <i key={index} className={pin.length > index ? 'is-filled' : ''} />)}</div>
        <div className="v3-pin-pad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => <button type="button" key={number} onClick={() => press(number)}>{number}</button>)}
          <span />
          <button type="button" onClick={() => press(0)}>0</button>
          <button type="button" onClick={() => setPin((value) => value.slice(0, -1))} aria-label="删除一位"><Icon name="chevronBack" /></button>
        </div>
        {error ? <div className="v3-gate__error" role="alert">{error}</div> : null}
        <button className="v3-btn v3-btn--block" type="button" onClick={() => verify()} disabled={pin.length !== 4 || checking}>验证 PIN</button>
        <button className="v3-gate__back" type="button" onClick={() => navigate('/today')}>返回孩子模式</button>
      </section>
    </main>
  )
}
