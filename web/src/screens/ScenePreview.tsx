import { SceneView } from '../scene/SceneView'
import { sceneById } from '../game/story'
import { FACE_STYLES, PRESETS, scaled, type Expression } from '../rig/features'
import type { CharacterId } from '../rig/characters'
import type { Shot } from '../scene/coords'

/** Dev view: one scene picture. ?scene=balloon_away&moment=comfort&hero=sam&shot=duo&face=sad */
export function ScenePreview() {
  const q = new URLSearchParams(window.location.search)
  const scene = sceneById(q.get('scene') ?? '') ?? sceneById('red_balloon')!
  const moment = q.get('moment') === 'comfort' ? 'comfort' : 'event'
  const hero = (q.get('hero') ?? 'sam') as CharacterId
  const shot = (q.get('shot') ?? (moment === 'comfort' ? 'duo' : 'solo')) as Shot
  const face = (q.get('face') ?? scene.emotion) as Expression
  return (
    <div className="app">
      <div className="screen">
        <SceneView
          hero={hero}
          place={scene.place}
          time={scene.timeOfDay}
          sceneId={scene.id}
          moment={moment}
          shot={shot}
          heroFace={scaled(PRESETS[face] ?? {}, FACE_STYLES.big)}
          friendFace={scaled(PRESETS.happy, 0.5)}
          beat={Number(q.get('beat') ?? 9)}
        />
        <div className="panel" />
      </div>
    </div>
  )
}
