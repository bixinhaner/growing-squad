import { appPath } from '../../data/paths.js'

export const READING_COVER_OPTIONS = [
  ['hedgehog-lantern', '灯笼刺猬'], ['star-path', '追星星'], ['leaf-boat', '叶子船'],
  ['four-seasons-garden', '四季菜园'], ['talking-tree', '会说话的树'], ['cloud-whisper', '云朵悄悄话'],
  ['robot-seed', '机器人种子'], ['fox-bridge', '狐狸木桥'], ['dream-train', '梦谷列车'],
  ['waiting-dinosaur', '等待的小恐龙'], ['pocket-ocean', '口袋海洋'], ['singing-tree', '唱歌的树'],
].map(([id, label]) => ({ id, label, image: appPath(`assets/reading/${id}.webp`) }))

export const READING_MODES = [
  { id: 'listen-parent', title: '听家长读', subtitle: '我来听故事', family: 'listen' },
  { id: 'follow-audio', title: '听一句跟一句', subtitle: '跟着家人的录音读', family: 'listen' },
  { id: 'audio-pause-read', title: '听听停停自己读', subtitle: '需要时再听一小段', family: 'bridge' },
  { id: 'read-together', title: '一起读', subtitle: '你一句，我一句', family: 'together', recommended: true },
  { id: 'turn-taking', title: '轮流读', subtitle: '每人读一小段', family: 'together' },
  { id: 'dialogue-role', title: '角色读', subtitle: '我读对话', family: 'together' },
  { id: 'independent-short', title: '自己读一点', subtitle: '先读一小段', family: 'independent' },
  { id: 'independent-book', title: '自己读整本', subtitle: '需要时再来帮我', family: 'independent' },
]

export const DIFFICULTY_OPTIONS = [
  { id: 'easy', title: '很轻松', copy: '这本已经很熟悉' },
  { id: 'just-right', title: '刚刚好', copy: '读起来正合适' },
  { id: 'hard', title: '有点难', copy: '下次多陪一点' },
]

export const REFLECTION_OPTIONS = [
  { id: 'tell', title: '说给它听' },
  { id: 'draw', title: '画一张图' },
  { id: 'act', title: '演给它看' },
  { id: 'skip', title: '今天先不讲' },
]

export const REFLECTION_PROMPTS = ['你最喜欢谁？', '发生了什么？', '换成你会怎么办？', '哪个地方最有趣？']

export function readingCover(id) {
  return READING_COVER_OPTIONS.find((item) => item.id === id) || READING_COVER_OPTIONS[0]
}

export function readingMode(id) {
  return READING_MODES.find((item) => item.id === id) || READING_MODES[0]
}
