const ACTION_SOUNDS = {
  SETUP_COMPLETE: 'celebration',
  COMPLETE_TASK: 'taskComplete',
  RESET_TASK: 'undo',
  SKIP_TASK: 'skip',
  CONFIRM_BED: 'ready',
  REQUEST_REWARD: 'wish',
  APPROVE_REWARD: 'reward',
  UNDO_REWARD: 'undo',
  ADD_REWARD_EVENT: 'reward',
  UNDO_REWARD_EVENT: 'undo',
  RECORD_ASLEEP_TIME: 'save',
  SKIP_ASLEEP_TIME: 'dismiss',
  UPDATE_SCHEDULE: 'save',
  UPDATE_ROUTINE: 'save',
  ADD_PROFILE: 'celebration',
  DELETE_PROFILE: 'caution',
  UPDATE_PROFILE: 'save',
  UPDATE_WISHES: 'save',
  UPDATE_ACCESSIBILITY: 'toggle',
  SWITCH_PROFILE: 'switch',
  SELECT_MOVEMENT_ACTIVITY: 'tap',
  START_MOVEMENT_ACTIVITY: 'ready',
  REQUEST_MOVEMENT_HELP: 'wish',
  COMPLETE_MOVEMENT_ACTIVITY: 'allTasks',
  RECORD_MOVEMENT_FEEDBACK: 'keepsake',
  SKIP_MOVEMENT_ACTIVITY: 'skip',
  UPDATE_MOVEMENT_PREFERENCES: 'save',
  ADD_READING_BOOK: 'save',
  UPDATE_READING_BOOK: 'save',
  SELECT_READING_MODE: 'tap',
  START_READING_SESSION: 'ready',
  REQUEST_READING_HELP: 'wish',
  COMPLETE_READING_SESSION: 'keepsake',
  RECORD_READING_DIFFICULTY: 'toggle',
  ADD_READING_REFLECTION: 'keepsake',
  UPSERT_RESPONSIBILITY_ROUTINE: 'save',
  ROTATE_RESPONSIBILITY_ROLES: 'switch',
  UPDATE_RESPONSIBILITY_SCAFFOLD: 'toggle',
  REQUEST_RESPONSIBILITY_ROLE_CHANGE: 'wish',
  RESOLVE_RESPONSIBILITY_REQUEST: 'save',
  START_RESPONSIBILITY_SESSION: 'ready',
  REQUEST_RESPONSIBILITY_HELP: 'wish',
  COMPLETE_RESPONSIBILITY_ROLE: 'keepsake',
  ADD_RESPONSIBILITY_REFLECTION: 'keepsake',
  CREATE_INVENTOR_PROJECT: 'ready',
  UPDATE_INVENTOR_STAGE: 'switch',
  ADD_INVENTOR_ARTIFACT: 'keepsake',
  MARK_INVENTOR_ARTIFACT_SYNCED: 'save',
  RECORD_INVENTOR_TEST: 'keepsake',
  ADD_INVENTOR_KNOWLEDGE: 'keepsake',
  CREATE_INVENTOR_ITERATION: 'celebration',
  SELECT_INVENTOR_SHOWCASE_METHOD: 'toggle',
  ADD_INVENTOR_PARENT_NOTE: 'save',
  ARCHIVE_INVENTOR_PROJECT: 'keepsake',
}

let context = null
let destination = null
let pendingTap = null
let noiseBuffer = null

function getAudioContext() {
  if (typeof window === 'undefined') return null
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return null
  if (!context || context.state === 'closed') {
    context = new AudioContext()
    const compressor = context.createDynamicsCompressor()
    compressor.threshold.value = -20
    compressor.knee.value = 18
    compressor.ratio.value = 5
    compressor.attack.value = 0.006
    compressor.release.value = 0.25
    const master = context.createGain()
    master.gain.value = 0.24
    master.connect(compressor)
    compressor.connect(context.destination)
    destination = master
  }
  return context
}

export function primeAudio() {
  const audio = getAudioContext()
  if (audio?.state === 'suspended') audio.resume().catch(() => {})
}

function tone(audio, frequency, start, duration, volume = 0.25, type = 'sine', detune = 0) {
  const oscillator = audio.createOscillator()
  const gain = audio.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, start)
  oscillator.detune.value = detune
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + Math.min(0.035, duration * 0.12))
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  oscillator.connect(gain)
  gain.connect(destination)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.03)
}

function bell(audio, frequency, start, duration = 0.75, volume = 0.2) {
  tone(audio, frequency, start, duration, volume, 'sine')
  tone(audio, frequency * 2.01, start, duration * 0.56, volume * 0.3, 'sine', 3)
  tone(audio, frequency * 3.98, start, duration * 0.28, volume * 0.1, 'sine', -4)
}

function getNoise(audio) {
  if (noiseBuffer && noiseBuffer.sampleRate === audio.sampleRate) return noiseBuffer
  noiseBuffer = audio.createBuffer(1, audio.sampleRate * 3, audio.sampleRate)
  const channel = noiseBuffer.getChannelData(0)
  for (let index = 0; index < channel.length; index += 1) channel[index] = (Math.random() * 2 - 1) * (1 - index / channel.length)
  return noiseBuffer
}

function noise(audio, start, duration, volume = 0.08, frequency = 1400) {
  const source = audio.createBufferSource()
  const filter = audio.createBiquadFilter()
  const gain = audio.createGain()
  source.buffer = getNoise(audio)
  filter.type = 'bandpass'
  filter.frequency.value = frequency
  filter.Q.value = 1.2
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(0.04, duration * 0.2))
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  source.connect(filter)
  filter.connect(gain)
  gain.connect(destination)
  source.start(start)
  source.stop(start + duration)
}

const sequences = {
  tap(audio, now) {
    bell(audio, 659.25, now, 0.24, 0.12)
  },
  toggle(audio, now) {
    bell(audio, 523.25, now, 0.35, 0.13)
    bell(audio, 659.25, now + 0.12, 0.4, 0.12)
  },
  dismiss(audio, now) {
    tone(audio, 440, now, 0.34, 0.11, 'sine')
    tone(audio, 349.23, now + 0.12, 0.44, 0.1, 'sine')
  },
  navigate(audio, now) {
    bell(audio, 587.33, now, 0.38, 0.11)
    bell(audio, 783.99, now + 0.13, 0.48, 0.1)
  },
  taskComplete(audio, now) {
    ;[523.25, 659.25, 783.99].forEach((frequency, index) => bell(audio, frequency, now + index * 0.18, 0.72, 0.2 - index * 0.02))
  },
  allTasks(audio, now) {
    ;[523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((frequency, index) => bell(audio, frequency, now + index * 0.25, 1.05, 0.2))
    bell(audio, 523.25, now + 1.38, 1.15, 0.11)
    bell(audio, 783.99, now + 1.38, 1.15, 0.1)
    bell(audio, 1046.5, now + 1.38, 1.3, 0.14)
  },
  undo(audio, now) {
    bell(audio, 659.25, now, 0.55, 0.14)
    bell(audio, 523.25, now + 0.2, 0.65, 0.12)
  },
  skip(audio, now) {
    noise(audio, now, 0.65, 0.045, 850)
    tone(audio, 440, now + 0.08, 0.55, 0.11, 'sine')
    tone(audio, 349.23, now + 0.28, 0.62, 0.09, 'sine')
  },
  ready(audio, now) {
    ;[392, 523.25, 659.25, 783.99].forEach((frequency, index) => bell(audio, frequency, now + index * 0.22, 0.9, 0.18))
  },
  wish(audio, now) {
    bell(audio, 587.33, now, 0.8, 0.16)
    bell(audio, 739.99, now + 0.22, 0.9, 0.15)
    bell(audio, 880, now + 0.46, 1, 0.14)
  },
  reward(audio, now) {
    ;[523.25, 659.25, 783.99, 987.77, 1174.66].forEach((frequency, index) => bell(audio, frequency, now + index * 0.18, 1.05, 0.17))
    noise(audio, now + 0.25, 1.25, 0.025, 2600)
  },
  save(audio, now) {
    bell(audio, 493.88, now, 0.65, 0.13)
    bell(audio, 659.25, now + 0.2, 0.8, 0.14)
  },
  switch(audio, now) {
    bell(audio, 523.25, now, 0.55, 0.12)
    bell(audio, 698.46, now + 0.14, 0.65, 0.12)
    bell(audio, 880, now + 0.28, 0.72, 0.11)
  },
  caution(audio, now) {
    tone(audio, 293.66, now, 0.55, 0.1, 'triangle')
    tone(audio, 261.63, now + 0.26, 0.62, 0.09, 'triangle')
  },
  celebration(audio, now) {
    sequences.allTasks(audio, now)
    noise(audio, now + 0.45, 1.7, 0.03, 3200)
  },
  watering(audio, now) {
    noise(audio, now, 2.7, 0.035, 900)
    ;[0.05, 0.32, 0.61, 0.96, 1.35, 1.78, 2.12].forEach((offset, index) => {
      bell(audio, 900 + index * 75, now + offset, 0.34, 0.1)
      noise(audio, now + offset, 0.18, 0.055, 1800 + index * 90)
    })
  },
  bloom(audio, now) {
    ;[392, 493.88, 587.33, 783.99].forEach((frequency, index) => bell(audio, frequency, now + index * 0.22, 1.25, 0.17))
    bell(audio, 987.77, now + 1.05, 1.25, 0.14)
    noise(audio, now + 0.45, 1.45, 0.025, 3000)
  },
  starlight(audio, now) {
    ;[659.25, 783.99, 987.77, 1174.66, 1318.51, 1567.98, 1318.51, 1760].forEach((frequency, index) => bell(audio, frequency, now + index * 0.42, 1.15, 0.13))
    noise(audio, now + 0.35, 3.35, 0.022, 3400)
  },
  keepsake(audio, now) {
    ;[392, 493.88, 587.33, 493.88].forEach((frequency, index) => bell(audio, frequency, now + index * 0.42, 1.25, 0.11))
  },
  goodnight(audio, now) {
    ;[783.99, 659.25, 523.25, 392].forEach((frequency, index) => bell(audio, frequency, now + index * 0.32, 1.2, 0.13))
  },
  musicStart(audio, now) {
    bell(audio, 523.25, now, 0.8, 0.1)
    bell(audio, 783.99, now + 0.22, 1, 0.11)
  },
}

export function playSound(name, { muted = false } = {}) {
  if (pendingTap) {
    window.clearTimeout(pendingTap)
    pendingTap = null
  }
  if (muted || !sequences[name]) return false
  const audio = getAudioContext()
  if (!audio) return false
  if (audio.state === 'suspended') audio.resume().catch(() => {})
  sequences[name](audio, audio.currentTime + 0.015)
  return true
}

export function scheduleTapSound({ muted = false, navigation = false } = {}) {
  if (muted || typeof window === 'undefined') return
  if (pendingTap) window.clearTimeout(pendingTap)
  pendingTap = window.setTimeout(() => {
    pendingTap = null
    playSound(navigation ? 'navigate' : 'tap')
  }, 0)
}

export function soundForAction(action) {
  if (action?.type === 'COMPLETE_TASK' && action.celebrate) return 'allTasks'
  return ACTION_SOUNDS[action?.type] || null
}

export function playActionSound(action, muted) {
  const name = soundForAction(action)
  if (name) playSound(name, { muted })
}
