import { StrictMode, useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Modal } from './Shared.jsx'

function Example() {
  const [open, setOpen] = useState(false)
  return <><button onClick={() => setOpen(true)}>添加家里的书</button>{open ? <Modal title="书籍编辑" onClose={() => setOpen(false)}><label>书名<input autoFocus /></label></Modal> : null}</>
}

describe('dialog focus ownership', () => {
  it('restores the trigger even when a child input used autoFocus, including StrictMode', async () => {
    const user = userEvent.setup()
    render(<StrictMode><Example /></StrictMode>)
    const trigger = screen.getByRole('button', { name: '添加家里的书' })
    await user.click(trigger)
    expect(screen.getByRole('dialog', { name: '书籍编辑' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
