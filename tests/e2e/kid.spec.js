import { expect, test } from '@playwright/test'
import { expectComfortable, expectImagesLoaded, persistedState, setupFamily, unlockParent } from './helpers.js'

const PAGES = [
  ['/today', null], ['/tonight', '今晚的小路'], ['/world', '星光世界'], ['/garden', '月光花园'], ['/box', /的宝盒/], ['/box?tab=memories', /的宝盒/],
  ['/box?tab=wishes', /的宝盒/], ['/pet', null], ['/movement', '动一动'], ['/reading', '读故事'], ['/family', '帮家里'],
  ['/inventor', '小发明'], ['/inventor/new', '你发现了什么小麻烦？'], ['/ask', null],
]

for (const viewport of [{ width: 1024, height: 768 }, { width: 375, height: 812 }]) {
  test(`every child page loads cleanly at ${viewport.width}px`, async ({ page }) => {
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.setViewportSize(viewport)
    await setupFamily(page)
    for (const [path, heading] of PAGES) {
      await page.goto(`/bedtime${path}`)
      await expect(page.locator('h1').first()).toBeVisible()
      if (heading) await expect(page.locator('h1').first()).toContainText(heading)
      await expectImagesLoaded(page)
      await expectComfortable(page)
    }
    expect(errors).toEqual([])
  })
}

test('legacy child links still arrive somewhere sensible', async ({ page }) => {
  await setupFamily(page)
  for (const from of ['/wishes', '/play', '/responsibility']) {
    await page.goto(`/bedtime${from}`)
    await expect(page.locator('h1').first()).toBeVisible()
    expect(new URL(page.url()).pathname).not.toBe(`/bedtime${from}`)
  }
})

test('a book added by a parent appears on the child shelf', async ({ page }) => {
  await setupFamily(page)
  await unlockParent(page, '/parent/growth/reading?add=1')
  await page.getByLabel('书名').fill('刺猬的勇敢小灯笼')
  await page.getByLabel('作者（可不填）').fill('家中绘本')
  await page.getByRole('radiogroup', { name: '封面' }).getByRole('radio').first().click()
  await page.getByRole('button', { name: '放上书架' }).click()
  await expect.poll(async () => (await persistedState(page)).modules.reading.books.some((book) => book.title === '刺猬的勇敢小灯笼')).toBe(true)
  await page.goto('/bedtime/reading')
  await expect(page.getByText('刺猬的勇敢小灯笼').first()).toBeVisible()
})

test('the parent door is a press-and-hold, not a tap', async ({ page }) => {
  await setupFamily(page)
  await page.goto('/bedtime/today')
  const lock = page.getByRole('button', { name: /家长入口/ })
  await lock.click()
  await expect(page).toHaveURL(/\/today/)
  await lock.hover()
  await page.mouse.down()
  await page.waitForTimeout(1600)
  await page.mouse.up()
  await expect(page).toHaveURL(/\/parent\/unlock/)
})

test('the star world map leads to every place and back', async ({ page }) => {
  // During the day the home screen offers the world; at bedtime it only shows tonight's path.
  await setupFamily(page, { at: '2026-09-06T16:00:00+08:00' })
  await page.goto('/bedtime/today')
  await page.getByRole('button', { name: '星光世界' }).click()
  await expect(page).toHaveURL(/\/world$/)
  for (const [name, url] of [[/^月光花园：/, /\/garden$/], [/^能量广场：/, /\/movement$/], [/^故事树屋：/, /\/reading$/], [/^家庭小屋：/, /\/family$/], [/^发明工坊：/, /\/inventor$/], [/^愿望码头：/, /\/box\?tab=wishes$/], [/^小伙伴：/, /\/pet$/]]) {
    await page.getByRole('button', { name }).click()
    await expect(page).toHaveURL(url)
    await page.goto('/bedtime/world')
  }
  await expect(page.locator('.k-spot.is-calling')).toHaveCount(0)
  // In the evening the unfinished garden is the place that calls.
  await page.clock.setFixedTime(new Date('2026-09-06T20:45:00+08:00'))
  await page.reload()
  await expect(page.locator('.k-spot.is-calling')).toHaveAccessibleName(/^月光花园：/)
  await page.setViewportSize({ width: 375, height: 812 })
  await expectComfortable(page, [page.getByRole('button', { name: /^能量广场：/ })])
})
