import { build } from 'esbuild'
import { readFile, writeFile, copyFile, mkdir } from 'node:fs/promises'
const pkg = JSON.parse(await readFile('node_modules/motion/package.json', 'utf8'))
if (pkg.version !== '12.43.0') throw new Error('Install motion@12.43.0 in an isolated workspace first.')
const result = await build({ stdin: { contents: 'export { animate } from "motion/mini"', resolveDir: process.cwd(), loader: 'js' }, bundle: true, write: false, format: 'esm', minify: false, legalComments: 'inline' })
await mkdir('src/vendor/motion-mini', { recursive: true })
await writeFile('src/vendor/motion-mini/index.js', '/* eslint-disable */\n// Motion 12.43.0, bundled from motion/mini. MIT. See LICENSE and README.md.\n' + result.outputFiles[0].text)
await copyFile('node_modules/motion/LICENSE.md', 'src/vendor/motion-mini/LICENSE.md')
