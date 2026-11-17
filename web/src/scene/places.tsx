import type { ComponentType } from 'react'
import { INK, Layer, LINE, Sky, THIN, Tuft, type TimeOfDay } from './art'
import { GROUND } from './coords'
import { ParkBack, ParkFront, PARK_SOLO_X } from './Park'

export interface PlaceProps {
  time: TimeOfDay
  sceneId: string
  moment: 'event' | 'comfort'
  /** Where the main character stands when alone (metres). */
  soloX: number
}

interface Place {
  Back: ComponentType<PlaceProps>
  Front?: ComponentType<PlaceProps>
  soloX?: Record<string, number>
}

// Simple stand-in rooms until each place has its own picture.
const ROOMS: Record<string, { wall: string; floor: string; rug: string }> = {
  bedroom: { wall: '#dfe6f3', floor: '#d9b991', rug: '#b9c9e6' },
  kitchen: { wall: '#f3ead2', floor: '#cfd8d2', rug: '#e8c9a0' },
  playroom: { wall: '#e2f0dc', floor: '#dcc09a', rug: '#f0cfb0' },
  living_room: { wall: '#f1e3d3', floor: '#cfae88', rug: '#c9d8c0' },
  bakery: { wall: '#f6e6da', floor: '#d6c3b0', rug: '#e9d2b8' },
  hallway: { wall: '#e6e3ee', floor: '#cdb497', rug: '#c7c2dc' },
}

function Room({ place }: { place: string }) {
  const c = ROOMS[place] ?? ROOMS.living_room
  function Back({ time }: PlaceProps) {
    return (
      <>
        <Layer par={0.1}>
          <Sky time={time} id={`${place}-sky`} />
        </Layer>
        <Layer par={0.6} enter={40}>
          {/* wall with a window cut out, so the sky layer shows through */}
          <path fillRule="evenodd" d="M -400 -400 H 1600 V 800 H -400 Z M 700 200 H 1000 V 520 H 700 Z" fill={c.wall} />
          <rect x="700" y="200" width="300" height="320" rx="6" fill="none" {...LINE} strokeWidth={14} stroke="#fbf6ee" />
          <rect x="693" y="193" width="314" height="334" rx="10" fill="none" {...THIN} />
          <path d="M 850 200 V 520 M 700 360 H 1000" stroke="#fbf6ee" strokeWidth={10} />
          <path d="M 680 530 H 1020" stroke={INK} strokeWidth={12} strokeLinecap="round" />
        </Layer>
        <Layer par={1} enter={80}>
          <path d="M -400 790 H 1600 V 1500 H -400 Z" fill={c.floor} {...LINE} />
          <path d="M -400 772 H 1600" stroke="#fbf6ee" strokeWidth={28} />
          <path d="M -400 758 H 1600" stroke={INK} strokeWidth={4} />
          <ellipse cx="600" cy={GROUND + 40} rx="430" ry="78" fill={c.rug} {...LINE} />
        </Layer>
      </>
    )
  }
  return Back
}

const OUTDOOR: Record<string, { ground: string; far: string }> = {
  garden: { ground: '#a8d58c', far: '#c6e2ac' },
  beach: { ground: '#f3e2b6', far: '#9fd3e6' },
}

function Outdoor({ place }: { place: string }) {
  const c = OUTDOOR[place] ?? OUTDOOR.garden
  function Back({ time }: PlaceProps) {
    return (
      <>
        <Layer par={0.08}>
          <Sky time={time} id={`${place}-sky`} />
        </Layer>
        <Layer par={0.35} enter={30}>
          <path d="M -400 700 Q 200 640 700 690 T 1600 680 V 1400 H -400 Z" fill={c.far} {...THIN} />
        </Layer>
        <Layer par={1} enter={80}>
          <path d="M -400 806 Q 600 776 1600 806 V 1500 H -400 Z" fill={c.ground} {...LINE} />
          {place === 'garden' && <Tuft x={150} y={910} s={0.8} />}
        </Layer>
      </>
    )
  }
  return Back
}

const PLACES: Record<string, Place> = {
  park: { Back: ParkBack, Front: ParkFront, soloX: PARK_SOLO_X },
  garden: { Back: Outdoor({ place: 'garden' }) },
  beach: { Back: Outdoor({ place: 'beach' }) },
}
for (const id of Object.keys(ROOMS)) PLACES[id] = { Back: Room({ place: id }) }

export function placeFor(id: string): Place {
  return PLACES[id] ?? PLACES.living_room
}
