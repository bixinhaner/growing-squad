import { describe, expect, it } from 'vitest'
import { COMPANION_PACKS, COMPANION_POSES, getCompanionPack, getThemePack, THEME_PACKS } from './themePacks.js'

describe('complete companion and world packs', () => {
  it('provides every selectable companion with a generated pose sheet', () => {
    expect(Object.keys(COMPANION_PACKS)).toEqual(['bear', 'rabbit', 'cloud', 'space-cat'])
    expect(Object.values(COMPANION_PACKS).every((pack) => pack.asset.startsWith('assets/companions/') && pack.asset.endsWith('.webp'))).toBe(true)
  })

  it('provides six reusable interaction poses', () => {
    expect(Object.keys(COMPANION_POSES)).toEqual(['wave', 'waiting', 'watering', 'celebrate', 'sleep', 'garden'])
  })

  it('provides all three generated world themes and safe fallbacks', () => {
    expect(Object.keys(THEME_PACKS)).toEqual(['moon-room', 'forest', 'space'])
    expect(Object.values(THEME_PACKS).every((pack) => pack.asset.startsWith('assets/themes/') && pack.asset.endsWith('.webp'))).toBe(true)
    expect(getCompanionPack('missing')).toBe(COMPANION_PACKS.bear)
    expect(getThemePack('missing')).toBe(THEME_PACKS['moon-room'])
  })
})
