import { useCallback } from 'react'
import { mirrorWeights } from '../face/score'
import { tracker } from '../face/tracker'
import { store } from '../game/settings'
import { fill, UI } from '../game/story'
import type { CharacterId } from '../rig/characters'
import { SceneView } from '../scene/SceneView'
import { useScript } from '../ui/narrator'
import { Caption } from '../ui/widgets'

/**
 * The character copies the child's face. No emotion words here at all:
 * the ideas name face parts only.
 */
export function Mirror({ hero, onDone }: { hero: CharacterId; onDone: () => void }) {
  const live = useCallback(() => {
    const f = tracker.frame
    return f.present ? mirrorWeights(f.shapes, store.get().baseline) : null
  }, [])

  useScript(async (s) => {
    await s.say(fill(UI.mirror.intro, hero))
    for (let i = 0; ; i++) {
      await s.pause(9000)
      await s.say(UI.mirror.ideas[i % UI.mirror.ideas.length])
    }
  }, [])

  return (
    <div className="screen">
      <SceneView hero={hero} place="living_room" time="midday" sceneId="mirror" shot="face" live={live} />
      <div className="panel">
        <Caption />
        <div className="buttons">
          <button className="btn" onClick={onDone}>
            {UI.mirror.done}
          </button>
        </div>
      </div>
    </div>
  )
}
