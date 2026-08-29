import { appPath } from '../../data/paths.js'

export const INVENTOR_STAGES = [
  { id: 'problem_defined', short: '发现麻烦', title: '我发现了什么麻烦？', image: 'problem' },
  { id: 'sketching', short: '画一画', title: '先把办法画下来', image: 'sketch' },
  { id: 'prototype_1', short: '第一版', title: '先做一个能试的版本', image: 'building-v1' },
  { id: 'testing', short: '试一试', title: '这次试出了什么？', image: 'testing' },
  { id: 'learning', short: '学一点', title: '需要时再学一个小线索', image: 'clue' },
  { id: 'iteration', short: '第二版', title: '带着线索再改一版', image: 'prototype-v2' },
  { id: 'showcase', short: '发布会', title: '把发明故事讲给家人', image: 'showcase' },
]

export const IDEA_SEEDS = [
  { id: 'hair-robot', title: '洗头机器人', problem: '洗头时水会进眼睛', helpsWho: '我自己', image: 'problem' },
  { id: 'rain-cover', title: '雨天书包保护罩', problem: '下雨时书包容易淋湿', helpsWho: '我自己', image: 'sketch' },
  { id: 'focus-helper', title: '专注小助手', problem: '做一件事时容易忘记下一步', helpsWho: '家人', image: 'building-v1' },
]

export const TEST_FINDINGS = [
  { id: 'front-worked', title: '前面挡住了' },
  { id: 'side-leaks', title: '两边还会漏' },
  { id: 'too-loose', title: '戴起来有点松' },
]

export const NEXT_CHANGES = [
  { id: 'wrap-sides', title: '把两边围起来' },
  { id: 'fit-better', title: '让它更贴合' },
  { id: 'another-way', title: '我有别的办法' },
]

export const KNOWLEDGE_CARDS = [
  { id: 'wraparound', title: '围住，比只挡前面更稳', copy: '只挡前面，水会从两边跑出来。让挡水边绕到两侧，水更容易顺着边缘流走。', image: 'knowledge-wraparound.webp' },
  { id: 'adjustable-band', title: '能调一调，会更贴合', copy: '每个人的头围不同。让带子可以重叠一点，就能舒服地贴合。', image: 'knowledge-adjustable-band.webp' },
  { id: 'water-path', title: '先给水安排一条路', copy: '水总会往低处走。用弯曲的边缘把水带到盆里，比硬挡住更可靠。', image: 'knowledge-water-path.webp' },
]

export const SHOWCASE_METHODS = [
  { id: 'live', title: '边做边讲' },
  { id: 'video', title: '播放我的30秒演示' },
  { id: 'parent-words', title: '请家长读我的原话' },
]

export const inventorImage = (name) => appPath(`assets/inventor/hair-robot-${name}.webp`)
export const knowledgeImage = (name) => appPath(`assets/inventor/${name}`)

export function inventorStage(status) {
  return INVENTOR_STAGES.find((item) => item.id === status) || INVENTOR_STAGES[0]
}

export function knowledgeCard(id) {
  return KNOWLEDGE_CARDS.find((item) => item.id === id) || KNOWLEDGE_CARDS[0]
}
