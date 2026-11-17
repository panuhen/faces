import { useMemo, useState } from 'react'
import { tracker } from '../face/tracker'
import { useSaved } from '../game/settings'
import { fill, pick, STORY, UI } from '../game/story'
import type { CharacterId } from '../rig/characters'
import { FACE_STYLES, PRESETS, scaled, type Emotion } from '../rig/features'
import { SceneView } from '../scene/SceneView'
import { MakeFace, type MakeResult } from '../ui/MakeFace'
import { useScript } from '../ui/narrator'
import { chime, tap } from '../ui/sound'
import { Caption, FaceCard, usePortraits } from '../ui/widgets'

type Step = 'pick' | 'show' | 'make' | 'after'

/** Pick one face and copy it. No story, no stickers. */
export function Practice({ hero, onDone }: { hero: CharacterId; onDone: () => void }) {
  const { settings } = useSaved()
  const [emotion, setEmotion] = useState<Emotion | null>(null)
  const [step, setStep] = useState<Step>('pick')
  const [round, setRound] = useState(0)
  const [result, setResult] = useState<MakeResult>('made')
  const pics = usePortraits(hero, 'big')
  const emotions = STORY.emotionOrder.filter((e) => settings.emotions.includes(e))
  const face = useMemo(() => (emotion && step !== 'pick' ? scaled(PRESETS[emotion], FACE_STYLES.big) : {}), [emotion, step])

  useScript(
    async (s) => {
      if (step === 'pick') await s.say(UI.practice.prompt)
      if (!emotion) return
      const info = STORY.emotions[emotion]
      const vars = { word: info.word }
      if (step === 'show') {
        await s.say(fill(UI.level1.show, hero, vars))
        await s.sayAll(info.hint)
        setStep('make')
      } else if (step === 'make') {
        await s.say(fill(tracker.state === 'on' ? info.makePrompt : UI.make.noCamera.prompt, hero, vars))
      } else if (step === 'after') {
        const line = result === 'made' || result === 'done' ? pick(UI.practice.success) : result === 'tried' ? pick(UI.make.niceTry) : pick(UI.make.skip.spoken)
        await s.say(line)
      }
    },
    [step, round],
  )

  return (
    <div className="screen">
      <SceneView hero={hero} place="playroom" time="midday" sceneId="practice" shot={step === 'pick' ? 'solo' : 'face'} heroFace={face}>
        <button className="corner" aria-label={UI.sticker.home} onClick={onDone}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 11.5 12 4l8 7.5M6.5 10v9h11v-9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </SceneView>
      <div className="panel">
        <Caption />
        {step === 'pick' && (
          <div className={`cards n${emotions.length}`}>
            {emotions.map((e) => (
              <FaceCard
                key={e}
                src={pics?.[e]}
                label={STORY.emotions[e].label}
                onTap={() => {
                  tap()
                  setEmotion(e)
                  setStep('show')
                }}
              />
            ))}
          </div>
        )}
        {step === 'make' && emotion && (
          <MakeFace
            key={round}
            hero={hero}
            emotion={emotion}
            onDone={(r) => {
              if (r === 'made') chime()
              setResult(r)
              setStep('after')
            }}
          />
        )}
        {step === 'after' && (
          <div className="buttons">
            <button className="btn quiet" onClick={() => setStep('pick')}>
              {UI.practice.another}
            </button>
            <button
              className="btn"
              onClick={() => {
                setRound(round + 1)
                setStep('show')
              }}
            >
              {UI.practice.again}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
