import { store } from '../game/settings'

// Two soft sounds made in the browser: a tap and a chime. No sound files,
// no "wrong" sound (design A1).

let ctx: AudioContext | null = null

function tone(freq: number, start: number, length: number, peak: number): void {
  if (!ctx) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  const t = ctx.currentTime + start
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(peak, t + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length)
  osc.connect(gain).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + length + 0.05)
}

function volume(): number {
  const s = store.get().settings.soundEffects
  return s === 'off' ? 0 : s === 'soft' ? 0.06 : 0.14
}

function ready(): boolean {
  if (volume() === 0) return false
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return true
  } catch {
    return false
  }
}

/** Every card tap sounds the same, target or not. */
export function tap(): void {
  if (ready()) tone(520, 0, 0.12, volume())
}

export function chime(): void {
  if (!ready()) return
  tone(660, 0, 0.35, volume())
  tone(880, 0.12, 0.45, volume())
}
