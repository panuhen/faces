import { useEffect, useRef, type ReactNode } from 'react'
import { storyCharacter } from '../game/story'
import type { CharacterId } from '../rig/characters'
import type { Weights } from '../rig/features'
import type { TimeOfDay } from './art'
import type { Shot } from './coords'
import { placeFor } from './places'
import { ScenePlayer } from './ScenePlayer'

export interface SceneViewProps {
  hero: CharacterId
  place: string
  time: TimeOfDay
  sceneId: string
  moment?: 'event' | 'comfort'
  shot?: Shot
  heroFace?: Weights
  friendFace?: Weights
  /** Mirror mode: the main character's face, read every frame. */
  live?: () => Weights | null
  children?: ReactNode
}

const NONE: Weights = {}

/** A scene picture: background layers, the 3D characters, then foreground layers. */
export function SceneView({ hero, place, time, sceneId, moment = 'event', shot = 'solo', heroFace = NONE, friendFace = NONE, live, children }: SceneViewProps) {
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const player = useRef<ScenePlayer | null>(null)
  const { Back, Front, soloX: table } = placeFor(place)
  const soloX = table?.[sceneId] ?? 0

  useEffect(() => {
    const p = new ScenePlayer(canvas.current!, box.current!)
    player.current = p
    return () => {
      p.dispose()
      player.current = null
    }
  }, [])

  useEffect(() => {
    void player.current?.setCast(hero, storyCharacter(hero).friendId)
  }, [hero])

  useEffect(() => {
    if (player.current) player.current.target = { shot, soloX, heroFace, friendFace }
  }, [shot, soloX, heroFace, friendFace])

  useEffect(() => {
    if (player.current) player.current.live = live ?? null
  }, [live])

  const props = { time, sceneId, moment, soloX }
  return (
    <div className="picture" ref={box}>
      {/* the key restarts the slide-in when the place changes */}
      <div className="layers" key={place}>
        <Back {...props} />
      </div>
      <canvas ref={canvas} />
      <div className="layers" key={`${place}-front`}>
        {Front && <Front {...props} />}
      </div>
      {children}
    </div>
  )
}
