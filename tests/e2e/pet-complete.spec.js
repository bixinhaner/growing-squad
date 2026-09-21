import { Buffer } from 'node:buffer'
import { expect, test } from '@playwright/test'
import { setupFamily, persistedState, unlockParent, expectComfortable } from './helpers.js'

// These exercise the installed application, not a stand-alone demo or fixture-only UI.
const START = '2026-09-21T16:00:00+08:00'
async function currentPet(page) {
  const state = await persistedState(page)
  return state.modules.pets.byProfile[state.profiles[0].id]
}
async function preparePet(page) {
  await setupFamily(page, { at: START })
  await page.goto('/bedtime/pet')
  await page.getByLabel('给小伙伴取个名字').fill('糯糯')
  await page.getByRole('button', { name: '把这颗蛋带回家', exact: true }).click()
  await expect.poll(async () => (await currentPet(page))?.name).toBe('糯糯')
  for (const name of ['说声你好', '盖好小毯子', '轻声唱一句']) {
    await page.getByRole('button', { name, exact: true }).click()
  }
  await page.clock.setFixedTime(new Date('2026-09-21T16:03:00+08:00'))
  await page.getByRole('button', { name: '一起迎接破壳', exact: true }).click()
  await page.getByRole('button', { name: '抱抱我的小伙伴', exact: true }).click()
  await expect(page.locator('.pet-room .pet-rig')).toHaveAttribute('data-age', 'baby')
}
async function play(page, title) {
  await page.getByRole('button', { name: '玩耍', exact: true }).click()
  await page.locator('.pet-item-card').filter({ has: page.getByRole('heading', { name: title, exact: true }) })
    .getByRole('button', { name: '一起玩一轮', exact: true }).click()
}
async function allowSave(page) {
  const session = Object.values((await currentPet(page)).playSessions).find(s => !s.endedAt)
  await page.clock.setFixedTime(new Date(session.startedAt + 6000))
}

test('zero-star wish goal persists without buying or minting stars', async ({ page }) => {
  await preparePet(page)
  await page.getByRole('button', { name: /徽章小铺，余额/ }).click()
  await page.getByRole('button',{name:'预览纸箱机器人'}).click()
  await page.getByRole('dialog').getByRole('button', { name: '记下这个小愿望' }).click()
  await expect.poll(async () => (await currentPet(page)).life.goalItemId).toBe('robot')
  expect((await persistedState(page)).rewards.starLedger).toHaveLength(0)
  expect((await currentPet(page)).inventory.robot).toBeUndefined()
  await page.reload()
  await page.getByRole('button', { name: /徽章小铺，余额/ }).click()
  await expect(page.locator('.pet-goal')).toContainText('纸箱机器人')
  await page.getByRole('button', { name: '先不设目标', exact: true }).click()
  await expect.poll(async () => (await currentPet(page)).life.goalItemId).toBeNull()
})

test('drawing has an accessible stamp, saves real strokes and survives refresh', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await preparePet(page)
  await page.getByRole('button', { name: '画给小伙伴', exact: true }).click()
  await page.getByLabel('作品名字').fill('我和糯糯的山')
  await page.getByRole('button', { name: '也可以贴一座小山', exact: true }).click()
  await expectComfortable(page)
  await allowSave(page)
  await page.getByRole('button', { name: '保存这件作品', exact: true }).click()
  await expect.poll(async () => (await currentPet(page)).life.creations.some(c => c.work.title === '我和糯糯的山' && c.work.strokes.length === 1)).toBe(true)
  await page.reload()
  await page.getByRole('button', { name: '回忆', exact: true }).click()
  await expect(page.getByRole('heading', { name: '我和糯糯的山', exact: true }).first()).toBeVisible()
  expect((await persistedState(page)).rewards.starLedger).toHaveLength(0)
})

test('theater sequence can be reordered and a saved draft resumes after a reload', async ({ page }) => {
  await preparePet(page)
  await play(page, '我的小剧场')
  await page.getByLabel('作品名字').fill('糯糯的晚安演出')
  for (const name of ['挥挥手', '跳一下', '盖被子']) {
    await page.getByRole('group', { name: '添加演出动作' }).getByRole('button', { name, exact: true }).click()
  }
  await page.getByRole('button', { name: '把第2个动作提前', exact: true }).click()
  await expect.poll(async () => Object.values((await currentPet(page)).playSessions).find(s => !s.endedAt)?.work?.acts).toEqual(['hop', 'wave', 'sleep'])
  await page.reload()
  await expect(page.getByLabel('作品名字')).toHaveValue('糯糯的晚安演出')
  await expect(page.locator('.pet-act-list').first()).toContainText('盖被子')
  await allowSave(page)
  await page.getByRole('button', { name: '保存这件作品', exact: true }).click()
  await expect.poll(async () => (await currentPet(page)).life.creations.some(c => c.work.kind === 'theater' && c.work.acts.length === 3)).toBe(true)
  await page.getByRole('button', { name: '回忆', exact: true }).click()
  const replay = page.getByRole('button', { name: '重看我的小剧场', exact: true }).first()
  await replay.click()
  await expect(page.getByRole('button', { name: '停止演出', exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: '停止演出', exact: true }).first().click()
})

test('room placement and immutable keepsake both persist', async ({ page }) => {
  await preparePet(page)
  await page.getByRole('button', { name: '布置', exact: true }).click()
  await page.locator('.pet-arranger').getByRole('button', { name: '右一点', exact: true }).click()
  await page.getByRole('button', { name: '保存摆放', exact: true }).click()
  await expect.poll(async () => (await currentPet(page)).life.layout.food).toEqual({ x: 20, y: 76 })
  await page.getByRole('button', { name: '回小屋看看', exact: true }).click()
  await expect(page.locator('.pet-room-object--food')).toHaveCSS('left', /px$/)
  await page.getByRole('button', { name: '留下小屋纪念画', exact: true }).click()
  await expect.poll(async () => (await currentPet(page)).memories.filter(m => m.kind === 'snapshot').length).toBe(1)
  await page.getByRole('button', { name: '给小伙伴改名字', exact: true }).click()
  await page.getByRole('dialog').getByLabel('小伙伴的名字').fill('新名字')
  await page.getByRole('dialog').getByRole('button', { name: '保存名字', exact: true }).click()
  await page.reload()
  const pet = await currentPet(page)
  expect(pet.name).toBe('新名字')
  expect(pet.memories.find(m => m.kind === 'snapshot').snapshot.name).toBe('糯糯')
  expect(pet.life.layout.food.x).toBe(20)
})

test('family garden keeps the child choice after refresh without fake attendance', async ({ page }) => {
  await preparePet(page)
  await page.getByRole('button', { name: '去家庭花园', exact: true }).click()
  await page.getByRole('button', { name: '星星花', exact: true }).click()
  await page.getByRole('button', { name: '蓝色', exact: true }).click()
  await page.getByLabel('给家人留一句话').fill('这朵花送给妹妹')
  await page.getByRole('button', { name: '把我的小花种好', exact: true }).click()
  await expect.poll(async () => (await currentPet(page)).life.garden?.flower).toBe('star')
  await page.reload()
  expect((await currentPet(page)).life.garden.note).toBe('这朵花送给妹妹')
  expect(Object.keys((await persistedState(page)).modules.pets.byProfile)).toHaveLength(1)
})

test('media is opt-in and an explicitly selected image can be saved and viewed locally', async ({ page }) => {
  await preparePet(page)
  await page.getByRole('button', { name: '回忆', exact: true }).click()
  await expect(page.getByLabel('添加伙伴照片或语音')).toHaveCount(0)
  await unlockParent(page, '/parent/pet')
  await page.getByLabel('允许主动添加照片和30秒语音').check()
  await page.getByRole('button', { name: '保存伙伴设置', exact: true }).click()
  await expect(page.getByText('伙伴设置已保存。', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: '看看小伙伴的家', exact: true }).click()
  await page.getByRole('button', { name: '回忆', exact: true }).click()
  await page.getByLabel('添加伙伴照片或语音').setInputFiles({
    name: '测试小画.png', mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jR7kAAAAASUVORK5CYII=', 'base64'),
  })
  await expect.poll(async () => (await currentPet(page)).memories.filter(m => m.media).length).toBe(1)
  await expect(page.getByRole('img', { name: '测试小画.png', exact: true })).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: '回忆', exact: true }).click()
  await expect(page.getByRole('img', { name: '测试小画.png', exact: true })).toBeVisible()
})

test('the configured play budget preserves a creation and stops the round, not care', async ({ page }) => {
  await preparePet(page)
  await unlockParent(page, '/parent/pet')
  await page.getByLabel('每天玩耍与创作时间（分钟，0 表示不限）').fill('1')
  await page.getByRole('button', { name: '保存伙伴设置', exact: true }).click()
  await expect(page.getByText('伙伴设置已保存。', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: '看看小伙伴的家', exact: true }).click()
  await play(page, '我的小剧场')
  await page.getByRole('group', { name: '添加演出动作' }).getByRole('button', { name: '挥挥手', exact: true }).click()
  await expect.poll(async () => Object.values((await currentPet(page)).playSessions).find(s => !s.endedAt)?.work?.acts?.length).toBe(1)
  const session = Object.values((await currentPet(page)).playSessions).find(s => !s.endedAt)
  await page.clock.setFixedTime(new Date(session.startedAt + 61000))
  await expect.poll(async () => (await currentPet(page)).playSessions[session.id].endedAt).toBeTruthy()
  expect((await currentPet(page)).life.creations).toHaveLength(1)
  await page.getByRole('button', { name: '照顾', exact: true }).click()
  await page.getByRole('button', { name: '准备食物', exact: true }).click()
  await expect(page.getByText('吧唧吧唧，谢谢你准备的小点心。', { exact: true })).toBeVisible()
})
