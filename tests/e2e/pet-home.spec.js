import { expect, test } from '@playwright/test'
import { setupFamily, persistedState, unlockParent, completeBedtime, expectComfortable } from './helpers.js'

const DAY = '2026-09-20T16:00:00+08:00'
async function petState(page) { const state = await persistedState(page); return state.modules.pets.byProfile[state.profiles[0].id] }
async function adopt(page, species = '森林蛋', name = '糯糯') {
  await page.goto('/bedtime/world')
  await page.getByRole('button', { name: /小伙伴的家/ }).click()
  await expect(page.getByRole('heading', { name: '从一颗小小的蛋开始' })).toBeVisible()
  await page.getByRole('button', { name: new RegExp(species) }).click()
  await page.getByLabel('先给小伙伴取个名字').fill(name)
  await page.getByRole('button', { name: '把这颗蛋带回家' }).click()
  await expect.poll(async () => (await petState(page))?.name).toBe(name)
}
async function hatch(page) {
  for (const name of ['说声你好', '盖好小毯子', '轻声唱一句']) await page.getByRole('button', { name, exact: true }).click()
  await page.clock.setFixedTime(new Date('2026-09-20T16:03:00+08:00'))
  await page.getByRole('button', { name: '一起迎接破壳' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: '抱抱我的小伙伴' }).click()
  await expect.poll(async () => (await petState(page))?.hatchedAt).toBeTruthy()
}
async function capture(page, name) {
  await page.screenshot({ path: `artifacts/visual-qa/pet-${name}.png`, fullPage: true, animations: 'disabled' })
}

test('pet adoption, warm-up, hatch, free care and truthful memories persist', async ({ page }) => {
  await page.setViewportSize({width:1194,height:834})
  await setupFamily(page, { at: DAY })
  await page.goto('/bedtime/world')
  await capture(page,'world-entry')
  await adopt(page)
  await capture(page,'egg-tablet')
  await hatch(page)
  await capture(page,'home-tablet')
  await page.getByRole('button', { name: '准备食物', exact:true }).click()
  await page.getByRole('button', { name: '梳梳毛', exact:true }).click()
  await page.getByRole('button', { name: '回忆', exact:true }).click()
  await page.getByLabel('留一句自己的话').fill('我教糯糯玩球，它像一团软软的棉花。')
  await page.getByRole('button', { name:'把这句话收好' }).click()
  await expect(page.getByText('我教糯糯玩球，它像一团软软的棉花。', {exact:true})).toBeVisible()
  const memories=(await petState(page)).memories.length
  await page.getByRole('button', {name:'重看破壳'}).click()
  await page.getByRole('button', {name:'抱抱我的小伙伴'}).click()
  expect((await petState(page)).memories).toHaveLength(memories)
  await page.reload()
  await expect(page.getByRole('heading', { name:'糯糯',exact:true })).toBeVisible()
  expect((await petState(page)).memories.some(m=>m.note.includes('软软的棉花'))).toBe(true)
  expect((await persistedState(page)).rewards.starLedger).toHaveLength(0)
})

test('starlight request, real parent approval, room placement and refund share the original balance', async({page})=>{
  await page.setViewportSize({width:1440,height:1000})
  await setupFamily(page,{at:DAY})
  await completeBedtime(page)
  await adopt(page)
  await hatch(page)
  const balance=(await persistedState(page)).rewards.starLedger.reduce((sum,e)=>sum+e.delta,0)
  await page.getByRole('button',{name:/星光小铺，余额/}).click()
  await capture(page,'shop-desktop')
  await page.locator('.pet-item-card').filter({has:page.getByRole('heading',{name:'小花地毯',exact:true})}).getByRole('button').click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('dialog').getByRole('button',{name:'请家长同意'}).click()
  await expect.poll(async()=>Object.values((await persistedState(page)).modules.pets.requests).some(r=>r.status==='pending')).toBe(true)
  expect((await persistedState(page)).rewards.starLedger.reduce((sum,e)=>sum+e.delta,0)).toBe(balance)
  await unlockParent(page,'/parent/pet')
  await capture(page,'parent-approval')
  await page.getByRole('button',{name:'同意兑换',exact:true}).click()
  await expect.poll(async()=>Boolean((await petState(page)).inventory['daisy-rug'])).toBe(true)
  await page.getByRole('link',{name:'看看小伙伴的家'}).click()
  await page.getByRole('button',{name:'布置',exact:true}).click()
  await page.getByRole('button',{name:'摆到小屋'}).click()
  await page.getByRole('button',{name:'回小屋看看'}).click()
  await expect(page.locator('.pet-floor-rug')).toBeVisible()
  await page.reload()
  await expect(page.locator('.pet-floor-rug')).toBeVisible()
  await unlockParent(page,'/parent/pet')
  await page.getByRole('button',{name:'撤销兑换',exact:true}).click()
  await expect.poll(async()=>Boolean((await petState(page)).inventory['daisy-rug'])).toBe(false)
  expect((await persistedState(page)).rewards.starLedger.reduce((sum,e)=>sum+e.delta,0)).toBe(balance)
})

test('a child can complete a free ball round and stop another without minting stars',async({page})=>{
  await setupFamily(page,{at:DAY});await adopt(page);await hatch(page)
  await page.getByRole('button',{name:'玩耍',exact:true}).click()
  await page.locator('.pet-item-card').filter({has:page.getByRole('heading',{name:'你推我接',exact:true})}).getByRole('button').click()
  for(let i=0;i<3;i++) {
    await page.getByRole('button',{name:'把球轻轻推过去'}).click()
    if(i<2) await expect(page.getByRole('button',{name:'把球轻轻推过去'})).toBeEnabled()
  }
  const session=Object.values((await petState(page)).playSessions)[0]
  await page.clock.setFixedTime(new Date(session.startedAt+5000))
  await page.getByRole('button',{name:'这一轮玩好啦'}).click()
  await expect.poll(async()=>(await petState(page)).playSessions[session.id].completed).toBe(true)
  await page.locator('.pet-item-card').filter({has:page.getByRole('heading',{name:'找找小伙伴',exact:true})}).getByRole('button').click()
  await capture(page,'hide-game')
  await page.getByRole('button',{name:'现在回小屋'}).click()
  expect(Object.values((await petState(page)).playSessions).filter(s=>s.completed)).toHaveLength(1)
  expect((await persistedState(page)).rewards.starLedger).toHaveLength(0)
})

test('choices are saved as an imagined story and quiet hours disable games but not care',async({page})=>{
  await setupFamily(page,{at:DAY});await adopt(page,'月光蛋','团团');await hatch(page)
  await page.getByRole('button',{name:'玩耍',exact:true}).click()
  await page.locator('.pet-item-card').filter({has:page.getByRole('heading',{name:'小屋里的第一天',exact:true})}).getByRole('button').click()
  for(const choice of ['看看窗外','一条小毯子','暖暖的窝']) {
    await page.getByRole('button',{name:choice,exact:true}).click()
    await page.getByRole('button',{name:'接着看'}).click()
  }
  await page.clock.setFixedTime(new Date('2026-09-20T16:03:06+08:00'))
  await page.getByRole('button',{name:'收下这段故事'}).click()
  await expect.poll(async()=>(await petState(page)).memories.some(m=>m.kind==='story'&&m.note.includes('暖暖的窝'))).toBe(true)
  await page.clock.setFixedTime(new Date('2026-09-20T21:10:00+08:00'))
  await expect(page.getByText('现在是安静时间',{exact:true})).toBeVisible()
  await expect(page.getByRole('button',{name:'明天再一起玩'}).first()).toBeDisabled()
  await page.getByRole('button',{name:'照顾',exact:true}).click()
  await page.getByRole('button',{name:'准备食物',exact:true}).click()
  await expect(page.getByText('吧唧吧唧，谢谢你准备的小点心。',{exact:true})).toBeVisible()
})

test('allowance unlocks a permanent play item and repeated purchase stays unavailable',async({page})=>{
  await setupFamily(page,{at:DAY});await completeBedtime(page);await adopt(page);await hatch(page)
  await unlockParent(page,'/parent/pet')
  await page.getByLabel('星光兑换方式').selectOption('allowance')
  await page.getByLabel('每天自主兑换额度（星光）').fill('8')
  await page.getByRole('button',{name:'保存伙伴设置'}).click()
  await expect(page.getByText('伙伴设置已保存。',{exact:true})).toBeVisible()
  await page.getByRole('link',{name:'看看小伙伴的家'}).click()
  await page.getByRole('button',{name:/星光小铺，余额/}).click()
  await page.locator('.pet-item-card').filter({has:page.getByRole('heading',{name:'彩色积木',exact:true})}).getByRole('button').click()
  await page.getByRole('dialog').getByRole('button',{name:'8 星光兑换'}).click()
  await expect.poll(async()=>Boolean((await petState(page)).inventory.blocks)).toBe(true)
  await page.getByRole('button',{name:'玩耍',exact:true}).click()
  await page.locator('.pet-item-card').filter({has:page.getByRole('heading',{name:'小小建筑师',exact:true})}).getByRole('button',{name:'一起玩一轮'}).click()
  for(const color of ['黄色','绿色','蓝色']) await page.getByRole('button',{name:`放一块${color}积木`}).click()
  await page.clock.setFixedTime(new Date('2026-09-20T16:03:06+08:00'))
  await page.getByRole('button',{name:'这一轮玩好啦'}).click()
  await page.getByRole('button',{name:/星光小铺，余额/}).click()
  await page.locator('.pet-item-card').filter({has:page.getByRole('heading',{name:'彩色积木',exact:true})}).getByRole('button',{name:'看看怎么用'}).click()
  await expect(page.getByRole('dialog')).toContainText('已经拥有，不会再次扣除星光。')
  expect((await persistedState(page)).rewards.starLedger.filter(e=>e.reason==='伙伴小铺：彩色积木')).toHaveLength(1)
})

for(const size of [{name:'phone',width:390,height:844},{name:'narrow',width:320,height:740}]) {
  test(`pet controls, long names and modal keyboard focus fit ${size.name}`,async({page})=>{
    const errors=[];page.on('pageerror',e=>errors.push(e.message))
    await page.setViewportSize(size)
    await page.emulateMedia({reducedMotion:'reduce'})
    await setupFamily(page,{at:DAY})
    await adopt(page,'太空蛋','圆滚滚的太空小伙伴')
    await capture(page,`egg-${size.name}`)
    await hatch(page)
    await expectComfortable(page,[page.getByRole('button',{name:'准备食物',exact:true})])
    await capture(page,`home-${size.name}`)
    for(const name of ['玩耍','布置','回忆']) {
      await page.getByRole('button',{name,exact:true}).click()
      await expectComfortable(page)
    }
    const opener=page.getByRole('button',{name:'给小伙伴改名字'})
    await opener.click();await page.keyboard.press('Escape');await expect(opener).toBeFocused()
    await page.getByRole('button',{name:/星光小铺，余额/}).click()
    await expectComfortable(page)
    await capture(page,`shop-${size.name}`)
    expect(errors).toEqual([])
  })
}

test('six hours offline or away keeps the egg ready instead of missing its birth',async({page})=>{
  await setupFamily(page,{at:DAY});await adopt(page,'云朵蛋','绵绵')
  await page.clock.setFixedTime(new Date('2026-09-21T16:00:00+08:00'))
  await page.reload()
  await page.getByRole('button',{name:'一起迎接破壳',exact:true}).click()
  await page.getByRole('button',{name:'抱抱我的小伙伴'}).click()
  await expect.poll(async()=>(await petState(page)).species).toBe('cloud')
  await page.getByRole('button',{name:'回忆',exact:true}).click()
  await capture(page,'cloud-memories')
})
