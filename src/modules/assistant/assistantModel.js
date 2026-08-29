import { getScaffoldStates, getScaffoldSuggestion } from '../../core/scaffold/scaffoldEngine.js'
import { movementSessionsFor } from '../movement/movementModel.js'
import { readingSessionsFor } from '../reading/readingModel.js'
import { activeInventorProject } from '../inventor/inventorModel.js'

export const DEFAULT_ASSISTANT_SETTINGS = {
  enabled: false,
  childOneQuestion: false,
  externalUpload: false,
  scopes: { activitySummary: true, childQuotes: false, media: false },
}

export function assistantState(state) {
  return { version: 1, settingsByProfile: {}, suggestions: {}, reflections: {}, ...(state.modules?.assistant || {}) }
}

export function assistantSettings(state, profileId = state.activeProfileId) {
  const saved = assistantState(state).settingsByProfile[profileId] || {}
  return { ...DEFAULT_ASSISTANT_SETTINGS, ...saved, scopes: { ...DEFAULT_ASSISTANT_SETTINGS.scopes, ...saved.scopes } }
}

export function assistantSuggestions(state, profileId = state.activeProfileId) {
  return Object.values(assistantState(state).suggestions).filter((item) => item.profileId === profileId).sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt))
}

const inRange = (timestamp, start, end) => Number(timestamp) >= start && Number(timestamp) < end

export function buildWeeklyReport(state, profileId = state.activeProfileId, now = Date.now()) {
  const end = Number(now)
  const start = end - 7 * 86400000
  const bedtime = Object.values(state.modules?.bedtime?.sessions || {}).filter((item) => item.profileId === profileId && inRange(item.inBedAt || item.routineCompletedAt, start, end))
  const reading = readingSessionsFor(state, profileId).filter((item) => item.completedAt && inRange(item.completedAt, start, end))
  const movement = movementSessionsFor(state, profileId).filter((item) => item.completedAt && inRange(item.completedAt, start, end))
  const responsibility = Object.values(state.modules?.responsibility?.sessions || {}).filter((item) => item.profileId === profileId && item.completedAt && inRange(item.completedAt, start, end))
  const inventor = (state.modules?.inventor?.projects || []).filter((item) => item.profileId === profileId && inRange(item.updatedAt, start, end))
  const decisions = Object.entries(state.modules?.core?.todayDecisions || {}).filter(([key, item]) => key.startsWith(`${profileId}:`) && inRange(item.completedAt || item.selectedAt || item.laterAt, start, end)).map(([, item]) => item)
  const supportCount = decisions.filter((item) => ['help', 'together'].includes(item.supportMode)).length
    + reading.filter((item) => item.helpRequestedAt).length
    + movement.filter((item) => item.helpRequestedAt).length
  const total = bedtime.length + reading.length + movement.length + responsibility.length + inventor.length
  return {
    start,
    end,
    total,
    supportCount,
    headline: total ? `这周留下了 ${total} 个真实成长片段` : '这一周还在等第一个成长片段',
    subline: supportCount ? `其中 ${supportCount} 次，孩子清楚地表达了“陪我一下”。` : '孩子按自己的节奏行动，需要帮助时也可以随时开口。',
    moments: [
      { id: 'bedtime', title: '晚间节奏', value: bedtime.length, unit: '个夜晚', copy: bedtime.length ? '完成就是积累，不把晚一点当失败。' : '完成今晚流程后，这里会留下记录。' },
      { id: 'movement', title: '身体能量', value: movement.length, unit: '次活动', copy: '看见孩子愿意开始，而不是比较运动量。' },
      { id: 'reading', title: '故事时光', value: reading.length, unit: '次阅读', copy: '读完、听完、一起读，都算真实参与。' },
      { id: 'family', title: '一起生活', value: responsibility.length + inventor.length, unit: '个片段', copy: '责任和创造都来自家里真实发生的事。' },
    ],
  }
}

export function buildAssistantSuggestions(state, profileId = state.activeProfileId) {
  const settings = assistantSettings(state, profileId)
  if (!settings.scopes.activitySummary) return [{
    id: `suggestion:${profileId}:private:${Math.floor(Date.now() / 604800000)}`,
    kind: 'activity',
    title: '让孩子自己选一件想继续的事',
    body: '当前没有读取活动摘要。这是一条通用建议：只问孩子想继续什么，不根据历史记录推断。',
    evidence: '通用建议 · 未读取活动记录',
  }]
  const scaffold = getScaffoldSuggestion(getScaffoldStates(state, profileId))
  const project = activeInventorProject(state, profileId)
  const report = buildWeeklyReport(state, profileId)
  return [
    scaffold ? { id: `suggestion:${profileId}:scaffold:${scaffold.capabilityId}`, kind: 'support', title: '下周可以少帮一步', body: scaffold.body, evidence: '来自孩子与支持中的当前陪伴层级' } : null,
    project ? { id: `suggestion:${profileId}:inventor:${project.id}`, kind: 'knowledge', title: `把“${project.title}”做成一张发现卡`, body: '保留孩子测试时发现的线索，家长确认后再收进成长记录。', evidence: '来自发明家工坊的最近项目' } : null,
    { id: `suggestion:${profileId}:week:${Math.floor(Date.now() / 604800000)}`, kind: 'activity', title: report.total ? '选一个片段，让孩子讲给家里听' : '从一个五分钟小行动开始', body: report.total ? '不复盘对错，只问：“你最想留下哪一件事？”' : '让孩子自己从阅读、运动或家务里选一件，不设置完成排名。', evidence: '来自本周本地活动摘要' },
  ].filter(Boolean).slice(0, 3)
}

export function childAssistantPrompt(state, profileId = state.activeProfileId) {
  const settings = assistantSettings(state, profileId)
  if (!settings.enabled || !settings.childOneQuestion) return null
  const project = settings.scopes.activitySummary ? activeInventorProject(state, profileId) : null
  if (project && ['learning', 'iteration', 'showcase'].includes(project.status)) return {
    id: `inventor:${project.id}:feeling`,
    eyebrow: '眠眠只问一个问题',
    question: `做“${project.title}”时，哪一刻最像小发明家？`,
    choices: [
      { id: 'found', title: '发现新线索', copy: '我看见了以前没注意到的事' },
      { id: 'changed', title: '动手改一改', copy: '我让它比第一版更好用' },
      { id: 'shared', title: '讲给别人听', copy: '我能说出它为什么这样做' },
    ],
  }
  return {
    id: `week:${Math.floor(Date.now() / 604800000)}:moment`,
    eyebrow: '眠眠只问一个问题',
    question: '今天哪件小事最想留在成长地图里？',
    choices: [
      { id: 'started', title: '我自己开始了', copy: '没有一直等大人提醒' },
      { id: 'tried', title: '我愿意试一试', copy: '不一定成功，也有新发现' },
      { id: 'helped', title: '我帮助了家里', copy: '大家一起做更轻松' },
    ],
  }
}
