import type { CSSProperties, ReactNode } from 'react'
import { Blob, INK, LINE, THIN } from './art'
import { px, py, U } from './coords'
import type { PlaceProps } from './places'
import './props_extra.css'

// Props for the extra scenes (ids starting with x_). Same rules as props.tsx:
// picture units (1000 = picture height, ground at py(0)), flat colours with ink
// outlines, drawn behind the characters, moving on the narrator's lines (beat).

/** Where the main character stands when alone, for extra scenes with props. */
export const EXTRA_SOLO_X: Record<string, number> = {
  x_pancakes: -0.55,
  x_sprinkles: -0.5,
  x_toy_car: -0.55,
  x_sandcastle: -0.55,
  x_popcorn: -0.55,
  x_rabbit: -0.55,
  x_stuck_zip: -0.6,
  x_drawing_stop: -0.6,
  x_dark_shed: -0.6,
  x_big_wave: -0.5,
  x_moldy_roll: -0.55,
  x_seaweed: -0.55,
}

const G = py(0) // the floor line the characters stand on
const WALL = 790 // bottom of the back wall in the rooms
const m = (v: number) => v * U // metres to picture units
const fade = (on: boolean, s = 0.6, delay = 0): CSSProperties => ({ opacity: on ? 1 : 0, transition: `opacity ${s}s ease ${delay}s` })
const move = (s: number, delay = 0): CSSProperties => ({ transition: `transform ${s}s cubic-bezier(0.3, 0.8, 0.3, 1) ${delay}s, opacity ${s}s ease ${delay}s` })

/* ---------------- shared pieces ---------------- */

function Table({ x, h = 0.75, w = 0.9, color = '#d2a274' }: { x: number; h?: number; w?: number; color?: string }) {
  const cx = px(x)
  const top = py(h)
  const W = m(w)
  const legs = `M ${cx - W / 2 + 24} ${top} V ${G} M ${cx + W / 2 - 24} ${top} V ${G}`
  return (
    <g>
      <path d={legs} stroke={INK} strokeWidth={18} strokeLinecap="round" />
      <path d={legs} stroke={color} strokeWidth={8} strokeLinecap="round" />
      <rect x={cx - W / 2} y={top - 16} width={W} height={24} rx={8} fill={color} {...LINE} />
    </g>
  )
}

/** Soft wavy lines rising from (x, y): smell or steam. */
function Wisps({ x, y, color, n = 2 }: { x: number; y: number; color: string; n?: number }) {
  return (
    <g fill="none" stroke={color} strokeWidth={7} strokeLinecap="round">
      {Array.from({ length: n }, (_, i) => (
        <g key={i} className="x-wisp" style={{ animationDelay: `${i * 0.7}s` }}>
          <path d={`M ${x + (i - (n - 1) / 2) * 34} ${y} q 14 -18 0 -36 q -14 -18 0 -36`} />
        </g>
      ))}
    </g>
  )
}

function Star({ x, y, s = 1, delay = 0 }: { x: number; y: number; s?: number; delay?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="x-twinkle" style={{ animationDelay: `${delay}s` }}>
        <path d="M 0 -22 Q 4 -4 22 0 Q 4 4 0 22 Q -4 4 -22 0 Q -4 -4 0 -22 Z" fill="#ffe89a" {...THIN} />
      </g>
    </g>
  )
}

function Sparkles({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <Star x={x - 60} y={y} s={0.9} />
      <Star x={x + 50} y={y - 40} s={1.1} delay={0.4} />
      <Star x={x + 10} y={y + 50} s={0.7} delay={0.8} />
    </g>
  )
}

/* ---------------- kitchen: pancakes, popcorn ---------------- */

const PANCAKE = '#e8b86a'
const PANCAKE_EDGE = '#c98f45'

function Pancakes({ beat }: { beat: number }) {
  const tx = px(0.55)
  const top = py(0.8) - 16
  const done = beat >= 1
  return (
    <g>
      <Table x={0.55} h={0.8} w={1.05} />
      {/* mix and pour: bowl with batter, then the pan with a pancake flipping */}
      <g style={fade(!done)}>
        <path d={`M ${tx - 190} ${top - 58} Q ${tx - 130} ${top + 12} ${tx - 70} ${top - 58} Z`} fill="#e9eef2" {...LINE} />
        <ellipse cx={tx - 130} cy={top - 58} rx={60} ry={10} fill="#f3dca0" {...THIN} />
        <path d={`M ${tx - 118} ${top - 62} L ${tx - 70} ${top - 140}`} stroke={INK} strokeWidth={8} strokeLinecap="round" />
        <path d={`M ${tx + 150} ${top - 14} L ${tx + 245} ${top - 30}`} stroke={INK} strokeWidth={14} strokeLinecap="round" />
        <ellipse cx={tx + 70} cy={top - 12} rx={80} ry={16} fill="#55565e" {...LINE} />
        <g className="x-flip">
          <ellipse cx={tx + 70} cy={top - 28} rx={52} ry={11} fill={PANCAKE} stroke={PANCAKE_EDGE} strokeWidth={4} />
        </g>
      </g>
      {/* round, warm pancakes on a plate */}
      <g style={fade(done, 0.7, 0.2)}>
        <ellipse cx={tx} cy={top - 6} rx={100} ry={15} fill="#ffffff" {...LINE} />
        {[0, 1, 2, 3].map((i) => (
          <ellipse key={i} cx={tx + (i % 2 ? 4 : -3)} cy={top - 22 - i * 17} rx={74} ry={13} fill={PANCAKE} stroke={PANCAKE_EDGE} strokeWidth={4} />
        ))}
        <path d={`M ${tx - 40} ${top - 76} Q ${tx - 46} ${top - 50} ${tx - 40} ${top - 30}`} fill="none" stroke="#9a5a2a" strokeWidth={9} strokeLinecap="round" />
        <rect x={tx - 16} y={top - 98} width={30} height={16} rx={4} fill="#fbe7a1" {...THIN} />
        <Wisps x={tx} y={top - 112} color="#ffffffcc" n={3} />
      </g>
    </g>
  )
}

function Popcorn({ moment, beat }: { moment: 'event' | 'comfort'; beat: number }) {
  if (moment === 'comfort') {
    const tx = px(0.55)
    const top = py(0.75) - 16
    return (
      <g>
        <Table x={0.55} h={0.75} w={0.9} />
        <g className="x-pop-in">
          <Blob
            fill="#fffaf0"
            width={4}
            circles={[
              [tx - 60, top - 74, 26],
              [tx - 20, top - 92, 30],
              [tx + 24, top - 88, 28],
              [tx + 62, top - 72, 24],
              [tx, top - 66, 30],
            ]}
          />
          <path d={`M ${tx - 100} ${top - 66} Q ${tx} ${top + 34} ${tx + 100} ${top - 66} Z`} fill="#e9a0b6" {...LINE} />
          <path d={`M ${tx - 60} ${top - 40} Q ${tx} ${top - 30} ${tx + 60} ${top - 40}`} fill="none" stroke="#ffffff88" strokeWidth={8} strokeLinecap="round" />
          <Wisps x={tx} y={top - 130} color="#ffffffcc" n={3} />
        </g>
      </g>
    )
  }
  const sx = px(0.6)
  const W = m(0.9)
  const top = py(0.9)
  const popping = beat >= 1
  return (
    <g>
      {/* stove */}
      <rect x={sx - W / 2} y={top} width={W} height={G - top} rx={10} fill="#e9eef2" {...LINE} />
      <rect x={sx - W / 2 + 34} y={top + 70} width={W - 68} height={G - top - 100} rx={10} fill="#c9d3da" {...THIN} />
      <rect x={sx - W / 2 + 60} y={top + 96} width={W - 120} height={70} rx={8} fill="#55565e" {...THIN} />
      {[-70, -25, 25, 70].map((dx) => (
        <circle key={dx} cx={sx + dx} cy={top + 36} r={11} fill="#ffffff" {...THIN} />
      ))}
      {/* pot with a glass lid */}
      <path d={`M ${sx - 105} ${top - 14} H ${sx - 125} M ${sx + 105} ${top - 14} H ${sx + 125}`} stroke={INK} strokeWidth={14} strokeLinecap="round" />
      <rect x={sx - 105} y={top - 84} width={210} height={84} rx={12} fill="#9aa3ad" {...LINE} />
      <g>
        {popping
          ? [
              [-60, 10],
              [-22, 0],
              [18, 14],
              [56, 4],
              [-40, 40],
              [2, 34],
              [40, 42],
            ].map(([dx, dy], i) => (
              <g key={i} className="x-pop" style={{ animationDelay: `${i * 0.17}s` }}>
                <Blob
                  fill="#fffaf0"
                  width={3}
                  circles={[
                    [sx + dx - 7, top - 112 + dy, 11],
                    [sx + dx + 7, top - 114 + dy, 12],
                    [sx + dx, top - 124 + dy, 11],
                  ]}
                />
              </g>
            ))
          : [-50, -30, -8, 12, 34, 52].map((dx) => <ellipse key={dx} cx={sx + dx} cy={top - 92} rx={7} ry={5} fill="#f6c443" stroke={INK} strokeWidth={2} />)}
      </g>
      <g className={popping ? 'x-jiggle' : undefined}>
        <path d={`M ${sx - 108} ${top - 84} Q ${sx - 104} ${top - 190} ${sx} ${top - 192} Q ${sx + 104} ${top - 190} ${sx + 108} ${top - 84} Z`} fill="#d8eef7" fillOpacity={0.45} {...LINE} />
        <path d={`M ${sx - 62} ${top - 150} Q ${sx - 40} ${top - 172} ${sx - 10} ${top - 176}`} fill="none" stroke="#ffffffcc" strokeWidth={8} strokeLinecap="round" />
        <rect x={sx - 18} y={top - 214} width={36} height={22} rx={8} fill="#55565e" {...THIN} />
      </g>
    </g>
  )
}

/* ---------------- bakery: sprinkles, moldy roll ---------------- */

const SPRINKLE_COLORS = ['#e9a0b6', '#7cc6c0', '#f6c443', '#9cc7f0', '#b9d98f']

function Sprinkles({ beat }: { beat: number }) {
  const tx = px(0)
  const top = py(0.75) - 16
  const lots = beat >= 1
  // positions on the cake's front, spread over the icing
  const dots = Array.from({ length: 44 }, (_, i) => ({
    x: tx - 74 + ((i * 37) % 148),
    y: top - 112 + ((i * 23) % 70),
    r: (i * 47) % 180,
    c: SPRINKLE_COLORS[i % SPRINKLE_COLORS.length],
  }))
  const shown = lots ? dots : dots.slice(0, 12)
  const shakerX = tx + 30
  const shakerY = py(1.25)
  return (
    <g>
      <Table x={0} h={0.75} w={0.7} />
      <ellipse cx={tx} cy={top - 4} rx={112} ry={14} fill="#ffffff" {...LINE} />
      <rect x={tx - 90} y={top - 124} width={180} height={118} rx={14} fill="#fbf6ee" {...LINE} />
      <path d={`M ${tx - 90} ${top - 100} Q ${tx - 70} ${top - 80} ${tx - 50} ${top - 100} Q ${tx - 30} ${top - 78} ${tx - 10} ${top - 100} Q ${tx + 10} ${top - 80} ${tx + 30} ${top - 100} Q ${tx + 50} ${top - 78} ${tx + 70} ${top - 100} Q ${tx + 80} ${top - 88} ${tx + 90} ${top - 100}`} fill="none" stroke="#efe2cf" strokeWidth={6} />
      {shown.map((d, i) => (
        // the class sits on a wrapper: a CSS transform-origin would also move the rect's own rotate()
        <g key={i} className="x-dot">
          <rect x={d.x - 6} y={d.y - 2} width={12} height={5} rx={2} fill={d.c} transform={`rotate(${d.r} ${d.x} ${d.y})`} />
        </g>
      ))}
      {/* the shaker pours over the cake */}
      <g transform={`translate(${shakerX} ${shakerY}) rotate(150)`}>
        <g className="x-shake">
          <rect x={-26} y={-44} width={52} height={78} rx={14} fill="#fbf1e1" {...LINE} />
          <rect x={-28} y={30} width={56} height={22} rx={8} fill="#e0b98c" {...LINE} />
          <path d="M -10 -20 H 10 M -10 0 H 10" stroke={SPRINKLE_COLORS[0]} strokeWidth={6} strokeLinecap="round" />
        </g>
      </g>
      {Array.from({ length: lots ? 9 : 4 }, (_, i) => (
        <g key={i} className="x-fall" style={{ animationDelay: `${i * (lots ? 0.18 : 0.4)}s`, animationDuration: lots ? '0.9s' : '1.4s' }}>
          <rect x={shakerX + 30 + ((i * 13) % 34) - 17} y={shakerY + 40} width={10} height={5} rx={2} fill={SPRINKLE_COLORS[i % SPRINKLE_COLORS.length]} />
        </g>
      ))}
    </g>
  )
}

const ROLL = '#e2a85a'
const OLD_ROLL = '#b9925e'

function Roll({ x, y, color = ROLL, s = 1 }: { x: number; y: number; color?: string; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={0} rx={44} ry={27} fill={color} {...THIN} />
      <path d="M -18 -18 Q -12 -4 -16 10 M 2 -22 Q 8 -6 4 10 M 22 -18 Q 26 -6 22 6" fill="none" stroke="#00000033" strokeWidth={5} strokeLinecap="round" />
    </g>
  )
}

/** The underside of the old roll: green and fuzzy. */
function MoldyRoll({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={0} cy={0} rx={44} ry={27} fill="#d9c49a" {...THIN} />
      {[
        [-20, -6, 13],
        [8, 6, 15],
        [24, -10, 9],
        [-4, -14, 8],
      ].map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="#8fb86a" stroke="#6f9a52" strokeWidth={3} strokeDasharray="3 4" />
      ))}
    </g>
  )
}

function BreadRack({ x }: { x: number }) {
  const cx = px(x)
  const W = m(0.62)
  const t1 = py(0.4)
  const t2 = py(0.85)
  return (
    <g>
      <path d={`M ${cx - W / 2} ${t2 - 10} V ${G} M ${cx + W / 2} ${t2 - 10} V ${G}`} stroke={INK} strokeWidth={18} strokeLinecap="round" />
      <path d={`M ${cx - W / 2} ${t2 - 10} V ${G} M ${cx + W / 2} ${t2 - 10} V ${G}`} stroke="#b98a5e" strokeWidth={8} strokeLinecap="round" />
      <rect x={cx - W / 2 - 10} y={t1} width={W + 20} height={18} rx={6} fill="#c99a6c" {...LINE} />
      <rect x={cx - W / 2 - 10} y={t2} width={W + 20} height={18} rx={6} fill="#c99a6c" {...LINE} />
      <Roll x={cx - 60} y={t1 - 24} />
      <Roll x={cx + 30} y={t1 - 24} />
      <Roll x={cx - 20} y={t1 - 48} s={0.9} />
      <Roll x={cx + 50} y={t2 - 24} />
    </g>
  )
}

function MoldyRollScene({ moment, beat }: { moment: 'event' | 'comfort'; beat: number }) {
  if (moment === 'comfort') {
    const bx = px(0)
    return (
      <g>
        <BreadRack x={0.75} />
        {/* pedal bin in the gap between the two characters */}
        <rect x={bx - 52} y={G - 120} width={104} height={120} rx={12} fill="#9aa3ad" {...LINE} />
        <rect x={bx - 60} y={G - 136} width={120} height={22} rx={8} fill="#7f8891" {...LINE} />
        <path d={`M ${bx - 26} ${G - 96} V ${G - 20} M ${bx} ${G - 96} V ${G - 20} M ${bx + 26} ${G - 96} V ${G - 20}`} stroke="#ffffff55" strokeWidth={6} strokeLinecap="round" />
        <g className="x-drop">
          <MoldyRoll x={bx} y={G - 150} />
        </g>
        {beat >= 1 && (
          // a fresh, warm roll in a paper bag
          <g transform={`translate(${px(0.3)} ${py(1.0)})`}>
            <g className="x-bob">
              <g className="x-pop-in">
                <Roll x={0} y={-36} s={1.1} />
                <path d="M -50 -30 L -42 40 H 42 L 50 -30 Z" fill="#e8d2ad" {...LINE} />
                <path d="M -50 -30 L -36 -14 L -22 -30 L -8 -14 L 6 -30 L 20 -14 L 34 -30 L 50 -30" fill="none" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
                <Wisps x={0} y={-74} color="#ffffffcc" n={2} />
              </g>
            </g>
          </g>
        )}
      </g>
    )
  }
  // the old roll comes from the back of the rack to the main character's hand
  const hx = px(0.02)
  const hy = py(0.98)
  const from = { x: px(0.75) - 40 - hx, y: py(0.85) - 24 - hy }
  return (
    <g>
      <BreadRack x={0.75} />
      <g className="x-pick" style={{ '--fx': `${from.x}px`, '--fy': `${from.y}px` } as CSSProperties}>
        {beat >= 1 ? (
          <g key="under" className="x-turn">
            <MoldyRoll x={hx} y={hy} />
            <Wisps x={hx} y={hy - 34} color="#9db88a" n={2} />
          </g>
        ) : (
          <Roll x={hx} y={hy} color={OLD_ROLL} />
        )}
      </g>
    </g>
  )
}

/* ---------------- bedroom: toy car ---------------- */

const CAR = '#3f7fd1'

function Wheel({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={21} fill={INK} />
      <circle cx={x} cy={y} r={8} fill="#d9d9d9" />
    </g>
  )
}

/** Small toy car, side view facing right, bottom centre at (0, 0). */
function Car({ front }: { front: boolean }) {
  return (
    <g>
      <path d="M -46 -60 L -30 -96 L 26 -96 L 46 -60 Z" fill={CAR} {...LINE} />
      <path d="M -34 -64 L -24 -88 L 20 -88 L 34 -64 Z" fill="#cfe8f7" {...THIN} />
      <path d="M -2 -88 V -64" stroke={INK} strokeWidth={4} />
      <rect x={-78} y={-64} width={156} height={44} rx={16} fill={CAR} {...LINE} />
      <circle cx={66} cy={-46} r={7} fill="#fbe7a1" {...THIN} />
      <Wheel x={-46} y={-20} />
      {front && <Wheel x={46} y={-20} />}
    </g>
  )
}

function ToyCar({ moment, beat }: { moment: 'event' | 'comfort'; beat: number }) {
  if (moment === 'comfort') {
    const cx = px(0)
    return (
      <g>
        <g transform={`translate(${cx} ${G})`}>
          <Car front={true} />
        </g>
        {/* the glue tube */}
        <g transform={`translate(${px(0.3)} ${G - 14}) rotate(-8)`}>
          <rect x={-40} y={-14} width={70} height={28} rx={10} fill="#ffffff" {...LINE} />
          <rect x={30} y={-10} width={22} height={20} rx={5} fill="#7cc6c0" {...THIN} />
          <rect x={-30} y={-6} width={36} height={12} rx={4} fill="#f6c443" />
        </g>
        {beat < 1 && <circle cx={cx + 46} cy={G - 20} r={30} fill="none" stroke="#ffffffcc" strokeWidth={6} className="x-twinkle" />}
        {beat >= 1 && <Sparkles x={cx} y={G - 140} />}
      </g>
    )
  }
  const cx = px(0.45)
  return (
    <g>
      {/* the front sinks where the wheel is missing */}
      <g transform={`translate(${cx} ${G}) rotate(8 60 0)`}>
        <g key={beat} className={beat >= 1 ? 'x-try' : undefined}>
          <Car front={false} />
        </g>
      </g>
      {/* the wheel lies next to it */}
      <g transform={`translate(${px(0.86)} ${G - 12})`}>
        <ellipse cx={0} cy={0} rx={23} ry={12} fill={INK} />
        <ellipse cx={0} cy={-2} rx={9} ry={5} fill="#d9d9d9" />
      </g>
    </g>
  )
}

/* ---------------- playroom: drawing ---------------- */

function DrawingStop({ moment, beat }: { moment: 'event' | 'comfort'; beat: number }) {
  const tx = px(0)
  const top = py(0.55) - 16
  const shelfY = py(1.55)
  const onShelf = moment === 'comfort' && beat >= 1
  const drawing = moment === 'event' && beat === 0
  return (
    <g>
      {moment === 'comfort' && (
        <g>
          <rect x={px(-0.32)} y={shelfY} width={m(0.64)} height={18} rx={6} fill="#c99a6c" {...LINE} />
          <path d={`M ${px(-0.22)} ${shelfY + 18} l 0 34 l 26 -34 M ${px(0.22)} ${shelfY + 18} l 0 34 l -26 -34`} fill="none" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
        </g>
      )}
      <Table x={0} h={0.55} w={0.78} color="#f3a96b" />
      {[
        ['#e9806e', -100],
        ['#7cc6c0', -74],
        ['#f6c443', 82],
      ].map(([c, dx]) => (
        <rect key={c} x={tx + Number(dx)} y={top - 12} width={34} height={11} rx={4} fill={c as string} {...THIN} />
      ))}
      {/* the picture leans on a little stand; later it goes to the shelf */}
      <g style={{ transform: onShelf ? `translate(0px, ${shelfY - top}px)` : 'none', ...move(0.9) }}>
        <path d={`M ${tx - 40} ${top - 4} L ${tx - 20} ${top - 40} M ${tx + 40} ${top - 4} L ${tx + 20} ${top - 40}`} stroke={INK} strokeWidth={6} strokeLinecap="round" />
        <g transform={`rotate(-4 ${tx} ${top - 70})`}>
          <rect x={tx - 78} y={top - 132} width={156} height={120} rx={4} fill="#ffffff" {...THIN} />
          {/* half-coloured house */}
          <path d={`M ${tx - 44} ${top - 34} V ${top - 76} H ${tx + 44} V ${top - 34} Z`} fill="none" stroke="#e9806e" strokeWidth={5} strokeLinejoin="round" />
          <path d={`M ${tx - 44} ${top - 34} V ${top - 76} H ${tx} V ${top - 34} Z`} fill="#f6c443" opacity={0.75} />
          <path d={`M ${tx - 54} ${top - 74} L ${tx} ${top - 116} L ${tx + 54} ${top - 74}`} fill="none" stroke="#7cc6c0" strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" />
          <rect x={tx - 10} y={top - 58} width={18} height={24} fill="none" stroke="#e9806e" strokeWidth={4} />
        </g>
        {drawing && (
          <g className="x-draw">
            <g transform={`translate(${tx + 24} ${top - 70}) rotate(-50)`}>
              <rect x={-8} y={-50} width={16} height={50} rx={4} fill="#e9806e" {...THIN} />
              <path d="M -8 0 L 0 14 L 8 0 Z" fill="#e9806e" {...THIN} />
            </g>
          </g>
        )}
      </g>
    </g>
  )
}

/* ---------------- garden: rabbit, dark shed ---------------- */

const RABBIT = '#b8b4ad'

/** A little grey rabbit, feet at (0, 0), facing left. */
function Rabbit() {
  return (
    <g>
      <circle cx={46} cy={-40} r={14} fill="#ffffff" {...THIN} />
      <ellipse cx={18} cy={-46} rx={44} ry={38} fill={RABBIT} {...LINE} />
      <ellipse cx={-6} cy={-34} rx={20} ry={16} fill="#ece8e1" />
      <g transform="rotate(-14 -26 -96)">
        <ellipse cx={-24} cy={-150} rx={11} ry={34} fill={RABBIT} {...THIN} />
        <ellipse cx={-24} cy={-150} rx={5} ry={24} fill="#f2b8c4" />
      </g>
      <g transform="rotate(10 -6 -96)">
        <ellipse cx={-2} cy={-146} rx={11} ry={32} fill={RABBIT} {...THIN} />
      </g>
      <circle cx={-26} cy={-92} r={32} fill={RABBIT} {...LINE} />
      <circle cx={-38} cy={-98} r={5} fill={INK} />
      <ellipse cx={-56} cy={-86} rx={5} ry={4} fill="#e88aa0" />
      <ellipse cx={-10} cy={-6} rx={22} ry={8} fill={RABBIT} {...THIN} />
    </g>
  )
}

function Bush({ x, s = 1 }: { x: number; s?: number }) {
  return (
    <Blob
      fill="#86bd84"
      circles={[
        [x - 60 * s, G - 50 * s, 55 * s],
        [x, G - 80 * s, 70 * s],
        [x + 64 * s, G - 48 * s, 52 * s],
        [x, G - 30 * s, 50 * s],
      ]}
    />
  )
}

function RabbitScene({ moment, beat }: { moment: 'event' | 'comfort'; beat: number }) {
  const plant = px(0.8)
  const lifted = moment === 'event'
  return (
    <g>
      {/* leafy plant with one big leaf */}
      <Blob
        fill="#7fb878"
        circles={[
          [plant - 90, G - 80, 66],
          [plant + 80, G - 76, 70],
          [plant, G - 140, 80],
          [plant, G - 60, 70],
        ]}
      />
      <g transform={`translate(${plant - 30} ${G - 10})`}>
        <g className={lifted ? 'x-lift' : undefined}>
          <path d="M 0 0 Q -100 -70 -230 -40 Q -160 70 0 0 Z" fill="#9ccc8e" {...LINE} />
          <path d="M 0 0 Q -100 -20 -215 -36" fill="none" stroke="#5f9a57" strokeWidth={5} />
        </g>
      </g>
      {moment === 'event' && beat >= 1 && (
        <g transform={`translate(${px(0.08)} ${G}) scale(1.35)`}>
          <g className="x-hop">
            <Rabbit />
          </g>
        </g>
      )}
      {moment === 'comfort' && (
        <>
          <g transform={`translate(${px(1.08)} ${G}) scale(1.35)`}>
            <g className="x-hop-away">
              <Rabbit />
            </g>
          </g>
          <Bush x={px(1.12)} />
          {/* only the white tail still shows */}
          <circle className="x-tail" cx={px(1.12) - 82} cy={G - 50} r={14} fill="#ffffff" {...THIN} />
        </>
      )}
    </g>
  )
}

const PLANK = '#8a6a4e'

function Bird({ dark }: { dark: boolean }) {
  const body = dark ? '#3b2f2a' : '#9a6a45'
  return (
    <g>
      <ellipse cx={0} cy={-26} rx={30} ry={24} fill={body} {...THIN} />
      <circle cx={-22} cy={-44} r={16} fill={body} {...THIN} />
      {!dark && (
        <>
          <path d="M -36 -46 L -50 -42 L -36 -38 Z" fill="#f3a96b" stroke={INK} strokeWidth={2} />
          <circle cx={-26} cy={-48} r={3.5} fill={INK} />
          <ellipse cx={-6} cy={-18} rx={14} ry={10} fill="#e8c9a0" />
        </>
      )}
      <g className="x-flap" style={{ transformOrigin: '6px -30px' }}>
        <path d="M 6 -30 Q 30 -50 34 -20 Q 20 -16 6 -30 Z" fill={dark ? '#2b221f' : '#7a4f34'} {...THIN} />
      </g>
      <path d="M 26 -18 L 44 -10" stroke={INK} strokeWidth={6} strokeLinecap="round" />
    </g>
  )
}

function DarkShed({ moment, beat }: { moment: 'event' | 'comfort'; beat: number }) {
  const open = moment === 'comfort'
  const dx = px(0)
  const DW = m(0.78)
  const top = WALL + 16 - m(2.1)
  const doorBottom = WALL + 16
  const birdX = px(0.75)
  const flying = open && beat >= 1
  return (
    <g>
      {/* inside the shed: plank walls and floor cover the garden */}
      <rect x={-400} y={-400} width={2000} height={doorBottom + 400} fill={PLANK} />
      {Array.from({ length: 28 }, (_, i) => (
        <path key={i} d={`M ${-400 + i * 72} -400 V ${doorBottom}`} stroke="#6f533c" strokeWidth={5} />
      ))}
      <rect x={-400} y={doorBottom} width={2000} height={900} fill="#6e5440" />
      <path d={`M -400 ${doorBottom} H 1600`} stroke={INK} strokeWidth={6} />
      {/* the garden behind the door */}
      <rect x={dx - DW / 2} y={top} width={DW} height={doorBottom - top} fill="#bfe3f5" />
      <rect x={dx - DW / 2} y={doorBottom - 120} width={DW} height={120} fill="#a8d58c" />
      <circle cx={dx + 50} cy={top + 90} r={34} fill="#ffe89a" />
      {/* the door swings open on its left hinge */}
      <g style={{ transform: open ? 'scaleX(0.1)' : 'none', transformBox: 'fill-box', transformOrigin: 'left center', ...move(1.1) }}>
        <rect x={dx - DW / 2} y={top} width={DW} height={doorBottom - top} fill="#a07a52" {...LINE} />
        {[1, 2, 3].map((i) => (
          <path key={i} d={`M ${dx - DW / 2 + (DW / 4) * i} ${top + 6} V ${doorBottom - 6}`} stroke="#7f5e3f" strokeWidth={5} />
        ))}
        <path d={`M ${dx - DW / 2 + 12} ${top + 90} H ${dx + DW / 2 - 12} L ${dx - DW / 2 + 12} ${doorBottom - 90} H ${dx + DW / 2 - 12}`} fill="none" stroke="#7f5e3f" strokeWidth={14} strokeLinejoin="round" />
      </g>
      <rect x={dx - DW / 2} y={top} width={DW} height={doorBottom - top} fill="none" stroke={open ? INK : '#ffe9a8'} strokeWidth={open ? 8 : 5} />
      {/* rake on the wall, watering can on the floor */}
      <g>
        <path d={`M ${px(1.12)} ${G - 70} V ${G - 560}`} stroke={INK} strokeWidth={16} strokeLinecap="round" />
        <path d={`M ${px(1.12)} ${G - 70} V ${G - 560}`} stroke="#c9a27a" strokeWidth={7} strokeLinecap="round" />
        <path d={`M ${px(1.12) - 60} ${G - 560} H ${px(1.12) + 60}`} stroke={INK} strokeWidth={14} strokeLinecap="round" />
        {[-48, -24, 0, 24, 48].map((d) => (
          <path key={d} d={`M ${px(1.12) + d} ${G - 560} v -34`} stroke={INK} strokeWidth={7} strokeLinecap="round" />
        ))}
      </g>
      <g transform={`translate(${px(0.36)} ${G})`}>
        <path d="M 40 -80 L 110 -130" stroke={INK} strokeWidth={16} strokeLinecap="round" />
        <path d="M 40 -80 L 110 -130" stroke="#8fb0a0" strokeWidth={7} strokeLinecap="round" />
        <path d="M -40 -110 Q -60 -150 -20 -150" fill="none" stroke={INK} strokeWidth={8} strokeLinecap="round" />
        <rect x={-56} y={-112} width={104} height={112} rx={18} fill="#8fb0a0" {...LINE} />
      </g>
      {/* something small in the corner: a bird */}
      <g transform={`translate(${birdX} ${G - 4})`}>
        <g className={flying ? 'x-fly' : !open && beat >= 1 ? 'x-rustle' : undefined}>
          <Bird dark={!open} />
        </g>
      </g>
      {!open && beat >= 1 && (
        <g fill="none" stroke="#d9c7a8" strokeWidth={6} strokeLinecap="round">
          <g className="x-twinkle">
            <path d={`M ${birdX - 70} ${G - 90} q -14 20 0 40 M ${birdX + 70} ${G - 90} q 14 20 0 40`} />
          </g>
        </g>
      )}
      {/* dark inside; light when the door opens */}
      <rect x={-400} y={-400} width={2000} height={1900} fill="#140e1e" style={{ opacity: open ? 0.08 : 0.45, transition: 'opacity 1.4s ease' }} />
      <path
        d={`M ${dx - DW / 2} ${doorBottom} L ${dx + DW / 2} ${doorBottom} L ${dx + DW / 2 + 260} 1500 L ${dx - DW / 2 - 260} 1500 Z`}
        fill="#fff3b0"
        style={{ opacity: open ? 0.45 : 0, transition: 'opacity 1.4s ease 0.4s' }}
      />
    </g>
  )
}

/* ---------------- hallway: stuck zip ---------------- */

function StuckZip({ moment, beat }: { moment: 'event' | 'comfort'; beat: number }) {
  const dx = px(-0.1)
  const DW = m(0.78)
  const top = WALL - m(2.1)
  const open = moment === 'comfort' && beat >= 1
  const rack = px(0.6)
  const stand = px(1.05)
  return (
    <g>
      {/* sunshine outside the front door */}
      <rect x={dx - DW / 2} y={top} width={DW} height={WALL - top} fill="#bfe3f5" />
      <rect x={dx - DW / 2} y={WALL - 150} width={DW} height={150} fill="#a8d58c" />
      <circle cx={dx + 40} cy={top + 110} r={40} fill="#ffe89a" />
      <g style={{ transform: open ? 'scaleX(0.1)' : 'none', transformBox: 'fill-box', transformOrigin: 'left center', ...move(1.1) }}>
        <rect x={dx - DW / 2} y={top} width={DW} height={WALL - top} fill="#c98f5e" {...LINE} />
        <rect x={dx - DW / 2 + 30} y={top + 150} width={DW - 60} height={170} rx={8} fill="none" stroke="#a8754a" strokeWidth={6} />
        <rect x={dx - DW / 2 + 30} y={top + 360} width={DW - 60} height={220} rx={8} fill="none" stroke="#a8754a" strokeWidth={6} />
        <circle cx={dx} cy={top + 80} r={34} fill="#cfe8f7" {...THIN} />
        <circle cx={dx + DW / 2 - 34} cy={top + 350} r={12} fill="#f6c443" {...THIN} />
      </g>
      <rect x={dx - DW / 2 - 14} y={top - 14} width={DW + 28} height={WALL - top + 14} fill="none" stroke="#fbf6ee" strokeWidth={16} />
      <rect x={dx - DW / 2 - 22} y={top - 22} width={DW + 44} height={WALL - top + 22} fill="none" {...THIN} />
      {open && <path d={`M ${dx - DW / 2} ${WALL} L ${dx + DW / 2} ${WALL} L ${dx + DW / 2 + 200} 1500 L ${dx - DW / 2 - 200} 1500 Z`} fill="#fff3b0" className="x-light" />}
      {/* shoe rack with two pairs of shoes */}
      <rect x={rack - 110} y={G - 110} width={220} height={20} rx={6} fill="#c99a6c" {...LINE} />
      <path d={`M ${rack - 96} ${G - 90} V ${G} M ${rack + 96} ${G - 90} V ${G}`} stroke={INK} strokeWidth={12} strokeLinecap="round" />
      {[-60, -20, 26, 66].map((d, i) => (
        <path key={d} d={`M ${rack + d - 20} ${G - 112} q 0 -26 22 -26 q 14 0 16 14 l 14 6 q 4 6 0 6 Z`} fill={i < 2 ? '#7cc6c0' : '#e9a0b6'} {...THIN} />
      ))}
      {/* coat stand with a hat and a scarf */}
      <path d={`M ${stand} ${G - 4} V ${G - 560}`} stroke={INK} strokeWidth={18} strokeLinecap="round" />
      <path d={`M ${stand} ${G - 4} V ${G - 560}`} stroke="#b98a5e" strokeWidth={8} strokeLinecap="round" />
      <path d={`M ${stand - 70} ${G} L ${stand} ${G - 40} L ${stand + 70} ${G}`} fill="none" stroke={INK} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
      <path d={`M ${stand - 50} ${G - 520} L ${stand} ${G - 500} L ${stand + 50} ${G - 520}`} fill="none" stroke={INK} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
      <path d={`M ${stand - 60} ${G - 556} q 0 -52 60 -52 q 60 0 60 52 Z`} fill="#f6c443" {...LINE} />
      <path d={`M ${stand + 40} ${G - 500} q 30 60 6 150 l 28 6 q 22 -90 -10 -160 Z`} fill="#9cc7f0" {...THIN} />
      {moment === 'event' && beat >= 1 && (
        // tug lines next to the main character: pulling, pulling
        <g fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round">
          <g className="x-tug">
            <path d={`M ${px(-0.2)} ${py(1.15)} q 18 10 0 22 M ${px(-0.14)} ${py(1.05)} q 22 12 0 26`} />
          </g>
        </g>
      )}
    </g>
  )
}

/* ---------------- beach: sandcastle, big wave, seaweed ---------------- */

/** Foam where the sea meets the sand, gently moving. */
function SeaEdge() {
  return (
    <g>
      <path d="M -400 812 H 1600 V 834 H -400 Z" fill="#e3cf9c" />
      <g className="x-foam">
        <path d="M -440 812 q 30 -14 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0" fill="none" stroke="#ffffff" strokeWidth={8} strokeLinecap="round" />
      </g>
    </g>
  )
}

const SAND = '#e6c78b'

function Castle({ flag }: { flag: boolean }) {
  return (
    <g>
      <rect x={-72} y={-74} width={144} height={74} fill={SAND} {...THIN} />
      <path d="M -72 -74 v -14 h 20 v 14 h 16 v -14 h 20 v 14 h 16 v -14 h 20 v 14 h 16 v -14 h 20 v 14 h 16 v -14 h 20 v 14" fill={SAND} {...THIN} />
      <rect x={-92} y={-120} width={42} height={120} fill={SAND} {...THIN} />
      <rect x={50} y={-120} width={42} height={120} fill={SAND} {...THIN} />
      <path d="M -92 -120 l 21 -26 l 21 26 Z M 50 -120 l 21 -26 l 21 26 Z" fill="#d9b673" {...THIN} />
      <path d="M -18 0 v -34 q 18 -22 36 0 v 34 Z" fill="#b9935a" {...THIN} />
      {flag && (
        <g>
          <path d="M 71 -146 V -206" stroke={INK} strokeWidth={5} strokeLinecap="round" />
          <path d="M 73 -204 L 116 -190 L 73 -176 Z" fill="#e8382f" {...THIN} />
        </g>
      )}
    </g>
  )
}

function BucketSpade({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} ${G})`}>
      <path d="M -40 -84 L 40 -84 L 30 0 L -30 0 Z" fill="#7cc6c0" {...LINE} />
      <path d="M -38 -84 Q 0 -140 38 -84" fill="none" stroke={INK} strokeWidth={6} />
      <path d="M 60 -150 L 80 -30" stroke={INK} strokeWidth={14} strokeLinecap="round" />
      <path d="M 60 -150 L 80 -30" stroke="#f6c443" strokeWidth={6} strokeLinecap="round" />
      <path d="M 66 -40 L 96 -36 L 92 0 L 66 4 Z" fill="#f6c443" {...THIN} />
    </g>
  )
}

/** A thin sheet of water running up the sand from the right, with a foamy edge. */
function WaterSheet({ toX, className, style }: { toX: number; className?: string; style?: CSSProperties }) {
  return (
    <g className={className} style={style}>
      <path d={`M ${toX} ${G - 26} Q ${toX - 30} ${G - 4} ${toX} ${G + 20} L 1700 ${G + 34} L 1700 ${G - 40} Z`} fill="#bfe6f0" stroke="#ffffff" strokeWidth={10} strokeLinejoin="round" />
    </g>
  )
}

function Sandcastle({ moment, beat }: { moment: 'event' | 'comfort'; beat: number }) {
  const cx = px(0.55)
  if (moment === 'comfort') {
    return (
      <g>
        <SeaEdge />
        <ellipse cx={cx} cy={G - 8} rx={100} ry={18} fill="#d8bd84" />
        <BucketSpade x={px(1.15)} />
        {/* the new castle stands higher up the sand, nearer to us */}
        <g transform={`translate(${px(0.62)} ${py(-0.3)}) scale(1.1)`}>
          <g className={beat === 0 ? 'x-build' : undefined}>
            <Castle flag={true} />
          </g>
        </g>
      </g>
    )
  }
  const washed = beat >= 1
  return (
    <g>
      <SeaEdge />
      {washed && <ellipse cx={cx} cy={G - 8} rx={100} ry={18} fill="#d8bd84" />}
      <g transform={`translate(${cx} ${G})`}>
        <g style={{ transform: washed ? 'scaleY(0.1)' : 'none', opacity: washed ? 0 : 1, transformBox: 'fill-box', transformOrigin: 'center bottom', ...move(1.2, 0.5) }}>
          <Castle flag={false} />
        </g>
      </g>
      <BucketSpade x={px(1.08)} />
      {washed && <WaterSheet toX={cx - 160} className="x-wash" />}
    </g>
  )
}

function BigWave({ moment, beat }: { moment: 'event' | 'comfort'; beat: number }) {
  const big = moment === 'event' && beat >= 1
  const back = moment === 'comfort'
  return (
    <g>
      <SeaEdge />
      {/* a rounded wave rises at the back, then sinks again */}
      <g style={{ transform: big ? 'none' : 'translateY(140px) scaleY(0.2)', opacity: big ? 1 : 0, transformBox: 'fill-box', transformOrigin: 'center bottom', ...move(0.9) }}>
        <path d="M 600 812 C 700 770 760 650 900 606 C 1010 574 1100 616 1084 676 C 1066 640 1012 640 996 670 C 984 706 1060 724 1130 706 C 1260 706 1360 760 1500 812 Z" fill="#8fd0e6" {...LINE} />
        <path d="M 820 650 C 880 606 1000 584 1066 630 C 1040 620 1006 626 990 650 C 940 640 880 646 820 650 Z" fill="#ffffff" {...THIN} />
        <path d="M 700 780 Q 760 760 800 772 M 1200 760 Q 1260 744 1300 760" fill="none" stroke="#ffffffaa" strokeWidth={8} strokeLinecap="round" />
      </g>
      <BucketSpade x={px(0.82)} />
      {(big || back) && <WaterSheet toX={px(-0.25)} className={big ? 'x-rush' : undefined} style={back ? { transform: 'translateX(900px)', opacity: 0, transition: 'transform 2.4s ease-in, opacity 2.4s ease-in' } : undefined} />}
      {back && beat >= 1 && <Sparkles x={px(0)} y={py(0.3)} />}
    </g>
  )
}

function Seaweed({ moment, beat }: { moment: 'event' | 'comfort'; beat: number }) {
  if (moment === 'comfort') {
    const fx = px(-0.3)
    return (
      <g>
        <SeaEdge />
        <WaterSheet toX={px(-1.0)} className="x-rush" />
        {[0, 1, 2].map((i) => (
          <g key={i} className="x-splash" style={{ animationDelay: `${i * 0.35}s` }}>
            <circle cx={fx + i * 26 - 20} cy={G - 30} r={9} fill="#bfe6f0" {...THIN} />
          </g>
        ))}
        {beat >= 1 && <Sparkles x={px(-0.15)} y={py(1.1)} />}
      </g>
    )
  }
  const sx = px(-0.18)
  return (
    <g>
      <SeaEdge />
      {/* a slimy pile right where the main character stands */}
      <Blob
        fill="#56804f"
        circles={[
          [sx - 70, G - 16, 34],
          [sx - 10, G - 28, 42],
          [sx + 56, G - 18, 36],
          [sx + 100, G - 10, 24],
        ]}
      />
      <path d={`M ${sx - 90} ${G - 20} q 30 -30 60 -6 q 30 -36 70 -8 q 30 -24 60 2`} fill="none" stroke="#3f6b45" strokeWidth={8} strokeLinecap="round" />
      <path d={`M ${sx - 30} ${G - 50} q 10 -8 20 -2 M ${sx + 40} ${G - 40} q 10 -8 20 -2`} fill="none" stroke="#ffffff99" strokeWidth={6} strokeLinecap="round" />
      {beat >= 1 && <Wisps x={sx + 20} y={G - 76} color="#9db88a" n={3} />}
    </g>
  )
}

/* ---------------- entry ---------------- */

/** Props behind the characters for the extra scenes (ids starting with x_), or null. */
export function ExtraProps(p: PlaceProps) {
  const { moment, beat } = p
  const scenes: Record<string, ReactNode> = {
    x_pancakes: <Pancakes beat={beat} />,
    x_sprinkles: <Sprinkles beat={beat} />,
    x_toy_car: <ToyCar moment={moment} beat={beat} />,
    x_sandcastle: <Sandcastle moment={moment} beat={beat} />,
    x_popcorn: <Popcorn moment={moment} beat={beat} />,
    x_rabbit: <RabbitScene moment={moment} beat={beat} />,
    x_stuck_zip: <StuckZip moment={moment} beat={beat} />,
    x_drawing_stop: <DrawingStop moment={moment} beat={beat} />,
    x_dark_shed: <DarkShed moment={moment} beat={beat} />,
    x_big_wave: <BigWave moment={moment} beat={beat} />,
    x_moldy_roll: <MoldyRollScene moment={moment} beat={beat} />,
    x_seaweed: <Seaweed moment={moment} beat={beat} />,
  }
  return scenes[p.sceneId] ?? null
}
