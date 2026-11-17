import { CHARACTER_INFO, characterUrl, type CharacterId } from '../rig/characters'
import { EMOTIONS, FACE_STYLES, PRESETS, scaled, type Expression, type FaceStyle } from '../rig/features'
import { CharacterStage } from './CharacterStage'

// Face cards are pictures, drawn once per character and face style. This keeps
// the game to one live WebGL canvas (phones allow only a few).

const SIZE = 256
export type Portraits = Record<Expression, string>
const cache = new Map<string, Promise<Portraits>>()

export function portraits(character: CharacterId, style: FaceStyle): Promise<Portraits> {
  const key = `${character}/${style}`
  let p = cache.get(key)
  if (!p) {
    p = draw(character, style)
    cache.set(key, p)
  }
  return p
}

async function draw(character: CharacterId, style: FaceStyle): Promise<Portraits> {
  const canvas = document.createElement('canvas')
  const stage = new CharacterStage(canvas, { alpha: true })
  stage.renderer.setPixelRatio(1)
  stage.renderer.setSize(SIZE, SIZE, false)
  await stage.load(characterUrl(character))
  const face = CHARACTER_INFO[character].face
  const out = {} as Portraits
  for (const e of ['neutral', ...EMOTIONS] as Expression[]) {
    stage.setWeights(scaled(PRESETS[e], FACE_STYLES[style]))
    stage.frame(0, (face.top + face.bottom) / 2, face.top - face.bottom, 1)
    stage.render()
    out[e] = canvas.toDataURL('image/png')
  }
  stage.dispose()
  stage.renderer.forceContextLoss()
  return out
}
