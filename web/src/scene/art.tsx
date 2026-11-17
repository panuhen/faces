import type { CSSProperties, ReactNode } from 'react'

// Shared drawing pieces for scene pictures: flat fills and dark outlines,
// to match the cel-shaded characters.

export const INK = '#2b1d24'
export const LINE = { stroke: INK, strokeWidth: 6, strokeLinejoin: 'round', strokeLinecap: 'round' } as const
export const THIN = { ...LINE, strokeWidth: 4 } as const

export type TimeOfDay = 'morning' | 'midday' | 'afternoon' | 'evening'

export const SKY: Record<TimeOfDay, [string, string]> = {
  morning: ['#bfe3f5', '#fdf0d8'],
  midday: ['#a3d8f4', '#e6f5fb'],
  afternoon: ['#a9d4ee', '#fbe6c4'],
  evening: ['#9aa7dc', '#f9c79a'],
}

/**
 * One depth layer of a picture. 'par' is how strongly it follows the camera
 * (0 = fixed like the sky, 1 = with the characters, above 1 = in front).
 * 'enter' is how far it slides in when the scene opens.
 */
export function Layer({ par, enter = 0, front, children }: { par: number; enter?: number; front?: boolean; children: ReactNode }) {
  const style = { '--par': par, '--enter': `${enter}px` } as CSSProperties
  return (
    <div className={front ? 'layer front' : 'layer'} style={style}>
      <svg viewBox="-150 -125 1500 1250" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {children}
      </svg>
    </div>
  )
}

/** Overlapping circles drawn as one outlined shape (tree tops, bushes, clouds). */
export function Blob({ circles, fill, stroke = INK, width = 6 }: { circles: [number, number, number][]; fill: string; stroke?: string; width?: number }) {
  return (
    <g>
      <g fill={stroke}>
        {circles.map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r + width} />
        ))}
      </g>
      <g fill={fill}>
        {circles.map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} />
        ))}
      </g>
    </g>
  )
}

export function Sky({ time, id }: { time: TimeOfDay; id: string }) {
  const [top, bottom] = SKY[time]
  const sunY = time === 'midday' ? 110 : time === 'evening' ? 560 : 170
  return (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="0.75" stopColor={bottom} />
        </linearGradient>
      </defs>
      <rect x="-400" y="-400" width="2000" height="1800" fill={`url(#${id})`} />
      <circle cx={time === 'evening' ? 300 : 770} cy={sunY} r="78" fill="#fff6c9" />
      <circle cx={time === 'evening' ? 300 : 770} cy={sunY} r="58" fill="#ffe89a" />
    </>
  )
}

export function Cloud({ x, y, s = 1, drift = 0 }: { x: number; y: number; s?: number; drift?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="drift" style={{ animationDelay: `${-drift}s` }}>
        <Blob
          fill="#ffffff"
          stroke="#b7cad6"
          width={4}
          circles={[
            [-70, 10, 34],
            [-25, -18, 46],
            [35, -8, 40],
            [80, 14, 30],
            [5, 18, 40],
          ]}
        />
      </g>
    </g>
  )
}

/** A balloon with a string from its knot to (toX, toY), all in picture units. */
export function Balloon({ x, y, toX, toY, color, s = 1, className }: { x: number; y: number; toX?: number; toY?: number; color: string; s?: number; className?: string }) {
  const ry = 78 * s
  const rx = 64 * s
  const knot = y + ry
  return (
    <g className={className}>
      {toX !== undefined && toY !== undefined && (
        <path d={`M ${x} ${knot + 10 * s} Q ${x + 26} ${(knot + toY) / 2} ${toX} ${toY}`} fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
      )}
      <path d={`M ${x - 11 * s} ${knot + 13 * s} L ${x} ${knot - 4 * s} L ${x + 11 * s} ${knot + 13 * s} Z`} fill={color} {...THIN} />
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={color} {...LINE} strokeWidth={6 * Math.max(0.6, s)} />
      <ellipse cx={x - rx * 0.36} cy={y - ry * 0.38} rx={rx * 0.17} ry={ry * 0.24} fill="#ffffff" opacity="0.6" transform={`rotate(24 ${x - rx * 0.36} ${y - ry * 0.38})`} />
    </g>
  )
}

/** A tuft of grass, base at (x, y). */
export function Tuft({ x, y, s = 1, fill = '#8fc27a' }: { x: number; y: number; s?: number; fill?: string }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M -44 0 Q -40 -34 -52 -58 Q -24 -44 -20 -8 Q -14 -52 -4 -84 Q 10 -50 10 -8 Q 20 -46 44 -62 Q 36 -30 42 0 Z"
      fill={fill}
      {...THIN}
    />
  )
}

export function Flower({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M 0 0 Q 4 -22 0 -44" fill="none" stroke="#5f9a57" strokeWidth={5} strokeLinecap="round" />
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 11} cy={-50 + Math.sin((a * Math.PI) / 180) * 11} r="9" fill={color} stroke={INK} strokeWidth={3} />
      ))}
      <circle cx="0" cy="-50" r="6" fill="#ffe89a" stroke={INK} strokeWidth={3} />
    </g>
  )
}
