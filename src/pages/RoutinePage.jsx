import { useState } from 'react'
import { dayTypeFor, getRoutine, localDateKey, uid } from '../domain/model.js'
import { OBJECT_ASSET_OPTIONS } from '../domain/assets.js'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { PageTitle, Segmented, Toggle } from '../ui/Shared.jsx'
import { AssetArt } from '../ui/AssetArt.jsx'
import { Icon } from '../ui/Icons.jsx'

const MAX_ROUTINE_STEPS = 16

export function RoutinePage() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const [dayType, setDayType] = useState(() => dayTypeFor(new Date(`${localDateKey()}T12:00:00`)))
  const routine = getRoutine(state, dayType)
  const [steps, setSteps] = useState(() => structuredClone(routine.steps))
  const [selectedId, setSelectedId] = useState(routine.steps[0]?.id || null)
  const [saved, setSaved] = useState(false)
  const [draggedId, setDraggedId] = useState(null)
  const [limitMessage, setLimitMessage] = useState('')

  const changeDayType = (value) => {
    const nextRoutine = getRoutine(state, value)
    const nextSteps = structuredClone(nextRoutine.steps)
    setDayType(value)
    setSteps(nextSteps)
    setSelectedId(nextSteps[0]?.id || null)
    setSaved(false)
  }

  const selected = steps.find((step) => step.id === selectedId)
  const enabledCount = steps.filter((step) => step.enabled).length
  const patchStep = (id, patch) => setSteps((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item))
  const toggleStep = (step, value) => {
    if (value && !step.enabled && enabledCount >= MAX_ROUTINE_STEPS) {
      setLimitMessage('儿童区最多同时显示 16 项，请先停用一项。')
      return
    }
    setLimitMessage('')
    patchStep(step.id, { enabled: value })
  }
  const move = (index, delta) => {
    const target = index + delta
    if (target < 0 || target >= steps.length) return
    setSteps((items) => {
      const next = [...items]
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return next
    })
  }
  const dropBefore = (targetId) => {
    if (!draggedId || draggedId === targetId) return
    setSteps((items) => {
      const next = [...items]
      const sourceIndex = next.findIndex((item) => item.id === draggedId)
      const [source] = next.splice(sourceIndex, 1)
      const targetIndex = next.findIndex((item) => item.id === targetId)
      next.splice(targetIndex, 0, source)
      return next
    })
    setDraggedId(null)
  }
  const addStep = () => {
    if (enabledCount >= MAX_ROUTINE_STEPS) {
      setLimitMessage('已经启用 16 项任务，请先停用一项再添加。')
      return
    }
    const step = { id: uid('step'), title: '新步骤', icon: 'heart', duration: 3, enabled: true }
    setSteps((items) => [...items, step])
    setSelectedId(step.id)
    setLimitMessage('')
  }
  const remove = (id) => {
    if (steps.length <= 1) return
    setSteps((items) => items.filter((item) => item.id !== id))
    if (selectedId === id) setSelectedId(steps.find((item) => item.id !== id)?.id || null)
  }
  const save = () => {
    dispatch({ type: 'UPDATE_ROUTINE', payload: { dayType, steps } })
    setSaved(true)
  }
  return (
    <section>
      <PageTitle title="睡前流程" subtitle="最多 16 项；儿童区会把全部任务放在同一屏。" icon="book" />
      <Segmented label="流程日期类型" value={dayType} onChange={changeDayType} options={[{ value: 'weekday', label: '工作日' }, { value: 'weekend', label: '周末' }]} />
      <div className="routine-layout">
        <article className="routine-list-card">
          <div className="routine-list">
            {steps.map((step, index) => (
              <div key={step.id} className={`routine-row ${selectedId === step.id ? 'is-selected' : ''} ${draggedId === step.id ? 'is-dragging' : ''}`} draggable onDragStart={(event) => { setDraggedId(step.id); event.dataTransfer.effectAllowed = 'move' }} onDragEnd={() => setDraggedId(null)} onDragOver={(event) => event.preventDefault()} onDrop={() => dropBefore(step.id)}>
                <button className="drag-handle" type="button" aria-label={`拖动或编辑${step.title}`} title="拖动排序，也可使用右侧上下按钮" onClick={() => setSelectedId(step.id)}>⋮⋮</button>
                <AssetArt id={step.icon} label={step.title} className="routine-row__icon" />
                <button className="routine-row__name" type="button" onClick={() => setSelectedId(step.id)}>{step.title}</button>
                <Toggle label={`启用${step.title}`} checked={step.enabled} onChange={(value) => toggleStep(step, value)} />
                <button className="move-button" type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`${step.title}上移`}>↑</button>
                <button className="move-button" type="button" onClick={() => move(index, 1)} disabled={index === steps.length - 1} aria-label={`${step.title}下移`}>↓</button>
              </div>
            ))}
          </div>
          <div className="routine-count-note"><strong>已启用 {enabledCount} / 16 项</strong><span>{enabledCount > 9 ? '儿童端将使用紧凑任务墙，全部保持可见。' : `还可以启用 ${Math.max(0, MAX_ROUTINE_STEPS - enabledCount)} 项。`}</span></div>
          {limitMessage ? <div className="gentle-warning" role="status">{limitMessage}</div> : null}
          <button className="button button--dashed button--wide" type="button" onClick={addStep} disabled={enabledCount >= MAX_ROUTINE_STEPS}>{enabledCount >= MAX_ROUTINE_STEPS ? '已到 16 项上限' : '＋ 添加步骤'}</button>
          {saved ? <div className="form-success" role="status">流程已经保存。</div> : null}
          <button className="button button--primary button--wide" type="button" onClick={save}><Icon name="check" />保存流程</button>
          <div className="routine-preview"><small>孩子将看到的任务卡预览</small><div>{steps.filter((step) => step.enabled).map((step) => <span key={step.id}><AssetArt id={step.icon} decorative /><b>{step.title}</b></span>)}</div></div>
        </article>
        <aside className="step-editor">
          <h2>编辑步骤</h2>
          {selected ? (
            <>
              <label>名称<input value={selected.title} maxLength={8} onChange={(event) => patchStep(selected.id, { title: event.target.value })} /></label>
              <label>图片<div className="asset-options">{OBJECT_ASSET_OPTIONS.map((asset) => <button key={asset.id} type="button" aria-label={asset.label} title={asset.label} className={selected.icon === asset.id ? 'is-selected' : ''} onClick={() => patchStep(selected.id, { icon: asset.id })}><AssetArt id={asset.id} decorative /></button>)}</div></label>
              <label>建议时长<select value={selected.duration} onChange={(event) => patchStep(selected.id, { duration: Number(event.target.value) })}><option value={2}>2 分钟</option><option value={3}>3 分钟</option><option value={5}>5 分钟</option><option value={10}>10 分钟</option><option value={15}>15 分钟</option></select></label>
              <p>建议 5–10 分钟。预计完成时间帮助孩子建立时间感。</p>
              <button className="text-button text-button--danger" type="button" onClick={() => remove(selected.id)}>删除这个步骤</button>
            </>
          ) : <p>选择一个步骤开始编辑。</p>}
        </aside>
      </div>
    </section>
  )
}
