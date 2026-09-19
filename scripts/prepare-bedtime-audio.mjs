// Generate the five-minute bedtime versions from the supplied source files.
// The user-provided MP3 paths are intentionally passed through environment
// variables so the repository never stores private download paths.
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const sampleRate = 44100, channels = 2, seconds = 300, gain = 0.32
const sourceTracks = [
  { id: 'wind-song', title: '风之歌', source: process.env.BEDTIME_WIND_SOURCE },
  { id: 'you', title: 'You', source: process.env.BEDTIME_YOU_SOURCE },
  { id: 'moonflower-piano', title: '月光花钢琴', source: 'public/audio/bgm/moonflower-piano.m4a' },
  { id: 'rainy-dream', title: '小雨的梦', source: 'public/audio/bgm/rainy-dream.m4a' },
]
const missing = sourceTracks.filter((track) => !track.source).map((track) => track.id)
if (missing.length) throw new Error(`Set BEDTIME_WIND_SOURCE and BEDTIME_YOU_SOURCE before generating: ${missing.join(', ')}`)
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
  for (const track of sourceTracks) {
    const wav = join(work, `${track.id}-source.wav`), rendered = join(work, `${track.id}-rendered.wav`)
    convert([resolve(track.source), wav, '-f', 'WAVE', '-d', `LEI16@${sampleRate}`])
    const source = readFileSync(wav)
    let offset = 12, pcm
    while (offset + 8 <= source.length) {
      const size = source.readUInt32LE(offset + 4)
      if (source.toString('ascii', offset, offset + 4) === 'data') { pcm = source.subarray(offset + 8, offset + 8 + size); break }
      offset += 8 + size + size % 2
    }
    if (!pcm || !pcm.length) throw new Error(`No PCM data in ${track.id}`)
    const frames = pcm.length / (channels * 2), length = seconds * sampleRate
    const output = Buffer.alloc(length * channels * 2)
    const overlap = Math.round(sampleRate * 0.15), stride = Math.max(1, frames - overlap)
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
    convert([rendered, join(target, `${track.id}.m4a`), '-f', 'm4af', '-d', 'aac', '-b', '96000', '-q', '127'])
    console.log(`${track.title}: ${seconds}s, baked gain ${gain}, 2.2s fade in, 8s fade out`)
  }
} finally { rmSync(work, { recursive: true, force: true }) }
