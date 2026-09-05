/* global Buffer */
import { expect, test } from '@playwright/test'
import { setupFamily, unlockParent, persistedState, completeBedtime, expectComfortable } from './helpers.js'

const balance = async(page) => (await persistedState(page)).rewards.starLedger.reduce((sum,e) => sum+Number(e.delta || 0),0)
async function reward(page,title,points=10) {
  await page.getByRole('button',{name:'记录奖励',exact:true}).click()
  const dialog=page.getByRole('dialog',{name:'记录奖励'})
  await dialog.getByLabel('奖励原因').fill(title)
  await dialog.getByLabel('自定义星光数量').fill(String(points))
  await dialog.getByRole('button',{name:'保存到奖励宝箱'}).click()
  await expect(page.locator('.reward-moment-list')).toContainText(title)
}

test('family setup, reversible tasks, settlement and refresh preserve a real bedtime',async({page}) => {
  await setupFamily(page)
  const tasks=page.locator('.gs-task-grid>button');const count=await tasks.count()
  expect(count).toBeGreaterThan(0)
  await tasks.first().click(); await expect(tasks.first()).toHaveAttribute('aria-pressed','true')
  await tasks.first().click(); await expect(tasks.first()).toHaveAttribute('aria-pressed','false')
  await expect(page.getByRole('button',{name:new RegExp(`再完成 ${count} 项`)})).toBeDisabled()
  await completeBedtime(page)
  const first=await persistedState(page)
  const session=Object.values(first.modules.bedtime.sessions)[0]
  expect(session.routineCompletedAt).toBeTruthy();expect(session.inBedAt).toBeTruthy();expect(session.asleepAt).toBeFalsy()
  const earned=await balance(page);expect(earned).toBe(45)
  await page.reload();expect(await balance(page)).toBe(earned)
  await page.getByRole('button',{name:'浇好啦，去睡觉'}).click()
  await expect(page).toHaveURL(/goodnight/)
  await page.goto('/bedtime/garden');await expect(page.locator('.calm-week .is-recorded')).toHaveCount(1)
  await page.screenshot({path:'artifacts/visual-qa/bedtime-garden-tablet.png',fullPage:true})
})

test('late completion leaves a memory without deducting stars or inventing sleep',async({page}) => {
  await setupFamily(page,{at:'2026-09-06T22:00:00+08:00'})
  await expect(page.getByText(/慢慢完成也没关系/)).toBeVisible()
  await completeBedtime(page)
  expect(await balance(page)).toBe(0)
  const s=Object.values((await persistedState(page)).modules.bedtime.sessions)[0]
  expect(s.asleepAt).toBeFalsy();expect(s.completionEarlyMinutes).toBe(0)
})

test('wish request keeps balance until parent approval and supports undo',async({page}) => {
  await setupFamily(page);await completeBedtime(page)
  await page.goto('/bedtime/wishes')
  await page.getByRole('button',{name:/一起做一件小手工/}).click()
  await page.getByRole('button',{name:'请家长确认'}).click()
  await expect.poll(async() => (await persistedState(page)).rewards.requests.some((r) => r.status==='pending')).toBe(true)
  expect(await balance(page)).toBe(45)
  await unlockParent(page,'/parent/rewards')
  await page.getByRole('button',{name:/确认兑换/}).click()
  await expect.poll(() => balance(page)).toBe(10)
  await page.getByRole('button',{name:'撤销',exact:true}).click()
  await expect.poll(() => balance(page)).toBe(45)
})

test('parents edit actual schedules, routines, wishes and accessibility',async({page}) => {
  await setupFamily(page);await unlockParent(page,'/parent/schedule')
  await page.getByRole('button',{name:'周末',exact:true}).click()
  await page.getByLabel('计划完成任务',{exact:true}).fill('21:45')
  await page.getByRole('button',{name:'保存作息'}).click()
  await expect(page.getByText(/已保存/)).toBeVisible()
  await unlockParent(page,'/parent/routine');await page.getByRole('button',{name:'周末',exact:true}).click()
  await page.locator('.calm-editor-row').first().getByRole('button',{name:'编辑',exact:true}).click()
  await page.getByLabel('任务名称').fill('认真刷牙')
  await page.getByRole('button',{name:'完成编辑'}).click();await page.getByRole('button',{name:'保存流程'}).click()
  await expect.poll(async() => (await persistedState(page)).modules.bedtime.routines.some((r) => r.steps.some((s) => s.title==='认真刷牙'))).toBe(true)
  await unlockParent(page,'/parent/rewards');await page.getByRole('button',{name:'编辑家庭愿望单'}).click()
  await page.getByLabel('愿望 1 名称').fill('一起画月球车');await page.getByRole('button',{name:'保存愿望单'}).click()
  await expect.poll(async() => (await persistedState(page)).rewards.wishes.some((w) => w.name==='一起画月球车')).toBe(true)
  await unlockParent(page,'/parent/accessibility')
  for(const name of ['减少动态','大号文字','高对比度']) await page.getByRole('switch',{name,exact:true}).click()
  await expect(page.getByRole('switch',{name:'大号文字',exact:true})).toHaveAttribute('aria-checked','true')
  await page.goto('/bedtime/tonight');await expect(page.getByRole('button',{name:/认真刷牙/})).toBeVisible()
  await page.setViewportSize({width:390,height:844});await expectComfortable(page)
})

test('every companion and theme keeps a real layered preview and saved choice',async({page}) => {
  await setupFamily(page);await unlockParent(page,'/parent/profile')
  for(const name of ['眠眠熊','月兔','云朵','太空猫']) {
    await page.locator('.choice-grid--characters').getByRole('button',{name,exact:true}).click()
    await expect(page.locator('.profile-preview .character-pose')).toHaveAttribute('aria-label',`${name}主题预览`)
  }
  for(const name of ['月光卧室','森林小屋','安静太空']) {
    await page.locator('.choice-grid--themes').getByRole('button',{name,exact:true}).click()
    await expect(page.locator('.profile-preview .theme-world')).toBeVisible()
  }
  await page.getByRole('button',{name:'保存资料'}).click()
  await expect.poll(async() => (await persistedState(page)).profiles[0].character).toBe('space-cat')
  await page.goto('/bedtime/today');await expect(page.locator('.child-character')).toHaveAttribute('aria-label','陪伴角色：太空猫')
})

test('two children keep separate tasks and records after switching and refresh',async({page}) => {
  await setupFamily(page);await page.locator('.gs-task-grid>button').first().click()
  await expect(page.locator('.gs-task-grid>button').first()).toHaveAttribute('aria-pressed','true')
  await unlockParent(page,'/parent/profile');await page.getByRole('button',{name:'新增孩子',exact:true}).first().click()
  const dialog=page.getByRole('dialog',{name:'新增孩子'})
  await dialog.getByLabel('孩子昵称').fill('妹妹');await dialog.getByRole('button',{name:'建立孩子档案'}).click()
  await expect.poll(async() => (await persistedState(page)).profiles.length).toBe(2)
  await expect(page.getByLabel('昵称',{exact:true})).toHaveValue('妹妹')
  await page.goto('/bedtime/tonight');await expect(page.locator('.gs-task-grid>button[aria-pressed=true]')).toHaveCount(0)
  await unlockParent(page,'/parent/profile');await page.locator('.child-roster').getByRole('button',{name:/小语/}).click()
  await expect(page.getByLabel('昵称',{exact:true})).toHaveValue('小语')
  await page.goto('/bedtime/tonight');await expect(page.locator('.gs-task-grid>button[aria-pressed=true]')).toHaveCount(1)
  await page.reload();await expect(page.locator('.gs-task-grid>button[aria-pressed=true]')).toHaveCount(1)
})

test('direct parent links require PIN and refresh never leaves parent mode unlocked',async({page}) => {
  await setupFamily(page);await page.goto('/bedtime/parent/data')
  for(const digit of ['1','1','1','1']) await page.getByRole('button',{name:digit,exact:true}).click()
  await expect(page.getByRole('alert')).toContainText('PIN 不正确')
  await unlockParent(page,'/parent/data');await expect(page.getByRole('heading',{name:'家庭守护中心'})).toBeVisible()
  await page.reload();await expect(page.getByRole('heading',{name:'进入家长区'})).toBeVisible()
})

test('backups export and reimport without losing a child profile',async({page}) => {
  await setupFamily(page);await unlockParent(page,'/parent/data')
  await page.getByRole('button',{name:'创建本机备份'}).click()
  await page.getByText('备份、导入与 iPad 安装').click()
  const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:/导出轻量 JSON/}).click()
  const download=await downloaded
  expect(download.suggestedFilename()).toMatch(/\.json$/)
  const stream=await download.createReadStream();const chunks=[];for await(const chunk of stream) chunks.push(chunk)
  const bytes=Buffer.concat(chunks);expect(JSON.parse(bytes.toString()).profiles[0].name).toBe('小语')
  await page.locator('input[type=file]').setInputFiles({name:'restore.json',mimeType:'application/json',buffer:bytes})
  await expect(page.getByText(/数据导入完成/)).toBeVisible()
  expect((await persistedState(page)).profiles[0].name).toBe('小语')
})

test('manual memories and zero-point encouragement persist with reversible recording',async({page}) => {
  await setupFamily(page);await unlockParent(page,'/parent/rewards')
  await reward(page,'帮妹妹找到了水杯',10)
  await expect.poll(() => balance(page)).toBe(10)
  await page.getByRole('button',{name:'撤销',exact:true}).click();await expect.poll(() => balance(page)).toBe(0)
  await reward(page,'一起完成了拼图',0)
  await expect.poll(() => balance(page)).toBe(0)
  await page.goto('/bedtime/me');await expect(page.getByText('一起完成了拼图')).toBeVisible()
  await page.reload();await expect(page.getByText('一起完成了拼图')).toBeVisible()
})
