import type { CSSProperties, ReactNode } from 'react'
import { Balloon, INK, Layer, LINE, THIN } from './art'
import { px, py, U } from './coords'
import type { PlaceProps } from './places'
import { EXTRA_SOLO_X, ExtraProps } from './props_extra'

// Story props that stand behind the characters: Rufus the dog (park), the
// block tower (playroom) and the chocolate cake (bakery). Each scene moves
// its props on the narrator's lines ('beat' = index of the line being read).

/** Where the main character stands when alone, for scenes with props. */
export const PROP_SOLO_X: Record<string, number> = {
  big_dog: -0.65,
  tall_tower: -0.65,
  tower_knocked: -0.65,
  cake_drop: -0.45,
  snow_summer: -0.45,
  old_milk: -0.6,
  jack_in_box: -0.5,
  apple_worm: -0.6,
  party: -0.65,
  ...EXTRA_SOLO_X,
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


/* ---------------- shared pieces ---------------- */

/** A small round table, top at TABLE_TOP metres, centred at x metres. */
function Table({ x }: { x: number }) {
  const tx = px(x)
  const top = py(TABLE_TOP)
  return (
    <g>
      <path d={`M ${tx} ${top} V ${py(0) - 18} M ${tx - 58} ${py(0) - 6} H ${tx + 58}`} stroke={INK} strokeWidth={16} strokeLinecap="round" />
      <path d={`M ${tx} ${top} V ${py(0) - 18}`} stroke="#c9a27a" strokeWidth={8} strokeLinecap="round" />
      <ellipse cx={tx} cy={top} rx={120} ry={22} fill="#e2c39b" {...LINE} />
    </g>
  )
}

/** Something held out between the two characters, bobbing gently. */
function Held({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <g transform={`translate(${px(x)} ${py(y)})`}>
      <g className="bob">
        <g className="pop-in">{children}</g>
      </g>
    </g>
  )
}

function Glass({ x, y, drink }: { x: number; y: number; drink: string | null }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M -26 -86 H 26 L 21 0 H -21 Z" fill="#ffffffcc" {...LINE} />
      {drink && <path d="M -23.5 -62 H 23.5 L 20 -3 H -20 Z" fill={drink} />}
    </g>
  )
}

/** Wavy smell lines rising from (x, y). */
function Smell({ x, y }: { x: number; y: number }) {
  return (
    <g className="smell" fill="none" stroke="#8fbf5a" strokeWidth={7} strokeLinecap="round">
      <path d={`M ${x - 18} ${y} q -14 -22 0 -44 q 14 -22 0 -44`} />
      <path d={`M ${x + 18} ${y - 6} q -14 -22 0 -44 q 14 -22 0 -44`} />
    </g>
  )
}

/* ---------------- 1. snow in summer (bedroom) ---------------- */

function SunHatChair() {
  const x = px(0.55)
  const seat = py(0.62)
  return (
    <g>
      <path d={`M ${x - 70} ${py(0) - 4} V ${seat} M ${x + 70} ${py(0) - 4} V ${seat} M ${x + 70} ${seat} V ${py(1.35)}`} stroke={INK} strokeWidth={14} strokeLinecap="round" />
      <path d={`M ${x - 70} ${py(0) - 4} V ${seat} M ${x + 70} ${py(0) - 4} V ${seat} M ${x + 70} ${seat} V ${py(1.35)}`} stroke="#c9a27a" strokeWidth={7} strokeLinecap="round" />
      <rect x={x - 84} y={seat - 16} width={168} height={26} rx={10} fill="#e2c39b" {...LINE} />
      {/* the sun hat shows that it is summer */}
      <g transform={`translate(${x - 6} ${seat - 18})`}>
        <ellipse cx={0} cy={0} rx={86} ry={20} fill="#f3d27a" {...LINE} />
        <path d="M -44 -2 Q -42 -54 0 -56 Q 42 -54 44 -2 Z" fill="#f3d27a" {...LINE} />
        <path d="M -43 -14 Q 0 -4 43 -14" fill="none" stroke="#e9806e" strokeWidth={12} />
      </g>
    </g>
  )
}

/* ---------------- 2. old milk (kitchen) ---------------- */

const KITCHEN_TABLE_X = 0.2

function Breakfast({ moment, beat }: Pick<PlaceProps, 'moment' | 'beat'>) {
  const tx = px(KITCHEN_TABLE_X)
  const top = py(TABLE_TOP) - 10
  const juice = moment === 'comfort' && beat >= 1
  const milkGone = moment === 'comfort'
  return (
    <>
      <Table x={KITCHEN_TABLE_X} />
      {/* bowl */}
      <path d={`M ${tx - 100} ${top - 40} Q ${tx - 70} ${top + 6} ${tx - 40} ${top - 40} Z`} fill="#9cc7f0" {...LINE} />
      {!milkGone && (
        <g transform={`translate(${tx + 70} ${top})`}>
          {/* milk carton */}
          <path d="M -26 0 V -90 L 0 -116 L 26 -90 V 0 Z" fill="#ffffff" {...LINE} />
          <path d="M -26 -60 H 26" stroke="#9cc7f0" strokeWidth={14} />
        </g>
      )}
      {milkGone ? (
        juice && (
          <g className="pop-in">
            <Glass x={tx + 10} y={top} drink="#f6a93b" />
          </g>
        )
      ) : (
        <>
          <Glass x={tx + 10} y={top} drink="#fbfaf4" />
          {beat >= 1 && <Smell x={tx + 10} y={top - 96} />}
        </>
      )}
    </>
  )
}

/* ---------------- 3. jack-in-the-box (living room) ---------------- */

function JackInBox({ moment, beat }: Pick<PlaceProps, 'moment' | 'beat'>) {
  const x = px(0.45)
  const y = py(0)
  const open = (moment === 'event' && beat >= 1) || (moment === 'comfort' && beat < 1)
  return (
    <g transform={`translate(${x} ${y})`}>
      {/* music notes while the handle turns */}
      {moment === 'event' && beat === 0 && (
        <g className="notes" fill={INK}>
          <g>
            <ellipse cx={-40} cy={-260} rx={14} ry={10} />
            <path d="M -27 -262 V -310" stroke={INK} strokeWidth={5} />
          </g>
          <g style={{ animationDelay: '0.8s' }}>
            <ellipse cx={30} cy={-300} rx={14} ry={10} />
            <path d="M 43 -302 V -350 L 60 -340" stroke={INK} strokeWidth={5} fill="none" />
          </g>
        </g>
      )}
      {open && (
        <g className="spring-up">
          {/* zigzag spring and a smiling sun puppet */}
          <path d="M 0 -180 l 30 -20 l -60 -20 l 60 -20 l -60 -20 l 30 -20" fill="none" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
          <g transform="translate(0 -330)">
            {Array.from({ length: 10 }, (_, i) => (
              <path key={i} transform={`rotate(${i * 36})`} d="M -12 -62 L 0 -86 L 12 -62 Z" fill="#f6c443" {...THIN} />
            ))}
            <circle cx={0} cy={0} r={62} fill="#f6c443" {...LINE} />
            <circle cx={-20} cy={-10} r={7} fill={INK} />
            <circle cx={20} cy={-10} r={7} fill={INK} />
            <path d="M -24 16 Q 0 36 24 16" fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" />
          </g>
        </g>
      )}
      <rect x={-90} y={-180} width={180} height={180} rx={12} fill="#7cc6c0" {...LINE} />
      <path d="M -90 -120 H 90" stroke="#5aa7a1" strokeWidth={10} />
      <path d="M -40 -70 l 10 -22 l 10 22 l -24 -14 h 28 Z" fill="#fbf6ee" />
      {/* lid: closed on top, or open and tipped back */}
      {open ? (
        <rect x={60} y={-250} width={30} height={84} rx={6} fill="#5aa7a1" {...LINE} transform="rotate(20 75 -180)" />
      ) : (
        <rect x={-98} y={-196} width={196} height={24} rx={8} fill="#5aa7a1" {...LINE} />
      )}
      {/* crank handle on the side */}
      <g className={moment === 'event' && beat === 0 ? 'crank' : undefined} style={{ transformOrigin: '96px -100px', transformBox: 'view-box' }}>
        <path d="M 90 -100 H 116 V -60" fill="none" stroke={INK} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={116} cy={-56} r={12} fill="#e9806e" {...THIN} />
      </g>
    </g>
  )
}

/* ---------------- 4. worm in the apple (garden) ---------------- */

function Picnic({ moment, beat }: Pick<PlaceProps, 'moment' | 'beat'>) {
  const ax = px(0.12)
  const ay = py(0) + 30
  const worm = (moment === 'event' && beat >= 1) || moment === 'comfort'
  return (
    <>
      {/* checked picnic blanket on the grass */}
      <g>
        <defs>
          <pattern id="checks" width="60" height="60" patternUnits="userSpaceOnUse">
            <rect width="60" height="60" fill="#f7d7d3" />
            <rect width="30" height="30" fill="#ee9f97" />
            <rect x="30" y="30" width="30" height="30" fill="#ee9f97" />
          </pattern>
        </defs>
        <path d={`M ${px(-0.75)} ${py(0) + 70} L ${px(-0.55)} ${py(0) - 10} H ${px(0.75)} L ${px(0.95)} ${py(0) + 70} Z`} fill="url(#checks)" {...LINE} />
      </g>
      {/* green apple with a bite */}
      <g transform={`translate(${ax} ${ay})`}>
        <path d="M 0 -96 Q -60 -112 -66 -50 Q -66 6 0 6 Q 66 6 66 -50 Q 60 -112 0 -96 Z" fill="#a8d06a" {...LINE} />
        <path d="M 66 -66 Q 40 -60 42 -36 Q 50 -14 68 -22" fill="#fbf1d0" {...THIN} />
        <path d="M 0 -96 Q 4 -120 16 -128" fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" />
        <path d="M 6 -112 Q 30 -136 50 -116 Q 30 -104 6 -112 Z" fill="#7fb35a" {...THIN} />
        {worm && (
          <g className="worm">
            <path d="M 50 -48 Q 74 -64 92 -50 Q 104 -40 98 -28" fill="none" stroke={INK} strokeWidth={22} strokeLinecap="round" />
            <path d="M 50 -48 Q 74 -64 92 -50 Q 104 -40 98 -28" fill="none" stroke="#f3a3b5" strokeWidth={14} strokeLinecap="round" />
            <circle cx={95} cy={-50} r={3.5} fill={INK} />
          </g>
        )}
      </g>
      {moment === 'comfort' && beat >= 1 && (
        <Held x={0.05} y={1.0}>
          <path d="M -60 -10 Q -40 40 50 20 Q 60 14 56 6 Q -10 18 -46 -24 Q -56 -28 -60 -10 Z" fill="#f6d24b" {...LINE} />
        </Held>
      )}
    </>
  )
}

/* ---------------- 5. thunderstorm (living room) ---------------- */

function StormDim({ moment }: Pick<PlaceProps, 'moment'>) {
  // the room goes darker during the storm; the characters stay lit
  return <rect x={-400} y={-400} width={2000} height={1900} fill="#2b3550" style={{ opacity: moment === 'event' ? 0.22 : 0, transition: 'opacity 1.5s' }} />
}

/* ---------------- 6. the party (garden) ---------------- */

function Party() {
  const flags = Array.from({ length: 13 }, (_, i) => i)
  const colors = ['#f6c443', '#7cc6c0', '#e9a0b6', '#9cc7f0', '#b9d98f']
  const tx = px(0)
  const top = py(TABLE_TOP) - 10
  return (
    <>
      {/* bunting across the top */}
      <path d="M -200 90 Q 600 230 1400 90" fill="none" stroke={INK} strokeWidth={5} />
      <g className="sway">
        {flags.map((i) => {
          const x = -120 + i * 110
          const t = (x + 200) / 1600
          const y = 90 + 4 * 140 * t * (1 - t) - 4
          return <path key={i} d={`M ${x - 30} ${y} L ${x + 30} ${y} L ${x} ${y + 56} Z`} fill={colors[i % colors.length]} {...THIN} />
        })}
      </g>
      <Table x={0} />
      {/* balloons tied to the table */}
      <g className="bob">
        <Balloon x={tx - 70} y={py(2.35)} toX={tx - 20} toY={top} color="#e9a0b6" s={0.7} />
        <Balloon x={tx + 60} y={py(2.5)} toX={tx + 10} toY={top} color="#9cc7f0" s={0.7} />
      </g>
      {/* cake */}
      <g transform={`translate(${tx} ${top})`}>
        <rect x={-70} y={-70} width={140} height={70} rx={10} fill="#fbf1e1" {...LINE} />
        <path d="M -70 -44 H 70" stroke="#e9a0b6" strokeWidth={10} />
        {[-36, 0, 36].map((cx) => (
          <g key={cx}>
            <rect x={cx - 5} y={-108} width={10} height={38} rx={4} fill="#9cc7f0" {...THIN} />
            <path className="flame" d={`M ${cx} -130 Q ${cx + 10} -118 ${cx} -110 Q ${cx - 10} -118 ${cx} -130 Z`} fill="#f6c443" />
          </g>
        ))}
      </g>
    </>
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
  else if (p.sceneId === 'snow_summer') content = <SunHatChair />
  else if (p.sceneId === 'old_milk') content = <Breakfast moment={p.moment} beat={p.beat} />
  else if (p.sceneId === 'jack_in_box') content = <JackInBox moment={p.moment} beat={p.beat} />
  else if (p.sceneId === 'apple_worm') content = <Picnic moment={p.moment} beat={p.beat} />
  else if (p.sceneId === 'thunderstorm') content = <StormDim moment={p.moment} />
  else if (p.sceneId === 'party') content = <Party />
  else if (p.sceneId.startsWith('x_')) content = <ExtraProps {...p} />
  if (!content) return null
  return (
    <Layer par={1} enter={90}>
      {content}
    </Layer>
  )
}
