import { test,expect } from '@playwright/test'
import { setupFamily,persistedState,expectComfortable } from './helpers.js'
const T='2026-09-21T12:00:00+08:00'
for(const [egg,species,petName] of [['彩虹蛋','unicorn','彩彩'],['爪印蛋','puppy','布丁'],['月舞蛋','fox','月月'],['暖暖蛋','chick','啾啾']]) {
  test(`${species}: free preview, deliberate adoption and generated art persist`,async({page})=>{
    await setupFamily(page,{at:T})
    await page.goto('/bedtime/pet')
    await expect(page.getByRole('button',{name:/免费预览/})).toHaveCount(8)
    await page.getByRole('button',{name:new RegExp(`${egg}，`)}).click()
    const state=await persistedState(page)
    expect(Object.keys(state.modules.pets.byProfile)).toHaveLength(0)
    await page.getByRole('button',{name:'把这颗蛋带回家'}).click()
    await expect(page.getByRole('heading',{name:petName,exact:true})).toBeVisible()
    await page.clock.setFixedTime(new Date('2026-09-21T18:01:00+08:00'));await page.reload()
    await page.getByRole('button',{name:'一起迎接破壳'}).click()
    await page.getByRole('button',{name:'抱抱我的小伙伴'}).click()
    await expect(page.locator('.pet-touch .plush-body')).toHaveAttribute('src',new RegExp(`/pets/${species}/idle.webp`))
    await expect(page.getByRole('button',{name:'喂一点星光'})).toBeDisabled()
    await page.getByRole('button',{name:'准备食物',exact:true}).click()
    expect((await persistedState(page)).rewards.starLedger).toHaveLength(0)
    await page.screenshot({path:`artifacts/visual-qa/pet-v2-${species}.png`,fullPage:true,animations:'disabled'})
  })
}
for(const viewport of [{width:390,height:844},{width:320,height:740},{width:1194,height:834}]) {
  test(`egg meadow and badge preview remain reachable at ${viewport.width}px`,async({page})=>{
    await page.setViewportSize(viewport);await page.emulateMedia({reducedMotion:'reduce'})
    await setupFamily(page,{at:T});await page.goto('/bedtime/pet')
    await expectComfortable(page,[page.getByRole('button',{name:'把这颗蛋带回家'})])
    await page.getByRole('button',{name:/彩虹蛋，/}).click()
    await page.getByRole('button',{name:'把这颗蛋带回家'}).click()
    await page.getByRole('button',{name:/徽章小铺，余额/}).click()
    await page.getByRole('button',{name:'预览花花公主裙'}).click()
    await page.getByRole('button',{name:'试穿一下，不扣徽章'}).click()
    await expect(page.getByRole('button',{name:'确认兑换 · 1 枚徽章'})).toBeDisabled()
    await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'预览花花公主裙'})).toBeFocused()
    await expectComfortable(page)
  })
}
