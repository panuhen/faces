import { Blob, Flower, INK, LINE, THIN } from './art'
import type { PlaceProps } from './places'

// Furniture for the stand-in rooms, at the far left of the picture so the
// characters and the story props keep the middle. Also what the window shows
// in the scenes that need it (snow in summer, the thunderstorm).

const WOOD = '#c9a27a'
const WOOD_DARK = '#a77d58'

function Bed() {
  return (
    <g>
      <rect x={-60} y={520} width={46} height={270} rx={14} fill={WOOD} {...LINE} />
      <rect x={-30} y={650} width={380} height={90} rx={22} fill="#fbf6ee" {...LINE} />
      <path d="M 110 650 H 340 Q 360 650 360 680 V 740 H 110 Z" fill="#9cc7f0" {...LINE} />
      <path d="M 150 660 V 735 M 200 660 V 735 M 250 660 V 735 M 300 660 V 735" stroke="#ffffff88" strokeWidth={8} />
      <ellipse cx={30} cy={640} rx={60} ry={30} fill="#ffffff" {...LINE} />
      <path d="M -10 740 V 790 M 330 740 V 790" stroke={INK} strokeWidth={14} strokeLinecap="round" />
    </g>
  )
}

function Kitchen() {
  return (
    <g>
      {/* wall cupboard */}
      <rect x={-140} y={250} width={420} height={170} rx={10} fill="#e7d3b4" {...LINE} />
      <path d="M 70 250 V 420" stroke={INK} strokeWidth={5} />
      <circle cx={50} cy={340} r={8} fill={INK} />
      <circle cx={90} cy={340} r={8} fill={INK} />
      {/* counter and cupboards */}
      <rect x={-140} y={600} width={460} height={190} rx={8} fill="#e7d3b4" {...LINE} />
      <rect x={-150} y={580} width={480} height={30} rx={8} fill="#b8c7c2" {...LINE} />
      <path d="M 90 610 V 790" stroke={INK} strokeWidth={5} />
      <circle cx={70} cy={690} r={8} fill={INK} />
      <circle cx={110} cy={690} r={8} fill={INK} />
      {/* kettle */}
      <path d="M 180 580 Q 175 510 230 505 Q 285 510 280 580 Z" fill="#e9a0b6" {...LINE} />
      <path d="M 280 540 Q 310 540 315 515" fill="none" stroke={INK} strokeWidth={8} strokeLinecap="round" />
      <path d="M 205 505 Q 230 470 255 505" fill="none" stroke={INK} strokeWidth={8} strokeLinecap="round" />
    </g>
  )
}

function Sofa() {
  return (
    <g>
      <rect x={-150} y={560} width={460} height={150} rx={40} fill="#b9c9a5" {...LINE} />
      <rect x={-120} y={660} width={400} height={80} rx={24} fill="#cddab9" {...LINE} />
      <rect x={250} y={620} width={80} height={130} rx={34} fill="#b9c9a5" {...LINE} />
      <ellipse cx={180} cy={620} rx={56} ry={44} fill="#f6c443" opacity={0.85} {...THIN} />
      <path d="M -100 740 V 790 M 280 740 V 790" stroke={INK} strokeWidth={14} strokeLinecap="round" />
    </g>
  )
}

function Lamp() {
  // floor lamp at the right of the window
  return (
    <g>
      <path d="M 1085 790 V 420" stroke={INK} strokeWidth={10} strokeLinecap="round" />
      <ellipse cx={1085} cy={790} rx={46} ry={12} fill={INK} />
      <path d="M 1030 420 L 1050 320 H 1120 L 1140 420 Z" fill="#fbe7b0" {...LINE} />
    </g>
  )
}

function ToyShelf() {
  return (
    <g>
      <rect x={60} y={480} width={280} height={310} rx={8} fill={WOOD} {...LINE} />
      <path d="M 60 580 H 340 M 60 680 H 340" stroke={INK} strokeWidth={6} />
      <circle cx={130} cy={545} r={30} fill="#e8a7a0" {...LINE} />
      <path d="M 130 515 V 575 M 100 545 H 160" stroke="#ffffff99" strokeWidth={5} />
      <rect x={200} y={520} width={56} height={56} rx={6} fill="#9cc7f0" {...LINE} />
      {/* teddy */}
      <circle cx={150} cy={640} r={28} fill={WOOD_DARK} {...LINE} />
      <circle cx={128} cy={614} r={11} fill={WOOD_DARK} {...THIN} />
      <circle cx={172} cy={614} r={11} fill={WOOD_DARK} {...THIN} />
      <ellipse cx={150} cy={672} rx={30} ry={8} fill={WOOD_DARK} />
      <rect x={220} y={720} width={90} height={56} rx={8} fill="#f6c443" {...LINE} />
      <rect x={90} y={720} width={100} height={56} rx={8} fill="#b9d98f" {...LINE} />
    </g>
  )
}

function BakeryCounter() {
  return (
    <g>
      {/* cakes on a wall shelf */}
      <path d="M -140 420 H 300" stroke={INK} strokeWidth={12} strokeLinecap="round" />
      <rect x={-90} y={360} width={110} height={60} rx={8} fill="#f3c6d2" {...LINE} />
      <rect x={80} y={340} width={90} height={80} rx={8} fill="#fbf1e1" {...LINE} />
      <circle cx={125} cy={330} r={10} fill="#e8a7a0" {...THIN} />
      <rect x={210} y={370} width={70} height={50} rx={8} fill="#c9a27a" {...LINE} />
      {/* glass counter */}
      <rect x={-140} y={560} width={470} height={230} rx={10} fill="#f4ead6" {...LINE} />
      <rect x={-110} y={590} width={410} height={110} rx={8} fill="#dff0f7" {...THIN} />
      <path d="M -60 600 L -20 690 M 120 600 L 160 690" stroke="#ffffff" strokeWidth={10} opacity={0.7} />
      <ellipse cx={30} cy={690} rx={40} ry={10} fill="#e2c39b" />
      <ellipse cx={200} cy={690} rx={40} ry={10} fill="#e2c39b" />
    </g>
  )
}

function Fence() {
  // garden fence at the back, with a flower bed
  const posts = Array.from({ length: 22 }, (_, i) => -380 + i * 90)
  return (
    <g>
      <path d="M -400 690 H 1600 M -400 735 H 1600" stroke={INK} strokeWidth={22} />
      <path d="M -400 690 H 1600 M -400 735 H 1600" stroke="#f4ead6" strokeWidth={12} />
      {posts.map((x) => (
        <path key={x} d={`M ${x} 780 V 650 L ${x + 22} 628 L ${x + 44} 650 V 780 Z`} fill="#f4ead6" {...THIN} />
      ))}
      <Blob fill="#8fc27a" circles={[[-120, 760, 50], [-40, 770, 44], [40, 762, 48], [1180, 760, 50], [1260, 770, 44]]} />
      <Flower x={-110} y={760} color="#f8dfe9" />
      <Flower x={-30} y={772} color="#fbe7b0" />
      <Flower x={40} y={760} color="#f5efe6" />
      <Flower x={1200} y={762} color="#f8dfe9" />
    </g>
  )
}

/** Furniture for one place, in picture units. */
export function Furniture({ place }: { place: string }) {
  if (place === 'bedroom') return <Bed />
  if (place === 'kitchen') return <Kitchen />
  if (place === 'living_room')
    return (
      <>
        <Sofa />
        <Lamp />
      </>
    )
  if (place === 'playroom') return <ToyShelf />
  if (place === 'bakery') return <BakeryCounter />
  if (place === 'garden') return <Fence />
  return null
}

/* ---------------- what the window shows ---------------- */

const WIN = { x: 700, y: 200, w: 300, h: 320 }

function Snowflakes() {
  const flakes = Array.from({ length: 16 }, (_, i) => ({ x: WIN.x + 14 + ((i * 53) % (WIN.w - 28)), d: (i * 0.37) % 3, s: 4 + (i % 3) * 2 }))
  return (
    <g>
      {flakes.map((f, i) => (
        <circle key={i} className="snow" cx={f.x} cy={WIN.y - 10} r={f.s} fill="#ffffff" stroke="#b7cad6" strokeWidth={1.5} style={{ animationDelay: `${-f.d}s` }} />
      ))}
    </g>
  )
}

function Raindrops() {
  const drops = Array.from({ length: 18 }, (_, i) => ({ x: WIN.x + 10 + ((i * 47) % (WIN.w - 20)), d: (i * 0.23) % 1 }))
  return (
    <g stroke="#c9d6e6" strokeWidth={4} strokeLinecap="round">
      {drops.map((r, i) => (
        <path key={i} className="rain" d={`M ${r.x} ${WIN.y - 30} l -10 30`} style={{ animationDelay: `${-r.d}s` }} />
      ))}
    </g>
  )
}

/** The view through the window for scenes that need one; drawn under the window frame. */
export function WindowView({ sceneId, moment }: PlaceProps) {
  let view = null
  if (sceneId === 'snow_summer') {
    // a green summer tree outside; snow falls on it, then the sun melts it
    view = (
      <>
        <rect x={WIN.x} y={WIN.y} width={WIN.w} height={WIN.h} fill={moment === 'comfort' ? '#bfe3f5' : '#d7e3ec'} />
        {moment === 'comfort' && <circle cx={WIN.x + 230} cy={WIN.y + 70} r={42} fill="#ffe89a" stroke="#fff6c9" strokeWidth={14} />}
        <path d={`M ${WIN.x + 120} ${WIN.y + WIN.h} V ${WIN.y + 200}`} stroke="#a9795a" strokeWidth={26} />
        <Blob fill="#86bd84" circles={[[WIN.x + 80, WIN.y + 170, 60], [WIN.x + 150, WIN.y + 130, 72], [WIN.x + 200, WIN.y + 190, 54]]} />
        {moment === 'event' ? (
          <>
            <path d={`M ${WIN.x + 40} ${WIN.y + 120} Q ${WIN.x + 100} ${WIN.y + 60} ${WIN.x + 180} ${WIN.y + 64}`} fill="none" stroke="#ffffff" strokeWidth={16} strokeLinecap="round" />
            <Snowflakes />
          </>
        ) : (
          <path d={`M ${WIN.x + 50} ${WIN.y + 120} Q ${WIN.x + 80} ${WIN.y + 104} ${WIN.x + 110} ${WIN.y + 110}`} fill="none" stroke="#ffffff" strokeWidth={8} strokeLinecap="round" opacity={0.8} />
        )}
      </>
    )
  } else if (sceneId === 'thunderstorm') {
    view =
      moment === 'event' ? (
        <>
          <rect x={WIN.x} y={WIN.y} width={WIN.w} height={WIN.h} fill="#7d8aa3" />
          <Blob fill="#a2aec4" stroke="#5f6b82" width={4} circles={[[WIN.x + 60, WIN.y + 60, 46], [WIN.x + 130, WIN.y + 40, 56], [WIN.x + 210, WIN.y + 64, 48], [WIN.x + 270, WIN.y + 50, 40]]} />
          {/* lightning as a slow soft glow, never a flash */}
          <g className="glow">
            <circle cx={WIN.x + 180} cy={WIN.y + 170} r={70} fill="#fff6c9" opacity={0.35} />
            <path d={`M ${WIN.x + 190} ${WIN.y + 100} L ${WIN.x + 160} ${WIN.y + 175} H ${WIN.x + 190} L ${WIN.x + 165} ${WIN.y + 245}`} fill="none" stroke="#ffe89a" strokeWidth={12} strokeLinejoin="round" strokeLinecap="round" />
          </g>
          <Raindrops />
        </>
      ) : (
        <>
          <rect x={WIN.x} y={WIN.y} width={WIN.w} height={WIN.h} fill="#bfe3f5" />
          <g fill="none" strokeWidth={14} strokeLinecap="round">
            <path d={`M ${WIN.x + 20} ${WIN.y + 300} A 140 140 0 0 1 ${WIN.x + 300} ${WIN.y + 300}`} stroke="#e9806e" />
            <path d={`M ${WIN.x + 34} ${WIN.y + 300} A 126 126 0 0 1 ${WIN.x + 286} ${WIN.y + 300}`} stroke="#f6c443" />
            <path d={`M ${WIN.x + 48} ${WIN.y + 300} A 112 112 0 0 1 ${WIN.x + 272} ${WIN.y + 300}`} stroke="#8fc27a" />
            <path d={`M ${WIN.x + 62} ${WIN.y + 300} A 98 98 0 0 1 ${WIN.x + 258} ${WIN.y + 300}`} stroke="#9cc7f0" />
          </g>
          <circle cx={WIN.x + 240} cy={WIN.y + 70} r={40} fill="#ffe89a" stroke="#fff6c9" strokeWidth={14} />
        </>
      )
  }
  if (!view) return null
  return (
    <g>
      <defs>
        <clipPath id="window-clip">
          <rect x={WIN.x} y={WIN.y} width={WIN.w} height={WIN.h} />
        </clipPath>
      </defs>
      <g clipPath="url(#window-clip)">{view}</g>
    </g>
  )
}
