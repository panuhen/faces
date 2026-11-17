export const CHARACTERS = ['pip', 'miso', 'sam'] as const
export type CharacterId = (typeof CHARACTERS)[number]

export const CHARACTER_INFO: Record<CharacterId, { name: string; frame: { top: number; bottom: number } }> = {
  pip: { name: 'Pip', frame: { top: 1.46, bottom: -0.04 } },
  miso: { name: 'Miso', frame: { top: 2.16, bottom: -0.04 } },
  sam: { name: 'Sam', frame: { top: 2.4, bottom: -0.04 } },
}
