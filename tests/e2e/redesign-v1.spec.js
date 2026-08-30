import { expect, test } from '@playwright/test'

async function setupFamily(page) {
  await page.clock.setFixedTime(new Date('2026-08-30T20:45:00+08:00'))
  await page.goto('/bedtime/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await page.getByRole('button', { name: /我先替孩子设置/ }).click()
  await page.getByLabel('孩子昵称').fill('小雨')
  await page.getByText('设置周末时间').click()
  await page.getByLabel('周末开始准备', { exact: true }).fill('20:30')
  await page.getByLabel('周末计划完成', { exact: true }).fill('21:30')
  await page.getByRole('button', { name: /收玩具/ }).click()
  await page.getByRole('button', { name: /上厕所/ }).click()
  await page.getByLabel('家长区 PIN').fill('2468')
  await page.getByRole('button', { name: /保存并看看今晚/ }).click()
  await expect(page).toHaveURL(/\/bedtime\/tonight/)
  await expect(page.getByRole('navigation', { name: '儿童主导航' })).toBeVisible()
}

async function unlockParent(page, next = '/bedtime/parent/overview') {
  await page.goto(next)
  for (const digit of ['2', '4', '6', '8']) await page.getByRole('button', { name: digit, exact: true }).click()
}

test('new child and parent journeys stay complete, reversible and one-screen at their target sizes', async ({ page }) => {
  test.setTimeout(90000)
  await page.setViewportSize({ width: 390, height: 844 })
  await setupFamily(page)

  await page.goto('/bedtime/today')
  const childNav = page.getByRole('navigation', { name: '儿童主导航' })
  for (const label of ['今天', '小队世界', '成长背包']) await expect(childNav.getByRole('link', { name: label })).toBeVisible()
  await expect(page.locator('.gs-next-card')).toBeVisible()
  await expect(page.locator('.gs-continue-card')).toBeVisible()

  await page.getByRole('link', { name: '小队世界' }).click()
  await expect(page.getByRole('button', { name: '月光花园' })).toBeVisible()
  await page.getByRole('link', { name: '成长背包' }).click()
  await expect(page.getByRole('heading', { name: /收集的每一份成长/ })).toBeVisible()

  await unlockParent(page, '/bedtime/parent/routine')
  await page.getByRole('button', { name: '周末', exact: true }).click()
  const initialTaskCount = await page.locator('.gs-routine-list > article').count()
  for (let index = initialTaskCount; index < 16; index += 1) {
    await page.getByRole('button', { name: /添加任务/ }).click()
    await page.getByRole('button', { name: '完成编辑' }).click()
  }
  await expect(page.getByRole('button', { name: '已到 16 项上限' })).toBeDisabled()
  await page.getByRole('button', { name: '保存流程' }).click()
  await page.getByRole('button', { name: '孩子模式' }).click()

  await page.setViewportSize({ width: 1194, height: 834 })
  await expect(page.locator('.gs-task-grid button')).toHaveCount(16)
  const taskButtons = page.locator('.gs-task-grid button')
  const geometry = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
    visible: [...document.querySelectorAll('.gs-task-grid button')].filter((item) => {
      const rect = item.getBoundingClientRect()
      return rect.top >= 0 && rect.bottom <= window.innerHeight
    }).length,
  }))
  expect(geometry).toEqual({ scrollHeight: 834, innerHeight: 834, visible: 16 })

  for (let index = 0; index < 16; index += 1) await taskButtons.nth(index).click()
  await expect(page.getByRole('button', { name: /完成今晚任务/ })).toBeEnabled()
  await taskButtons.nth(0).click()
  await expect(page.getByRole('button', { name: /再完成 1 项/ })).toBeDisabled()
  await expect(page.locator('.star-balance')).toContainText('0')

  await unlockParent(page)
  await page.setViewportSize({ width: 390, height: 844 })
  const parentNav = page.getByRole('navigation', { name: '家长导航' })
  for (const label of ['今天', '成长', '计划', '奖励', '设置']) await expect(parentNav.getByRole('link', { name: label })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
})
