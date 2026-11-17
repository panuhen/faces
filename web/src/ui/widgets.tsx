import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { CharacterId } from '../rig/characters'
import type { Expression, FaceStyle } from '../rig/features'
import { portraits, type Portraits } from '../three/portraits'
import { tracker } from '../face/tracker'
import { useCaption } from './narrator'

/** The narrator's current line. */
export function Caption() {
  const text = useCaption()
  return (
    <p className="caption" aria-live="polite">
      {text}
    </p>
  )
}

export function usePortraits(character: CharacterId, style: FaceStyle): Portraits | null {
  const [pics, setPics] = useState<Portraits | null>(null)
  useEffect(() => {
    let alive = true
    setPics(null)
    void portraits(character, style).then((p) => alive && setPics(p))
    return () => {
      alive = false
    }
  }, [character, style])
  return pics
}

/** A card with the character's face for one expression. */
export function FaceCard({ src, label, state, onTap }: { src?: string; label?: string; state?: 'pulse' | 'sparkle' | 'on'; onTap?: () => void }) {
  return (
    <button className={`card ${state ?? ''}`} onClick={onTap} disabled={!onTap}>
      {src ? <img src={src} alt="" draggable={false} /> : <span className="card-wait" />}
      {label && <span className="card-label">{label}</span>}
    </button>
  )
}

export function Face({ character, style = 'big', expression }: { character: CharacterId; style?: FaceStyle; expression: Expression }) {
  const pics = usePortraits(character, style)
  return pics ? <img className="face" src={pics[expression]} alt="" draggable={false} /> : <span className="face" />
}

/** The child's own camera picture, small and mirrored. Shown live, never stored. */
export function CameraPreview() {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = ref.current
    if (!v || !tracker.stream) return
    v.srcObject = tracker.stream
    void v.play().catch(() => undefined)
    return () => {
      v.srcObject = null
    }
  }, [])
  if (!tracker.stream) return null
  return <video ref={ref} className="preview" playsInline muted />
}

/** A button that only works after a 3-second press (the grown-ups' gate). */
export function HoldButton({ label, hint, onHeld, children }: { label: string; hint: string; onHeld: () => void; children: ReactNode }) {
  const [holding, setHolding] = useState(false)
  const timer = useRef(0)
  const stop = () => {
    clearTimeout(timer.current)
    setHolding(false)
  }
  useEffect(() => () => clearTimeout(timer.current), [])
  return (
    <div className="hold">
      <button
        className={holding ? 'hold-button holding' : 'hold-button'}
        aria-label={label}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={() => {
          setHolding(true)
          timer.current = window.setTimeout(() => {
            setHolding(false)
            onHeld()
          }, 3000)
        }}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
      >
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <circle className="hold-ring" cx="24" cy="24" r="21" />
        </svg>
        {children}
      </button>
      {holding && <span className="hold-hint">{hint}</span>}
    </div>
  )
}

export function Gear() {
  return (
    <svg className="gear" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M19.4 13a7.5 7.5 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-1.7-1L15 3.5h-4l-.4 2.5a7.6 7.6 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.5 7.5 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6ZM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z"
      />
    </svg>
  )
}
