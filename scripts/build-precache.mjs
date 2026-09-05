import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

// Vite emits lazy route chunks separately. Cache every emitted script/style and
// visual asset, rather than only the entry files mentioned in index.html.
export function writePrecacheManifest(directory) {
  const dist = resolve(directory)
  const assets = []
  function walk(folder) {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const path = join(folder, entry.name)
      if (entry.isDirectory()) walk(path)
      else if (entry.isFile() && /\.(js|css|png|webp|svg|ico)$/i.test(entry.name)) assets.push(relative(dist, path).split(sep).join('/'))
    }
  }
  walk(join(dist, 'assets'))
  assets.sort()
  const template = readFileSync(join(dist, 'sw.js'), 'utf8')
  if (!template.includes('__BUILD_REVISION__')) throw new Error('Service worker build revision placeholder is missing; run vite build first.')
  const hash = createHash('sha256').update(template).update(readFileSync(join(dist, 'index.html')))
  for (const asset of assets) hash.update(asset).update('\0').update(readFileSync(join(dist, asset)))
  const revision = hash.digest('hex').slice(0, 20)
  const manifest = { version: 1, revision, assets }
  writeFileSync(join(dist, 'precache-manifest.json'), JSON.stringify(manifest))
  writeFileSync(join(dist, 'sw.js'), template.replaceAll('__BUILD_REVISION__', revision))
  return manifest
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = writePrecacheManifest(resolve('dist'))
  console.log(`Offline build ${manifest.revision}: ${manifest.assets.length} scripts, styles and visual assets`)
}
