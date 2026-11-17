// Face features exported from Blender as additive clips (frame 0 = rest, frame 1 = full).
// _L / _R are the CHARACTER's left / right.
export const FEATURES = [
  'browInnerUp',
  'browDown_L', 'browDown_R',
  'browOuterUp_L', 'browOuterUp_R',
  'eyeBlink_L', 'eyeBlink_R',
  'eyeWide_L', 'eyeWide_R',
  'eyeSquint_L', 'eyeSquint_R',
  'jawOpen',
  'mouthSmile_L', 'mouthSmile_R',
  'mouthFrown_L', 'mouthFrown_R',
  'mouthStretch_L', 'mouthStretch_R',
  'mouthPucker', 'mouthPress', 'mouthUpperUp', 'noseSneer',
] as const

// Extra clips for the character's accent part (Pip's sprout, later Miso's ears).
export const ACCENTS = ['accentDroop', 'accentPerk'] as const

export type Feature = (typeof FEATURES)[number] | (typeof ACCENTS)[number]
export type Weights = Partial<Record<Feature, number>>

export const EMOTIONS = ['happy', 'sad', 'angry', 'surprised', 'scared', 'disgusted'] as const
export type Emotion = (typeof EMOTIONS)[number]
export type Expression = Emotion | 'neutral'

// Both sides at once, for symmetric presets.
function sym(base: string, w: number): Weights {
  return { [`${base}_L`]: w, [`${base}_R`]: w } as Weights
}

// Character face presets. Built only from brows, eyes and mouth, the same
// features the camera checks on the child's face.
export const PRESETS: Record<Expression, Weights> = {
  neutral: {},
  happy: { accentPerk: 0.6, ...sym('mouthSmile', 1), ...sym('eyeSquint', 0.7), jawOpen: 0.3, ...sym('browOuterUp', 0.2) },
  sad: { accentDroop: 1, browInnerUp: 1, ...sym('mouthFrown', 1), ...sym('eyeBlink', 0.35), mouthPress: 0.3 },
  angry: { ...sym('browDown', 1), mouthPress: 1, ...sym('mouthFrown', 0.35), ...sym('eyeBlink', 0.12), noseSneer: 0.25 },
  surprised: { accentPerk: 1, browInnerUp: 1, ...sym('browOuterUp', 1), ...sym('eyeWide', 1), jawOpen: 0.85, mouthPucker: 0.55 },
  scared: { accentDroop: 0.5, browInnerUp: 1, ...sym('browOuterUp', 0.45), ...sym('eyeWide', 1), ...sym('mouthStretch', 1), jawOpen: 0.3, ...sym('mouthFrown', 0.3) },
  disgusted: { noseSneer: 1, mouthUpperUp: 1, ...sym('browDown', 0.5), ...sym('eyeSquint', 0.5), ...sym('mouthFrown', 0.45) },
}

// Face style: how far the character's face goes from rest toward the preset.
export const FACE_STYLES = { big: 1, medium: 0.7, subtle: 0.45 } as const
export type FaceStyle = keyof typeof FACE_STYLES

export function scaled(w: Weights, k: number): Weights {
  const out: Weights = {}
  for (const [f, v] of Object.entries(w)) out[f as Feature] = (v ?? 0) * k
  return out
}
