import { dayTypeFor, getRoutine, getSchedule, getSession, isRoutineOpen, localDateKey, timeToMinutes } from '../../domain/model.js'
import { getTodayDecision } from './todayDecisions.js'

export const ROUTINE_PERIODS = ['morning', 'after-school', 'evening']
const PERIOD_LABELS = { morning: '早晨', 'after-school': '放学后', evening: '晚饭后' }

export function defaultRoutinesFor(profileId) {
  return [
    { id: `core-${profileId}-morning`, profileId, period: 'morning', name: '晨间准备', startTime: '07:00', endTime: '08:20', enabled: true,
      items: [{ id: 'morning-ready', title: '穿好衣服，准备出发', assetId: 'pajamas', estimatedMinutes: 8, required: false }] },
    { id: `core-${profileId}-after-school`, profileId, period: 'after-school', name: '放学后', startTime: '15:30', endTime: '18:30', enabled: true,
      items: [{ id: 'after-free', title: '先放松一下', assetId: 'park', estimatedMinutes: 20, required: false, kind: 'free' },
        { id: 'after-bag', title: '收拾书包', assetId: 'backpack', estimatedMinutes: 5, required: false },
        { id: 'after-story', title: '读一个故事', assetId: 'story', estimatedMinutes: 10, required: false }] },
    { id: `core-${profileId}-evening`, profileId, period: 'evening', name: '晚间成长', startTime: '19:00', endTime: '21:30', enabled: true,
      items: [{ id: 'evening-family', title: '和家人聊聊天', assetId: 'heart', estimatedMinutes: 10, required: false },
        { id: 'evening-bedtime', title: '开始今晚的小任务', assetId: 'pillow', estimatedMinutes: 20, required: true, route: '/tonight' }] },
  ]
}

export function getCoreRoutines(state, profileId) {
  const stored = state.modules?.core?.routines?.filter((routine) => routine.profileId === profileId)
  return stored?.length ? stored : defaultRoutinesFor(profileId)
}

export function findCurrentPeriod(now = new Date()) {
  const minutes = now.getHours() * 60 + now.getMinutes()
  return minutes < 660 ? 'morning' : minutes < 1110 ? 'after-school' : 'evening'
}

export function deriveTodayCandidate(state, profileId, now = new Date()) {
  const dateKey = localDateKey(now)
  const dayType = dayTypeFor(now)
  const schedule = getSchedule(state, dayType, dateKey, profileId)
  const session = getSession(state, dateKey, profileId)
  const period = findCurrentPeriod(now)
  const free = { id: `free:${profileId}:${dateKey}:${period}`, period, context: PERIOD_LABELS[period], moduleId: 'core',
    title: '现在是你的自由时间', subtitle: '去玩、去看书，或者什么都不做都可以。', options: [], supportActions: [], free: true }
  if (session?.status === 'goodnight') return { ...free, title: '今晚已经准备好了', subtitle: '放下屏幕，安心休息。' }
  if (isRoutineOpen(schedule, now) || Boolean(session)) {
    const steps = getRoutine(state, dayType, profileId).steps.filter((step) => step.enabled)
    const remaining = steps.filter((step) => (session?.stepStatus?.[step.id] || 'todo') === 'todo').length
    return { id: `bedtime:${profileId}:${dateKey}`, period: 'evening', context: '晚间成长', moduleId: 'bedtime', route: '/tonight',
      title: remaining ? `今晚还有 ${remaining} 件小事` : '今晚的小任务完成啦', subtitle: '不赶时间，一件一件慢慢来。',
      options: [{ id: 'bedtime', title: remaining ? '继续今晚的小任务' : '准备上床', assetId: 'pillow', route: '/tonight' }], supportActions: [] }
  }
  const minutes = now.getHours() * 60 + now.getMinutes()
  const routine = getCoreRoutines(state, profileId).find((item) => {
    if (item.enabled === false) return false
    const start = timeToMinutes(item.startTime), end = timeToMinutes(item.endTime)
    return start <= end ? minutes >= start && minutes < end : minutes >= start || minutes < end
  })
  if (!routine) return free
  const decision = getTodayDecision(state, profileId, dateKey, routine.id)
  if (decision.skippedRoutineId === routine.id) return free
  const base = { id: routine.id, routineId: routine.id, period: routine.period, context: PERIOD_LABELS[routine.period], moduleId: 'core' }
  if (decision.completedAt) return { ...base, title: '这件事完成啦', subtitle: '接下来是你的时间，不用马上做下一件。', options: [], supportActions: [], completed: true }
  const selected = routine.items.find((item) => item.id === decision.selectedItemId)
  const options = selected ? [{ ...selected, action: 'complete' }] : routine.items.filter((item) => item.kind !== 'free').slice(0, 2)
  if (!options.length) return free
  if (Number(decision.laterUntil) > now.getTime()) return { ...base, title: '先安心休息一会儿', subtitle: '不用守着屏幕，准备好也可以提前回来。',
    options: options.map((item) => ({ ...item, action: 'resume' })), paused: true, laterUntil: decision.laterUntil, supportActions: ['skip'] }
  return { ...base, title: selected ? `正在做：${selected.title}` : options.length > 1 ? '现在想先做哪一件？' : options[0].title,
    subtitle: selected ? '去做吧，做完再回来告诉眠眠。' : '选一个就好，也可以今天先休息。', options,
    supportActions: ['together', 'help', 'skip', 'later'], inProgress: Boolean(selected) }
}

export function inspectRoutineLoad(routines) {
  const warnings = []
  for (const routine of routines) {
    const structured = routine.items.filter((item) => item.kind !== 'free')
    const required = structured.filter((item) => item.required)
    const totalMinutes = structured.reduce((sum, item) => sum + Number(item.estimatedMinutes || 0), 0)
    if (routine.period === 'after-school' && structured.length > 4) warnings.push('放学后超过 4 个结构化活动')
    if (routine.period === 'after-school' && !routine.items.some((item) => item.kind === 'free')) warnings.push('放学后没有自由玩耍时间')
    if (required.length > 1) warnings.push('同时安排了多个“必须完成”')
    if (routine.period === 'evening' && totalMinutes > Math.max(30, timeToMinutes(routine.endTime) - timeToMinutes(routine.startTime))) warnings.push('晚间活动预计时长超过时间窗口')
  }
  return [...new Set(warnings)]
}
