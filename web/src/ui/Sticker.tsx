import type { ReactNode } from 'react'
import { INK } from '../scene/art'

const L = { stroke: INK, strokeWidth: 4, strokeLinejoin: 'round', strokeLinecap: 'round' } as const

// Small pictures for the sticker book, one per scene. Drawn in a 100 x 100 box.
const ART: Record<string, ReactNode> = {
  snowflake: (
    <g stroke="#6fb6dd" strokeWidth={7} strokeLinecap="round">
      {[0, 60, 120].map((a) => (
        <path key={a} transform={`rotate(${a} 50 50)`} d="M 50 18 V 82 M 50 30 L 40 22 M 50 30 L 60 22 M 50 70 L 40 78 M 50 70 L 60 78" />
      ))}
    </g>
  ),
  orange_juice: (
    <>
      <path d="M 32 26 H 68 L 63 84 H 37 Z" fill="#ffffff" {...L} />
      <path d="M 34.5 42 H 65.5 L 62 82 H 38 Z" fill="#f6a93b" />
      <path d="M 58 12 L 52 50" {...L} strokeWidth={5} stroke="#7cc6c0" />
    </>
  ),
  red_balloon: (
    <>
      <path d="M 50 62 Q 56 78 48 92" fill="none" {...L} strokeWidth={3} />
      <ellipse cx="50" cy="38" rx="24" ry="28" fill="#e8382f" {...L} />
      <ellipse cx="42" cy="28" rx="4" ry="7" fill="#fff" opacity="0.6" />
    </>
  ),
  two_balloons: (
    <>
      <path d="M 36 62 Q 44 78 48 92 M 64 58 Q 54 78 50 92" fill="none" {...L} strokeWidth={3} />
      <ellipse cx="34" cy="40" rx="19" ry="23" fill="#f6c443" {...L} />
      <ellipse cx="66" cy="36" rx="19" ry="23" fill="#7cc6c0" {...L} />
    </>
  ),
  block_tower: (
    <>
      <rect x="36" y="64" width="28" height="24" rx="3" fill="#7cc6c0" {...L} />
      <rect x="38" y="40" width="26" height="24" rx="3" fill="#f6c443" {...L} />
      <rect x="35" y="16" width="27" height="24" rx="3" fill="#e9a0b6" {...L} />
    </>
  ),
  two_hands_blocks: (
    <>
      <rect x="22" y="58" width="26" height="26" rx="3" fill="#f6c443" {...L} />
      <rect x="52" y="58" width="26" height="26" rx="3" fill="#7cc6c0" {...L} />
      <rect x="37" y="30" width="26" height="26" rx="3" fill="#e9a0b6" {...L} />
    </>
  ),
  dog_tail: (
    <>
      <path d="M 28 34 Q 20 52 30 60 M 72 34 Q 80 52 70 60" fill="#8a5a3c" {...L} />
      <ellipse cx="50" cy="52" rx="24" ry="26" fill="#b98558" {...L} />
      <ellipse cx="50" cy="64" rx="12" ry="9" fill="#f3e2cc" {...L} />
      <circle cx="41" cy="46" r="3.5" fill={INK} />
      <circle cx="59" cy="46" r="3.5" fill={INK} />
      <ellipse cx="50" cy="60" rx="4" ry="3" fill={INK} />
    </>
  ),
  jack_box: (
    <>
      <rect x="28" y="54" width="44" height="34" rx="4" fill="#7cc6c0" {...L} />
      <path d="M 50 54 L 44 46 L 56 40 L 44 34" fill="none" {...L} />
      <circle cx="50" cy="24" r="12" fill="#f6c443" {...L} />
    </>
  ),
  banana: <path d="M 22 40 Q 30 82 78 70 Q 84 66 80 60 Q 46 64 32 34 Q 26 30 22 40 Z" fill="#f6d24b" {...L} />,
  cupcake: (
    <>
      <path d="M 30 56 H 70 L 64 88 H 36 Z" fill="#e9a0b6" {...L} />
      <path d="M 26 56 Q 26 32 50 30 Q 74 32 74 56 Z" fill="#fbf1e1" {...L} />
      <circle cx="50" cy="22" r="8" fill="#e8382f" {...L} />
    </>
  ),
  rainbow: (
    <g fill="none" strokeWidth={9} strokeLinecap="round">
      <path d="M 14 76 A 36 36 0 0 1 86 76" stroke="#e9806e" />
      <path d="M 24 76 A 26 26 0 0 1 76 76" stroke="#f6c443" />
      <path d="M 34 76 A 16 16 0 0 1 66 76" stroke="#7cc6c0" />
    </g>
  ),
  party_hat: (
    <>
      <path d="M 50 14 L 76 82 H 24 Z" fill="#7cc6c0" {...L} />
      <path d="M 38 46 L 62 52 M 31 66 L 70 72" stroke="#f6c443" strokeWidth={6} strokeLinecap="round" />
      <circle cx="50" cy="14" r="8" fill="#f6c443" {...L} />
    </>
  ),
}

const STAR = <path d="M 50 14 L 60 38 L 86 40 L 66 57 L 73 83 L 50 69 L 27 83 L 34 57 L 14 40 L 40 38 Z" fill="#f6c443" {...L} />

export function Sticker({ id, size = 96 }: { id: string; size?: number }) {
  return (
    <svg className="sticker" width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="47" fill="#ffffff" stroke={INK} strokeWidth={4} />
      {ART[id] ?? STAR}
    </svg>
  )
}
