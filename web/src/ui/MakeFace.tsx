import { useEffect, useRef, useState } from 'react'
import { scoreFace, type Score } from '../face/score'
import { tracker } from '../face/tracker'
import { store, useSaved } from '../game/settings'
import { fill, pick, STORY, UI } from '../game/story'
import type { CharacterId } from '../rig/characters'
import type { Emotion } from '../rig/features'
import { announce } from './narrator'
import { speak } from '../game/speech'

export type MakeResult = 'made' | 'tried' | 'skipped' | 'done'

interface Props {
  hero: CharacterId
  emotion: Emotion
  onDone: (result: MakeResult) => void
}

const TIER_4 = 0.8

/**
 * "Can you show the ___ face?" The camera follows the child's face and fills a
 * meter. Feedback names a face part and an action, never a feeling (design A1.6).
 * Without a camera the child taps Done instead.
 */
export function MakeFace({ hero, emotion, onDone }: Props) {
  const { settings } = useSaved()
  const info = STORY.emotions[emotion]
  const camera = tracker.state === 'on'
  const fillRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<SVGCircleElement>(null)
  const [coach, setCoach] = useState('')
  const [fading, setFading] = useState(false)
  const [debug, setDebug] = useState<Score | null>(null)
  const done = useRef(onDone)
  done.current = onDone

  useEffect(() => {
    if (!camera) return
    const vars = { word: info.word }
    tracker.simTarget = emotion
    let raf = 0
    let finished = false
    let smooth = 0
    let held = 0
    let tier = 0
    let lastTierTalk = performance.now() // let the prompt finish first
    let lastCoachTalk = performance.now() // let the prompt finish first
    let lastSeen = performance.now()
    let lostTalk = -1e9
    let active = 0 // seconds the face has been in view, for the time limit
    let last = performance.now()
    let frame = 0

    const finish = (result: MakeResult) => {
      if (finished) return
      finished = true
      done.current(result)
    }

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      if (finished) return
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const f = tracker.frame
      const s = store.get()
      if (!f.present) {
        // face lost for 2 s: one gentle line; the timer waits
        if (now - lastSeen > 2000 && now - lostTalk > 9000) {
          lostTalk = now
          announce(pick(UI.camera.faceLost))
        }
        smooth *= 0.9
        held = 0
      } else {
        lastSeen = now
        active += dt
        const score = scoreFace(emotion, f.shapes, s.baseline, s.settings.sensitivity)
        smooth += (score.total - smooth) * (1 - Math.exp(-dt * 8))
        if (s.settings.debug && frame++ % 6 === 0) setDebug(score)

        const t = UI.make.meterTiers.find((m) => smooth >= m.from && smooth < m.to)?.tier ?? 4
        // speak only when the tier goes up, and not too often; a falling score is silent
        if (t > tier && now - lastTierTalk > 4000) {
          announce(fill(pick(UI.make.meterTiers[t - 1].lines), hero, vars))
          lastTierTalk = now
          tier = t
        }
        if (t < TIER_4_INDEX) {
          const line = info.coach.find((c) => c.feature === score.weakest)?.text ?? ''
          setCoach(line)
          if (line && now - lastCoachTalk > 6000 && now - lastTierTalk > 2500) {
            lastCoachTalk = now
            void speak(line)
          }
        } else setCoach('')

        if (smooth >= TIER_4) held += dt
        else if (smooth < TIER_4 - 0.08) held = 0
        if (held >= s.settings.holdTime) {
          finish('made')
          return
        }
        const limit = s.settings.timeLimit
        if (limit !== 'off' && active >= limit) {
          setFading(true)
          finish('tried')
          return
        }
      }
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${Math.min(1, smooth / TIER_4).toFixed(3)})`
      if (ringRef.current) ringRef.current.style.strokeDashoffset = String(100 - Math.min(1, held / s.settings.holdTime) * 100)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      tracker.simTarget = null
    }
  }, [camera, emotion, hero, info])

  return (
    <div className="make">
      {camera ? (
        <>
          <div className={fading ? 'meter fading' : 'meter'}>
            <div className="meter-track">
              <div className="meter-fill" ref={fillRef} />
            </div>
            <svg className="meter-star" viewBox="0 0 48 48" aria-hidden="true">
              <circle className="meter-ring" ref={ringRef} cx="24" cy="24" r="21" pathLength="100" />
              <path d="M24 9l4.4 9.6 10.4 1.1-7.8 7 2.3 10.3L24 31.6 14.7 37l2.3-10.3-7.8-7 10.4-1.1z" />
            </svg>
          </div>
          <p className="coach">{coach}</p>
          <ul className="hints">
            {info.hint.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
          {settings.debug && debug && (
            <div className="debug">
              <span>total {debug.total.toFixed(2)}</span>
              {Object.entries(debug.features).map(([k, v]) => (
                <span key={k}>
                  {k} {v.toFixed(2)}
                </span>
              ))}
            </div>
          )}
          <div className="buttons">
            <button className="btn quiet" onClick={() => onDone('skipped')}>
              {UI.make.skip.button}
            </button>
          </div>
        </>
      ) : (
        <>
          <ul className="hints">
            {info.hint.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
          <div className="buttons">
            <button className="btn quiet" onClick={() => onDone('skipped')}>
              {UI.make.skip.button}
            </button>
            <button className="btn" onClick={() => onDone('done')}>
              {UI.make.noCamera.button}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

const TIER_4_INDEX = 4
