import { useEffect, useSyncExternalStore, type DependencyList } from 'react'
import { speak, stopSpeech, wait } from '../game/speech'

// The narrator: one line of text on screen at a time, read aloud if that is on.

let caption = ''
const listeners = new Set<() => void>()

function setCaption(text: string): void {
  caption = text
  listeners.forEach((l) => l())
}

export function useCaption(): string {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => caption,
  )
}

/** Shows and speaks a line without waiting for it (meter encouragement). */
export function announce(text: string): void {
  setCaption(text)
  void speak(text)
}

export function clearCaption(): void {
  setCaption('')
}

class Cancelled extends Error {}

export interface Script {
  /** Shows and speaks a line; resolves when it has been read. */
  say(text: string): Promise<void>
  sayAll(lines: string[]): Promise<void>
  pause(ms: number): Promise<void>
}

/**
 * Runs a timed sequence of lines for the current step. When the step changes
 * (deps) or the screen closes, the sequence stops at its next line.
 */
export function useScript(run: (s: Script) => Promise<void>, deps: DependencyList): void {
  useEffect(() => {
    let alive = true
    const check = () => {
      if (!alive) throw new Cancelled()
    }
    const s: Script = {
      async say(text) {
        check()
        setCaption(text)
        await speak(text)
        check()
      },
      async sayAll(lines) {
        for (const line of lines) await s.say(line)
      },
      async pause(ms) {
        check()
        await wait(ms)
        check()
      },
    }
    run(s).catch((err) => {
      if (!(err instanceof Cancelled)) console.error(err)
    })
    return () => {
      alive = false
      stopSpeech()
    }
    // the caller lists what the sequence depends on
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
