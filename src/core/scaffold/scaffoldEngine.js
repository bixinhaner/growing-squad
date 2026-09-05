import { sessionsForProfile } from '../activity/activitySelectors.js'

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
  { key: 'reading.finish', group: '阅读', title: '参与一次阅读', assetId: 'story', level: 2 },
  { key: 'responsibility.water', group: '自理', title: '带好水壶', assetId: 'wash', level: 1 },
]
export function getScaffoldStates(state, profileId) {
  return DEFAULT_CAPABILITIES.map((c) => ({ ...c, id: `${profileId}:${c.key}`, profileId,
    ...(state.scaffold?.states?.[`${profileId}:${c.key}`] || {}), evidence: scaffoldEvidence(state, profileId, c.key) }))
}
export function getScaffoldSuggestion(states) {
  const candidate = states.filter((s) => s.evidence.confirmedCount >= 3 && s.evidence.independentRate >= .75 && s.evidence.helpRate <= .25 && Number(s.level || 0) < 4)
    .sort((a, b) => b.evidence.confirmedCount - a.evidence.confirmedCount)[0]
  if (!candidate) return null
  const nextLevel = Math.min(4, Number(candidate.level || 0) + 1)
  return { capabilityId: candidate.id, nextLevel, title: `${candidate.title}有 ${candidate.evidence.independentCount} 次明确的独立完成记录。`,
    body: `可以和孩子商量，试试“${SCAFFOLD_LEVELS[nextLevel].label}”。依据是最近 ${candidate.evidence.confirmedCount} 次有明确陪伴方式的记录，不是因为没有点击求助；随时可以恢复帮助。`, evidence: candidate.evidence }
}
export function scaffoldEvidence(state, profileId, capabilityKey) {
  const moduleId = capabilityKey.split('.')[0]
  let sessions = sessionsForProfile(state.modules?.[moduleId]?.sessions || (moduleId === 'bedtime' ? state.sessions : {}), profileId)
  const stepId = capabilityKey === 'bedtime.wash' ? 'wash' : 'backpack'
  if (moduleId === 'bedtime') sessions = sessions.filter((s) => s.stepStatus?.[stepId])
  if (moduleId === 'responsibility') sessions = sessions.filter((s) => s.capabilityKey === capabilityKey || s.capabilityKeys?.includes(capabilityKey))
  const records = sessions.sort((a, b) => Number(b.completedAt || b.routineCompletedAt || b.startedAt) - Number(a.completedAt || a.routineCompletedAt || a.startedAt)).slice(0, 8).map((s) => {
    const at = s.completedAt || s.routineCompletedAt || s.startedAt
    const completed = moduleId === 'bedtime' ? s.stepStatus[stepId] === 'done' : Boolean(s.completedAt)
    const observation = s.supportEvidence?.[`${profileId}:${capabilityKey}`] || (s.profileId === profileId ? s.supportEvidence?.[capabilityKey] : null)
    const confirmed = observation?.source === 'parent' && ['independent', 'together', 'helped'].includes(observation.mode)
    const helped = Boolean((confirmed && observation.mode === 'helped') || s.helpRequestedAt || (s.helpRequests || []).some((r) => r.profileId === profileId))
    return { at, sessionId: s.id, completed, helped, confirmed, independent: Boolean(completed && confirmed && observation.mode === 'independent' && !helped) }
  })
  const count = records.length, confirmedCount = records.filter((r) => r.confirmed).length
  const independentCount = records.filter((r) => r.independent).length, helpCount = records.filter((r) => r.helped).length
  return { count, confirmedCount, unknownCount: count - confirmedCount, independentCount, helpCount,
    independentRate: confirmedCount ? independentCount / confirmedCount : 0, helpRate: count ? helpCount / count : 0, records }
}
