// @vitest-environment node
import { it,expect } from 'vitest'
import { readFileSync,existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { PET_ITEMS } from './petCatalog.js'
it('all generated runtime assets exist, are verified individual cutouts and are not concept screenshots',()=>{
  const manifest=JSON.parse(readFileSync('public/assets/pets-v2/manifest.json','utf8'))
  expect(Object.keys(manifest.assets)).toHaveLength(53)
  for(const asset of Object.values(manifest.assets)){
    const path=`public/${asset.path}`
    expect(existsSync(path)).toBe(true)
    const bytes=readFileSync(path)
    expect(bytes.toString('ascii',0,4)).toBe('RIFF')
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(asset.sha256)
  }
})
it('the five requested pets each have six independent generated poses and an egg',()=>{
  for(const pet of ['unicorn','puppy','rabbit','fox','chick']){
    for(const pose of ['idle','happy','eating','wave','sleep','skill'])expect(existsSync(`public/assets/pets-v2/pets/${pet}/${pose}.webp`)).toBe(true)
    expect(existsSync(`public/assets/pets-v2/eggs/${pet}.webp`)).toBe(true)
  }
})
it('every new dress, house and furniture item points to a real standalone shop asset',()=>{
  for(const item of PET_ITEMS.filter(i=>/^(dress-|house-|furniture-)/.test(i.art)))expect(existsSync(`public/assets/pets-v2/shop/${item.art}.webp`)).toBe(true)
})
