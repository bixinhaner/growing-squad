// Optional asset authoring on macOS, not part of the production build.
// Keep the CC0 sources unchanged; generated AAC files have a native ending,
// quiet level and fades, independent of background timers or iOS volume APIs.
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const sampleRate = 44100, channels = 2, seconds = 300, gain = 0.32
const work = mkdtempSync(join(tmpdir(), 'bedtime-audio-'))
const target = resolve('public/audio/bedtime-5min')
mkdirSync(target, { recursive: true })
function convert(args) {
  const result = spawnSync('/usr/bin/afconvert', args, { encoding: 'utf8' })
  if (result.error || result.status !== 0) throw result.error || new Error(result.stderr)
}
function pcmWave(data) {
  const header = Buffer.alloc(44)
  header.write('RIFF'); header.writeUInt32LE(data.length + 36, 4); header.write('WAVEfmt ', 8)
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(channels, 22)
  header.writeUInt32LE(sampleRate, 24); header.writeUInt32LE(sampleRate * channels * 2, 28)
  header.writeUInt16LE(channels * 2, 32); header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(data.length, 40)
  return Buffer.concat([header, data])
}
try {
  for (const name of ['moon-clouds', 'starry-meadow', 'moonflower-piano', 'rainy-dream']) {
    const wav = join(work, 'source.wav'), rendered = join(work, 'rendered.wav')
    convert([resolve(`public/audio/bgm/${name}.m4a`), wav, '-f', 'WAVE', '-d', `LEI16@${sampleRate}`])
    const source = readFileSync(wav)
    let offset = 12, pcm
    while (offset + 8 <= source.length) {
      const size = source.readUInt32LE(offset + 4)
      if (source.toString('ascii', offset, offset + 4) === 'data') { pcm = source.subarray(offset + 8, offset + 8 + size); break }
      offset += 8 + size + size % 2
    }
    if (!pcm || !pcm.length) throw new Error(`No PCM data in ${name}`)
    const frames = pcm.length / (channels * 2), length = seconds * sampleRate
    const output = Buffer.alloc(length * channels * 2)
    // Short crossfades avoid a click or a hard boundary at each loop.
    const overlap = Math.round(sampleRate * 0.15), stride = frames - overlap
    for (let frame = 0; frame < length; frame += 1) {
      const position = frame < frames ? frame : overlap + (frame - frames) % stride
      const loopEnd = position >= stride
      const mix = loopEnd ? (position - stride) / overlap : 0
      const envelope = gain * Math.min(1, frame / (2.2 * sampleRate), (length - 1 - frame) / (8 * sampleRate))
      for (let channel = 0; channel < channels; channel += 1) {
        const original = pcm.readInt16LE((position * channels + channel) * 2)
        const next = loopEnd ? pcm.readInt16LE(((position - stride) * channels + channel) * 2) : 0
        output.writeInt16LE(Math.round((original * (1 - mix) + next * mix) * envelope), (frame * channels + channel) * 2)
      }
    }
    writeFileSync(rendered, pcmWave(output))
    convert([rendered, join(target, `${name}.m4a`), '-f', 'm4af', '-d', 'aac', '-b', '96000', '-q', '127'])
    console.log(`${name}: ${seconds}s, baked gain ${gain}, 2.2s fade in, 8s fade out`)
  }
} finally { rmSync(work, { recursive: true, force: true }) }
