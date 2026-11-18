import { useSyncExternalStore } from 'react'
import type { Emotion, FaceStyle } from '../rig/features'
import type { CharacterId } from '../rig/characters'

// Everything the game saves stays in this browser's localStorage (design A11).
const KEY = 'face-feelings/v1'

export interface Settings {
  emotions: Emotion[]
  cards: number
  sensitivity: 'low' | 'medium' | 'high'
  holdTime: number
  timeLimit: 'off' | 10 | 20 | 30
  faceStyle: FaceStyle
  difficulty: 1 | 2 | 3 | 4
  readAloud: boolean
  cameraPreview: boolean
  sessionLength: 'short' | 'medium' | 'full'
  debug: boolean
  soundEffects: 'on' | 'soft' | 'off'
}

export interface Saved {
  settings: Settings
  character: CharacterId | null
  /** Calm-face blendshape values from calibration. */
  baseline: Record<string, number> | null
  /** Sticker ids with labels, oldest first. */
  stickers: { id: string; label: string }[]
  /** Where the session picker stopped in the emotion rotation. */
  rotation: number
  /** Scenes played in short and medium sessions, newest first (the picker avoids repeats). */
  lastScenes: string[]
}

export const DEFAULT_SETTINGS: Settings = {
  emotions: ['happy', 'sad', 'surprised', 'angry', 'scared', 'disgusted'],
  cards: 3,
  sensitivity: 'medium',
  holdTime: 1,
  timeLimit: 'off',
  faceStyle: 'big',
  difficulty: 2,
  readAloud: true,
  cameraPreview: true,
  sessionLength: 'short',
  debug: false,
  soundEffects: 'soft',
}

function fresh(): Saved {
  return { settings: { ...DEFAULT_SETTINGS }, character: null, baseline: null, stickers: [], rotation: 0, lastScenes: [] }
}

function read(): Saved {
  try {
    const text = localStorage.getItem(KEY)
    if (!text) return fresh()
    const data = JSON.parse(text) as Partial<Saved>
    return { ...fresh(), ...data, settings: { ...DEFAULT_SETTINGS, ...data.settings } }
  } catch {
    return fresh()
  }
}

let state = read()
const listeners = new Set<() => void>()

function write(next: Saved): void {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // private mode or full storage: the game still runs, it just forgets
  }
  listeners.forEach((l) => l())
}

export const store = {
  get: (): Saved => state,
  set: (patch: Partial<Saved>): void => write({ ...state, ...patch }),
  setSettings: (patch: Partial<Settings>): void => {
    const settings = { ...state.settings, ...patch }
    // the guess needs two cards, and never more cards than emotions
    if (settings.emotions.length < 2) return
    settings.cards = Math.min(settings.cards, settings.emotions.length)
    write({ ...state, settings })
  },
  addSticker: (s: { id: string; label: string }): void => write({ ...state, stickers: [...state.stickers, s] }),
  clear: (): void => {
    try {
      localStorage.removeItem(KEY)
    } catch {
      // nothing saved
    }
    write(fresh())
  },
  subscribe: (l: () => void): (() => void) => {
    listeners.add(l)
    return () => listeners.delete(l)
  },
}

export function useSaved(): Saved {
  return useSyncExternalStore(store.subscribe, store.get)
}
