export const SCAFFOLD_LEVELS = [
  { id: 0, label: '一起做', childLabel: '和家长一起' },
  { id: 1, label: '我来选', childLabel: '我来选' },
  { id: 2, label: '提醒一次', childLabel: '提醒我一次' },
  { id: 3, label: '自己开始', childLabel: '我自己来' },
  { id: 4, label: '安静陪伴', childLabel: '需要时再帮我' },
]

export const DEFAULT_CAPABILITIES = [
  { key: 'bedtime.wash', group: '晚间成长', title: '睡前洗漱', assetId: 'wash', level: 2 },
  { key: 'bedtime.pack-bag', group: '晚间成长', title: '整理书包', assetId: 'backpack', level: 2 },
  { key: 'reading.start', group: '阅读', title: '自己开始阅读', assetId: 'story', level: 1 },
  { key: 'reading.finish', group: '阅读', title: '坚持读完一本书', assetId: 'book', level: 2 },
  { key: 'responsibility.water', group: '自理', title: '带好水壶', assetId: 'wash', level: 1 },
]

export function getScaffoldStates(state, profileId) {
  return DEFAULT_CAPABILITIES.map((capability) => {
    const key = `${profileId}:${capability.key}`
    return { ...capability, id: key, profileId, ...(state.scaffold?.states?.[key] || {}) }
  })
}

export function getScaffoldSuggestion(states) {
  const packBag = states.find((item) => item.key === 'bedtime.pack-bag') || states[0]
  if (!packBag) return null
  const nextLevel = Math.min(4, Number(packBag.level || 0) + 1)
  return {
    capabilityId: packBag.id,
    nextLevel,
    title: `整理书包现在使用“${SCAFFOLD_LEVELS[Number(packBag.level || 0)].label}”。`,
    body: `如果孩子最近做起来比较轻松，下周可以试试“${SCAFFOLD_LEVELS[nextLevel].label}”。觉得吃力时随时调回来。`,
  }
}
