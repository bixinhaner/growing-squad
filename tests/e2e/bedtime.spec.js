import { expect, test } from '@playwright/test'
import { balance, completeBedtime, expectComfortable, persistedState, sessions, setupFamily, unlockParent } from './helpers.js'

test('setup, reversible steps, early finish, watering and goodnight', async ({ page }) => {
  await setupFamily(page)
  const stones = page.locator('.k-stones button')
  const count = await stones.count()
  expect(count).toBeGreaterThan(1)
  const flower = page.locator('.k-path__flower')
  await expect(flower).toHaveAttribute('src', /moonflower-1/)
  await expect(page.locator('.k-path__time')).toContainText('21:30')

  // Undo from the step card and from the toast.
  await page.getByRole('button', { name: '做好了', exact: true }).click()
  await expect(stones.first()).toHaveClass(/is-done/)
  await expect(flower).toHaveAttribute('src', /moonflower-2/)
  await stones.first().click()
  await page.getByRole('button', { name: '其实还没做好' }).click()
  await expect(stones.first()).toHaveClass(/is-todo/)
  await page.getByRole('button', { name: '做好了', exact: true }).click()
  await page.locator('.u-toast').getByRole('button', { name: '撤销' }).click()
  await expect(stones.first()).toHaveClass(/is-todo/)

  // Skipping is reversible too.
  await page.getByRole('button', { name: '今晚不做这件' }).click()
  await expect(stones.first()).toHaveClass(/is-skipped/)
  await stones.first().click()
  await page.getByRole('button', { name: '我还是要做' }).click()
  await expect(stones.first()).toHaveClass(/is-todo/)

  await completeBedtime(page)
  const [session] = await sessions(page)
  expect(session.routineCompletedAt).toBeTruthy()
  expect(session.inBedAt).toBeTruthy()
  expect(session.asleepAt).toBeFalsy()
  expect(await balance(page)).toBe(45)

  for (let pour = 1; pour <= 3; pour += 1) await page.getByRole('button', { name: `浇水（第 ${pour} 次）` }).click()
  await page.getByRole('button', { name: '去睡觉' }).click()
  await expect(page).toHaveURL(/goodnight/)
  await expect(page.getByRole('heading', { name: /晚安，小语/ })).toBeVisible()

  await page.reload()
  expect(await balance(page)).toBe(45)
  await page.goto('/bedtime/tonight')
  await expect(page.getByRole('heading', { name: '今晚完成啦' })).toBeVisible()
  await page.goto('/bedtime/box?tab=garden')
  await expect(page).toHaveURL(/\/garden$/)
  const bloom = page.locator('.k-bloom.is-today')
  await expect(bloom).toHaveClass(/is-stage-4/)
  await expect(bloom).toHaveClass(/has-fruit/)
  await expect(bloom.locator('.k-bloom__fruit')).toHaveText('45')
  await expect(page.getByRole('heading', { name: '月光花园' })).toBeVisible()
  await expect(page.locator('.k-grove__head')).toContainText('结了 45 点星光果')
})

test('late completion keeps a memory without deducting stars or inventing sleep', async ({ page }) => {
  await setupFamily(page, { at: '2026-09-06T22:00:00+08:00' })
  await expect(page.locator('.k-path__time')).toContainText('慢慢走完')
  await completeBedtime(page)
  expect(await balance(page)).toBe(0)
  const [session] = await sessions(page)
  expect(session.asleepAt).toBeFalsy()
  expect(session.completionEarlyMinutes).toBe(0)
  // The flower still blooms; there is just no star fruit.
  await page.goto('/bedtime/garden')
  await expect(page.locator('.k-bloom.is-today')).toHaveClass(/is-stage-4/)
  await expect(page.locator('.k-bloom__fruit')).toHaveCount(0)
})

test('wish request waits for a parent, approval spends stars and undo returns them', async ({ page }) => {
  await setupFamily(page)
  await completeBedtime(page)
  await page.goto('/bedtime/box?tab=wishes')
  await page.getByRole('button', { name: /一起做一件小手工/ }).click()
  await page.getByRole('button', { name: '告诉家长我想要' }).click()
  await expect(page.getByRole('button', { name: /一起做一件小手工/ })).toContainText('等家长确认中')
  await expect.poll(async () => (await persistedState(page)).rewards.requests.some((request) => request.status === 'pending')).toBe(true)
  expect(await balance(page)).toBe(45)

  await unlockParent(page)
  await expect(page.getByRole('heading', { name: /件事等你/ })).toBeVisible()
  await page.getByRole('button', { name: '同意兑换' }).click()
  await expect.poll(() => balance(page)).toBe(10)
  await page.locator('.u-toast').getByRole('button', { name: '撤销' }).click()
  await expect.poll(() => balance(page)).toBe(45)
})

test('tonight fits a phone without sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await setupFamily(page)
  await expectComfortable(page, [page.getByRole('button', { name: '做好了', exact: true })])
})
