export const INVENTOR_STAGES=[
  {id:'problem_defined',short:'发现麻烦',title:'我发现了什么麻烦？',image:'problem'},
  {id:'sketching',short:'画一画',title:'先把办法画下来',image:'sketch'},
  {id:'prototype_1',short:'第一版',title:'先做一个能试的版本',image:'building-v1'},
  {id:'testing',short:'试一试',title:'这次试出了什么？',image:'testing'},
  {id:'learning',short:'学一点',title:'需要时再学一个小线索',image:'clue'},
  {id:'iteration',short:'第二版',title:'带着线索再改一版',image:'prototype-v2'},
  {id:'showcase',short:'发布会',title:'把发明故事讲给家人',image:'showcase'},
]
export const IDEA_SEEDS=[
  {id:'hair-robot',title:'洗头机器人',problem:'洗头时水会进眼睛',helpsWho:'我自己',image:'problem'},
  {id:'rain-cover',title:'雨天书包保护罩',problem:'下雨时书包容易淋湿',helpsWho:'我自己',image:'sketch'},
  {id:'focus-helper',title:'专注小助手',problem:'做一件事时容易忘记下一步',helpsWho:'家人',image:'building-v1'},
  {id:'my-idea',title:'我自己的想法',problem:'我发现了一个新的小麻烦',helpsWho:'家人',image:'sketch'},
]
const pairs=(items) => items.map(([id,title]) => ({id,title}))
export const PROJECT_TEMPLATES={
  'hair-robot':{
    safety:'先用玩偶和纸板模拟挡水。由家长看护，不在孩子头上测试电器、热水或自动机械。',
    findings:pairs([['front-worked','前面挡住了'],['side-leaks','两边还会漏'],['too-loose','戴起来有点松']]),
    changes:pairs([['wrap-sides','把两边围起来'],['fit-better','让它更贴合'],['another-way','我有别的办法']]),
    cards:[
      {id:'wraparound',title:'围住，比只挡前面更稳',copy:'想一想两侧哪里会漏。先给玩偶做纸板模型，观察边缘的形状。',image:'knowledge-wraparound.webp'},
      {id:'adjustable-band',title:'能调一调，会更贴合',copy:'试着让纸带有几个可调的位置，看看怎样才不松也不紧。',image:'knowledge-adjustable-band.webp'},
      {id:'water-path',title:'先给水安排一条路',copy:'先画出水可能流向哪里，再请家长在桌面模型上做小测试。',image:'knowledge-water-path.webp'},
    ],
  },
  'rain-cover':{
    safety:'用空书包或纸盒测试，里面放干纸巾。只用少量常温水，远离插座和电子设备。',
    findings:pairs([['top-dry','上面遮住了'],['seam-wet','接缝处还是湿了'],['hard-open','拿东西不方便']]),
    changes:pairs([['overlap-edge','让边缘多盖住一点'],['add-flap','留一个好打开的小盖'],['rain-other','我有别的办法']]),
    cards:[
      {id:'rain-overlap',title:'让接缝像屋瓦一样搭着',copy:'上一片盖住下一片的边缘，再看看少量水会流到哪里。',image:'workshop-hero.webp'},
      {id:'rain-tissue',title:'干纸巾是一位小观察员',copy:'把干纸巾放进模型里，每次只改一个地方，就更容易知道哪里改善了。',image:'workshop-hero.webp'},
    ],
  },
  'focus-helper':{
    safety:'用纸卡、图画和可移动标记做原型。不用惩罚、强制倒计时或贴能力标签。',
    findings:pairs([['next-visible','能看懂下一步了'],['too-many','一次看到的步骤太多'],['forgot-marker','做完后忘了移动标记']]),
    changes:pairs([['one-card','一次只露出一张卡'],['bigger-picture','把图画得更清楚'],['move-marker','做完就移动一个小标记']]),
    cards:[
      {id:'focus-visible',title:'把下一步放在看得见的地方',copy:'只留下眼前要用的一张图卡。试完再问：这样是不是更容易找到下一步？',image:'workshop-hero.webp'},
      {id:'focus-feedback',title:'给完成一个温柔的信号',copy:'把做完的卡翻过去，或移动一个小夹子；不需要扣分或催快。',image:'workshop-hero.webp'},
    ],
  },
  'my-idea':{
    safety:'先做小模型。请家长检查工具、材料和测试环境；涉及电、水、火、尖锐物品时不要自行实验。',
    findings:pairs([['part-worked','有一部分办法管用了'],['still-hard','还有不方便的地方'],['new-clue','我发现了新线索']]),
    changes:pairs([['change-one','先改一个地方'],['try-material','试试另一种安全材料'],['ask-user','问问用它的人']]),
    cards:[{id:'generic-one-change',title:'一次只改一个地方',copy:'先说出你想观察什么，再只改变一个地方。这样更容易发现是哪一步起了作用。',image:'workshop-hero.webp'}],
  },
}
export function inventorTemplate(seedId) { return PROJECT_TEMPLATES[seedId] || PROJECT_TEMPLATES['my-idea'] }
export const TEST_FINDINGS=PROJECT_TEMPLATES['hair-robot'].findings
export const NEXT_CHANGES=PROJECT_TEMPLATES['hair-robot'].changes
export const KNOWLEDGE_CARDS=Object.values(PROJECT_TEMPLATES).flatMap((t) => t.cards)
export const SHOWCASE_METHODS=[{id:'live',title:'边做边讲'},{id:'video',title:'播放我的30秒演示'},{id:'parent-words',title:'请家长读我的原话'}]
