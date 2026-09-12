import { expect, test } from '@playwright/test'
import { completeBedtime, setupFamily } from './helpers.js'

async function goodnight(page) {
  await page.addInitScript(() => {
    const NativeAudio = window.Audio
    window.__bedtimeAudios = []
    window.Audio = function (...args) {
      const audio = new NativeAudio(...args)
      window.__bedtimeAudios.push(audio)
      return audio
    }
    window.Audio.prototype = NativeAudio.prototype
  })
  await setupFamily(page)
  await completeBedtime(page)
  await page.goto('/bedtime/goodnight')
  await expect(page.getByRole('button', { name: '随机播放 5 分钟', exact: true })).toBeVisible()
}
const playing = (page) => page.getByRole('button', { name: '停止轻音乐', exact: true })
const noAudio = (page) => expect.poll(() => page.evaluate(() => window.__bedtimeAudios.every((audio) => audio.paused))).toBe(true)

test('music can switch, stop, recover from interruption and end without a page timer', async ({ page }) => {
  await goodnight(page)
  await page.getByRole('button', { name: '随机播放 5 分钟', exact: true }).click()
  await expect(playing(page)).toBeVisible()
  const title = await page.getByRole('status').textContent()
  await page.getByRole('button', { name: '换一首', exact: true }).click()
  await expect(playing(page)).toBeVisible()
  await expect(page.getByRole('status')).not.toHaveText(title)
  await playing(page).click(); await noAudio(page)
  await page.getByRole('button', { name: '随机播放 5 分钟', exact: true }).click()
  await expect(playing(page)).toBeVisible()
  await page.evaluate(() => window.__bedtimeAudios.at(-1).pause())
  await expect(page.getByRole('status')).toContainText('已暂停')
  await page.getByRole('button', { name: '继续播放', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('正在播放')
  const media = await page.evaluate(() => {
    const audio = window.__bedtimeAudios.at(-1)
    return { duration: audio.duration, loop: audio.loop, count: window.__bedtimeAudios.length }
  })
  expect(media.duration).toBeCloseTo(300, 0)
  expect(media.loop).toBe(false)
  expect(media.count).toBe(3)
  // Seek the real AAC to its ending; native ended must reset the actual UI.
  await page.evaluate(() => { window.__bedtimeAudios.at(-1).currentTime = 299.5 })
  await expect(page.getByRole('button', { name: '随机播放 5 分钟', exact: true })).toBeVisible()
  await noAudio(page)
})

test('slow loading can be cancelled and repeated switches never leave uncontrolled music', async ({ page }) => {
  await goodnight(page)
  await page.route('**/audio/bedtime-5min/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 900))
    await route.continue().catch(() => {})
  })
  await page.getByRole('button', { name: '随机播放 5 分钟', exact: true }).click()
  await page.getByRole('button', { name: '取消播放', exact: true }).click()
  await expect(page.getByRole('button', { name: '随机播放 5 分钟', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '随机播放 5 分钟', exact: true }).click()
  await page.getByRole('button', { name: '换一首', exact: true }).click()
  await page.getByRole('button', { name: '换一首', exact: true }).click()
  await expect(playing(page)).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  expect(await page.evaluate(() => window.__bedtimeAudios.filter((audio) => !audio.paused).length)).toBe(1)
  await playing(page).click()
  await noAudio(page)
})

test('offline failure gives a useful retry and recovers when the connection returns', async ({ page, context }) => {
  await goodnight(page)
  await context.setOffline(true)
  await page.getByRole('button', { name: '随机播放 5 分钟', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('请联网')
  await noAudio(page)
  await context.setOffline(false)
  await page.getByRole('button', { name: '重新播放', exact: true }).click()
  await expect(playing(page)).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await playing(page).click(); await noAudio(page)
})
