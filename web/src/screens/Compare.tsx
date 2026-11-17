import { useEffect, useRef, useState } from 'react'
import { CharacterStage } from '../three/CharacterStage'
import { EMOTIONS, FACE_STYLES, PRESETS, scaled, type Expression, type FaceStyle } from '../rig/features'
import { CHARACTERS, CHARACTER_INFO, type CharacterId } from '../rig/characters'

const EXPRESSIONS: Expression[] = ['neutral', ...EMOTIONS]
const TILE_W = 190
const TILE_H = 210

function Row({ id, style }: { id: CharacterId; style: FaceStyle }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const stage = useRef<CharacterStage | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const s = new CharacterStage(ref.current!)
    stage.current = s
    s.renderer.setPixelRatio(1)
    s.renderer.setSize(EXPRESSIONS.length * TILE_W, TILE_H, false)
    s.load(`${import.meta.env.BASE_URL}characters/${id}.glb`).then(() => setReady(true))
    return () => s.dispose()
  }, [id])

  useEffect(() => {
    if (!ready) return
    const k = FACE_STYLES[style]
    stage.current!.renderTiles(
      EXPRESSIONS.map((e, i) => ({ x: i * TILE_W, y: 0, w: TILE_W, h: TILE_H, weights: scaled(PRESETS[e], k) })),
      TILE_H,
      CHARACTER_INFO[id].frame,
    )
    document.body.dataset[`rendered${id}`] = 'yes'
  }, [ready, style, id])

  return (
    <div className="compare-row">
      <div className="compare-name">{CHARACTER_INFO[id].name}</div>
      <canvas ref={ref} style={{ width: EXPRESSIONS.length * TILE_W, height: TILE_H }} />
    </div>
  )
}

/** Dev view: all characters x all expressions. */
export function Compare() {
  const [style, setStyle] = useState<FaceStyle>('big')
  return (
    <div className="compare">
      <div className="row">
        Face style:{' '}
        {(Object.keys(FACE_STYLES) as FaceStyle[]).map((s) => (
          <button key={s} className={s === style ? 'on' : ''} onClick={() => setStyle(s)}>
            {s}
          </button>
        ))}
      </div>
      <div className="compare-head">
        {EXPRESSIONS.map((e) => (
          <span key={e} style={{ width: TILE_W }}>{e}</span>
        ))}
      </div>
      {CHARACTERS.map((id) => (
        <Row key={id} id={id} style={style} />
      ))}
    </div>
  )
}
