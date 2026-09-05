// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { writePrecacheManifest } from './build-precache.mjs'
const folders = []
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'growing-precache-'))
  folders.push(dir)
  mkdirSync(join(dir, 'assets/reading'), { recursive: true })
  writeFileSync(join(dir, 'index.html'), '<script src="assets/index-hash.js"></script>')
  writeFileSync(join(dir, 'sw.js'), "const CACHE_NAME = 'growing-squad-__BUILD_REVISION__'")
  writeFileSync(join(dir, 'assets/index-hash.js'), 'entry')
  writeFileSync(join(dir, 'assets/LazyRoute-hash.js'), 'lazy')
  writeFileSync(join(dir, 'assets/style-hash.css'), 'css')
  writeFileSync(join(dir, 'assets/reading/cover.webp'), 'image')
  return dir
}
afterEach(() => { for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true }) })
describe('offline build manifest', () => {
  it('includes unvisited lazy route chunks, styles and nested visual assets', () => {
    const dir = fixture(), manifest = writePrecacheManifest(dir)
    expect(manifest.assets).toEqual(['assets/LazyRoute-hash.js', 'assets/index-hash.js', 'assets/reading/cover.webp', 'assets/style-hash.css'])
    expect(JSON.parse(readFileSync(join(dir, 'precache-manifest.json'), 'utf8'))).toEqual(manifest)
    expect(readFileSync(join(dir, 'sw.js'), 'utf8')).toContain(manifest.revision)
    expect(readFileSync(join(dir, 'sw.js'), 'utf8')).not.toContain('__BUILD_REVISION__')
  })
  it('changes cache identity when even a non-hashed illustration changes', () => {
    const a = fixture(), b = fixture()
    writeFileSync(join(b, 'assets/reading/cover.webp'), 'changed image')
    expect(writePrecacheManifest(a).revision).not.toBe(writePrecacheManifest(b).revision)
  })
  it('is deterministic for identical builds and fails on an already patched worker', () => {
    const a = fixture(), b = fixture()
    expect(writePrecacheManifest(a)).toEqual(writePrecacheManifest(b))
    expect(() => writePrecacheManifest(a)).toThrow('run vite build first')
  })
})
