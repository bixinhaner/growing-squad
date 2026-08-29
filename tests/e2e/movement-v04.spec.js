import { expect, test } from '@playwright/test'

async function setupFamily(page) {
  await page.goto('/bedtime/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await page.getByRole('button', { name: /和孩子一起开始/ }).click()
  await page.getByLabel('孩子昵称').fill('小语')
  await page.getByLabel('家长区 PIN').fill('2468')
  await page.getByRole('button', { name: /保存并看看今晚/ }).click()
}

test('child starts within three taps and feedback becomes an energy memory', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 })
  await setupFamily(page)
  await page.goto('/bedtime/today')

  await page.getByRole('button', { name: /选一个好玩的活动/ }).click() // 1
  await expect(page.getByRole('heading', { name: '今天想怎样动一动？' })).toBeVisible()
  await page.locator('.movement-picks>button').first().click() // 2
  const activityTitle = await page.locator('.movement-ready h1').innerText()
  await page.getByRole('button', { name: '我准备好啦' }).click() // 3

  await expect(page.getByRole('heading', { name: '去玩吧，屏幕在这里等你' })).toBeVisible()
  await expect(page.getByText(/卡路里|热量|排名|计时/)).toHaveCount(0)
  const singleScreen = await page.evaluate(() => ({ document: document.documentElement.scrollHeight, viewport: innerHeight }))
  expect(singleScreen.document).toBeLessThanOrEqual(singleScreen.viewport)

  await page.getByRole('button', { name: '我回来啦' }).click()
  await page.getByRole('button', { name: /还想玩/ }).click()
  await expect(page.getByRole('heading', { name: '能量广场' })).toBeVisible()
  await expect(page.getByText(activityTitle)).toBeVisible()
  await page.reload()
  await expect(page.getByText(activityTitle)).toBeVisible()
  await page.screenshot({ path: 'artifacts/visual-qa/80-movement-energy-ipad.png', fullPage: true })
})

test('phone keeps every child action visible without page scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await setupFamily(page)
  await page.goto('/bedtime/movement')
  for (const name of ['换两个', '和家长一起', '今天先不做']) await expect(page.getByRole('button', { name })).toBeVisible()
  const choiceMetrics = await page.evaluate(() => ({ document: document.documentElement.scrollHeight, viewport: innerHeight }))
  expect(choiceMetrics.document).toBeLessThanOrEqual(choiceMetrics.viewport)
  await page.locator('.movement-picks>button').first().click()
  for (const name of ['我准备好啦', '换一个', '需要帮助']) await expect(page.getByRole('button', { name, exact: true })).toBeVisible()
  const readyMetrics = await page.evaluate(() => ({ document: document.documentElement.scrollHeight, viewport: innerHeight }))
  expect(readyMetrics.document).toBeLessThanOrEqual(readyMetrics.viewport)
  await page.screenshot({ path: 'artifacts/visual-qa/81-movement-ready-mobile.png', fullPage: true })
})

test('parent sees autonomy insight and can enable rain-safe recommendations', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await setupFamily(page)
  await page.goto('/bedtime/parent/movement')
  for (const digit of ['2', '4', '6', '8']) await page.getByRole('button', { name: digit, exact: true }).click()
  await expect(page.getByRole('heading', { name: '运动小队' })).toBeVisible()
  await expect(page.getByText('累计自主选择')).toBeVisible()
  await expect(page.locator('.movement-library__grid article')).toHaveCount(20)
  await page.getByLabel('下雨时自动推荐室内活动').check()
  await expect(page.getByLabel('下雨时自动推荐室内活动')).toBeChecked()
  await expect(page.getByText(/卡路里|体重|排行榜/)).toHaveCount(0)
  await page.screenshot({ path: 'artifacts/visual-qa/82-movement-parent-desktop.png', fullPage: true })
})
