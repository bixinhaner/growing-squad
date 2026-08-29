import { dayTypeFor, getSchedule, localDateKey, timeToMinutes } from '../../domain/model.js'

export const REMINDER_PRIORITIES = { help: 100, bedtime: 70, resume: 40, suggestion: 10 }

function isQuietMinute(minute, quietStart = 22 * 60, quietEnd = 7 * 60) {
  return quietStart > quietEnd ? minute >= quietStart || minute < quietEnd : minute >= quietStart && minute < quietEnd
}

function capabilityLevel(state, profileId, capabilityKey) {
  return Number(state.scaffold?.states?.[`${profileId}:${capabilityKey}`]?.level ?? 2)
}

export function deriveReminderCandidates(state, current = new Date()) {
  const dateKey = localDateKey(current, 0)
  const currentMinute = current.getHours() * 60 + current.getMinutes()
  const candidates = []
  for (const profile of state.profiles || []) {
    const schedule = getSchedule(state, dayTypeFor(current), dateKey, profile.id)
    const bedtimeMinute = (timeToMinutes(schedule.prepareTime) - Number(schedule.reminderMinutes || 30) + 1440) % 1440
    if (schedule.reminderEnabled !== false && currentMinute === bedtimeMinute) candidates.push({ id: `bedtime:${profile.id}:${dateKey}:${bedtimeMinute}`, profileId: profile.id, kind: 'bedtime', priority: REMINDER_PRIORITIES.bedtime, title: `晚上好，${profile.name}`, body: `还有 ${schedule.reminderMinutes} 分钟开始准备，成长伙伴在等你。`, url: '/bedtime/tonight' })

    const readingHelp = Object.values(state.modules?.reading?.sessions || {}).find((item) => item.profileId === profile.id && item.helpRequestedAt && !item.completedAt)
    if (readingHelp) candidates.push({ id: `help:reading:${readingHelp.id}`, profileId: profile.id, kind: 'help', priority: REMINDER_PRIORITIES.help, title: `${profile.name}需要陪一下`, body: '阅读时遇到了需要家长一起看的地方。', url: '/bedtime/parent/reading' })
    const responsibilityHelp = Object.values(state.modules?.responsibility?.sessions || {}).find((item) => item.profileId === profile.id && item.helpRequestedAt && item.status !== 'done')
    if (responsibilityHelp) candidates.push({ id: `help:responsibility:${responsibilityHelp.id}`, profileId: profile.id, kind: 'help', priority: REMINDER_PRIORITIES.help, title: `${profile.name}需要陪一下`, body: '家庭小角色正在等待家长回应。', url: '/bedtime/parent/responsibility' })

    const delayed = state.modules?.core?.todayDecisions?.[`${profile.id}:${dateKey}`]
    if (delayed?.laterUntil && Math.abs(Number(delayed.laterUntil) - current.getTime()) < 60_000 && capabilityLevel(state, profile.id, 'today.start') < 3) candidates.push({ id: `resume:${profile.id}:${dateKey}:${delayed.laterUntil}`, profileId: profile.id, kind: 'resume', priority: REMINDER_PRIORITIES.resume, title: '想再看看刚才的小行动吗？', body: '可以继续，也可以今天先不做。', url: '/bedtime/today' })
  }
  return candidates
    .filter((item) => item.kind === 'help' || !isQuietMinute(currentMinute))
    .sort((left, right) => right.priority - left.priority)
}

export function selectReminderCandidates(candidates, sentIds = new Set(), limit = 3) {
  const profileKinds = new Set()
  return candidates.filter((item) => {
    if (sentIds.has(item.id)) return false
    const key = `${item.profileId}:${item.kind}`
    if (profileKinds.has(key)) return false
    profileKinds.add(key)
    return true
  }).slice(0, limit)
}
