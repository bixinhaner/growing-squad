import { expect } from '@playwright/test'
export async function setupFamily(page,{name='小语',at='2026-09-06T20:45:00+08:00',prepareTime='20:30',bedTime='21:30'}={}) {
  await page.clock.setFixedTime(new Date(at))
  await page.goto('/bedtime/')
  await page.getByRole('button',{name:/我先替孩子设置/}).click()
  await page.getByLabel('孩子昵称').fill(name)
  await page.getByLabel('开始准备',{exact:true}).fill(prepareTime)
  await page.getByLabel('计划完成任务',{exact:true}).fill(bedTime)
  await page.getByText('设置周末时间',{exact:true}).click()
  await page.getByLabel('周末开始准备',{exact:true}).fill(prepareTime)
  await page.getByLabel('周末计划完成',{exact:true}).fill(bedTime)
  await page.getByLabel('家长区 PIN').fill('2468')
  await page.getByRole('button',{name:/保存并看看今晚/}).click()
  await expect(page).toHaveURL(/\/tonight$/)
  await expect.poll(async() => (await persistedState(page)).setupComplete).toBe(true)
}
export async function persistedState(page) { return page.evaluate(() => JSON.parse(localStorage.getItem('growing-squad:main:v7') || '{}')) }
export async function unlockParent(page,path='/parent/overview') {
  await page.goto(path.startsWith('/bedtime/') ? path : `/bedtime${path}`)
  await expect(page).toHaveURL(/\/parent\/unlock/)
  for(const digit of ['2','4','6','8']) await page.getByRole('button',{name:digit,exact:true}).click()
  await expect(page).not.toHaveURL(/\/parent\/unlock/)
}
export async function expectComfortable(page,buttons=[]) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  for(const button of buttons) {
    await button.scrollIntoViewIfNeeded()
    await expect(button).toBeInViewport()
    const box=await button.boundingBox()
    expect(box.width).toBeGreaterThanOrEqual(40)
    expect(box.height).toBeGreaterThanOrEqual(40)
  }
}
export async function expectImagesLoaded(page) { await expect.poll(() => page.locator('img').evaluateAll((images) => images.every((img) => !img.src || img.complete && img.naturalWidth>0))).toBe(true) }
export async function addBook(page,title='刺猬的勇敢小灯笼',cover='灯笼刺猬') {
  await page.getByRole('button',{name:/添加家里的书/}).click()
  await page.getByLabel('书名').fill(title)
  await page.getByLabel('作者（可不填）').fill('家中绘本')
  await page.getByRole('button',{name:cover,exact:true}).click()
  await page.getByRole('button',{name:'放上书架',exact:true}).click()
  await expect.poll(async() => (await persistedState(page)).modules.reading.books.some((b) => b.title===title)).toBe(true)
}
export async function completeBedtime(page) {
  const buttons=page.locator('.gs-task-grid>button')
  await expect(buttons.first()).toBeVisible()
  const count=await buttons.count()
  for(let index=0;index<count;index+=1) {
    if(await buttons.nth(index).getAttribute('aria-pressed')!=='true') await buttons.nth(index).click()
    await expect(buttons.nth(index)).toHaveAttribute('aria-pressed','true')
  }
  await page.getByRole('button',{name:/完成今晚任务，去月光花园/}).click()
  await expect(page.getByRole('heading',{name:/的小花浇水/})).toBeVisible()
  await expect.poll(async() => Object.values((await persistedState(page)).modules.bedtime.sessions).some((s) => s.status==='goodnight')).toBe(true)
}
