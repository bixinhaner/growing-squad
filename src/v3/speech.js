// Many 4–6 year olds cannot read yet, so key child prompts can be spoken aloud.
// Uses the platform voice only; nothing leaves the device.
let cachedVoice = null

function chineseVoice() {
  if (cachedVoice || typeof window === 'undefined' || !window.speechSynthesis) return cachedVoice
  const voices = window.speechSynthesis.getVoices()
  cachedVoice = voices.find((voice) => /zh[-_]CN/i.test(voice.lang) && /Tingting|婷婷|Xiaoxiao|晓晓/i.test(voice.name))
    || voices.find((voice) => /zh[-_]CN/i.test(voice.lang))
    || voices.find((voice) => /^zh/i.test(voice.lang))
    || null
  return cachedVoice
}

export function canSpeak() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function'
}

export function speak(text, { muted = false } = {}) {
  if (muted || !text || !canSpeak()) return false
  const synth = window.speechSynthesis
  synth.cancel()
  const utterance = new window.SpeechSynthesisUtterance(text)
  utterance.lang = 'zh-CN'
  utterance.rate = 0.9
  utterance.pitch = 1.15
  const voice = chineseVoice()
  if (voice) utterance.voice = voice
  synth.speak(utterance)
  return true
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel()
}
