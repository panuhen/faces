import type { Emotion, Weights } from '../rig/features'
import type { Settings } from '../game/settings'

export type Shapes = Record<string, number>

// What the camera checks per emotion (design A3). Each feature is a group of
// MediaPipe blendshapes; 'full' is how far above the calm face the value must
// rise to count as fully made. Alternatives ('or') cover movements that
// MediaPipe reports weakly, such as the nose wrinkle.
// The ids match the coach lines in story.json.
interface FeatureDef {
  id: string
  weight: number
  parts: { shapes: string[]; full: number }[]
}

const both = (name: string) => [`${name}Left`, `${name}Right`]

export const CHECKS: Record<Emotion, FeatureDef[]> = {
  happy: [
    { id: 'mouth', weight: 0.8, parts: [{ shapes: both('mouthSmile'), full: 0.5 }] },
    { id: 'cheeks', weight: 0.2, parts: [{ shapes: both('cheekSquint'), full: 0.12 }, { shapes: both('eyeSquint'), full: 0.35 }] },
  ],
  sad: [
    { id: 'brows', weight: 0.5, parts: [{ shapes: ['browInnerUp'], full: 0.35 }] },
    { id: 'mouth', weight: 0.5, parts: [{ shapes: both('mouthFrown'), full: 0.2 }, { shapes: ['mouthShrugLower'], full: 0.45 }] },
  ],
  angry: [
    { id: 'brows', weight: 0.6, parts: [{ shapes: both('browDown'), full: 0.4 }] },
    { id: 'mouth', weight: 0.4, parts: [{ shapes: both('mouthPress'), full: 0.3 }, { shapes: ['mouthShrugLower'], full: 0.45 }, { shapes: both('mouthFrown'), full: 0.2 }] },
  ],
  surprised: [
    { id: 'brows', weight: 0.35, parts: [{ shapes: ['browInnerUp', ...both('browOuterUp')], full: 0.4 }] },
    { id: 'eyes', weight: 0.2, parts: [{ shapes: both('eyeWide'), full: 0.2 }] },
    { id: 'mouth', weight: 0.45, parts: [{ shapes: ['jawOpen'], full: 0.3 }] },
  ],
  scared: [
    { id: 'brows', weight: 0.35, parts: [{ shapes: ['browInnerUp', ...both('browOuterUp')], full: 0.35 }] },
    { id: 'eyes', weight: 0.2, parts: [{ shapes: both('eyeWide'), full: 0.2 }] },
    { id: 'mouth', weight: 0.45, parts: [{ shapes: both('mouthStretch'), full: 0.2 }, { shapes: both('mouthLowerDown'), full: 0.35 }] },
  ],
  disgusted: [
    { id: 'nose', weight: 0.45, parts: [{ shapes: both('noseSneer'), full: 0.15 }, { shapes: both('cheekSquint'), full: 0.15 }, { shapes: both('browDown'), full: 0.35 }] },
    { id: 'mouth', weight: 0.55, parts: [{ shapes: both('mouthUpperUp'), full: 0.3 }] },
  ],
}

const SENSITIVITY = { low: 1.3, medium: 1, high: 0.7 } as const

export interface Score {
  /** 0 to 1 for the whole face. */
  total: number
  /** 0 to 1 per feature id. */
  features: Record<string, number>
  /** Feature that is furthest from done. */
  weakest: string
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

function mean(shapes: Shapes, names: string[]): number {
  let sum = 0
  for (const n of names) sum += shapes[n] ?? 0
  return sum / names.length
}

/** How close the face is to the target, measured against the calm baseline. */
export function scoreFace(emotion: Emotion, shapes: Shapes, baseline: Shapes | null, sensitivity: Settings['sensitivity']): Score {
  const k = SENSITIVITY[sensitivity]
  const features: Record<string, number> = {}
  let total = 0
  let weakest = ''
  let low = Infinity
  for (const f of CHECKS[emotion]) {
    let best = 0
    for (const p of f.parts) {
      const rise = mean(shapes, p.shapes) - (baseline ? mean(baseline, p.shapes) : 0)
      best = Math.max(best, clamp01(rise / (p.full * k)))
    }
    features[f.id] = best
    total += best * f.weight
    if (best < low) {
      low = best
      weakest = f.id
    }
  }
  return { total: clamp01(total), features, weakest }
}

/**
 * Mirror mode: the child's blendshapes drive the character's face directly.
 * The character faces the child like a mirror, so the child's left side
 * moves the character's right side.
 */
export function mirrorWeights(s: Shapes, baseline: Shapes | null): Weights {
  const v = (name: string, gain = 1.6) => clamp01(((s[name] ?? 0) - (baseline?.[name] ?? 0)) * gain)
  return {
    browInnerUp: v('browInnerUp'),
    browDown_R: v('browDownLeft'),
    browDown_L: v('browDownRight'),
    browOuterUp_R: v('browOuterUpLeft'),
    browOuterUp_L: v('browOuterUpRight'),
    eyeBlink_R: v('eyeBlinkLeft', 1.2),
    eyeBlink_L: v('eyeBlinkRight', 1.2),
    eyeWide_R: v('eyeWideLeft', 3),
    eyeWide_L: v('eyeWideRight', 3),
    eyeSquint_R: v('eyeSquintLeft'),
    eyeSquint_L: v('eyeSquintRight'),
    jawOpen: v('jawOpen', 1.8),
    mouthSmile_R: v('mouthSmileLeft', 1.5),
    mouthSmile_L: v('mouthSmileRight', 1.5),
    mouthFrown_R: v('mouthFrownLeft', 3),
    mouthFrown_L: v('mouthFrownRight', 3),
    mouthStretch_R: v('mouthStretchLeft', 3),
    mouthStretch_L: v('mouthStretchRight', 3),
    mouthPucker: v('mouthPucker', 1.2),
    mouthPress: Math.max(v('mouthPressLeft', 2), v('mouthPressRight', 2)),
    mouthUpperUp: Math.max(v('mouthUpperUpLeft', 2), v('mouthUpperUpRight', 2)),
    noseSneer: Math.max(v('noseSneerLeft', 4), v('noseSneerRight', 4)),
  }
}

/** Fake camera values for ?sim=1 (testing without a camera): a face that makes the target. */
export function simulatedShapes(emotion: Emotion | null, amount: number): Shapes {
  const out: Shapes = {}
  if (!emotion) return out
  for (const f of CHECKS[emotion]) for (const n of f.parts[0].shapes) out[n] = f.parts[0].full * 1.2 * amount
  return out
}
