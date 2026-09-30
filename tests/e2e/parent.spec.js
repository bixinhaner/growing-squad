import { expect, test } from '@playwright/test'
import { expectComfortable, persistedState, setupFamily, unlockParent } from './helpers.js'

const ROUTES = [
  ['/parent', /有 \d|现在没什么/],
  ['/parent/growth', null], ['/parent/growth/sleep', null], ['/parent/growth/support', null],
  ['/parent/growth/movement', null], ['/parent/growth/reading', null], ['/parent/growth/chores', null],
  ['/parent/growth/inventor', null], ['/parent/growth/pet', null], ['/parent/growth/assistant', null],
  ['/parent/plan', '几点开始，几点完成'], ['/parent/plan/routine', '一步一步，走到被窝'],
  ['/parent/plan/day', '大人看全天，孩子只看下一件'], ['/parent/plan/wishes', '星光换成真实的陪伴'],
  ['/parent/family', '每个孩子，一份自己的节奏'], ['/parent/family/display', '让界面适合这个孩子'], ['/parent/family/data', null],
]

test('every parent page renders without errors or overflow', async ({ page }) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await setupFamily(page)
  await unlockParent(page)
  for (const [path, heading] of ROUTES) {
    await page.evaluate((to) => { history.pushState({}, '', `/bedtime${to}`); dispatchEvent(new PopStateEvent('popstate')) }, path)
    await expect(page.locator('.p-page h1, .p-main h1').first()).toBeVisible()
    if (heading) await expect(page.locator('h1, h2').filter({ hasText: heading }).first()).toBeVisible()
    await expectComfortable(page)
  }
  expect(errors).toEqual([])
})

test('old parent links land on their new homes', async ({ page }) => {
  await setupFamily(page)
  await unlockParent(page)
  const go = (to) => page.evaluate((path) => { history.pushState({}, '', `/bedtime${path}`); dispatchEvent(new PopStateEvent('popstate')) }, to)
  for (const [from, to] of [['/parent/rewards', /\/parent\/plan\/wishes$/], ['/parent/schedule', /\/parent\/plan$/], ['/parent/routine', /\/parent\/plan\/routine$/], ['/parent/accessibility', /\/parent\/family\/display$/], ['/parent/overview?view=bedtime', /\/parent\/growth\/sleep$/], ['/parent/nowhere', /\/parent$/]]) {
    await go(from)
    await expect(page).toHaveURL(to)
  }
})

test('parents edit schedules, routines, wishes and display settings', async ({ page }) => {
  await setupFamily(page)
  await unlockParent(page, '/parent/plan')
  await page.locator('.p-day').filter({ hasText: '周末' }).getByRole('button', { name: '调整' }).click()
  const sheet = page.getByRole('dialog', { name: '周末的作息' })
  await sheet.getByLabel('计划完成').fill('21:45')
  await sheet.getByRole('button', { name: '保存' }).click()
  await expect(sheet).toBeHidden()
  await expect(page.locator('.p-day').filter({ hasText: '周末' })).toContainText('21:45')

  await page.getByRole('link', { name: '睡前小路' }).click()
  await page.getByRole('radiogroup', { name: '哪一天' }).getByRole('radio', { name: '周末' }).click()
  await page.locator('.p-steps__main').first().click()
  await page.getByRole('dialog', { name: '这一步' }).getByLabel('名称').fill('认真刷牙')
  await page.getByRole('button', { name: '好了' }).click()
  await page.getByRole('button', { name: '保存小路' }).click()
  await expect.poll(async () => (await persistedState(page)).modules.bedtime.routines.some((routine) => routine.steps.some((step) => step.title === '认真刷牙'))).toBe(true)

  await page.getByRole('link', { name: /愿望星光/ }).click()
  await page.getByRole('button', { name: '编辑愿望单' }).click()
  await page.getByLabel('愿望 1 名称').fill('一起画月球车')
  await page.getByRole('button', { name: '保存愿望单' }).click()
  await expect.poll(async () => (await persistedState(page)).rewards.wishes.some((wish) => wish.name === '一起画月球车')).toBe(true)

  await page.evaluate(() => { history.pushState({}, '', '/bedtime/parent/family/display'); dispatchEvent(new PopStateEvent('popstate')) })
  for (const name of ['减少动态', '大号文字', '高对比度']) await page.getByRole('switch', { name, exact: true }).click()
  await expect(page.getByRole('switch', { name: '大号文字', exact: true })).toHaveAttribute('aria-checked', 'true')
  await expect.poll(async () => Object.values((await persistedState(page)).accessibilityByProfile || {}).some((settings) => settings.largeText && settings.highContrast && settings.reduceMotion)).toBe(true)

  // Sunday: the weekend step shows up on tonight's path.
  await page.goto('/bedtime/tonight')
  await expect(page.getByRole('button', { name: /^认真刷牙：/ })).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await expectComfortable(page)
})

test('a second child gets their own profile and path', async ({ page }) => {
  await setupFamily(page)
  await unlockParent(page, '/parent/family')
  await page.getByRole('button', { name: '再加一个孩子' }).click()
  const sheet = page.getByRole('dialog', { name: '再加一个孩子' })
  await sheet.getByLabel('名字').fill('小禾')
  await sheet.getByRole('button', { name: '建立档案' }).click()
  await expect.poll(async () => (await persistedState(page)).profiles.map((profile) => profile.name)).toContain('小禾')
  await expect(page.getByRole('radiogroup', { name: '选择孩子' })).toContainText('小禾')
})

test('parent area on a phone uses bottom tabs and stays in bounds', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await setupFamily(page)
  await unlockParent(page)
  await expectComfortable(page)
  await page.evaluate(() => { history.pushState({}, '', '/bedtime/parent/plan/wishes'); dispatchEvent(new PopStateEvent('popstate')) })
  await expectComfortable(page)
})
