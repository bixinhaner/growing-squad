import { expect, test } from '@playwright/test'
import { setupFamily, unlockParent, expectComfortable, expectImagesLoaded } from './helpers.js'
async function openGuardian(page) {
  await unlockParent(page, '/parent/data')
  await expect(page.getByRole('heading', { name: '家庭守护中心' })).toBeVisible()
}
async function assertVisualIntegrity(page) {
  await expectComfortable(page); await expectImagesLoaded(page)
  await expect(page.locator('.guardian-step')).toHaveCount(4)
  await expect(page.getByText('记录已保存在本机，建议创建备份')).toBeVisible()
}
test('guardian center gives verifiable protection and progressive disclosure on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1024 })
  await setupFamily(page); await openGuardian(page); await assertVisualIntegrity(page)
  await expect(page.locator('.guardian-danger .danger-zone')).toBeHidden()
  await page.getByRole('button', { name: /立即做一次安全检查/ }).click()
  await expect(page.getByRole('status')).toContainText('本地备份已完成')
  await expect(page.getByText('全部成长记录已安全保存')).toBeVisible()
  await page.getByText('备份、导入与 iPad 安装').click()
  await expect(page.getByRole('button', { name: /导出轻量 JSON/ })).toBeVisible()
  await page.screenshot({ path: 'artifacts/visual-qa/130-family-guardian-desktop.png', fullPage: true })
})
test('guardian center keeps the active destination reachable and readable on iPad', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 })
  await setupFamily(page); await openGuardian(page); await assertVisualIntegrity(page)
  await expect(page.getByRole('navigation', { name: '家长导航' }).getByRole('link', { name: '设置', exact: true })).toBeVisible()
  await page.screenshot({ path: 'artifacts/visual-qa/131-family-guardian-ipad.png', fullPage: true })
})
test('guardian center has no horizontal overflow on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await setupFamily(page); await openGuardian(page); await assertVisualIntegrity(page)
  await expect(page.getByRole('navigation', { name: '家长导航' }).getByRole('link', { name: '设置', exact: true })).toBeVisible()
  await page.screenshot({ path: 'artifacts/visual-qa/132-family-guardian-mobile.png', fullPage: true })
})
