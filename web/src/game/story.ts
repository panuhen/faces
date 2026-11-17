import raw from './story.json'
import type { Emotion } from '../rig/features'
import type { CharacterId } from '../rig/characters'

export interface Coach {
  feature: string
  text: string
  blendshapes: string[]
}
export interface EmotionInfo {
  label: string
  word: string
  introOrder: number
  hint: string[]
  makePrompt: string
  coach: Coach[]
}
export interface Scene {
  id: string
  order: number
  timeOfDay: 'morning' | 'midday' | 'afternoon' | 'evening'
  place: string
  emotion: Emotion
  followsId?: string
  finale?: boolean
  text: string[]
  comfort: string[] | null
  sticker: { id: string; label: string }
}
export interface StoryCharacter {
  id: CharacterId
  name: string
  friendId: CharacterId
  words: { hand: string }
  pickLine: string
}
export interface SettingDef {
  id: string
  label: string
  help: string
  default?: unknown
  options?: unknown
  unit?: string
  type?: string
}

export const STORY = raw as unknown as {
  characters: StoryCharacter[]
  emotionOrder: Emotion[]
  emotions: Record<Emotion, EmotionInfo>
  ui: typeof raw.ui
  settings: SettingDef[]
  scenes: Scene[]
  finaleId: string
  extraScenes: Scene[]
}
export const UI = STORY.ui

export function storyCharacter(id: CharacterId): StoryCharacter {
  return STORY.characters.find((c) => c.id === id)!
}

export interface Vars {
  word?: string
  label?: string
  sticker?: string
}

/** Fills {name}, {friend}, {hand}, {word}, {label} and {sticker}. */
export function fill(text: string, hero: CharacterId, vars: Vars = {}): string {
  const c = storyCharacter(hero)
  const map: Record<string, string> = {
    name: c.name,
    friend: storyCharacter(c.friendId).name,
    hand: c.words.hand,
    word: vars.word ?? '',
    label: vars.label ?? '',
    sticker: vars.sticker ?? '',
  }
  return text.replace(/\{(\w+)\}/g, (m, k: string) => map[k] ?? m)
}

export function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

export function sceneById(id: string): Scene | undefined {
  return [...STORY.scenes, ...STORY.extraScenes].find((s) => s.id === id)
}
