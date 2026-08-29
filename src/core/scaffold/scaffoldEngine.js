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
    return { ...capability, id: key, profileId, ...(state.scaffold?.states?.[key] || {}), evidence: scaffoldEvidence(state, profileId, capability.key) }
  })
}

export function getScaffoldSuggestion(states) {
  const candidate = states
    .filter((item) => item.evidence.count >= 3)
    .filter((item) => item.evidence.independentRate >= 0.75 && item.evidence.helpRate <= 0.25)
    .filter((item) => Number(item.level || 0) < 4)
    .sort((left, right) => right.evidence.count - left.evidence.count || right.evidence.independentRate - left.evidence.independentRate)[0]
  if (!candidate) return null
  const nextLevel = Math.min(4, Number(candidate.level || 0) + 1)
  return {
    capabilityId: candidate.id,
    nextLevel,
    title: `${candidate.title}最近 ${candidate.evidence.independentCount} 次能独立完成。`,
    body: `可以试一周“${SCAFFOLD_LEVELS[nextLevel].label}”。这是根据最近 ${candidate.evidence.count} 次记录提出的建议；觉得吃力时随时调回来。`,
    evidence: candidate.evidence,
  }
}

function newest(values, timeKey) {
  return values.filter(Boolean).sort((left, right) => Number(right[timeKey] || 0) - Number(left[timeKey] || 0)).slice(0, 8)
}

export function scaffoldEvidence(state, profileId, capabilityKey) {
  let records = []
  if (capabilityKey.startsWith('bedtime.')) {
    const stepId = capabilityKey === 'bedtime.wash' ? 'wash' : 'backpack'
    const sessions = Object.values(state.modules?.bedtime?.sessions || state.sessions || {}).filter((item) => item.profileId === profileId && item.stepStatus?.[stepId])
    records = newest(sessions, 'routineCompletedAt').map((item) => ({ completed: item.stepStatus[stepId] === 'done', helped: Boolean(item.helpRequestedAt), at: item.routineCompletedAt || item.startedAt }))
  } else if (capabilityKey.startsWith('reading.')) {
    const sessions = Object.values(state.modules?.reading?.sessions || {}).filter((item) => item.profileId === profileId && item.startedAt)
    records = newest(sessions, 'startedAt').map((item) => ({ completed: Boolean(item.completedAt), helped: Boolean(item.helpRequestedAt), at: item.completedAt || item.startedAt }))
  } else if (capabilityKey.startsWith('responsibility.')) {
    const sessions = Object.values(state.modules?.responsibility?.sessions || {}).filter((item) => item.profileId === profileId && item.startedAt)
    records = newest(sessions, 'startedAt').map((item) => ({ completed: Boolean(item.completedAt || item.status === 'done'), helped: Boolean(item.helpRequestedAt), at: item.completedAt || item.startedAt }))
  }
  const count = records.length
  const independentCount = records.filter((item) => item.completed && !item.helped).length
  const helpCount = records.filter((item) => item.helped).length
  return { count, independentCount, helpCount, independentRate: count ? independentCount / count : 0, helpRate: count ? helpCount / count : 0, records }
}
