export const OBJECT_ASSETS = [
  'brush', 'wash', 'pajamas', 'story',
  'toys', 'toilet', 'backpack', 'heart',
  'lamp', 'pillow', 'lotion', 'vitamin',
  'craft', 'game', 'pancake', 'park',
  'icecream', 'pizza', 'movie', 'marshmallow',
  'coin', 'bicycle', 'courage', 'outing',
  'toy-train', 'music-box', 'dinosaur', 'sleepover',
  'blocks', 'zoo', 'cooking', 'surprise',
]

export const OBJECT_ASSET_OPTIONS = [
  { id: 'brush', label: '刷牙杯' }, { id: 'wash', label: '水滴' },
  { id: 'pajamas', label: '睡衣' }, { id: 'story', label: '故事书' },
  { id: 'toys', label: '玩具篮' }, { id: 'toilet', label: '小马桶' },
  { id: 'backpack', label: '书包' }, { id: 'heart', label: '暖心' },
  { id: 'lamp', label: '小夜灯' }, { id: 'pillow', label: '月亮枕' },
  { id: 'lotion', label: '润肤露' }, { id: 'vitamin', label: '营养瓶' },
  { id: 'craft', label: '做手工' }, { id: 'game', label: '桌游' },
  { id: 'pancake', label: '小点心' }, { id: 'park', label: '公园树' },
  { id: 'icecream', label: '冰淇淋' }, { id: 'pizza', label: '披萨' },
  { id: 'movie', label: '电影之夜' }, { id: 'marshmallow', label: '棉花糖' },
  { id: 'coin', label: '熊猫纪念币' }, { id: 'bicycle', label: '自行车' },
  { id: 'courage', label: '勇气奖章' }, { id: 'outing', label: '外出游玩' },
  { id: 'toy-train', label: '小玩具' }, { id: 'music-box', label: '音乐盒' },
  { id: 'dinosaur', label: '恐龙展' }, { id: 'sleepover', label: '小帐篷' },
  { id: 'blocks', label: '积木' }, { id: 'zoo', label: '动物园' },
  { id: 'cooking', label: '一起做饭' }, { id: 'surprise', label: '惊喜礼物' },
]

export const CHARACTER_ASSET_LABELS = {
  bear: '眠眠熊', rabbit: '月兔', cloud: '云朵', 'space-cat': '太空猫',
}

const LEGACY_ASSET_MAP = {
  '🪥': 'brush', '💧': 'wash', '🧸': 'toys', '📖': 'story', '📚': 'story',
  '🧺': 'toys', '🚽': 'toilet', '📔': 'backpack', '🎒': 'backpack', '👗': 'pajamas',
  '🧴': 'lotion', '💊': 'vitamin', '🎨': 'craft', '🎲': 'game', '🥞': 'pancake',
  '🌳': 'park', '🎵': 'story', '🍪': 'pancake', '🥛': 'wash', '⭐': 'lamp', '🌙': 'pillow',
}

export function normalizeAssetId(value, fallback = 'lamp') {
  if (OBJECT_ASSETS.includes(value)) return value
  return LEGACY_ASSET_MAP[value] || fallback
}
