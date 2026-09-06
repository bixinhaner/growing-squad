import { AssetArt } from '../AssetArt.jsx'
import { Icon } from '../Icons.jsx'
import './tonight-task-board.css'

/** One stable overview: completing an item never reorders or hides its neighbours. */
export function TonightTaskBoard({ steps, statuses, onToggle, onManage, onFinish }) {
  const done = steps.filter((step) => statuses[step.id] === 'done').length
  const skipped = steps.filter((step) => statuses[step.id] === 'skipped').length
  const remaining = steps.length - done - skipped
  return <article className="gs-tonight-tasks tonight-board" aria-labelledby="tonight-heading" data-density={steps.length > 12 ? 'compact' : 'comfortable'}>
    <header className="tonight-board__header">
      <h1 id="tonight-heading">今晚要做 {steps.length} 件事</h1>
      <div className="tonight-board__progress">
        <span role="status" aria-live="polite" aria-atomic="true"><strong>{done} / {steps.length}</strong> 已完成{skipped > 0 ? <small> · {skipped} 项已跳过</small> : null}</span>
        <progress value={done + skipped} max={Math.max(steps.length, 1)} aria-label="今晚已完成或跳过的准备" />
      </div>
      <button type="button" onClick={onManage}><Icon name="menu" size={18} />调整今晚任务</button>
    </header>
    <div className="gs-task-grid tonight-board__grid" role="group" aria-label="今晚任务清单" tabIndex={0}>
      {steps.map((step, index) => {
        const status = statuses[step.id] || 'todo'
        const hint = status === 'done' ? '，已完成，再点可撤销' : status === 'skipped' ? '，今晚已跳过，点按标记完成' : ''
        return <button type="button" key={step.id} className={`tonight-task${status === 'done' ? ' is-done' : status === 'skipped' ? ' is-skipped' : ''}`} onClick={() => onToggle(step)} aria-pressed={status === 'done'} aria-label={`${step.title}${hint}`} title={`${step.title}${hint}`}>
          <b className="tonight-task__number" aria-hidden="true">{index + 1}</b>
          <AssetArt id={step.icon} decorative />
          <strong className="tonight-task__title">{step.title}{status === 'skipped' ? <small>今晚先跳过</small> : null}</strong>
          <span className="tonight-task__mark" aria-hidden="true">{status === 'done' ? <Icon name="check" size={16} /> : status === 'skipped' ? '−' : null}</span>
        </button>
      })}
      {steps.length === 0 ? <p className="tonight-board__empty">今晚没有安排任务，安心休息吧。</p> : null}
    </div>
    <button className="gs-felt-button gs-felt-button--primary gs-tonight-finish" type="button" disabled={remaining > 0} onClick={onFinish}>
      <Icon name={remaining ? 'moon' : 'star'} /><span>{remaining ? `再完成 ${remaining} 项，就去月光花园` : '完成今晚任务，去月光花园'}</span>
    </button>
  </article>
}
