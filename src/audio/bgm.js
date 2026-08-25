import { appPath } from '../data/paths.js'

export const BEDTIME_TRACKS = [
  { id: 'moon-clouds', title: '月亮云朵', artist: 'Joth', src: appPath('audio/bgm/moon-clouds.m4a') },
  { id: 'starry-meadow', title: '星光草地', artist: 'pmiller', src: appPath('audio/bgm/starry-meadow.m4a') },
  { id: 'moonflower-piano', title: '月光花钢琴', artist: 'Kistol', src: appPath('audio/bgm/moonflower-piano.m4a') },
  { id: 'rainy-dream', title: '小雨的梦', artist: 'Rizy', src: appPath('audio/bgm/rainy-dream.m4a') },
]

export function pickBedtimeTrack(previousId = null, random = Math.random) {
  const choices = previousId && BEDTIME_TRACKS.length > 1 ? BEDTIME_TRACKS.filter((track) => track.id !== previousId) : BEDTIME_TRACKS
  return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))]
}
