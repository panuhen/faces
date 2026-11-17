import { useEffect, useRef, useState } from 'react'
import { CharacterStage } from '../three/CharacterStage'
import { CHARACTER_INFO, type CharacterId } from '../rig/characters'
import { ACCENTS, EMOTIONS, FACE_STYLES, FEATURES, PRESETS, scaled, type Expression, type FaceStyle, type Weights } from '../rig/features'

const EXPRESSIONS: Expression[] = ['neutral', ...EMOTIONS]
const COLS = 4
const TILE_W = 300
const TILE_H = 300

/** Dev view: every expression side by side, plus feature sliders for tuning. */
const BIG = Number(new URLSearchParams(window.location.search).get('size') ?? 420)

export function Gallery({ character }: { character: string }) {
  const FRAME = CHARACTER_INFO[character as CharacterId]?.frame ?? { top: 1.6, bottom: -0.04 }
  const gridRef = useRef<HTMLCanvasElement>(null)
  const tuneRef = useRef<HTMLCanvasElement>(null)
  const grid = useRef<CharacterStage | null>(null)
  const tune = useRef<CharacterStage | null>(null)
  // ?style=subtle starts in that face style
  const [style, setStyle] = useState<FaceStyle>(() => {
    const s = new URLSearchParams(window.location.search).get('style')
    return s && s in FACE_STYLES ? (s as FaceStyle) : 'big'
  })
  // ?pose=sad starts the big view in that expression (for close-up checks), scaled by ?style=
  const [manual, setManual] = useState<Weights>(() => {
    const pose = new URLSearchParams(window.location.search).get('pose') as Expression | null
    return pose && pose in PRESETS ? scaled(PRESETS[pose], FACE_STYLES[style]) : {}
  })
  const [ready, setReady] = useState(false)
  // degrees, turns the big view around the vertical axis (drag, slider, or ?yaw=)
  const [yaw, setYaw] = useState(() => Number(new URLSearchParams(window.location.search).get('yaw') ?? 0))
  const drag = useRef<{ x: number; yaw: number } | null>(null)

  useEffect(() => {
    const g = new CharacterStage(gridRef.current!)
    const t = new CharacterStage(tuneRef.current!)
    grid.current = g
    tune.current = t
    const rows = Math.ceil(EXPRESSIONS.length / COLS)
    g.renderer.setPixelRatio(1)
    g.renderer.setSize(COLS * TILE_W, rows * TILE_H, false)
    t.renderer.setPixelRatio(1)
    t.resize(BIG, BIG)
    const url = `${import.meta.env.BASE_URL}characters/${character}.glb`
    Promise.all([g.load(url), t.load(url)]).then(() => setReady(true))
    return () => {
      g.dispose()
      t.dispose()
    }
  }, [character])

  useEffect(() => {
    if (!ready) return
    const g = grid.current!
    const k = FACE_STYLES[style]
    const rows = Math.ceil(EXPRESSIONS.length / COLS)
    g.renderTiles(
      EXPRESSIONS.map((e, i) => ({
        x: (i % COLS) * TILE_W,
        y: Math.floor(i / COLS) * TILE_H,
        w: TILE_W,
        h: TILE_H,
        weights: scaled(PRESETS[e], k),
      })),
      rows * TILE_H,
      FRAME,
    )
    const t = tune.current!
    t.camera.top = FRAME.top
    t.camera.bottom = FRAME.bottom
    t.camera.left = -(FRAME.top - FRAME.bottom) / 2
    t.camera.right = (FRAME.top - FRAME.bottom) / 2
    t.camera.updateProjectionMatrix()
    t.setWeights(manual)
    if (t.root) t.root.rotation.y = (yaw * Math.PI) / 180
    t.render()
    document.body.dataset.rendered = 'yes'
  }, [ready, style, manual, FRAME, yaw])

  const rows = Math.ceil(EXPRESSIONS.length / COLS)
  return (
    <div className="gallery">
      <div className="gallery-grid" style={{ width: COLS * TILE_W, height: rows * TILE_H }}>
        <canvas ref={gridRef} style={{ width: COLS * TILE_W, height: rows * TILE_H }} />
        {EXPRESSIONS.map((e, i) => (
          <span key={e} className="tile-label" style={{ left: (i % COLS) * TILE_W + 10, top: Math.floor(i / COLS) * TILE_H + 8 }}>
            {e}
          </span>
        ))}
      </div>
      <div className="gallery-side">
        <div className="row">
          Face style:{' '}
          {(Object.keys(FACE_STYLES) as FaceStyle[]).map((s) => (
            <button key={s} className={s === style ? 'on' : ''} onClick={() => setStyle(s)}>
              {s}
            </button>
          ))}
        </div>
        <canvas
          ref={tuneRef}
          style={{ width: BIG, height: BIG, cursor: 'grab', touchAction: 'none' }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            drag.current = { x: e.clientX, yaw }
          }}
          onPointerMove={(e) => {
            if (!drag.current) return
            const d = drag.current.yaw + (e.clientX - drag.current.x) * 0.5
            setYaw(((((d + 180) % 360) + 360) % 360) - 180)
          }}
          onPointerUp={() => (drag.current = null)}
        />
        <div className="row">
          Rotate:{' '}
          <input type="range" min={-180} max={180} step={1} value={yaw} onChange={(e) => setYaw(Number(e.target.value))} />{' '}
          {yaw}°{' '}
          {[0, 45, 90, 180, -90].map((a) => (
            <button key={a} className={a === yaw ? 'on' : ''} onClick={() => setYaw(a)}>
              {a === 0 ? 'front' : a === 90 ? 'side' : a === 180 ? 'back' : `${a}°`}
            </button>
          ))}
        </div>
        <div className="sliders">
          {[...FEATURES, ...ACCENTS].map((f) => (
            <label key={f}>
              <span>{f}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={manual[f] ?? 0}
                onChange={(e) => setManual({ ...manual, [f]: Number(e.target.value) })}
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
