import { describe, expect, it } from 'vitest'
import { pickBedtimeTrack, BEDTIME_TRACKS } from './bgm.js'
import { soundForAction } from './soundscape.js'

describe('soundscape action coverage', () => {
  it.each([
    'SETUP_COMPLETE', 'COMPLETE_TASK', 'RESET_TASK', 'SKIP_TASK', 'CONFIRM_BED',
    'REQUEST_REWARD', 'APPROVE_REWARD', 'UNDO_REWARD', 'ADD_REWARD_EVENT',
    'UNDO_REWARD_EVENT', 'RECORD_ASLEEP_TIME', 'SKIP_ASLEEP_TIME', 'UPDATE_SCHEDULE',
    'UPDATE_ROUTINE', 'ADD_PROFILE', 'DELETE_PROFILE', 'UPDATE_PROFILE', 'UPDATE_WISHES',
    'UPDATE_ACCESSIBILITY', 'SWITCH_PROFILE',
  ])('maps %s to a clear sound', (type) => {
    expect(soundForAction({ type })).toBeTruthy()
  })

  it('uses the longer celebration when the last task is completed', () => {
    expect(soundForAction({ type: 'COMPLETE_TASK', celebrate: true })).toBe('allTasks')
  })
})

describe('bedtime BGM rotation', () => {
  it('provides four locally hosted tracks', () => {
    expect(BEDTIME_TRACKS).toHaveLength(4)
    expect(BEDTIME_TRACKS.every((track) => track.src.includes('audio/bgm/') && !track.src.startsWith('http'))).toBe(true)
  })

  it('does not repeat the previous track when another track is available', () => {
    const previous = BEDTIME_TRACKS[0]
    expect(pickBedtimeTrack(previous.id, () => 0).id).not.toBe(previous.id)
  })
})
