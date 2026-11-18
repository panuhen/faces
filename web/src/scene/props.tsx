import type { CSSProperties } from 'react'
import { INK, Layer, LINE, THIN } from './art'
import { px, py, U } from './coords'
import type { PlaceProps } from './places'

// Story props that stand behind the characters: Rufus the dog (park), the
// block tower (playroom) and the chocolate cake (bakery). Each scene moves
// its props on the narrator's lines ('beat' = index of the line being read).

/** Where the main character stands when alone, for scenes with props. */
export const PROP_SOLO_X: Record<string, number> = {
  big_dog: -0.65,
  tall_tower: -0.65,
  tower_knocked: -0.65,
  cake_drop: -0.45,
}

const ease = (s: number, delay = 0): CSSProperties => ({ transition: `transform ${s}s cubic-bezier(0.3, 0.8, 0.3, 1) ${delay}s` })
const BROWN = '#b98558'
const DARK = '#7a4f34'
const CREAM = '#f3e2cc'

/* ---------------- Rufus ---------------- */

/** A big friendly dog, side view facing left, feet at (0, 0), in picture units. */
function DogStanding({ barking }: { barking: boolean }) {
  return (
    <g>
      <g className="dog-tail" style={{ transformOrigin: '130px -230px' }}>
        <path d="M 128 -230 Q 190 -260 200 -330" fill="none" stroke={INK} strokeWidth={30} strokeLinecap="round" />
        <path d="M 128 -230 Q 190 -260 200 -330" fill="none" stroke={BROWN} strokeWidth={18} strokeLinecap="round" />
      </g>
      {[-105, -55, 60, 110].map((x, i) => (
        <rect key={x} x={x - 20} y={-170} width={40} height={170} rx={18} fill={i % 2 ? BROWN : DARK} {...LINE} />
      ))}
      <ellipse cx={0} cy={-200} rx={160} ry={88} fill={BROWN} {...LINE} />
      <ellipse cx={-20} cy={-160} rx={95} ry={38} fill={CREAM} />
      <g transform="translate(-150 -300)">
        <circle cx={0} cy={0} r={80} fill={BROWN} {...LINE} />
        {/* small floppy ear */}
        <path d="M -6 -74 Q 30 -96 58 -66 Q 62 -30 40 -14 Q 30 -40 -6 -50 Z" fill={DARK} {...LINE} />
        <ellipse cx={-78} cy={34} rx={56} ry={36} fill={CREAM} {...LINE} />
        {barking ? (
          <path d="M -128 50 Q -96 96 -40 66 Q -80 64 -128 50 Z" fill="#8d3b3b" {...THIN} />
        ) : (
          <path d="M -104 70 Q -98 104 -78 100 Q -70 80 -76 66 Z" fill="#e88aa0" {...THIN} />
        )}
        <ellipse cx={-126} cy={20} rx={18} ry={14} fill={INK} />
        <circle cx={-34} cy={-16} r={11} fill={INK} />
        <circle cx={-38} cy={-20} r={4} fill="#fff" />
        <path d="M -50 -40 Q -36 -48 -20 -42" fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
      </g>
    </g>
  )
}

/** Sitting, mouth closed, tongue out, tail wagging. Feet at (0, 0), facing left. */
function DogSitting() {
  return (
    <g>
      <g className="dog-tail wag" style={{ transformOrigin: '100px -40px' }}>
        <path d="M 100 -40 Q 170 -40 190 -110" fill="none" stroke={INK} strokeWidth={30} strokeLinecap="round" />
        <path d="M 100 -40 Q 170 -40 190 -110" fill="none" stroke={BROWN} strokeWidth={18} strokeLinecap="round" />
      </g>
      <ellipse cx={50} cy={-80} rx={90} ry={80} fill={BROWN} {...LINE} />
      <path d="M -60 -260 Q -110 -140 -70 0 L 10 0 Q 30 -140 20 -250 Z" fill={BROWN} {...LINE} />
      <ellipse cx={-38} cy={-150} rx={40} ry={70} fill={CREAM} />
      <rect x={-78} y={-150} width={38} height={150} rx={18} fill={DARK} {...LINE} />
      <rect x={-30} y={-150} width={38} height={150} rx={18} fill={BROWN} {...LINE} />
      <ellipse cx={70} cy={-14} rx={64} ry={24} fill={DARK} {...LINE} />
      <g transform="translate(-60 -320)">
        <circle cx={0} cy={0} r={80} fill={BROWN} {...LINE} />
        {/* small floppy ear */}
        <path d="M -6 -74 Q 30 -96 58 -66 Q 62 -30 40 -14 Q 30 -40 -6 -50 Z" fill={DARK} {...LINE} />
        <ellipse cx={-78} cy={34} rx={56} ry={36} fill={CREAM} {...LINE} />
        <path d="M -104 70 Q -98 108 -78 104 Q -70 82 -76 66 Z" fill="#e88aa0" {...THIN} />
        <ellipse cx={-126} cy={20} rx={18} ry={14} fill={INK} />
        <path d="M -48 -12 Q -36 -24 -22 -12" fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" />
        <path d="M -50 -40 Q -36 -50 -20 -44" fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
      </g>
    </g>
  )
}

function Rufus({ moment, beat }: Pick<PlaceProps, 'moment' | 'beat'>) {
  const s = 0.8 // the dog's head is at about 1 m, a big dog next to the characters
  if (moment === 'comfort') {
    // sits down next to the friend, who stands at +0.8 m in the two-character view
    return (
      <g transform={`translate(${px(0.05)} ${py(0)}) scale(${s})`}>
        <g className="sit-in">{beat >= 1 ? <DogSitting /> : <DogStanding barking={false} />}</g>
      </g>
    )
  }
  const barking = beat >= 1
  return (
    <g transform={`translate(${px(0.82)} ${py(0)}) scale(${s})`}>
      <g className="run-in">
        <DogStanding barking={barking} />
      </g>
      {barking && (
        // soft bark lines in front of the mouth, twice; no text in pictures
        <g className="bark" fill="none" stroke={INK} strokeWidth={8} strokeLinecap="round">
          <path d="M -300 -320 Q -320 -270 -300 -220" />
          <path d="M -340 -340 Q -370 -270 -340 -200" />
          <path d="M -380 -360 Q -420 -270 -380 -180" />
        </g>
      )}
    </g>
  )
}

/* ---------------- block tower ---------------- */

const BLOCK = 0.26 * U // a block is 26 cm: ten blocks are taller than the characters
const COLORS = ['#7cc6c0', '#f6c443', '#e9a0b6', '#9cc7f0', '#f3a96b', '#b9d98f']
const TOWER_X = -0.16

/** Ten blocks, a little uneven, base at the floor. */
function tower(x: number): { x: number; y: number; r: number }[] {
  return Array.from({ length: 10 }, (_, i) => ({ x: px(x) + Math.sin(i * 2.3) * 9, y: py(0) - (i + 1) * BLOCK, r: Math.sin(i * 1.7) * 3 }))
}

/** Where each block lands when the tower falls, spread on the rug away from the main character. */
const FALLEN = [
  [0.05, 0, 12],
  [0.38, 0, -20],
  [0.7, 0, 35],
  [0.95, 0, 8],
  [1.2, 0, -12],
  [0.25, 0.26, 28],
  [0.55, 0, 90],
  [0.85, 0.26, -30],
  [1.05, 0, 50],
  [1.38, 0, 15],
].map(([x, y, r]) => ({ x: px(x), y: py(0) - BLOCK - y * U, r }))

function Blocks({ sceneId, moment, beat }: Pick<PlaceProps, 'sceneId' | 'moment' | 'beat'>) {
  const standing = tower(TOWER_X)
  let blocks = standing
  let tilt = 0
  let stagger = 0 // seconds between blocks appearing (building up)
  if (sceneId === 'tall_tower') stagger = 0.22
  if (sceneId === 'tower_knocked' && moment === 'event') {
    if (beat === 1) tilt = 7
    if (beat >= 2) blocks = FALLEN
  }
  if (sceneId === 'tower_knocked' && moment === 'comfort') {
    if (beat < 1) blocks = FALLEN
    else stagger = 0.3
  }
  return (
    <g style={{ transform: `rotate(${tilt}deg)`, transformOrigin: `${px(TOWER_X) + BLOCK / 2}px ${py(0)}px`, ...ease(0.6) }}>
      {blocks.map((b, i) => (
        <g
          key={i}
          className={stagger ? 'block-in' : undefined}
          style={{ animationDelay: `${i * stagger}s`, transform: `translate(${b.x}px, ${b.y}px) rotate(${b.r}deg)`, transformOrigin: `${BLOCK / 2}px ${BLOCK / 2}px`, ...ease(0.7, i * 0.03) }}
        >
          <rect x={0} y={0} width={BLOCK} height={BLOCK} rx={8} fill={COLORS[i % COLORS.length]} {...LINE} />
          <rect x={14} y={14} width={BLOCK - 28} height={BLOCK - 28} rx={5} fill="#ffffff55" />
        </g>
      ))}
    </g>
  )
}

/* ---------------- chocolate cake ---------------- */

const TABLE_X = 0.62
const TABLE_TOP = 0.95 // metres

function Cake({ upside }: { upside: boolean }) {
  return (
    <g transform={upside ? 'scale(1 -1)' : undefined}>
      <rect x={-80} y={-80} width={160} height={80} rx={10} fill="#7b4a33" {...LINE} />
      <path d="M -80 -50 H 80" stroke="#f5d9c4" strokeWidth={8} />
      <path d="M -84 -80 Q -60 -60 -40 -80 Q -20 -58 0 -80 Q 20 -58 40 -80 Q 60 -60 84 -80 Z" fill="#5b3424" {...THIN} />
      <circle cx={0} cy={-92} r={14} fill="#e8382f" {...THIN} />
    </g>
  )
}

function Bakery({ moment, beat }: Pick<PlaceProps, 'moment' | 'beat'>) {
  const fallen = moment === 'comfort' || beat >= 1
  const tx = px(TABLE_X)
  const top = py(TABLE_TOP)
  return (
    <>
      {/* small round table */}
      <g>
        <path d={`M ${tx - 12} ${top} V ${py(0) - 18} M ${tx - 70} ${py(0) - 6} H ${tx + 46}`} stroke={INK} strokeWidth={16} strokeLinecap="round" />
        <path d={`M ${tx - 12} ${top} V ${py(0) - 18}`} stroke="#c9a27a" strokeWidth={8} strokeLinecap="round" />
        <ellipse cx={tx - 12} cy={top} rx={120} ry={22} fill="#e2c39b" {...LINE} />
      </g>
      {fallen && <ellipse className="splat" cx={tx - 210} cy={py(0) + 6} rx={130} ry={20} fill="#6b3d2a" opacity={0.85} />}
      <g style={{ transform: fallen ? `translate(${tx - 210}px, ${py(0) - 2}px) rotate(180deg)` : `translate(${tx - 40}px, ${top - 16}px)`, ...ease(0.55) }}>
        <Cake upside={false} />
      </g>
      {moment === 'comfort' && beat >= 1 && (
        // the friend holds out a cupcake
        <g transform={`translate(${px(0.18)} ${py(1.0)})`}>
          <g className="bob">
          <g className="pop-in">
            <path d="M -40 0 H 40 L 32 50 H -32 Z" fill="#e9a0b6" {...LINE} />
            <path d="M -46 2 Q -46 -44 0 -48 Q 46 -44 46 2 Z" fill="#fbf1e1" {...LINE} />
            <circle cx={0} cy={-60} r={14} fill="#e8382f" {...THIN} />
          </g>
          </g>
        </g>
      )}
    </>
  )
}

/** Props behind the characters for the current scene, or nothing. */
export function BackProps(p: PlaceProps) {
  let content = null
  if (p.sceneId === 'big_dog') content = <Rufus moment={p.moment} beat={p.beat} />
  else if (p.sceneId === 'tall_tower' || p.sceneId === 'tower_knocked') content = <Blocks sceneId={p.sceneId} moment={p.moment} beat={p.beat} />
  else if (p.sceneId === 'cake_drop') content = <Bakery moment={p.moment} beat={p.beat} />
  if (!content) return null
  return (
    <Layer par={1} enter={90}>
      {content}
    </Layer>
  )
}
