import type { Emotion } from '../rig/features'
import { STORY, type Scene } from './story'
import { store, type Settings } from './settings'

const LENGTH = { short: 4, medium: 8, full: 12 } as const

/** How many played scenes the picker remembers. */
const HISTORY = 40

/**
 * Picks the scenes of one story session (design section 7). The finale is always last.
 * Full sessions play the main day. Short and medium sessions rotate through the
 * emotions in introduction order, continuing where the last session stopped,
 * and for each emotion pick the main or extra scene the child has gone longest
 * without seeing (never-seen scenes first, ties at random). So replays bring
 * new situations, and every scene of an emotion comes round before one repeats.
 */
export function pickSession(settings: Settings): Scene[] {
  const on = new Set<Emotion>(settings.emotions)
  const finale = STORY.scenes.find((s) => s.id === STORY.finaleId)!
  const main = STORY.scenes.filter((s) => !s.finale && on.has(s.emotion))
  const extras = STORY.extraScenes.filter((s) => on.has(s.emotion))
  const k = LENGTH[settings.sessionLength] - 1
  let chosen: Scene[]

  if (settings.sessionLength === 'full') {
    chosen = [...main]
    for (const x of extras) if (chosen.length < k) chosen.push(x)
  } else {
    const saved = store.get()
    const history = saved.lastScenes
    // how long ago a scene was played: never played counts as longest ago
    const age = (s: Scene) => {
      const at = history.indexOf(s.id)
      return at < 0 ? Infinity : at
    }
    let order = STORY.emotionOrder.filter((e) => on.has(e))
    // the finale already gives a happy scene in a short session
    if (settings.sessionLength === 'short' && order.length > 1) order = order.filter((e) => e !== 'happy')
    chosen = []
    let i = saved.rotation
    for (let guard = 0; chosen.length < k && guard < k * 4; guard++, i++) {
      const emotion = order[i % order.length]
      const options = shuffle([...main, ...extras].filter((s) => s.emotion === emotion && !chosen.includes(s)))
      if (!options.length) continue
      const oldest = Math.max(...options.map(age))
      chosen.push(options.find((s) => age(s) === oldest)!)
    }
    if (settings.sessionLength === 'medium') keepPairs(chosen, main)
    const played = chosen.map((s) => s.id)
    store.set({ rotation: i % order.length, lastScenes: [...played, ...history.filter((id) => !played.includes(id))].slice(0, HISTORY) })
  }
  chosen.sort((a, b) => a.order - b.order)
  return [...chosen, finale]
}

/** Same place, two outcomes: if one scene of a pair is in, try to bring its partner. */
function keepPairs(chosen: Scene[], main: Scene[]): void {
  for (const s of [...chosen]) {
    const partner = main.find((m) => m.followsId === s.id || s.followsId === m.id)
    if (!partner || chosen.includes(partner)) continue
    // swap out a scene whose emotion appears twice and that is not part of a pair
    const spare = chosen.find(
      (c) => c !== s && !c.followsId && !main.some((m) => m.followsId === c.id) && chosen.filter((o) => o.emotion === c.emotion).length > 1,
    )
    if (spare) chosen[chosen.indexOf(spare)] = partner
  }
}

/** Cards for the guess step: the target plus random other enabled emotions, shuffled. */
export function pickCards(target: Emotion, settings: Settings): Emotion[] {
  const others = settings.emotions.filter((e) => e !== target)
  shuffle(others)
  const cards = [target, ...others.slice(0, Math.max(1, settings.cards - 1))]
  return shuffle(cards)
}

function shuffle<T>(list: T[]): T[] {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}
