import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { TonightTaskBoard } from './TonightTaskBoard.jsx'

afterEach(cleanup)
const steps = [
  { id: 'brush', title: '刷牙', icon: 'brush' },
  { id: 'clothes', title: '收拾明天的衣服', icon: 'pajamas' },
  { id: 'story', title: '读故事', icon: 'story' },
]
function board(statuses = {}, overrides = {}) {
  const callbacks = { onToggle: vi.fn(), onManage: vi.fn(), onFinish: vi.fn() }
  render(<TonightTaskBoard steps={steps} statuses={statuses} {...callbacks} {...overrides} />)
  return callbacks
}
describe('tonight overview only', () => {
  it('shows every complete task name without a focus switch or a featured first row', () => {
    board()
    const grid = screen.getByRole('group', { name: '今晚任务清单' })
    expect(within(grid).getAllByRole('button')).toHaveLength(3)
    expect(within(grid).getByText('收拾明天的衣服')).toBeVisible()
    expect(screen.queryByRole('button', { name: '专注一件' })).toBeNull()
    expect(screen.queryByRole('group', { name: '睡前查看方式' })).toBeNull()
    expect(within(grid).getAllByRole('button').every((button) => button.className === 'tonight-task')).toBe(true)
  })
  it('keeps the original step ID and order when completing any task', () => {
    const { onToggle } = board()
    fireEvent.click(screen.getByRole('button', { name: '收拾明天的衣服' }))
    expect(onToggle).toHaveBeenCalledWith(steps[1])
    expect(within(screen.getByRole('group')).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(steps.map((s) => s.title))
  })
  it('exposes reversible completed state without moving the card', () => {
    const { onToggle } = board({ brush: 'done' })
    const button = screen.getByRole('button', { name: '刷牙，已完成，再点可撤销' })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(button)
    expect(onToggle).toHaveBeenCalledWith(steps[0])
  })
  it('reports skipped separately rather than calling it a completion', () => {
    board({ clothes: 'skipped' })
    expect(screen.getByRole('status')).toHaveTextContent('0 / 3 已完成 · 1 项已跳过')
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '1')
    expect(screen.getByRole('button', { name: /收拾明天的衣服，今晚已跳过/ })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: /再完成 2 项/ })).toBeDisabled()
  })
  it('keeps finishing disabled while preparation remains', () => {
    const { onFinish } = board({ brush: 'done' })
    const finish = screen.getByRole('button', { name: /再完成 2 项/ })
    fireEvent.click(finish)
    expect(onFinish).not.toHaveBeenCalled()
  })
  it('continues through the original finish handler once all items are handled', () => {
    const { onFinish } = board({ brush: 'done', clothes: 'skipped', story: 'done' })
    fireEvent.click(screen.getByRole('button', { name: '完成今晚任务，去月光花园' }))
    expect(onFinish).toHaveBeenCalledOnce()
  })
  it('keeps adjustment available from the compact header', () => {
    const { onManage } = board()
    fireEvent.click(screen.getByRole('button', { name: '调整今晚任务' }))
    expect(onManage).toHaveBeenCalledOnce()
  })
  it('has a truthful empty state without creating replacement tasks', () => {
    board({}, { steps: [] })
    expect(screen.getByText('今晚没有安排任务，安心休息吧。')).toBeVisible()
    expect(within(screen.getByRole('group')).queryAllByRole('button')).toHaveLength(0)
  })
})
