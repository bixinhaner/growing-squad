import { expect, test } from '@playwright/test'
import { setupFamily, unlockParent, addBook, persistedState, expectComfortable, expectImagesLoaded } from './helpers.js'

test('two books created under one clock remain distinct and the editor restores keyboard focus', async ({ page }) => {
  await setupFamily(page)
  await unlockParent(page, '/parent/reading')
  const opener = page.getByRole('button', { name: '添加家里的书' })
  await opener.click()
  await expect(page.getByRole('dialog', { name: '添加孩子手边的书' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(opener).toBeFocused()
  // setupFamily freezes Date.now: IDs must not depend on a clock tick.
  await addBook(page, '姐姐的机器人故事')
  await addBook(page, '妹妹的月亮故事', '追星星')
  const books = (await persistedState(page)).modules.reading.books
  expect(books).toHaveLength(2)
  expect(new Set(books.map((book) => book.id)).size).toBe(2)
  await page.reload()
  for (const digit of ['2', '4', '6', '8']) await page.getByRole('button', { name: digit, exact: true }).click()
  await expect(page.getByText('姐姐的机器人故事', { exact: true })).toBeVisible()
  await expect(page.getByText('妹妹的月亮故事', { exact: true })).toBeVisible()
})

test('a real parent can acknowledge help and record observed together-reading without inferring independence', async ({ page }) => {
  await setupFamily(page)
  await unlockParent(page, '/parent/reading')
  await addBook(page)
  await page.goto('/bedtime/reading')
  await page.getByRole('button', { name: /刺猬的勇敢小灯笼的封面/ }).click()
  await page.getByRole('button', { name: '带我开始' }).click()
  await page.getByRole('button', { name: '我需要帮助' }).click()
  await expect(page.getByText('已记录你需要帮助，请叫家长来陪一下。')).toBeVisible()
  const session = Object.values((await persistedState(page)).modules.reading.sessions)[0]
  await unlockParent(page, '/parent/support')
  await expect(page.getByRole('heading', { name: '1 个需要回应的请求' })).toBeVisible()
  await page.getByRole('button', { name: '已经陪过孩子' }).click()
  await expect(page.getByRole('heading', { name: '暂时没有求助' })).toBeVisible()
  await expect.poll(async () => Boolean((await persistedState(page)).modules.reading.sessions[session.id].helpResolvedAt)).toBe(true)
  await page.goto(`/bedtime/reading/play/${session.id}`)
  await page.getByRole('button', { name: '读完啦' }).click()
  await page.getByRole('button', { name: '以后再说' }).click()
  await expect(page).toHaveURL(/story-treehouse/)
  await unlockParent(page, '/parent/support')
  const capability = page.locator('.calm-parent-card').filter({ has: page.getByRole('heading', { name: '参与一次阅读', exact: true }) })
  await capability.locator('summary').click()
  await capability.getByRole('combobox').selectOption('together')
  await expect.poll(async () => (await persistedState(page)).modules.reading.sessions[session.id].supportEvidence?.[`${session.profileId}:reading.finish`]?.mode).toBe('together')
  await expect(capability).toContainText('1 次有明确观察')
  await expect(page.getByRole('button', { name: '试一周', exact: true })).toHaveCount(0)
  await expectComfortable(page)
  await page.screenshot({ path: 'artifacts/visual-qa/final-parent-observations.png', fullPage: true })
})

for (const size of [{ name: 'phone', width: 390, height: 844 }, { name: 'tablet', width: 1194, height: 834 }, { name: 'desktop', width: 1440, height: 900 }]) {
  test(`main destinations remain readable and navigable on ${size.name}`, async ({ page }) => {
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.setViewportSize({ width: size.width, height: size.height })
    await setupFamily(page, { at: '2026-09-06T16:20:00+08:00' })
    for (const route of ['today', 'world', 'me']) {
      await page.goto(`/bedtime/${route}`)
      await expect(page.locator('.calm-page h1')).toBeVisible()
      await expect(page.getByRole('navigation', { name: '儿童主导航' }).getByRole('link')).toHaveCount(3)
      await expectComfortable(page)
      await expectImagesLoaded(page)
      await page.screenshot({ path: `artifacts/visual-qa/final-${route}-${size.name}.png`, fullPage: true })
    }
    await unlockParent(page, '/parent/report')
    await expect(page.getByRole('heading', { name: '看见真实的小变化' })).toBeVisible()
    await expectComfortable(page)
    await page.screenshot({ path: `artifacts/visual-qa/final-growth-${size.name}.png`, fullPage: true })
    expect(errors).toEqual([])
  })
}

test('narrow screen and larger text keep choices reachable without horizontal scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 })
  await setupFamily(page, { at: '2026-09-06T16:20:00+08:00' })
  await unlockParent(page, '/parent/accessibility')
  for (const name of ['大号文字', '减少动态']) await page.getByRole('switch', { name, exact: true }).click()
  await expect(page.locator('html')).toHaveClass(/large-text/)
  await page.goto('/bedtime/today')
  await expect(page.locator('.calm-choices>button')).toHaveCount(2)
  await expectComfortable(page, [page.locator('.calm-choices>button').first(), page.getByRole('button', { name: '需要帮助', exact: true })])
  await page.screenshot({ path: 'artifacts/visual-qa/final-today-narrow-large-text.png', fullPage: true })
  await page.getByRole('link', { name: '小队世界' }).click()
  await expect(page.locator('.calm-area-grid>button')).toHaveCount(5)
  await expectComfortable(page, [page.locator('.calm-area-grid>button').last()])
})

test('repeated movement sessions under a fixed clock each preserve their own feedback', async ({ page }) => {
  await setupFamily(page)
  for (const feedback of ['还想玩', '有点难']) {
    await page.goto('/bedtime/movement')
    await page.locator('.movement-picks>button').first().click()
    await page.getByRole('button', { name: '我准备好啦' }).click()
    await page.getByRole('button', { name: '我回来啦' }).click()
    await page.getByRole('button', { name: new RegExp(feedback) }).click()
    await expect(page).toHaveURL(/energy-plaza/)
  }
  await page.reload()
  const sessions = Object.values((await persistedState(page)).modules.movement.sessions)
  expect(sessions).toHaveLength(2)
  expect(new Set(sessions.map((s) => s.id)).size).toBe(2)
  expect(sessions.map((s) => s.feedback).sort()).toEqual(['again', 'hard'])
})

test('two timeline items added in one clock tick stay individually editable', async ({ page }) => {
  await setupFamily(page)
  await unlockParent(page, '/parent/timeline')
  const lane = page.locator('.timeline-lane--after-school')
  await lane.getByRole('button', { name: '添加活动' }).click()
  await lane.getByRole('button', { name: '添加活动' }).click()
  const names = lane.getByRole('textbox', { name: '放学后活动名称', exact: true })
  await expect(names).toHaveCount(5)
  await names.nth(3).fill('拼图时间')
  await names.nth(4).fill('画月球车')
  await expect(names.nth(3)).toHaveValue('拼图时间')
  await page.getByRole('button', { name: '保存时间线' }).click()
  await expect.poll(async () => (await persistedState(page)).modules.core.routines.find((r) => r.period === 'after-school')?.items.length).toBe(5)
  const items = (await persistedState(page)).modules.core.routines.find((r) => r.period === 'after-school').items
  expect(new Set(items.map((item) => item.id)).size).toBe(5)
  expect(items.slice(-2).map((item) => item.title)).toEqual(['拼图时间', '画月球车'])
})
