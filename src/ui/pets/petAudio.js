let context
let nodes=[]
export function stopPetAudio(){ for(const node of nodes){try{node.stop()}catch{/* already ended */}}nodes=[]; if(typeof window!=='undefined') window.speechSynthesis?.cancel() }
export function petSound(action,species,muted=false){
  if(muted || typeof window==='undefined')return
  const Audio=window.AudioContext||window.webkitAudioContext
  if(!Audio)return
  try{
    context ??= new Audio(); void context.resume().catch(()=>{})
    stopPetAudio()
    const base={bear:260,rabbit:440,cloud:520,'space-cat':340}[species]||300
    const melody=action==='hatch'?[1,1.25,1.5,2]:['sleep','rest'].includes(action)?[1,.8,.67]:action==='water'?[1,1.2]:[1,1.3,1.1]
    melody.forEach((ratio,i)=>{const tone=context.createOscillator(),gain=context.createGain(),t=context.currentTime+i*.12;tone.type='sine';tone.frequency.setValueAtTime(base*ratio,t);tone.frequency.exponentialRampToValueAtTime(base*ratio*.86,t+.14);gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.025,t+.02);gain.gain.exponentialRampToValueAtTime(.0001,t+.2);tone.connect(gain);gain.connect(context.destination);tone.start(t);tone.stop(t+.22);nodes.push(tone)})
  }catch{/* Sound is an optional response, never blocks an action. */}
}
export function speakPet(text){
  if(typeof window==='undefined'||!window.speechSynthesis) return false
  // Never select remote voices for children's personal text.
  const voice=window.speechSynthesis.getVoices().find(v=>v.localService&&/^zh/i.test(v.lang))
  if(!voice)return false
  stopPetAudio();const speech=new SpeechSynthesisUtterance(text);speech.voice=voice;speech.lang=voice.lang;speech.rate=.86;speech.volume=.6;window.speechSynthesis.speak(speech);return true
}
