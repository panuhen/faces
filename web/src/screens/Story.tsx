import { useMemo, useRef, useState } from 'react'
import { tracker } from '../face/tracker'
import { pickCards, pickSession } from '../game/session'
import { store, useSaved } from '../game/settings'
import { readingTime } from '../game/speech'
import { fill, pick, sceneById, STORY, UI, type Scene } from '../game/story'
import type { CharacterId } from '../rig/characters'
import { FACE_STYLES, PRESETS, scaled, type Emotion, type Weights } from '../rig/features'
import type { Shot } from '../scene/coords'
import { SceneView } from '../scene/SceneView'
import { MakeFace, type MakeResult } from '../ui/MakeFace'
import { useScript } from '../ui/narrator'
import { chime, tap } from '../ui/sound'
import { Sticker } from '../ui/Sticker'
import { CameraPreview, Caption, FaceCard, usePortraits } from '../ui/widgets'

type Phase =
  | 'intro' // good morning
  | 'story' // the situation is told
  | 'guess' // cards are out, waiting for a tap
  | 'right' // the target card was tapped
  | 'closer' // another card was tapped: look at the face together
  | 'find' // the target card pulses
  | 'found'
  | 'make' // make the face
  | 'after' // what the narrator says after the make step
  | 'comfort'
  | 'sticker'
  | 'outro'

type Part = 'brows' | 'eyes' | 'nose' | 'mouth' | 'cheeks'

// Which face part the pointer rests on for each hint line of an emotion.
const HINT_PARTS: Record<Emotion, Part[]> = {
  happy: ['mouth', 'cheeks'],
  sad: ['brows', 'mouth'],
  surprised: ['eyes', 'mouth'],
  angry: ['brows', 'mouth'],
  scared: ['eyes', 'mouth'],
  disgusted: ['nose', 'mouth'],
}

const CALM: Weights = {}
const SMILE = scaled(PRESETS.happy, 0.45)

/** Scenes for this session; ?scenes=red_balloon,balloon_away overrides the picker (testing). */
function sessionScenes(): Scene[] {
  const forced = new URLSearchParams(window.location.search).get('scenes')
  if (forced) {
    const list = forced.split(',').map((id) => sceneById(id)).filter((s): s is Scene => !!s)
    if (list.length) return list
  }
  return pickSession(store.get().settings)
}

export function Story({ hero, onEnd, onHome }: { hero: CharacterId; onEnd: () => void; onHome: () => void }) {
  const { settings } = useSaved()
  const [scenes] = useState(sessionScenes)
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('intro')
  const [telling, setTelling] = useState(0) // goes up for "Hear again"
  const [cards, setCards] = useState<Emotion[]>([])
  const [pointer, setPointer] = useState<Part | null>(null)
  const [friendIn, setFriendIn] = useState(false)
  const [smiling, setSmiling] = useState(false)
  const result = useRef<MakeResult>('made')
  const stuck = useRef(new Set<string>()) // scenes whose sticker is already in the book

  const scene = scenes[index]
  const emotion = scene.emotion
  const info = STORY.emotions[emotion]
  const level = settings.difficulty
  const vars = { word: info.word, label: info.label, sticker: scene.sticker.label }
  const text = (raw: string) => fill(raw, hero, vars)
  const happyOff = !settings.emotions.includes('happy')
  const cardStyle = level === 4 ? 'subtle' : settings.faceStyle
  const pics = usePortraits(hero, cardStyle)

  const goNext = () => {
    setFriendIn(false)
    setSmiling(false)
    setPointer(null)
    setTelling(0)
    if (index + 1 < scenes.length) {
      setIndex(index + 1)
      setPhase('story')
    } else setPhase('outro')
  }

  useScript(
    async (s) => {
      /** Tells a story line; the friend walks in at the first line that names them. */
      const tell = async (raw: string) => {
        if (raw.includes('{friend}')) setFriendIn(true)
        await s.say(text(raw))
      }
      switch (phase) {
        case 'intro':
          await s.pause(600)
          await s.sayAll(UI.intro.map(text))
          setPhase('story')
          break
        case 'story':
          if (level === 1) {
            await s.say(text(UI.level1.show))
            setPhase('make')
            break
          }
          await s.pause(telling ? 0 : 700)
          for (const line of scene.text) await tell(line)
          if (emotion === 'happy' && happyOff) {
            // happy is switched off: the finale is told, with no task
            setPhase('sticker')
            break
          }
          if (!telling) setCards(pickCards(emotion, settings))
          setPhase('guess')
          break
        case 'guess':
          await s.say(text(UI.guess.prompt))
          break
        case 'right':
          await s.say(text(pick(UI.guess.celebrate)))
          setPhase('make')
          break
        case 'closer':
          await s.say(text(pick(UI.guess.lookCloser.open)))
          // "Look at the eyebrows. Look at the mouth.": the pointer visits both
          setPointer('brows')
          setTimeout(() => setPointer((p) => (p === 'brows' ? 'mouth' : p)), readingTime(UI.guess.lookCloser.point) / 2)
          await s.say(UI.guess.lookCloser.point)
          for (let i = 0; i < info.hint.length; i++) {
            setPointer(HINT_PARTS[emotion][i] ?? 'mouth')
            await s.say(info.hint[i])
          }
          setPointer(null)
          await s.say(text(UI.guess.lookCloser.reveal))
          setPhase('find')
          break
        case 'find':
          await s.say(text(UI.guess.lookCloser.tapPrompt))
          await s.pause(6000) // no tap: the game goes on by itself
          setPhase('make')
          break
        case 'found':
          await s.say(text(UI.guess.lookCloser.found))
          setPhase('make')
          break
        case 'make':
          await s.say(text(tracker.state === 'on' ? info.makePrompt : UI.make.noCamera.prompt))
          break
        case 'after': {
          const r = result.current
          const line =
            r === 'made' ? pick(UI.make.success) : r === 'tried' ? pick(UI.make.niceTry) : r === 'done' ? UI.make.noCamera.after : pick(UI.make.skip.spoken)
          await s.say(text(line))
          setPhase(emotion === 'happy' ? 'sticker' : 'comfort')
          break
        }
        case 'comfort': {
          if (level === 1 || !scene.comfort) {
            await s.say(text(UI.level1.reset))
          } else {
            const lines = scene.comfort
            for (let i = 0; i < lines.length; i++) {
              if (i === lines.length - 1) setSmiling(true)
              await tell(lines[i])
            }
          }
          setSmiling(true)
          setPhase('sticker')
          break
        }
        case 'sticker':
          if (!stuck.current.has(scene.id)) {
            stuck.current.add(scene.id)
            store.addSticker(scene.sticker)
            chime()
          }
          await s.pause(300)
          await s.say(text(pick(UI.sticker.earned)))
          await s.pause(3000)
          goNext()
          break
        case 'outro':
          await s.sayAll(UI.outro.map(text))
          onEnd()
          break
      }
    },
    [index, phase, telling],
  )

  const onCard = (e: Emotion) => {
    tap()
    if (phase === 'guess') {
      if (e === emotion) {
        chime()
        setPhase('right')
      } else setPhase('closer')
    } else if (phase === 'find' && e === emotion) {
      chime()
      setPhase('found')
    }
  }

  // what the picture shows in this step
  const feeling = useMemo(() => scaled(PRESETS[emotion], FACE_STYLES[level === 1 ? 'big' : settings.faceStyle]), [emotion, level, settings.faceStyle])
  const feelingBig = useMemo(() => scaled(PRESETS[emotion], FACE_STYLES.big), [emotion])
  let heroFace: Weights = CALM
  let shot: Shot = friendIn ? 'duo' : 'solo'
  let moment: 'event' | 'comfort' = 'event'
  if (phase === 'story' || phase === 'guess' || phase === 'right') heroFace = level <= 2 ? feeling : CALM
  else if (phase === 'closer' || phase === 'find' || phase === 'found' || phase === 'make' || phase === 'after') {
    heroFace = feelingBig
    shot = 'face'
  } else if (phase === 'comfort' || phase === 'sticker') {
    moment = emotion === 'happy' ? 'event' : 'comfort'
    heroFace = emotion === 'happy' ? feeling : smiling ? SMILE : CALM
  } else if (phase === 'outro' || phase === 'intro') heroFace = SMILE
  const friendFace = moment === 'comfort' || scene.finale ? SMILE : CALM

  const showCards = phase === 'guess' || phase === 'right' || phase === 'closer' || phase === 'find' || phase === 'found'
  return (
    <div className="screen">
      <SceneView hero={hero} place={scene.place} time={scene.timeOfDay} sceneId={phase === 'intro' || phase === 'outro' ? phase : scene.id} moment={moment} shot={shot} heroFace={heroFace} friendFace={friendFace}>
        {pointer && <span className={`pointer at-${pointer} ${hero}`} />}
        {phase === 'make' && settings.cameraPreview && <CameraPreview />}
        <button className="corner" aria-label={UI.sticker.home} onClick={onHome}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 11.5 12 4l8 7.5M6.5 10v9h11v-9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <ol className="dots" aria-hidden="true">
          {scenes.map((s, i) => (
            <li key={s.id} className={i < index ? 'past' : i === index ? 'now' : ''} />
          ))}
        </ol>
      </SceneView>
      <div className="panel">
        <Caption />
        {showCards && (
          <div className={`cards n${cards.length} ${phase === 'closer' ? 'resting' : ''}`}>
            {cards.map((e) => (
              <FaceCard
                key={e}
                src={pics?.[e]}
                label={STORY.emotions[e].label}
                state={(phase === 'right' || phase === 'found') && e === emotion ? 'sparkle' : phase === 'find' && e === emotion ? 'pulse' : undefined}
                onTap={phase === 'guess' || phase === 'find' ? () => onCard(e) : undefined}
              />
            ))}
          </div>
        )}
        {phase === 'guess' && (
          <div className="buttons">
            <button className="btn quiet" onClick={() => (setTelling(telling + 1), setPhase('story'))}>
              {UI.storyControls.hearAgain}
            </button>
          </div>
        )}
        {phase === 'make' && (
          <MakeFace
            hero={hero}
            emotion={emotion}
            onDone={(r) => {
              result.current = r
              if (r === 'made') chime()
              setPhase('after')
            }}
          />
        )}
        {phase === 'sticker' && (
          <div className="sticker-earned">
            <Sticker id={scene.sticker.id} size={132} />
            <button className="btn" onClick={goNext}>
              {UI.storyControls.next}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
