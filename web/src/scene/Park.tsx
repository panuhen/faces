import { useEffect, useState } from 'react'
import { Balloon, Blob, Cloud, Flower, INK, Layer, LINE, Sky, THIN, Tuft } from './art'
import { GROUND, px, py } from './coords'
import type { PlaceProps } from './places'

// The park: scenes red_balloon (happy), balloon_away (sad) and big_dog (scared).
// Muted greens everywhere, so the red balloon is the one strong color.

const RED = '#e8382f'
const YELLOW = '#f6c443'
const TEAL = '#7cc6c0'

/** Where the main character stands when alone, in metres from the middle. */
export const PARK_SOLO_X: Record<string, number> = { red_balloon: -0.28, balloon_away: -0.2 }

function Tree({ x, s = 1 }: { x: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${GROUND - 40}) scale(${s})`}>
      <path d="M -34 0 Q -22 -120 -30 -300 L 34 -300 Q 24 -120 40 0 Z" fill="#a9795a" {...LINE} />
      <path d="M -8 -90 Q 4 -150 -4 -220" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" opacity="0.5" />
      <Blob
        fill="#86bd84"
        circles={[
          [-110, -330, 90],
          [0, -410, 120],
          [115, -330, 92],
          [-50, -290, 80],
          [60, -280, 84],
        ]}
      />
      <path d="M -70 -400 Q -40 -440 0 -446" fill="none" stroke="#b4dba6" strokeWidth={10} strokeLinecap="round" />
    </g>
  )
}

function Bench({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} ${GROUND - 66})`}>
      <rect x="-104" y="-74" width="208" height="26" rx="8" fill="#d2a274" {...THIN} />
      <rect x="-104" y="-40" width="208" height="26" rx="8" fill="#d2a274" {...THIN} />
      <rect x="-112" y="0" width="224" height="24" rx="8" fill="#c4915f" {...THIN} />
      <path d="M -84 24 V 62 M 84 24 V 62 M -84 -12 V 0 M 84 -12 V 0" stroke={INK} strokeWidth={9} strokeLinecap="round" />
    </g>
  )
}

function BalloonStand({ x }: { x: number }) {
  const y = GROUND - 30
  return (
    <g>
      {/* soft-colored balloons on the stand, so they do not compete with the red one */}
      <Balloon x={x - 58} y={y - 372} toX={x} toY={y - 150} color="#f3d9a4" s={0.8} />
      <Balloon x={x + 60} y={y - 384} toX={x} toY={y - 150} color="#bfe0d6" s={0.8} />
      <Balloon x={x} y={y - 446} toX={x} toY={y - 150} color="#e9c7d9" s={0.86} />
      <rect x={x - 82} y={y - 150} width="164" height="112" rx="12" fill="#f4ead6" {...LINE} />
      <path d={`M ${x - 96} ${y - 150} H ${x + 96}`} stroke={INK} strokeWidth={12} strokeLinecap="round" />
      <path d={`M ${x - 82} ${y - 112} H ${x + 82}`} stroke="#e0b98c" strokeWidth={14} />
      <circle cx={x - 46} cy={y - 22} r="26" fill="#b99273" {...LINE} />
      <circle cx={x + 46} cy={y - 22} r="26" fill="#b99273" {...LINE} />
      <circle cx={x - 46} cy={y - 22} r="6" fill={INK} />
      <circle cx={x + 46} cy={y - 22} r="6" fill={INK} />
    </g>
  )
}

function Leaf({ delay, y }: { delay: number; y: number }) {
  return (
    <g className="leaf" style={{ animationDelay: `${delay}s` }}>
      <path transform={`translate(0 ${y})`} d="M 0 0 Q 16 -22 40 -10 Q 22 12 0 0 Z" fill="#c9b458" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
    </g>
  )
}

export function ParkBack({ time }: PlaceProps) {
  return (
    <>
      <Layer par={0.08}>
        <Sky time={time} id="park-sky" />
        <Cloud x={250} y={170} s={1.1} drift={0} />
        <Cloud x={720} y={90} s={0.8} drift={30} />
        <Cloud x={1150} y={250} s={0.95} drift={55} />
      </Layer>
      <Layer par={0.3} enter={24}>
        <path d="M -400 690 Q -60 560 330 650 T 1000 620 T 1600 670 V 1400 H -400 Z" fill="#cfe6b4" {...THIN} />
        {[
          [80, 632, 46],
          [470, 648, 38],
          [760, 618, 50],
          [1130, 628, 42],
        ].map(([x, y, r]) => (
          <g key={x}>
            <path d={`M ${x} ${y + r * 0.6} V ${y + r * 1.7}`} stroke="#a58a72" strokeWidth={10} strokeLinecap="round" />
            <Blob fill="#a9d3a0" stroke="#5b7a5b" width={4} circles={[[x, y, r], [x - r * 0.7, y + r * 0.4, r * 0.7], [x + r * 0.7, y + r * 0.4, r * 0.7]]} />
          </g>
        ))}
        <path d="M -400 760 Q 200 680 700 740 T 1600 730 V 1400 H -400 Z" fill="#bcdc9f" {...THIN} />
      </Layer>
      <Layer par={0.68} enter={56}>
        <Tree x={170} />
        <Bench x={690} />
        <BalloonStand x={940} />
      </Layer>
      <Layer par={1} enter={90}>
        <path d="M -400 806 Q 600 772 1600 806 V 1500 H -400 Z" fill="#a8d58c" {...LINE} />
        <path d="M 300 1500 Q 470 960 880 806 L 1010 802 Q 720 960 700 1500 Z" fill="#f1e2c4" {...LINE} />
        <Tuft x={120} y={900} s={0.7} />
        <Tuft x={1060} y={930} s={0.8} />
      </Layer>
    </>
  )
}

export function ParkFront({ sceneId, moment, soloX }: PlaceProps) {
  return (
    <>
      <Layer par={1} front>
        <ParkProps sceneId={sceneId} moment={moment} soloX={soloX} />
      </Layer>
      <Layer par={1.25} enter={130} front>
        <Tuft x={-40} y={1040} s={1.5} />
        <Tuft x={240} y={1060} s={1.2} fill="#9bcb85" />
        <Flower x={150} y={1010} color="#f5efe6" />
        <Tuft x={960} y={1060} s={1.3} fill="#9bcb85" />
        <Tuft x={1230} y={1040} s={1.5} />
        <Flower x={1090} y={1016} color="#f8dfe9" />
        <Flower x={1150} y={1036} color="#f5efe6" />
      </Layer>
    </>
  )
}

function ParkProps({ sceneId, moment, soloX }: { sceneId: string; moment: 'event' | 'comfort'; soloX: number }) {
  // comfort of the sad balloon scene: the friend has two balloons, then gives one away
  const [given, setGiven] = useState(false)
  useEffect(() => {
    setGiven(false)
    if (sceneId !== 'balloon_away' || moment !== 'comfort') return
    const t = setTimeout(() => setGiven(true), 3400)
    return () => clearTimeout(t)
  }, [sceneId, moment])

  if (sceneId === 'red_balloon')
    return (
      <g className="bob">
        <Balloon x={px(soloX + 0.74)} y={py(2.42)} toX={px(soloX + 0.47)} toY={py(0.74)} color={RED} />
      </g>
    )
  if (sceneId === 'balloon_away' && moment === 'event')
    return (
      <>
        <g className="float-away">
          <Balloon x={860} y={250} toX={872} toY={420} color={RED} s={0.5} />
        </g>
        <Leaf delay={0} y={520} />
        <Leaf delay={1.6} y={640} />
        <Leaf delay={3.1} y={430} />
      </>
    )
  if (sceneId === 'balloon_away' && moment === 'comfort')
    return (
      <>
        <g className="bob">
          <Balloon x={px(0.22)} y={py(2.92)} toX={px(0.36)} toY={py(0.78)} color={TEAL} />
        </g>
        <g className="give" style={{ transform: given ? `translateX(${px(-0.24) - px(0)}px)` : 'none' }}>
          <g className="bob late">
            <Balloon x={px(0)} y={py(2.7)} toX={px(given ? -0.12 : 0.32)} toY={py(0.78)} color={YELLOW} />
          </g>
        </g>
      </>
    )
  return null
}
