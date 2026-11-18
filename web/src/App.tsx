import { useEffect, useState } from 'react'
import { tracker } from './face/tracker'
import { useSaved } from './game/settings'
import { stopSpeech } from './game/speech'
import { Book } from './screens/Book'
import { Calibrate } from './screens/Calibrate'
import { Camera } from './screens/Camera'
import { Compare } from './screens/Compare'
import { Gallery } from './screens/Gallery'
import { Home, type Mode } from './screens/Home'
import { Mirror } from './screens/Mirror'
import { Pick } from './screens/Pick'
import { Practice } from './screens/Practice'
import { OgCard } from './screens/OgCard'
import { SceneList } from './screens/SceneList'
import { ScenePreview } from './screens/ScenePreview'
import { Settings } from './screens/Settings'
import { Story } from './screens/Story'
import { clearCaption } from './ui/narrator'

type Route =
  | { at: 'home' }
  | { at: 'pick' | 'camera' | 'calibrate'; then: Mode | 'settings' }
  | { at: Mode; run: number }
  | { at: 'book' }
  | { at: 'settings' }

// "Session" is one app launch: the calm face is measured once, and again from settings.
let calibrated = false
let cameraAsked = false

function Game() {
  const { character } = useSaved()
  const [route, setRoute] = useState<Route>({ at: 'home' })

  // every screen starts quiet
  useEffect(() => {
    stopSpeech()
    clearCaption()
  }, [route])

  /** Walks the steps before a mode: character pick, camera, calm face. */
  const enter = (then: Mode | 'settings', from: 'home' | 'pick' | 'camera' | 'calibrate') => {
    if (from === 'home' && (then === 'story' || !character)) return setRoute({ at: 'pick', then })
    if (!cameraAsked && tracker.state === 'off') {
      cameraAsked = true
      return setRoute({ at: 'camera', then })
    }
    if (tracker.state === 'on' && !calibrated) {
      calibrated = true
      return setRoute({ at: 'calibrate', then })
    }
    if (then === 'mirror' && tracker.state !== 'on') return setRoute({ at: 'home' })
    setRoute(then === 'settings' ? { at: 'settings' } : { at: then, run: Date.now() })
  }

  const home = () => setRoute({ at: 'home' })
  const hero = character ?? 'miso'
  switch (route.at) {
    case 'home':
      return <Home onMode={(m) => enter(m, 'home')} onSettings={() => setRoute({ at: 'settings' })} />
    case 'pick':
      return <Pick onDone={() => enter(route.then, 'pick')} />
    case 'camera':
      return <Camera onDone={() => enter(route.then, 'camera')} />
    case 'calibrate':
      return <Calibrate hero={hero} onDone={() => enter(route.then, 'calibrate')} />
    case 'story':
      return <Story key={route.run} hero={hero} onEnd={() => setRoute({ at: 'book' })} onHome={home} />
    case 'mirror':
      return <Mirror hero={hero} onDone={home} />
    case 'practice':
      return <Practice hero={hero} onDone={home} />
    case 'book':
      return <Book onAgain={() => enter('story', 'home')} onHome={home} />
    case 'settings':
      return (
        <Settings
          onBack={home}
          onRecalibrate={() => {
            calibrated = false
            cameraAsked = false
            enter('settings', 'pick')
          }}
        />
      )
  }
}

export function App() {
  const params = new URLSearchParams(window.location.search)
  // dev views
  const c = params.get('c')
  if (c) return <Gallery character={c} />
  if (params.has('compare')) return <Compare />
  if (params.has('scene')) return <ScenePreview />
  if (params.has('og')) return <OgCard />
  if (params.has('allscenes')) return <SceneList />
  return (
    <div className="app">
      <Game />
    </div>
  )
}
