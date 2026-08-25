import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useBedtimeActions } from '../store/useBedtime.js'
import { appPath } from '../data/paths.js'
import { Brand } from '../ui/Shared.jsx'
import { Icon } from '../ui/Icons.jsx'

export function ParentGatePage() {
  const { unlockParent } = useBedtimeActions()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const next = new URLSearchParams(location.search).get('next') || '/parent/overview'

  const verify = async (value = pin) => {
    if (value.length !== 4) return
    try {
      if (await unlockParent(value)) {
      navigate(next, { replace: true })
      } else {
        setError('PIN 不正确，请再试一次。')
        setPin('')
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '暂时无法验证，请稍后再试。')
      setPin('')
    }
  }
  const handleNumber = (number) => {
    const nextPin = pin.length < 4 ? `${pin}${number}` : pin
    setPin(nextPin)
    setError('')
    if (nextPin.length === 4) verify(nextPin)
  }

  return (
    <main className="gate-page">
      <div className="gate-background"><Brand /><img src={appPath('assets/mascot-night.webp')} alt="" /></div>
      <section className="gate-card" aria-labelledby="gate-title">
        <div className="gate-shield"><Icon name="shield" size={34} /></div>
        <h1 id="gate-title">进入家长区</h1>
        <p>家长区包含时间、奖励和数据设置。</p>
        <div className="pin-dots" aria-label={`已输入 ${pin.length} 位`}><i className={pin.length > 0 ? 'filled' : ''}></i><i className={pin.length > 1 ? 'filled' : ''}></i><i className={pin.length > 2 ? 'filled' : ''}></i><i className={pin.length > 3 ? 'filled' : ''}></i></div>
        <div className="pin-pad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => <button type="button" key={number} onClick={() => handleNumber(number)}>{number}</button>)}
          <span></span><button type="button" onClick={() => handleNumber(0)}>0</button><button type="button" onClick={() => setPin((value) => value.slice(0, -1))} aria-label="删除一位">⌫</button>
        </div>
        {error ? <div className="form-error" role="alert">{error}</div> : null}
        <button className="button button--secondary button--wide" type="button" onClick={() => verify()}>验证 PIN</button>
        <button className="text-button" type="button" onClick={() => navigate('/tonight')}>返回孩子模式</button>
      </section>
    </main>
  )
}
