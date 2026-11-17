import { CharacterStage, loadActor, type Actor } from '../three/CharacterStage'
import { CHARACTER_INFO, characterUrl, type CharacterId } from '../rig/characters'
import { FEATURES, ACCENTS, type Feature, type Weights } from '../rig/features'
import { BASE_Y, WORLD_H, type Shot } from './coords'

const ALL: Feature[] = [...FEATURES, ...ACCENTS]
const OFFSTAGE = 3.4
const DUO_X = 0.8
const TURN = 0.2 // radians the two friends turn toward each other

/** A character on the stage: eased position, eased face, and blinking. */
class Puppet {
  x = 0
  targetX = 0
  yaw = 0
  targetYaw = 0
  private face: Weights = {}
  target: Weights = {}
  private nextBlink = 1 + Math.random() * 3
  private blink = 0

  constructor(
    readonly id: CharacterId,
    readonly actor: Actor,
  ) {}

  update(dt: number, time: number, rate = 7): void {
    const k = 1 - Math.exp(-dt * rate)
    this.x += (this.targetX - this.x) * (1 - Math.exp(-dt * 3.5))
    this.yaw += (this.targetYaw - this.yaw) * k
    // blink: closed for a moment every few seconds
    if (time > this.nextBlink) {
      this.blink = 0.14
      this.nextBlink = time + 2.5 + Math.random() * 3
    }
    this.blink = Math.max(0, this.blink - dt)
    const out: Weights = {}
    for (const f of ALL) {
      const v = (this.face[f] ?? 0) + ((this.target[f] ?? 0) - (this.face[f] ?? 0)) * k
      this.face[f] = v
      out[f] = v
    }
    if (this.blink > 0) {
      out.eyeBlink_L = Math.max(out.eyeBlink_L ?? 0, 1)
      out.eyeBlink_R = Math.max(out.eyeBlink_R ?? 0, 1)
    }
    this.actor.setWeights(out)
    const root = this.actor.root
    root.position.x = this.x
    root.rotation.y = this.yaw
    // breathing: a very small slow stretch
    root.scale.y = 1 + Math.sin(time * 1.7 + this.x) * 0.004
    root.visible = Math.abs(this.x) < OFFSTAGE - 0.1
  }
}

export interface SceneTarget {
  shot: Shot
  /** Where the main character stands when alone. */
  soloX: number
  heroFace: Weights
  friendFace: Weights
}

/**
 * Draws the main character and the friend over a scene picture, and moves the
 * shared "camera": the same zoom and focus go to the 3D camera and, as CSS
 * variables, to the picture layers.
 */
export class ScenePlayer {
  private readonly stage: CharacterStage
  private hero: Puppet | null = null
  private friend: Puppet | null = null
  private raf = 0
  private last = 0
  private z = 1
  private fx = 0
  private fy = BASE_Y
  private width = 1
  private height = 1
  private cast = ''
  private dead = false
  private readonly observer: ResizeObserver
  target: SceneTarget = { shot: 'solo', soloX: 0, heroFace: {}, friendFace: {} }
  /** Mirror mode: called every frame for the main character's face. */
  live: (() => Weights | null) | null = null

  constructor(
    canvas: HTMLCanvasElement,
    private readonly box: HTMLElement,
  ) {
    this.stage = new CharacterStage(canvas, { alpha: true })
    this.observer = new ResizeObserver(() => this.resize())
    this.observer.observe(box)
    this.resize()
    this.raf = requestAnimationFrame(this.tick)
  }

  private resize(): void {
    this.width = Math.max(1, this.box.clientWidth)
    this.height = Math.max(1, this.box.clientHeight)
    this.stage.renderer.setSize(this.width, this.height, false)
  }

  /** Loads the main character and the friend (who waits out of the picture). */
  async setCast(heroId: CharacterId, friendId: CharacterId): Promise<void> {
    const key = `${heroId}/${friendId}`
    if (key === this.cast) return
    this.cast = key
    const [h, f] = await Promise.all([loadActor(characterUrl(heroId)), loadActor(characterUrl(friendId))])
    if (this.dead || this.cast !== key) return
    for (const p of [this.hero, this.friend]) if (p) this.stage.remove(p.actor)
    this.hero = new Puppet(heroId, h)
    this.friend = new Puppet(friendId, f)
    this.hero.x = this.hero.targetX = this.target.shot === 'duo' ? -DUO_X : this.target.soloX
    this.friend.x = this.friend.targetX = OFFSTAGE
    this.stage.add(h)
    this.stage.add(f)
    this.box.dataset.ready = 'yes'
  }

  private tick = (now: number): void => {
    this.raf = requestAnimationFrame(this.tick)
    const dt = Math.min(0.1, (now - this.last) / 1000)
    this.last = now
    const t = this.target
    const hero = this.hero
    const friend = this.friend
    let z = 1
    let fx = 0
    let fy = BASE_Y
    if (hero && friend) {
      const duo = t.shot === 'duo'
      hero.targetX = duo ? -DUO_X : t.soloX
      hero.targetYaw = duo ? TURN : 0
      friend.targetX = duo ? DUO_X : OFFSTAGE
      friend.targetYaw = -TURN
      const live = this.live?.() ?? null
      hero.target = live ?? t.heroFace
      friend.target = t.friendFace
      hero.update(dt, now / 1000, live ? 20 : 7)
      friend.update(dt, now / 1000)
      if (duo) z = 0.88
      if (t.shot === 'face') {
        z = 2.05
        fx = hero.x
        fy = CHARACTER_INFO[hero.id].faceY
      }
    }
    const k = 1 - Math.exp(-dt * 4)
    this.z += (z - this.z) * k
    this.fx += (fx - this.fx) * k
    this.fy += (fy - this.fy) * k
    this.stage.frame(this.fx, this.fy, WORLD_H / this.z, this.width / this.height)
    this.stage.render()
    // the picture layers follow the same camera
    const p = this.height / WORLD_H
    const s = this.box.style
    s.setProperty('--z', this.z.toFixed(4))
    s.setProperty('--tx', `${(-this.fx * p * this.z).toFixed(2)}px`)
    s.setProperty('--ty', `${((this.fy - BASE_Y) * p * this.z).toFixed(2)}px`)
  }

  dispose(): void {
    this.dead = true
    cancelAnimationFrame(this.raf)
    this.observer.disconnect()
    // no forceContextLoss: React may mount this canvas again (StrictMode) and reuse its context
    this.stage.dispose()
  }
}
