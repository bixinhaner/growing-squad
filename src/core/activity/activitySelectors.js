import { todayDecisionsFor } from '../today/todayDecisions.js'

/** Shared sessions belong to participants, not necessarily a top-level profileId. */
export function belongsToProfile(item, profileId) {
  return item.profileId === profileId || (item.participants || []).some((p) => p.kind === 'child' && (p.profileId === profileId || p.id === `profile:${profileId}`))
}
export function sessionsForProfile(sessions, profileId) {
  return Object.values(sessions || {}).filter((item) => belongsToProfile(item, profileId))
}
export function unresolvedHelpFor(state, profileId) {
  const requests = []
  for (const moduleId of ['reading', 'movement', 'responsibility']) {
    for (const session of sessionsForProfile(state.modules?.[moduleId]?.sessions, profileId)) {
      const shared = (session.helpRequests || []).filter((r) => r.profileId === profileId && !r.resolvedAt)
      if ((session.helpRequestedAt && !session.helpResolvedAt && !session.completedAt) || shared.length) requests.push({
        id: `${moduleId}:${session.id}`, sourceModule: moduleId, sessionId: session.id, at: shared[0]?.requestedAt || session.helpRequestedAt,
        title: moduleId === 'reading' ? '阅读时需要陪一下' : moduleId === 'movement' ? '运动时需要帮一下' : '家庭小角色需要帮助', route: '/parent/support',
      })
    }
  }
  for (const decision of todayDecisionsFor(state, profileId)) {
    if (['help', 'together'].includes(decision.supportMode) && !decision.supportResolvedAt && !decision.completedAt && !decision.skippedAt && decision.supportUpdatedAt) requests.push({
      id: `today:${decision.id}`, sourceModule: 'core', decisionId: decision.id, at: decision.supportUpdatedAt, title: '日常小行动想和家长一起做', route: '/parent/support',
    })
  }
  return requests.sort((a, b) => b.at - a.at)
}

export function activityMomentsFor(state, profileId) {
  const moments = []
  const add = (item) => { if (Number.isFinite(Number(item.at)) && Number(item.at) > 0) moments.push({ ...item, at: Number(item.at), profileId }) }
  for (const s of sessionsForProfile(state.modules?.bedtime?.sessions || state.sessions, profileId)) {
    if (s.routineCompletedAt || s.inBedAt) add({ id: `bedtime:${s.id || s.dateKey}`, sourceModule: 'bedtime', title: '完成了今晚的准备', at: s.routineCompletedAt || s.inBedAt, route: '/tonight', assetId: 'pillow' })
  }
  const books = state.modules?.reading?.books || []
  for (const s of sessionsForProfile(state.modules?.reading?.sessions, profileId)) {
    if (s.completedAt) add({ id: `reading:${s.id}`, sourceModule: 'reading', title: `读了《${books.find((b) => b.id === s.bookId)?.title || '家里的书'}》`,
      at: s.completedAt, route: '/reading', assetId: 'story', note: s.reflection?.note || '', noteSource: s.reflection?.noteSource || 'unknown', participation: s.mode })
  }
  for (const s of sessionsForProfile(state.modules?.movement?.sessions, profileId)) {
    if (s.completedAt) add({ id: `movement:${s.id}`, sourceModule: 'movement', title: '玩了一次运动游戏', at: s.completedAt, route: '/movement', assetId: 'bicycle', feedback: s.feedback })
  }
  for (const s of sessionsForProfile(state.modules?.responsibility?.sessions, profileId)) {
    const participant = (s.participants || []).find((p) => p.profileId === profileId || p.id === `profile:${profileId}`)
    const participantId = participant?.id || `profile:${profileId}`
    const personalDone = (s.completedRoleIds || []).includes(participantId)
    if (personalDone && (s.roleCompletedAt?.[participantId] || s.completedAt)) add({ id: `responsibility:${s.id}`, sourceModule: 'responsibility',
      title: s.completedAt ? '和家人一起完成了小任务' : '做好了自己的小角色', at: s.roleCompletedAt?.[participantId] || s.completedAt,
      route: '/family-cottage', assetId: 'heart', participation: 'shared', groupComplete: Boolean(s.completedAt) })
    else if (s.profileId === profileId && s.completedAt) add({ id: `responsibility:${s.id}`, sourceModule: 'responsibility', title: '完成了一件家庭小事', at: s.completedAt, route: '/family-cottage', assetId: 'heart' })
  }
  for (const p of (state.modules?.inventor?.projects || []).filter((p) => p.profileId === profileId)) {
    add({ id: `inventor:${p.id}`, sourceModule: 'inventor', title: `让“${p.title}”往前走了一步`, at: p.updatedAt || p.createdAt,
      route: ['showcase', 'archived'].includes(p.status) ? `/inventor/showcase/${p.id}` : `/inventor/project/${p.id}`, assetId: 'craft' })
  }
  for (const d of todayDecisionsFor(state, profileId)) {
    if (d.completedAt) add({ id: `core:${d.id}`, sourceModule: 'core', title: d.itemTitle ? `完成了${d.itemTitle}` : '完成了一件日常小事', at: d.completedAt, route: '/today', assetId: 'courage' })
  }
  return [...new Map(moments.map((m) => [m.id, m])).values()].sort((a, b) => b.at - a.at || a.id.localeCompare(b.id))
}

export function growthSummary(state, profileId, now = Date.now(), days = 7) {
  const start = Number(now) - days * 86400000
  const moments = activityMomentsFor(state, profileId).filter((m) => m.at >= start && m.at <= Number(now))
  const counts = Object.fromEntries(['bedtime', 'movement', 'reading', 'responsibility', 'inventor', 'core'].map((id) => [id, moments.filter((m) => m.sourceModule === id).length]))
  return { start, end: Number(now), moments, counts, total: moments.length }
}

export function resumeActivity(state, profileId) {
  const sessions = sessionsForProfile(state.modules?.reading?.sessions, profileId).filter((s) => ['active', 'reflection'].includes(s.status)).sort((a, b) => b.startedAt - a.startedAt)
  for (const s of sessions) {
    const book = (state.modules?.reading?.books || []).find((b) => b.id === s.bookId && b.enabled !== false)
    if (book) return { title: book.title, eyebrow: '继续上次的故事', route: `/reading/play/${s.id}`, assetId: 'story' }
  }
  const project = (state.modules?.inventor?.projects || []).filter((p) => p.profileId === profileId && p.status !== 'archived').sort((a, b) => b.updatedAt - a.updatedAt)[0]
  return project ? { title: project.title, eyebrow: '接着探索我的想法', route: project.status === 'showcase' ? `/inventor/showcase/${project.id}` : `/inventor/project/${project.id}`, assetId: 'craft' } : null
}
