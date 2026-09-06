import { expect, test } from '@playwright/test'
import { setupFamily, unlockParent, persistedState, expectComfortable } from './helpers.js'

// Layout-only fixture. Start with a real setup and preserve required built-in IDs.
// These synthetic task names never access a production household.
async function layoutTasks(page, count = 16) {
  await page.evaluate((count) => {
    const state = JSON.parse(localStorage.getItem('growing-squad:main:v7'))
    const names = ['收拾明天的衣服', '整理书包', '收拾玩具', '上厕所', '喝水', '抹润肤霜', '和家人说晚安', '整理枕头', '准备睡觉']
    const icons = ['pajamas', 'backpack', 'toys', 'toilet', 'wash', 'lotion', 'heart', 'pillow', 'lamp']
    for (const routine of state.modules.bedtime.routines.filter((r) => r.profileId === state.activeProfileId)) {
      const builtins = routine.steps.filter((step) => step.enabled).slice(0, 7)
      routine.steps = [...builtins, ...Array.from({ length: Math.max(0, count - builtins.length) }, (_, i) => ({
        id: `layout-${i}`, title: names[i] || `自定义准备事项${i + 1}`, icon: icons[i] || 'lamp', duration: 3, enabled: true,
      }))]
    }
    localStorage.setItem('growing-squad:main:v7', JSON.stringify(state))
  }, count)
  await page.reload()
  await expect(page.locator('.gs-task-grid>button')).toHaveCount(count)
  await expect.poll(() => page.locator('#child-content').evaluate((e) => getComputedStyle(e).transform)).toBe('none')
}
async function assertNamesContained(page) {
  expect(await page.locator('.tonight-task').evaluateAll((items) => items.every((item) => {
    const name = item.querySelector('.tonight-task__title'), text = name.getBoundingClientRect(), card = item.getBoundingClientRect()
    return text.left >= card.left && text.right <= card.right + 1 && text.top >= card.top && text.bottom <= card.bottom + 1 && name.scrollWidth <= name.clientWidth + 1
  }))).toBe(true)
}

test('tonight 16-card tablet board gives space to equal rows and contains long names', async ({ page }) => {
  await page.setViewportSize({ width: 1194, height: 834 })
  await setupFamily(page)
  await layoutTasks(page)
  const tasks = page.locator('.gs-task-grid>button')
  const grid = page.getByRole('group', { name: '今晚任务清单' })
  await expect(page.getByRole('button', { name: '专注一件', exact: true })).toHaveCount(0)
  await expect(page.getByRole('group', { name: '睡前查看方式' })).toHaveCount(0)
  await assertNamesContained(page)
  const metrics = await grid.evaluate((el) => {
    const board = el.closest('.tonight-board'), r = el.getBoundingClientRect()
    const header = board.querySelector('header').getBoundingClientRect(), tiles = [...el.querySelectorAll('button')].map((b) => b.getBoundingClientRect())
    return { headerHeight: header.height, gridHeight: r.height, ratio: r.height / board.getBoundingClientRect().height,
      columns: getComputedStyle(el).gridTemplateColumns.split(' ').length,
      firstRow: tiles.slice(0, 3).map((b) => ({ width: b.width, height: b.height, y: b.y })),
      visible: tiles.filter((b) => b.top >= r.top && b.bottom <= r.bottom + 1).length }
  })
  expect(metrics.headerHeight).toBeLessThanOrEqual(82)
  expect(metrics.gridHeight).toBeGreaterThanOrEqual(430)
  expect(metrics.ratio).toBeGreaterThan(.69)
  expect(metrics.columns).toBe(3)
  expect(metrics.visible).toBe(16)
  for (const box of metrics.firstRow.slice(1)) {
    expect(Math.abs(box.width - metrics.firstRow[0].width)).toBeLessThanOrEqual(1)
    expect(Math.abs(box.y - metrics.firstRow[0].y)).toBeLessThanOrEqual(1)
    expect(Math.abs(box.height - metrics.firstRow[0].height)).toBeLessThanOrEqual(1)
  }
  await expect(page.locator('.gs-tonight-finish')).toBeInViewport()
  await page.screenshot({ path: 'artifacts/visual-qa/tonight-board-tablet.png', fullPage: true })
  await test.info().attach('panel-measurements', { body: JSON.stringify(metrics, null, 2), contentType: 'application/json' })
  const longTask = page.getByRole('button', { name: '收拾明天的衣服', exact: true })
  await longTask.click()
  await expect(tasks.nth(7)).toHaveAttribute('aria-pressed', 'true')
  await page.reload()
  await expect(tasks.nth(7)).toHaveAttribute('aria-pressed', 'true')
  await tasks.nth(7).click()
  await expect(tasks.nth(7)).toHaveAttribute('aria-pressed', 'false')
})

test('overflow stays inside the right panel without covering footer or moving the scene', async ({ page }) => {
  await page.setViewportSize({ width: 1194, height: 834 })
  await setupFamily(page)
  await layoutTasks(page, 24)
  const scene = page.locator('.gs-tonight-scene'), grid = page.locator('.tonight-board__grid'), tasks = grid.locator('button')
  const before = await scene.boundingBox()
  expect(await grid.evaluate((e) => e.scrollHeight > e.clientHeight)).toBe(true)
  await tasks.last().scrollIntoViewIfNeeded()
  await expect(tasks.last()).toBeInViewport()
  await expect(page.locator('.gs-tonight-finish')).toBeInViewport()
  await tasks.last().focus()
  await page.keyboard.press('Space')
  await expect(tasks.last()).toHaveAttribute('aria-pressed', 'true')
  expect(await scene.boundingBox()).toEqual(before)
  await assertNamesContained(page)
  await page.screenshot({ path: 'artifacts/visual-qa/tonight-board-overflow.png', fullPage: true })
})

test('temporary skip and restore remain reachable from the slim header without false completion', async ({ page }) => {
  await page.setViewportSize({ width: 1194, height: 834 })
  await setupFamily(page)
  const first = page.locator('.gs-task-grid>button').first()
  const name = await first.getAttribute('aria-label')
  const adjust = page.getByRole('button', { name: '调整今晚任务', exact: true })
  await adjust.click()
  const dialog = page.getByRole('dialog', { name: '调整今晚任务' })
  await dialog.getByRole('button', { name: new RegExp(name) }).click()
  await page.keyboard.press('Escape')
  await expect(adjust).toBeFocused()
  await expect(first).toHaveClass(/is-skipped/)
  await expect(first).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('.tonight-board__progress')).toContainText('1 项已跳过')
  await expect(page.locator('.tonight-board__progress strong')).toHaveText('0 / 7')
  await adjust.click()
  await dialog.getByRole('button', { name: new RegExp(name) }).click()
  await page.keyboard.press('Escape')
  await expect(first).not.toHaveClass(/is-skipped/)
  await expect(page.locator('.tonight-board__progress')).not.toContainText('已跳过')
})

for (const [name, width, height, large] of [['desktop', 1440, 900, false], ['phone', 390, 844, false], ['narrow-large', 320, 740, true]]) {
  test(`tonight full labels and controls stay reachable on ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await setupFamily(page)
    if (large) {
      await unlockParent(page, '/parent/accessibility')
      await page.getByRole('switch', { name: '大号文字', exact: true }).click()
      await page.getByRole('switch', { name: '减少动态', exact: true }).click()
      await expect(page.locator('html')).toHaveClass(/large-text/)
      await page.goto('/bedtime/tonight')
      await expect(page.locator('.gs-task-grid>button').first()).toBeVisible()
    }
    await layoutTasks(page)
    await assertNamesContained(page)
    const grid = page.locator('.gs-task-grid')
    await expectComfortable(page, [grid.locator('button').first(), grid.locator('button').nth(7), grid.locator('button').last()])
    const title = grid.locator('button').nth(7).locator('strong')
    await expect(title).toHaveText('收拾明天的衣服')
    expect(await title.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16)
    expect((await persistedState(page)).setupComplete).toBe(true)
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
    await page.screenshot({ path: `artifacts/visual-qa/tonight-board-${name}.png`, fullPage: true })
  })
}
