import { expect } from '@playwright/test'

export const persistedState = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('growing-squad:main:v7') || '{}'))
export const balance = async (page) => (await persistedState(page)).rewards.starLedger.reduce((sum, entry) => sum + Number(entry.delta || 0), 0)
export const sessions = async (page) => Object.values((await persistedState(page)).modules.bedtime.sessions)

async function pressPin(scope, pin = '2468') {
  for (const digit of pin) await scope.getByRole('button', { name: digit, exact: true }).click()
}

/** Walk the four-page v4 setup wizard. Bedtime defaults to 21:00; `later` pushes it back in 15-minute steps. */
export async function setupFamily(page, { name = '小语', at = '2026-09-06T20:45:00+08:00', later = 2 } = {}) {
  await page.clock.setFixedTime(new Date(at))
  await page.goto('/bedtime/')
  await page.getByRole('button', { name: '开始约定' }).click()
  await expect(page.getByRole('heading', { name: '谁要加入成长小队？' })).toBeVisible()
  await page.getByLabel('孩子的昵称').fill(name)
  await page.getByRole('button', { name: '下一步' }).click()
  for (let index = 0; index < later; index += 1) await page.getByRole('button', { name: '上床时间推后 15 分钟' }).click()
  await page.getByRole('group', { name: '周末' }).getByRole('button', { name: '和平时一样' }).click()
  await page.getByRole('button', { name: '下一步' }).click()
  await expect(page.getByRole('group', { name: '睡前步骤' })).toBeVisible()
  await page.getByRole('button', { name: '下一步' }).click()
  await pressPin(page)
  await expect(page.getByRole('heading', { name: '再输一次确认' })).toBeVisible()
  await pressPin(page)
  await expect(page).toHaveURL(/\/tonight$/)
  await expect(page.locator('.k-stones button').first()).toBeVisible()
  await expect.poll(async () => (await persistedState(page)).setupComplete).toBe(true)
}

/** A full load always locks the parent area, so every visit goes through the gate. */
export async function unlockParent(page, path = '/parent') {
  await page.goto(`/bedtime${path}`)
  await expect(page).toHaveURL(/\/parent\/unlock/)
  await pressPin(page)
  await expect(page).not.toHaveURL(/\/parent\/unlock/)
  await expect(page.locator('.p-app')).toBeVisible()
}

/** Tick every stone on tonight's path, then head to the watering ritual. */
export async function completeBedtime(page) {
  const stones = page.locator('.k-stones button')
  await expect(stones.first()).toBeVisible()
  const count = await stones.count()
  for (let index = 0; index < count; index += 1) {
    await page.getByRole('button', { name: '做好了', exact: true }).click()
    await expect(page.locator('.k-stones button.is-done')).toHaveCount(index + 1)
  }
  await page.getByRole('button', { name: '去给小花浇水', exact: true }).click()
  await expect(page.getByRole('heading', { name: '给小花浇水' })).toBeVisible()
  await expect.poll(async () => (await sessions(page)).some((session) => session.status === 'goodnight')).toBe(true)
}

export async function expectComfortable(page, buttons = []) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  for (const button of buttons) {
    await button.scrollIntoViewIfNeeded()
    await expect(button).toBeInViewport()
    const box = await button.boundingBox()
    expect(box.width).toBeGreaterThanOrEqual(40)
    expect(box.height).toBeGreaterThanOrEqual(40)
  }
}

export async function expectImagesLoaded(page) {
  await expect.poll(() => page.locator('img').evaluateAll((images) => images.every((img) => !img.src || (img.complete && img.naturalWidth > 0)))).toBe(true)
}
