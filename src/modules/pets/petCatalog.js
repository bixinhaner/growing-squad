/** Fixed catalogue. Prices are authoritative on the client AND server. No loot boxes. */
export const PET_SPECIES = [
  { id: 'bear', name: '眠眠熊', eggName: '森林蛋', mark: 'leaf', color: '#87a67a', copy: '一只会抱抱、会玩球的小熊', defaultName: '糯糯' },
  { id: 'rabbit', name: '月兔', eggName: '月光蛋', mark: 'moon', color: '#d6b3c8', copy: '一只耳朵会跟着心情动的月兔', defaultName: '团团' },
  { id: 'cloud', name: '云朵', eggName: '云朵蛋', mark: 'cloud', color: '#95bed2', copy: '一朵软绵绵、喜欢躲猫猫的云朵', defaultName: '绵绵' },
  { id: 'space-cat', name: '太空猫', eggName: '太空蛋', mark: 'planet', color: '#afa2d2', copy: '一只好奇、喜欢小发明的太空猫', defaultName: '星星' },
]
export const PET_ROOMS = [
  { id: 'moon-room', name: '月光卧室', itemId: null },
  { id: 'forest', name: '森林小屋', itemId: 'forest-room' },
  { id: 'space', name: '安静太空', itemId: 'space-room' },
]
export const PET_ITEMS = [
  { id: 'daisy-rug', name: '小花地毯', price: 3, category: 'decor', art: 'rug', slot: 'rug', copy: '把脚下变成软软的小花。永久保留。' },
  { id: 'star-lamp', name: '星星小夜灯', price: 5, category: 'decor', art: 'lamp', slot: 'lamp', copy: '点一下，亮起温暖的星光。永久保留。' },
  { id: 'moon-planter', name: '月亮花盆', price: 6, category: 'decor', art: 'plant', slot: 'decor', copy: '一朵不用追着浇水的小花。永久保留。' },
  { id: 'memory-frame', name: '星光相框', price: 6, category: 'decor', art: 'frame', slot: 'decor', copy: '把你最喜欢的伙伴回忆摆出来。永久保留。' },
  { id: 'blue-scarf', name: '星星围巾', price: 5, category: 'dress', art: 'scarf', slot: 'dress', copy: '一条属于你的蓝色小围巾。可以随时摘下。' },
  { id: 'raincoat', name: '小雨衣', price: 8, category: 'dress', art: 'raincoat', slot: 'dress', copy: '穿上黄色小雨衣，换一种可爱的样子。' },
  { id: 'star-ball', name: '星光球', price: 6, category: 'toy', art: 'ball', slot: 'toy', copy: '免费滚球的新款球衣，不替代基础玩具。' },
  { id: 'blocks', name: '彩色积木', price: 8, category: 'toy', art: 'blocks', slot: 'toy', game: 'blocks', copy: '解锁自由搭积木，伙伴会来参观。永久玩法。' },
  { id: 'ribbon', name: '转圈丝带', price: 10, category: 'skill', art: 'ribbon', slot: 'toy', skill: 'spin', copy: '解锁转圈练习；一起练习，才会学会。' },
  { id: 'toy-basket', name: '收纳小篮子', price: 10, category: 'skill', art: 'basket', slot: 'toy', skill: 'tidy', copy: '解锁收玩具本领，让小伙伴自己试试看。' },
  { id: 'picnic', name: '第一次野餐', price: 12, category: 'story', art: 'picnic', story: 'picnic', copy: '解锁一段能自己选择的小故事，可以反复玩。' },
  { id: 'robot', name: '纸箱机器人', price: 15, category: 'story', art: 'robot', story: 'robot', copy: '给运玩具机器人挑轮子、修挡板，再试一试。' },
  { id: 'tent', name: '星星小帐篷', price: 15, category: 'decor', art: 'tent', slot: 'decor', copy: '多一个可以探头躲起来的角落。永久保留。' },
  { id: 'forest-room', name: '森林小屋', price: 25, category: 'room', art: 'forest', room: 'forest', copy: '把小屋换成森林配色，原有家具和回忆都保留。' },
  { id: 'space-room', name: '安静太空', price: 25, category: 'room', art: 'planet', room: 'space', copy: '星球窗外的小屋；不用重新孵蛋。' },
]
export const PET_SKILLS = [
  { id: 'wave', name: '挥手打招呼', art: 'heart', itemId: null, copy: '抬起小手，看看你，再挥一挥。' },
  { id: 'spin', name: '开心转圈', art: 'ribbon', itemId: 'ribbon', copy: '先小转身，再转一圈，最后站稳。' },
  { id: 'tidy', name: '自己收玩具', art: 'basket', itemId: 'toy-basket', copy: '找到球、抱起来、轻轻放回篮子。' },
]
export const PET_ACTIONS = {
  hello: { name: '说声你好', message: '里面传来轻轻的回应。', art: 'heart' },
  blanket: { name: '盖好小毯子', message: '软软的小毯子，已经盖好了。', art: 'blanket' },
  hum: { name: '轻声唱一句', message: '你唱给它听，它轻轻晃动回应。', art: 'music' },
  pat: { name: '摸摸头', message: '它轻轻靠近了你。', art: 'heart' },
  feed: { name: '准备食物', message: '吧唧吧唧，谢谢你准备的小点心。', art: 'bowl' },
  water: { name: '喝一点水', message: '咕嘟，喝好啦！', art: 'cup' },
  brush: { name: '梳梳毛', message: '毛毛变得蓬松又舒服。', art: 'brush' },
  bath: { name: '洗个泡泡澡', message: '泡泡冲干净，变回蓬松的小伙伴啦。', art: 'bath' },
  sleep: { name: '盖被子晚安', message: '安心休息，下次还在这里。', art: 'blanket' },
}
export const PET_GAMES = [
  { id:'theater', name:'我的小剧场', art:'book', itemId:null, copy:'排好动作，让伙伴演出你的小故事。' },
  { id:'robot', name:'机器人试验场', art:'robot', itemId:'robot', copy:'换轮子、改挡板，真的试试能不能送到。' },
  { id: 'ball', name: '你推我接', art: 'ball', itemId: null, copy: '把球轻轻滚过来，伙伴会推回去。' },
  { id: 'hide', name: '找找小伙伴', art: 'tent', itemId: null, copy: '看看耳朵和小提示，找到它。' },
  { id: 'blocks', name: '小小建筑师', art: 'blocks', itemId: 'blocks', copy: '挑颜色、搭房子，没有标准答案。' },
  { id: 'story-welcome', name: '小屋里的第一天', art: 'book', itemId: null, copy: '挑一个角落，为新朋友安家。' },
  { id: 'story-picnic', name: '第一次野餐', art: 'picnic', itemId: 'picnic', copy: '选地点、铺毯子，一起看风景。' },
  { id: 'story-robot', name: '纸箱机器人', art: 'robot', itemId: 'robot', copy: '先做、试一试，再改一个地方。' },
  { id: 'family', name: '家庭花园见面', art: 'heart', itemId: null, copy: '和家里的其他伙伴打招呼，只记录自己的参与。' },
]
export const PET_STORIES = {
  welcome: [
    { title: '新朋友来啦，先去哪儿？', choices: ['看看窗外', '坐到软垫上'], response: ['窗外的叶子在轻轻摇。', '小伙伴踩了踩，软软的！'] },
    { title: '给它挑一个欢迎礼物吧', choices: ['一个小球', '一条小毯子'], response: ['它把球推到你面前。', '它把脸贴在了毯子上。'] },
    { title: '这个家，还想叫什么？', choices: ['月亮的小屋', '暖暖的窝'], response: ['一颗小小的月亮，住进回忆里。', '有你的小角落，就是家。'] },
  ],
  picnic: [
    { title: '今天去哪里野餐？', choices: ['树荫下', '小溪边'], response: ['树叶像一把轻轻的伞。', '听，水声在给我们唱歌。'] },
    { title: '小毯子被风吹起了，怎么办？', choices: ['用小石头压住角', '换个避风的地方'], response: ['四个角稳稳地贴住了草地。', '这里风小多了，再铺一次！'] },
    { title: '带哪一份回忆回家？', choices: ['画下今天的风景', '说一句喜欢的事'], response: ['那幅风景，留在你们的故事里。', '“和你一起出门，真好。”'] },
  ],
  robot: [
    { title: '玩具抱不完，做个什么帮手？', choices: ['带轮子的小推车', '纸箱运输机器人'], response: ['先把轮子放到纸箱下面。', '给纸箱画上眼睛，装上轮子。'] },
    { title: '试一下：球从边上滚下来了！', choices: ['把两边挡板加高', '把车开慢一点'], response: ['再试一次，球留在了车里！', '慢慢开，球不容易滚出去了。'] },
    { title: '下一版还想改什么？', choices: ['装一只小钩子', '加一块太阳能板'], response: ['小钩子能帮我们拉动小篮子。', '记下想法，下次和家人一起画出来。'] },
  ],
}
export const getPetItem = (id) => PET_ITEMS.find((item) => item.id === id)
export const getSpecies = (id) => PET_SPECIES.find((item) => item.id === id) || PET_SPECIES[0]
