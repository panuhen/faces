// The two playable characters. (The build script can also make an older test character, pip, viewable in the dev gallery as ?c=pip.)
export const CHARACTERS = ['miso', 'sam'] as const
export type CharacterId = (typeof CHARACTERS)[number]

export interface CharacterInfo {
  name: string
  /** Whole body, world heights (dev gallery and compare view). */
  frame: { top: number; bottom: number }
  /** Head only, for the face cards. */
  face: { top: number; bottom: number }
  /** World height of the middle of the face, for the look-closer zoom. */
  faceY: number
}

export const CHARACTER_INFO: Record<CharacterId, CharacterInfo> = {
  miso: { name: 'Miso', frame: { top: 2.16, bottom: -0.04 }, face: { top: 2.2, bottom: 0.86 }, faceY: 1.45 },
  sam: { name: 'Sam', frame: { top: 2.4, bottom: -0.04 }, face: { top: 2.34, bottom: 1.0 }, faceY: 1.55 },
}

export function characterUrl(id: string): string {
  return `${import.meta.env.BASE_URL}characters/${id}.glb`
}
