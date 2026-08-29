import { appPath } from '../../data/paths.js'

const role = (id, title, copy, steps, safety, image = id) => ({
  id, title, copy, steps, safety, image: appPath(`assets/responsibility/${image}.webp`),
})

export const RESPONSIBILITY_ROLES = [
  { ...role('place-settings', '摆碗筷', '把碗和筷子放到每个人的位置', ['拿好碗筷', '一个位置一份', '请家长看一眼'], '轻轻拿，一次少拿几个'), stepImages: ['place-settings-carry', 'place-settings-position', 'place-settings-check'].map((id) => appPath(`assets/responsibility/${id}.webp`)) },
  role('fold-napkins', '放餐巾纸', '把餐巾纸放在每个人面前', ['拿好餐巾纸', '每个人一张', '看看有没有漏掉'], '只拿干净的餐巾纸'),
  role('pack-backpack', '整理书包', '把明天要用的东西放回书包', ['先看明天需要什么', '一样一样放进去', '请家长最后看一眼'], '书包放在地上整理'),
  role('tidy-toys', '收好玩具', '让每个玩具回到自己的篮子', ['先找同一类', '轻轻放回篮子', '留一条能走的路'], '大件或高处请家长帮忙'),
  role('laundry-basket', '脏衣服回篮子', '把换下来的衣服送回洗衣篮', ['找出要洗的衣服', '口袋里的东西先拿出', '放进洗衣篮'], '不碰洗衣机和清洁用品'),
  role('water-plant', '给植物喝水', '给家里的植物一点刚好的水', ['先摸摸土', '慢慢倒一点水', '把水壶放回去'], '水洒了就请家长一起擦'),
  role('set-cups', '准备水杯', '把凉水杯放到安全的位置', ['拿稳空水杯', '放在桌子里面一点', '请家长来倒水'], '只拿空杯，热水交给大人'),
  role('match-socks', '袜子找朋友', '把一样的两只袜子放在一起', ['先按颜色找', '再看看大小', '配好后放成一小堆'], '找不到的一只先放旁边'),
  role('wipe-table', '擦擦小桌子', '用干净的湿布把小桌子擦舒服', ['请家长准备湿布', '从里面擦到外面', '把布交还家长'], '不碰清洁剂和插座'),
  role('feed-pet', '照顾小伙伴', '和家长一起准备宠物这一餐', ['请家长拿好食物', '倒进小碗里', '把袋子交还家长'], '只能用家长准备好的食物'),
  role('shelve-books', '书回到书架', '把看完的书轻轻送回低书架', ['把书合起来', '书脊朝外放好', '高处请家长帮忙'], '不爬柜子和椅子'),
  role('bring-tissues', '给家人拿纸巾', '看到需要时，把纸巾送到家人手边', ['拿一盒纸巾', '慢慢走过去', '放在家人手边'], '走路时看前面'),
]

export const RESPONSIBILITY_ACTIVITIES = [
  { id: 'prepare-table', title: '晚饭前准备餐桌', subtitle: '每个人准备一个位置', imageRoleId: 'place-settings', roleIds: ['place-settings', 'fold-napkins', 'set-cups'], adultRole: '端凉菜' },
  { id: 'tomorrow-ready', title: '明天准备小队', subtitle: '让早晨轻松一点', imageRoleId: 'pack-backpack', roleIds: ['pack-backpack', 'shelve-books', 'match-socks'], adultRole: '看明天安排' },
  { id: 'cozy-reset', title: '客厅舒服行动', subtitle: '一起收出能走的路', imageRoleId: 'tidy-toys', roleIds: ['tidy-toys', 'shelve-books', 'wipe-table'], adultRole: '整理高处' },
  { id: 'laundry-team', title: '衣服回家小队', subtitle: '把衣服送到对的地方', imageRoleId: 'laundry-basket', roleIds: ['laundry-basket', 'match-socks', 'fold-napkins'], adultRole: '照看洗衣机' },
  { id: 'plant-care', title: '绿色照顾时间', subtitle: '看看植物今天需要什么', imageRoleId: 'water-plant', roleIds: ['water-plant', 'wipe-table', 'bring-tissues'], adultRole: '照顾高处植物' },
  { id: 'caring-corner', title: '照顾家人角落', subtitle: '留意身边的小需要', imageRoleId: 'bring-tissues', roleIds: ['bring-tissues', 'set-cups', 'feed-pet'], adultRole: '准备安全物品' },
]

export const RESPONSIBILITY_SCAFFOLDS = [
  { id: 'together', title: '一起做', childCopy: '家长会和你一起做' },
  { id: 'guided', title: '说步骤', childCopy: '家长说一步，你做一步' },
  { id: 'prompted', title: '提醒后做', childCopy: '家长提醒一下，你来完成' },
  { id: 'invite-check', title: '主动请检查', childCopy: '做完后，请家长看一眼' },
  { id: 'quiet', title: '安静模式', childCopy: '相信你可以自己安排' },
]

export function responsibilityRole(id) {
  return RESPONSIBILITY_ROLES.find((item) => item.id === id) || RESPONSIBILITY_ROLES[0]
}

export function responsibilityActivity(id) {
  return RESPONSIBILITY_ACTIVITIES.find((item) => item.id === id) || RESPONSIBILITY_ACTIVITIES[0]
}

export function responsibilityScaffold(id) {
  return RESPONSIBILITY_SCAFFOLDS.find((item) => item.id === id) || RESPONSIBILITY_SCAFFOLDS[0]
}
