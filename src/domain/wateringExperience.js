const EXPERIENCES = {
  early: {
    duration: 18000,
    reducedDuration: 5200,
    starCount: 3,
    bloomAt: 4400,
    phases: [
      { at: 0, key: 'arrive', text: '今晚的努力，落进花园' },
      { at: 1800, key: 'water', text: '小花正在大口喝水' },
      { at: 4700, key: 'bloom', text: '提前完成，让月光花盛开得更明亮' },
      { at: 7600, key: 'gather', text: '看，星光果实一颗一颗飞来了' },
      { at: 11200, key: 'reward', text: '今晚的星光已经装进奖励宝箱' },
      { at: 15000, key: 'remember', text: '花园记住了今晚的努力' },
    ],
  },
  'on-time': {
    duration: 13000,
    reducedDuration: 4300,
    starCount: 1,
    bloomAt: 3600,
    phases: [
      { at: 0, key: 'arrive', text: '今晚的努力，落进花园' },
      { at: 1700, key: 'water', text: '小花正在大口喝水' },
      { at: 4000, key: 'bloom', text: '按时完成，月光花盛开了' },
      { at: 6500, key: 'fruit', text: '一颗纪念果实亮起来了' },
      { at: 9800, key: 'remember', text: '花园记住了今晚的坚持' },
    ],
  },
  'after-target': {
    duration: 10000,
    reducedDuration: 3400,
    starCount: 0,
    bloomAt: 2900,
    phases: [
      { at: 0, key: 'arrive', text: '今晚的努力，落进花园' },
      { at: 1400, key: 'water', text: '小花正在慢慢喝水' },
      { at: 3300, key: 'bloom', text: '虽然错过星光时间，小花依然盛开' },
      { at: 6100, key: 'kind', text: '今晚没有扣分，完成本身也值得纪念' },
      { at: 8200, key: 'tomorrow', text: '晚安，明晚还有新的星光' },
    ],
  },
  completed: {
    duration: 10000,
    reducedDuration: 3400,
    starCount: 0,
    bloomAt: 2900,
    phases: [
      { at: 0, key: 'arrive', text: '今晚的努力，落进花园' },
      { at: 1400, key: 'water', text: '小花正在慢慢喝水' },
      { at: 3300, key: 'bloom', text: '完成本身，也会让小花慢慢长大' },
      { at: 6100, key: 'kind', text: '花园记住了今晚的坚持' },
      { at: 8200, key: 'tomorrow', text: '晚安，明天见' },
    ],
  },
}

export function getWateringExperience(outcome, reducedMotion = false) {
  const experience = EXPERIENCES[outcome] || EXPERIENCES.completed
  if (!reducedMotion) return experience
  const scale = experience.reducedDuration / experience.duration
  return {
    ...experience,
    duration: experience.reducedDuration,
    bloomAt: Math.round(experience.bloomAt * scale),
    phases: experience.phases.map((phase) => ({ ...phase, at: Math.round(phase.at * scale) })),
  }
}
