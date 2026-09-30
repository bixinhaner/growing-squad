export const dateLabel = (at) => new Date(at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
export const longDate = (at) => new Date(at).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
export const clock = (at) => (at ? new Date(at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }) : null)
export const dayTitle = (dateKey) => new Date(`${dateKey}T12:00:00`).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', weekday: 'short' })
