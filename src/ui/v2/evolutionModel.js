import { activityMomentsFor, unresolvedHelpFor } from '../../core/activity/activitySelectors.js'

export const MEMORY_FILTERS = [
  ['all', '全部'], ['reading', '故事'], ['movement', '运动'],
  ['responsibility', '家人'], ['inventor', '发明'], ['bedtime', '晚安'], ['core', '日常'], ['encouragement', '鼓励'],
]
export function filterMemories(moments, category = 'all', query = '') {
  const needle = query.trim().toLocaleLowerCase('zh-CN')
  return moments.filter((m) => (category === 'all' || m.sourceModule === category) && (!needle || `${m.title || ''} ${m.note || ''}`.toLocaleLowerCase('zh-CN').includes(needle)))
}
export function nextBedtimeStep(steps, statuses) {
  return steps.find((step) => step.enabled !== false && (!statuses[step.id] || statuses[step.id] === 'todo')) || null
}
export function familyPulse(state, now) {
  return state.profiles.map((profile) => {
    const moments = activityMomentsFor(state, profile.id).filter((m) => m.at <= now)
    return { profile, latest: moments[0] || null, help: unresolvedHelpFor(state, profile.id).length,
      wishes: (state.rewardRequests || state.rewards?.requests || []).filter((r) => r.profileId === profile.id && r.status === 'pending').length }
  })
}
export function sectionName(path) {
  const groups = [
    ['overview', '今天'], ['report', '成长记录'], ['schedule', '作息与提醒'], ['routine', '睡前流程'],
    ['rewards', '愿望与鼓励'], ['profile', '家庭设置'], ['support', '陪伴与观察'], ['reading', '家庭书架'],
    ['movement', '运动游戏'], ['responsibility', '家庭角色'], ['inventor', '发明工坊'], ['assistant', '成长助手'],
    ['timeline', '全天安排'], ['accessibility', '声音与易用性'], ['devices', '家庭设备'], ['data', '数据与安全'], ['sync', '同步状态'],
  ]
  return groups.find(([part]) => path === `/parent/${part}`)?.[1] || '家长区'
}
