import { expect, test } from '@playwright/test'
import { setupFamily, unlockParent, expectComfortable, persistedState } from './helpers.js'

test('V2 deep parent pages keep mobile navigation, forms and fixed dialog positioning', async ({ page }) => {
  test.setTimeout(180000)
  await page.setViewportSize({ width: 390, height: 844 })
  await setupFamily(page)
  for (const section of ['report', 'schedule', 'routine', 'rewards', 'profile', 'reading', 'movement', 'responsibility', 'inventor', 'assistant', 'timeline', 'support', 'accessibility', 'devices', 'data', 'sync']) {
    await unlockParent(page, `/parent/${section}`)
    await expect(page.locator('h1').first()).toBeVisible()
    await expectComfortable(page)
    await expect.poll(() => page.locator('#parent-content').evaluate((element) => getComputedStyle(element).transform)).toBe('none')
    const navigation = page.getByRole('navigation', { name: '家长导航' })
    await expect(navigation).toBeInViewport()
    await expect(navigation.getByRole('link')).toHaveCount(5)
    await expect(navigation.getByText('今天', { exact: true })).toBeVisible()
    if (section === 'devices') {
      const heading = page.getByText('还没有已连接设备', { exact: true })
      const box = await heading.boundingBox()
      expect(box.width).toBeGreaterThanOrEqual(200)
      expect(box.height).toBeLessThanOrEqual(65)
    }
    if (section === 'profile') {
      const note = page.locator('.sticky-save > span')
      await expect(note).toBeVisible()
      const box = await note.boundingBox()
      expect(box.width).toBeGreaterThanOrEqual(200)
      expect(box.height).toBeLessThanOrEqual(50)
    }
    if (section === 'timeline') {
      await page.getByLabel('早晨活动名称').first().fill('检查水杯')
      await page.getByRole('button', { name: '保存时间线', exact: true }).click()
      await expect.poll(async () => (await persistedState(page)).modules.core.routines.some((routine) => routine.period === 'morning' && routine.items.some((item) => item.title === '检查水杯'))).toBe(true)
    }
    if (section === 'reading') {
      await page.getByRole('button', { name: /添加家里的书/ }).click()
      const overlay = page.locator('body > .overlay')
      await expect(overlay).toBeVisible()
      const box = await overlay.boundingBox()
      expect(box.x).toBe(0)
      expect(box.y).toBe(0)
      expect(box.width).toBe(390)
      expect(box.height).toBe(844)
      await page.keyboard.press('Escape')
      await expect(overlay).toHaveCount(0)
    }
    await page.screenshot({ path: `artifacts/visual-qa/v2-parent-${section}-phone.png`, fullPage: true })
  }
})
