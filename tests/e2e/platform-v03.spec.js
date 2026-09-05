import { expect, test } from '@playwright/test'
import { setupFamily, unlockParent, persistedState, expectComfortable, expectImagesLoaded } from './helpers.js'
test('today presents one primary card, two choices and three destinations',async({page}) => {
  await page.setViewportSize({width:1194,height:834}); await setupFamily(page,{at:'2026-09-06T16:20:00+08:00'}); await page.goto('/bedtime/today')
  await expect(page.locator('.calm-card')).toHaveCount(1); await expect(page.locator('.calm-choices>button')).toHaveCount(2)
  await expect(page.getByRole('navigation',{name:'儿童主导航'}).getByRole('link')).toHaveCount(3)
  await expectComfortable(page); await expectImagesLoaded(page)
  await page.screenshot({path:'artifacts/visual-qa/comfort-today-tablet.png',fullPage:true})
})
test('world retains artwork and exposes five real destinations',async({page}) => {
  await setupFamily(page); await page.goto('/bedtime/world')
  await expect(page.locator('.calm-map')).toHaveAttribute('src',/child-world-map\.png/)
  await expect(page.locator('.calm-area-grid>button')).toHaveCount(5)
  await expect(page.getByText('0 / 5 个地方留下了记忆')).toBeVisible()
  await expectComfortable(page); await expectImagesLoaded(page)
})
test('parent timeline and support remain editable after parent confirmation',async({page}) => {
  await setupFamily(page); await unlockParent(page,'/parent/timeline')
  await expect(page.getByRole('heading',{name:'家庭时间线'})).toBeVisible()
  await expect(page.getByText('孩子此刻看到的')).toBeVisible()
  await page.getByRole('button',{name:'保存时间线'}).click()
  await expect.poll(async() => (await persistedState(page)).modules.core.routines.length).toBeGreaterThan(0)
  await unlockParent(page,'/parent/support')
  const group=page.getByRole('group',{name:'整理书包的支持方式'})
  await group.getByRole('button',{name:'一起做',exact:true}).click()
  await expect(group.getByRole('button',{name:'一起做',exact:true})).toHaveAttribute('aria-pressed','true')
  await expect.poll(async() => Object.values((await persistedState(page)).scaffold.states).some((s) => s.capabilityKey==='bedtime.pack-bag' && s.level===0)).toBe(true)
  await expectComfortable(page)
})
