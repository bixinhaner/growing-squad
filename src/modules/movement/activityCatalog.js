import { appPath } from '../../data/paths.js'

const activity = (id, title, environment, participants, skills, equipment, steps, safety) => ({
  id, title, environment, participants, skills, equipment, steps, safety,
  image: appPath(`assets/movement/${id}.webp`),
})

export const MOVEMENT_ACTIVITIES = [
  activity('balloon-keep-up', '气球不落地', 'indoor', ['parent', 'sibling'], ['coordination', 'reaction'], '气球', ['找一块空地方', '轻轻拍起气球', '一起让它不落地'], '离桌角和玻璃远一点'),
  activity('robot-dance', '机器人舞会', 'indoor', ['solo', 'sibling'], ['coordination', 'jumping'], '音乐', ['选一首喜欢的歌', '学机器人转动身体', '音乐停就变成雕像'], '地面保持干爽'),
  activity('pillow-obstacle', '毛巾隧道', 'indoor', ['solo', 'sibling'], ['balance', 'climbing'], '枕头', ['用软枕头摆小路', '跨过、绕过、钻过去', '换一条路线再玩'], '只用柔软、不会滑动的物品'),
  activity('sock-basket', '袜子球投篮', 'indoor', ['solo', 'parent'], ['throwing', 'coordination'], '袜子和篮子', ['把袜子卷成软球', '篮子放在两步外', '轮流投进篮子'], '不用硬球，不朝人投'),
  activity('animal-jumps', '动物跳跳队', 'indoor', ['solo', 'sibling'], ['jumping', 'coordination'], '不用器材', ['选一种小动物', '学它安全地跳一跳', '换一种动物继续'], '留出不碰家具的空间'),
  activity('tape-balance', '平衡小路', 'indoor', ['solo', 'parent'], ['balance', 'coordination'], '纸胶带', ['贴一条弯弯小路', '脚跟接脚尖走过去', '试试倒着慢慢走'], '胶带不要贴在楼梯旁'),
  activity('color-reaction', '颜色反应站', 'indoor', ['parent'], ['reaction', 'coordination'], '彩色纸', ['摆开几张彩色纸', '家长说一种颜色', '快速碰到对应颜色'], '纸张要铺平避免打滑'),
  activity('robot-delivery', '机器人送货', 'indoor', ['parent', 'sibling'], ['cooperation', 'balance'], '一个软玩偶', ['一起抱住软包裹', '绕过房间里的小站', '安全送到目的地'], '慢慢走，不蒙眼睛'),
  activity('bike-color-hunt', '骑车找颜色', 'outdoor', ['solo', 'parent'], ['balance', 'reaction'], '自行车', ['戴好头盔', '选一种要寻找的颜色', '在安全区域慢慢找'], '只在家长认可的安全区域骑行'),
  activity('scooter-slalom', '滑板车绕桩', 'outdoor', ['solo', 'parent'], ['balance', 'coordination'], '滑板车', ['戴好护具', '摆开三个软标记', '慢慢绕过它们'], '远离车辆和陡坡'),
  activity('park-treasure', '公园寻宝跑', 'outdoor', ['parent', 'sibling'], ['running', 'reaction'], '不用器材', ['选三个自然小目标', '跑去找到它们', '回来分享发现'], '不采摘、不离开家长视线'),
  activity('family-relay', '家庭接力', 'outdoor', ['parent', 'sibling'], ['running', 'cooperation'], '软接力棒', ['选一小段安全路线', '把软棒交给下一位', '一起跑完就击掌'], '不在湿滑路面奔跑'),
  activity('hopscotch', '跳房子', 'outdoor', ['solo', 'sibling'], ['jumping', 'balance'], '粉笔', ['画简单格子', '单脚或双脚跳', '自己创造新路线'], '选择平整、无车辆的地面'),
  activity('jump-rope', '双人跳绳', 'outdoor', ['sibling', 'parent'], ['jumping', 'coordination'], '跳绳', ['先把绳子放平', '一起找到节奏', '能跳几下都可以'], '和旁人保持一臂距离'),
  activity('beanbag-catch', '软包接接乐', 'outdoor', ['parent', 'sibling'], ['throwing', 'reaction'], '软沙包', ['面对面站近一点', '轻轻抛给对方', '接住后退一小步'], '只使用柔软沙包'),
  activity('ball-pass', '小球传递站', 'outdoor', ['parent', 'sibling'], ['throwing', 'cooperation'], '软球', ['围成一个小圈', '轻轻传给下一位', '换个方向再来'], '不用力砸球'),
  activity('safe-climb', '低低攀爬线', 'outdoor', ['parent'], ['climbing', 'balance'], '游乐设施', ['家长先检查设施', '选最低的一条路线', '慢慢爬上再下来'], '全程由家长在身边保护'),
  activity('one-foot-statue', '单脚小雕像', 'outdoor', ['solo', 'sibling'], ['balance', 'coordination'], '不用器材', ['找一块平地', '单脚站成有趣姿势', '换脚再试一次'], '靠近可扶稳的地方'),
  activity('shadow-chase', '影子追追跑', 'outdoor', ['sibling', 'parent'], ['running', 'reaction'], '不用器材', ['找到长长的影子', '踩一踩对方的影子', '交换追逐角色'], '只在空旷安全区域玩'),
  activity('stump-expedition', '树桩小探险', 'outdoor', ['parent'], ['climbing', 'balance'], '低矮树桩', ['家长先检查路线', '牵手跨过低树桩', '到终点一起庆祝'], '只走低矮稳固的树桩'),
]

export const MOVEMENT_FILTERS = [
  { id: 'all', label: '全部' }, { id: 'indoor', label: '室内' }, { id: 'outdoor', label: '户外' },
  { id: 'no-equipment', label: '不用器材' }, { id: 'parent', label: '和家长' }, { id: 'sibling', label: '和兄弟姐妹' },
]

export function getMovementActivity(id) {
  return MOVEMENT_ACTIVITIES.find((item) => item.id === id)
}

export function filterMovementActivities(filter = 'all') {
  if (filter === 'all') return MOVEMENT_ACTIVITIES
  if (filter === 'indoor' || filter === 'outdoor') return MOVEMENT_ACTIVITIES.filter((item) => item.environment === filter)
  if (filter === 'no-equipment') return MOVEMENT_ACTIVITIES.filter((item) => item.equipment === '不用器材')
  return MOVEMENT_ACTIVITIES.filter((item) => item.participants.includes(filter))
}
