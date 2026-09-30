import { useState } from 'react'
import { useBedtimeActions } from '../../store/useBedtime.js'
import { Tap } from '../ui/kit.jsx'
import { clock, dayTitle } from './format.js'

function asleepTimestamp(dateKey, time, inBedAt) {
  const value = new Date(`${dateKey}T${time}:00`).getTime()
  if (!Number.isFinite(value)) return null
  return value < inBedAt ? value + 24 * 60 * 60000 : value
}

/** "About when did they fall asleep?" — quick estimates first, an exact time if you know it. */
export function SleepEntry({ session, onDone, compact }) {
  const { dispatch } = useBedtimeActions()
  const [time, setTime] = useState(() => clock(session.inBedAt + 20 * 60000))
  const record = (timestamp, accuracy) => {
    if (!timestamp) return
    dispatch({ type: 'RECORD_ASLEEP_TIME', dateKey: session.dateKey, timestamp, source: accuracy === 'exact' ? 'parent-entry' : 'parent-estimate', accuracy })
    onDone?.()
  }
  return (
    <div className={`p-sleep${compact ? ' is-compact' : ''}`}>
      {compact ? null : <p className="p-sleep__q">{dayTitle(session.dateKey)} {clock(session.inBedAt)} 上床，大约几点睡着？</p>}
      <div className="p-sleep__quick" role="group" aria-label="估计入睡时间">
        {[10, 20, 30].map((minutes) => <button type="button" key={minutes} className="u-chip" onClick={() => record(session.inBedAt + minutes * 60000, 'approximate')}>约 {minutes} 分钟后</button>)}
      </div>
      <div className="p-sleep__exact">
        <label><span className="u-sr">入睡时间</span><input className="u-input" type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
        <Tap tone="soft" size="s" onClick={() => record(asleepTimestamp(session.dateKey, time, session.inBedAt), 'exact')}>记这个时间</Tap>
        <Tap tone="quiet" size="s" onClick={() => { dispatch({ type: 'SKIP_ASLEEP_TIME', dateKey: session.dateKey }); onDone?.() }}>这晚不记</Tap>
      </div>
    </div>
  )
}
