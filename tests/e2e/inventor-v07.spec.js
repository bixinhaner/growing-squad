/* global Buffer */
import { expect, test } from '@playwright/test'

async function setupFamily(page) {
  await page.goto('/bedtime/')
  await page.evaluate(async () => {
    window.localStorage.clear()
    await new Promise((resolve) => {
      const request = indexedDB.deleteDatabase('growing-squad-v1')
      request.onsuccess = request.onerror = request.onblocked = resolve
    })
  })
  await page.reload()
  await page.getByRole('button', { name: /和孩子一起开始/ }).click()
  await page.getByLabel('孩子昵称').fill('小语')
  await page.getByLabel('家长区 PIN').fill('2468')
  await page.getByRole('button', { name: /保存并看看今晚/ }).click()
}

async function unlockParent(page) {
  for (const digit of ['2', '4', '6', '8']) await page.getByRole('button', { name: digit, exact: true }).click()
}

async function expectOneScreen(page) {
  const metrics = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    viewportWidth: innerWidth,
    viewportHeight: innerHeight,
  }))
  expect(metrics.width).toBeLessThanOrEqual(metrics.viewportWidth)
  expect(metrics.height).toBeLessThanOrEqual(metrics.viewportHeight)
}

async function createProjectThroughTesting(page) {
  await page.goto('/bedtime/inventor')
  await page.getByRole('button', { name: '发现我的第一个想法' }).click()
  await page.getByRole('button', { name: '把这个想法收进工坊' }).click()
  await page.getByRole('button', { name: '草图准备好啦' }).click()
  await page.getByRole('button', { name: '第一版准备试一试' }).click()
  await expect(page.getByRole('heading', { name: '这次试出了什么？' })).toBeVisible()
}

test('child keeps a complete invention story with offline evidence, a timely knowledge card and a family showcase', async ({ page }) => {
  test.setTimeout(150000)
  await page.setViewportSize({ width: 1366, height: 900 })
  await setupFamily(page)
  await page.goto('/bedtime/inventor')
  await expect(page.getByRole('heading', { name: '发明家工坊' })).toBeVisible()
  await expect(page.getByText(/积分|排名|连续打卡/)).toHaveCount(0)
  await expectOneScreen(page)
  await page.screenshot({ path: 'artifacts/visual-qa/110-inventor-workshop-ipad.png', fullPage: true })

  await page.getByRole('button', { name: '发现我的第一个想法' }).click()
  await expect(page.getByRole('heading', { name: '我发现了什么麻烦？' })).toBeVisible()
  await expectOneScreen(page)
  await page.screenshot({ path: 'artifacts/visual-qa/111-inventor-discover-ipad.png', fullPage: true })
  await page.getByRole('button', { name: '把这个想法收进工坊' }).click()
  await expect(page.getByRole('heading', { name: '先把办法画下来' })).toBeVisible()

  const evidence = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4])
  await page.getByLabel('拍下第一版').setInputFiles({ name: '草图证据.png', mimeType: 'image/png', buffer: evidence })
  await expect(page.getByText('已经保存在这台设备，联网后会自动同步。')).toBeVisible()
  expect(await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('growing-squad-v1', 1)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    return new Promise((resolve, reject) => {
      const request = db.transaction('mediaDrafts').objectStore('mediaDrafts').getAll()
      request.onsuccess = () => resolve(request.result.length)
      request.onerror = () => reject(request.error)
    })
  })).toBe(1)
  await page.reload()
  await expect(page.getByText('等网络恢复')).toBeVisible()

  await page.getByRole('button', { name: '草图准备好啦' }).click()
  await expect(page.getByRole('heading', { name: '先做一个能试的版本' })).toBeVisible()
  await page.screenshot({ path: 'artifacts/visual-qa/112-inventor-prototype-ipad.png', fullPage: true })
  await page.getByRole('button', { name: '第一版准备试一试' }).click()
  await expect(page.getByText('这不是失败，是第一版告诉我们的新线索')).toBeVisible()
  await expectOneScreen(page)
  await page.screenshot({ path: 'artifacts/visual-qa/113-inventor-testing-ipad.png', fullPage: true })
  await page.getByRole('button', { name: '把测试发现收好' }).click()
  await expect(page.getByRole('heading', { name: '新线索已经收好' })).toBeVisible()

  await page.goto('/bedtime/parent/inventor')
  await unlockParent(page)
  await expect(page.getByRole('heading', { name: '发明家工坊' })).toBeVisible()
  await expect(page.getByText('测试发现')).toBeVisible()
  await page.screenshot({ path: 'artifacts/visual-qa/114-inventor-parent-desktop.png', fullPage: true })
  await page.getByRole('button', { name: '放进孩子的下一步' }).first().click()
  await expect(page.getByText('这张小线索已经放进孩子的下一步。')).toBeVisible()

  await page.goto('/bedtime/inventor')
  await page.getByRole('button', { name: /继续往前走/ }).click()
  await expect(page.getByRole('button', { name: '听眠眠讲一遍' })).toBeVisible()
  await page.screenshot({ path: 'artifacts/visual-qa/115-inventor-knowledge-ipad.png', fullPage: true })
  await page.getByRole('button', { name: '带着这个线索再改一版' }).click()
  await expect(page.getByRole('heading', { name: '带着线索做第二版' })).toBeVisible()
  await page.screenshot({ path: 'artifacts/visual-qa/116-inventor-iteration-ipad.png', fullPage: true })
  await page.getByRole('button', { name: '第二版准备讲给家人听' }).click()
  await expect(page.getByRole('heading', { name: '我的发明故事' })).toBeVisible()
  await expect(page.locator('.inventor-story>div')).toHaveCount(4)
  await expect(page.getByText(/得分|积分|排名|获胜/)).toHaveCount(0)
  await expectOneScreen(page)
  await page.screenshot({ path: 'artifacts/visual-qa/117-inventor-showcase-ipad.png', fullPage: true })
})

test('phone testing view keeps every decision and primary action on one screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await setupFamily(page)
  await createProjectThroughTesting(page)
  for (const label of ['前面挡住了', '两边还会漏', '戴起来有点松', '把两边围起来', '把测试发现收好']) await expect(page.getByRole('button', { name: label })).toBeVisible()
  await expect(page.getByText('这不是失败，是第一版告诉我们的新线索')).toBeVisible()
  await expectOneScreen(page)
  await page.screenshot({ path: 'artifacts/visual-qa/118-inventor-testing-mobile.png', fullPage: true })
})
