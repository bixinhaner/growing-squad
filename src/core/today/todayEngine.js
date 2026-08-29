import { dayTypeFor, getRoutine, getSchedule, getSession, isRoutineOpen, localDateKey, timeToMinutes } from '../../domain/model.js'

export const ROUTINE_PERIODS = ['morning', 'after-school', 'evening']

const PERIOD_LABELS = {
  morning: '早晨',
  'after-school': '放学后',
  evening: '晚饭后',
}

export function defaultRoutinesFor(profileId) {
  return [
    {
      id: `core-${profileId}-morning`, profileId, period: 'morning', name: '晨间准备',
      startTime: '07:00', endTime: '08:20', enabled: true,
      items: [
        { id: 'morning-ready', title: '穿好衣服，准备出发', assetId: 'pajamas', estimatedMinutes: 8, required: false },
      ],
    },
    {
      id: `core-${profileId}-after-school`, profileId, period: 'after-school', name: '放学后',
      startTime: '15:30', endTime: '18:30', enabled: true,
      items: [
        { id: 'after-free', title: '先放松一下', assetId: 'park', estimatedMinutes: 20, required: false, kind: 'free' },
        { id: 'after-bag', title: '收拾书包', assetId: 'backpack', estimatedMinutes: 5, required: false },
        { id: 'after-story', title: '读一个故事', assetId: 'story', estimatedMinutes: 10, required: false },
      ],
    },
    {
      id: `core-${profileId}-evening`, profileId, period: 'evening', name: '晚间成长',
      startTime: '19:00', endTime: '21:30', enabled: true,
      items: [
        { id: 'evening-family', title: '和家人聊聊天', assetId: 'heart', estimatedMinutes: 10, required: false },
        { id: 'evening-bedtime', title: '开始今晚的小任务', assetId: 'pillow', estimatedMinutes: 20, required: true, route: '/tonight' },
      ],
    },
  ]
}

export function getCoreRoutines(state, profileId) {
  const stored = state.modules?.core?.routines?.filter((routine) => routine.profileId === profileId)
  return stored?.length ? stored : defaultRoutinesFor(profileId)
}

export function findCurrentPeriod(now = new Date()) {
  const minutes = now.getHours() * 60 + now.getMinutes()
  if (minutes < 11 * 60) return 'morning'
  if (minutes < 18 * 60 + 30) return 'after-school'
  return 'evening'
}

export function deriveTodayCandidate(state, profileId, now = new Date()) {
  const dateKey = localDateKey(now)
  const decisionKey = `${profileId}:${dateKey}`
  const decision = state.modules?.core?.todayDecisions?.[decisionKey] || {}
  const dayType = dayTypeFor(now)
  const schedule = getSchedule(state, dayType, dateKey, profileId)
  const bedtimeRoutine = getRoutine(state, dayType, profileId)
  const bedtimeSession = getSession(state, dateKey, profileId)
  const bedtimeOpen = isRoutineOpen(schedule, now) || Boolean(bedtimeSession)
  if (bedtimeOpen && bedtimeSession?.status !== 'goodnight') {
    const steps = bedtimeRoutine.steps.filter((step) => step.enabled)
    const remaining = steps.filter((step) => (bedtimeSession?.stepStatus?.[step.id] || 'todo') === 'todo').length
    return {
      id: `bedtime:${profileId}:${dateKey}`,
      period: 'evening', context: '晚间成长', moduleId: 'bedtime', route: '/tonight',
      title: remaining ? `今晚还有 ${remaining} 件小事` : '今晚的小任务完成啦',
      subtitle: remaining ? '眠眠陪你一件一件做完' : '去确认上床，花园就会亮起来',
      options: [{ id: 'bedtime', title: remaining ? '继续今晚的小任务' : '准备上床', assetId: 'pillow', route: '/tonight' }],
      supportActions: ['together', 'help', 'later'],
    }
  }

  const period = findCurrentPeriod(now)
  const routine = getCoreRoutines(state, profileId).find((item) => item.period === period && item.enabled !== false)
    || getCoreRoutines(state, profileId).find((item) => item.enabled !== false)
  const skipped = decision.skippedRoutineId === routine?.id
  if (!routine || skipped) return {
    id: `free:${profileId}:${dateKey}:${period}`, period, context: PERIOD_LABELS[period], moduleId: 'core',
    title: '现在是你的自由时间', subtitle: '想玩、想看书，或者什么都不做都可以', options: [], supportActions: [], free: true,
  }
  const selected = routine.items.find((item) => item.id === decision.selectedItemId)
  if (selected && !decision.completedAt) return {
    id: `${routine.id}:${selected.id}`, routineId: routine.id, period, context: PERIOD_LABELS[period], moduleId: 'core',
    title: `正在做：${selected.title}`, subtitle: '做完回来告诉我，也可以随时求助',
    options: [{ ...selected, action: 'complete' }], supportActions: ['help', 'later', 'skip'], inProgress: true,
  }
  if (decision.completedAt) return {
    id: `done:${routine.id}`, routineId: routine.id, period, context: PERIOD_LABELS[period], moduleId: 'core',
    title: '这件事完成啦', subtitle: '接下来是你的时间，不用马上做下一件', options: [], supportActions: [], completed: true,
  }
  const options = routine.items.filter((item) => item.kind !== 'free').slice(0, 2)
  return {
    id: routine.id, routineId: routine.id, period, context: PERIOD_LABELS[period], moduleId: 'core',
    title: options.length > 1 ? '现在想先做哪一件？' : (options[0]?.title || '现在是你的时间'),
    subtitle: options.length > 1 ? '选一个就好' : '按自己的节奏来', options,
    supportActions: ['together', 'help', 'skip', 'later'],
  }
}

export function inspectRoutineLoad(routines) {
  const warnings = []
  for (const routine of routines) {
    const structured = routine.items.filter((item) => item.kind !== 'free')
    const required = structured.filter((item) => item.required)
    const hasFree = routine.items.some((item) => item.kind === 'free')
    const totalMinutes = structured.reduce((sum, item) => sum + Number(item.estimatedMinutes || 0), 0)
    if (routine.period === 'after-school' && structured.length > 4) warnings.push('放学后超过 4 个结构化活动')
    if (routine.period === 'after-school' && !hasFree) warnings.push('放学后没有自由玩耍时间')
    if (required.length > 1) warnings.push('同时安排了多个“必须完成”')
    if (routine.period === 'evening' && totalMinutes > Math.max(30, timeToMinutes(routine.endTime) - timeToMinutes(routine.startTime))) warnings.push('晚间活动预计时长超过时间窗口')
  }
  return [...new Set(warnings)]
}
