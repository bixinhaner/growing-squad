import { appPath } from '../data/paths.js'

export const BEDTIME_TRACKS = [
  { id: 'wind-song', title: '风之歌', artist: '水', src: appPath('audio/bedtime-5min/wind-song.m4a') },
  { id: 'you', title: 'You', artist: '寒蝉鸣泣之时', src: appPath('audio/bedtime-5min/you.m4a') },
  { id: 'moonflower-piano', title: '月光花钢琴', artist: 'Kistol', src: appPath('audio/bedtime-5min/moonflower-piano.m4a') },
  { id: 'rainy-dream', title: '小雨的梦', artist: 'Rizy', src: appPath('audio/bedtime-5min/rainy-dream.m4a') },
]

export function pickBedtimeTrack(previousId = null, random = Math.random) {
  const choices = previousId && BEDTIME_TRACKS.length > 1 ? BEDTIME_TRACKS.filter((track) => track.id !== previousId) : BEDTIME_TRACKS
  return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))]
}
