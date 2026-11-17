import { store } from './settings'

// Read-aloud. Recorded lines (public/voice, see scripts/voice-record.mjs) are
// played as audio; any line without a recording falls back to the phone's own
// voice (Web Speech API). Every call resolves, also when sound is off, missing
// or stuck, so the game never waits forever.

const BASE = `${import.meta.env.BASE_URL}voice/`

/** Recorded line text -> file name. Empty until index.json has loaded. */
let recorded: Record<string, string> = {}
fetch(`${BASE}index.json`)
  .then((r) => (r.ok ? r.json() : {}))
  .then((index: Record<string, string>) => (recorded = index))
  .catch(() => undefined)

// One audio element for every line. Phones only let a page play sound after a
// tap, so the first tap anywhere unlocks this element for the rest of the visit.
const audio = typeof Audio === 'undefined' ? null : new Audio()
let unlocked = false
function unlock(): void {
  if (unlocked || !audio) return
  unlocked = true
  const first = Object.values(recorded)[0]
  if (!first || !audio.paused) return
  audio.muted = true
  audio.src = BASE + first
  audio
    .play()
    .then(() => {
      audio.pause()
      audio.muted = false
    })
    .catch(() => {
      audio.muted = false
      unlocked = false
    })
}
window.addEventListener('pointerdown', unlock, true)

let voice: SpeechSynthesisVoice | null = null

function chooseVoice(): void {
  const voices = window.speechSynthesis?.getVoices() ?? []
  voice =
    voices.find((v) => v.lang === 'en-US' && v.localService) ??
    voices.find((v) => v.lang.startsWith('en') && v.localService) ??
    voices.find((v) => v.lang.startsWith('en')) ??
    null
}
if ('speechSynthesis' in window) {
  chooseVoice()
  window.speechSynthesis.addEventListener('voiceschanged', chooseVoice)
}

/** Reading time when nothing is spoken: long enough to read the line. */
export function readingTime(text: string): number {
  return 900 + text.length * 55
}

export const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

/** Ends the current line (its speak() promise resolves). */
let finishCurrent: (() => void) | null = null

export function stopSpeech(): void {
  finishCurrent?.()
  audio?.pause()
  window.speechSynthesis?.cancel()
}

export function speak(text: string): Promise<void> {
  if (!store.get().settings.readAloud) return wait(readingTime(text))
  stopSpeech()
  const file = recorded[text]
  if (file && audio) return play(audio, BASE + file, text)
  return say(text)
}

function play(el: HTMLAudioElement, src: string, text: string): Promise<void> {
  return new Promise((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      clearTimeout(timer)
      el.onended = el.onerror = null
      if (finishCurrent === finish) finishCurrent = null
      resolve()
    }
    finishCurrent = finish
    el.onended = finish
    // a file that fails to load or play still leaves the line on screen to read
    el.onerror = () => void wait(readingTime(text)).then(finish)
    const timer = setTimeout(finish, readingTime(text) * 2 + 3000)
    el.src = src
    el.play().catch(() => void wait(readingTime(text)).then(finish))
  })
}

function say(text: string): Promise<void> {
  const synth = window.speechSynthesis
  if (!synth || !voice) return wait(readingTime(text))
  return new Promise((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      clearTimeout(timer)
      if (finishCurrent === finish) finishCurrent = null
      resolve()
    }
    finishCurrent = finish
    const u = new SpeechSynthesisUtterance(text)
    u.voice = voice
    u.lang = voice!.lang
    u.rate = 0.9
    u.pitch = 1.1
    u.onend = finish
    u.onerror = finish
    // some browsers never fire onend: give up after a generous time
    const timer = setTimeout(finish, readingTime(text) * 2 + 2000)
    synth.speak(u)
  })
}
