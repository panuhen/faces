import { useMemo } from 'react'
import { tracker } from '../face/tracker'
import { useSaved } from '../game/settings'
import { UI } from '../game/story'
import { PRESETS, scaled } from '../rig/features'
import { SceneView } from '../scene/SceneView'
import { Gear, HoldButton } from '../ui/widgets'

export type Mode = 'story' | 'mirror' | 'practice'

export function Home({ onMode, onSettings }: { onMode: (m: Mode) => void; onSettings: () => void }) {
  const { character } = useSaved()
  const smile = useMemo(() => scaled(PRESETS.happy, 0.4), [])
  // without a camera there is nothing for the mirror to copy
  const mirror = tracker.state !== 'denied' && tracker.state !== 'failed'
  return (
    <div className="screen home">
      <SceneView hero={character ?? 'miso'} place="park" time="morning" sceneId="home" heroFace={smile}>
        <h1 className="title">{UI.appTitle}</h1>
        <HoldButton label="Settings" hint={UI.adultGate.label} onHeld={onSettings}>
          <Gear />
        </HoldButton>
      </SceneView>
      <div className="panel">
        <div className="modes">
          <button className="btn big" onClick={() => onMode('story')}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 5.5c3-1.2 5.5-1 8 .8 2.5-1.8 5-2 8-.8v13c-3-1.2-5.5-1-8 .8-2.5-1.8-5-2-8-.8zM12 6.300v13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
            </svg>
            {UI.home.story}
          </button>
          {mirror && (
            <button className="btn big second" onClick={() => onMode('mirror')}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <ellipse cx="12" cy="9.5" rx="6" ry="7" fill="none" stroke="currentColor" strokeWidth="2.2" />
                <path d="M12 16.500V21M8.5 21h7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
              {UI.home.mirror}
            </button>
          )}
          <button className="btn big second" onClick={() => onMode('practice')}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
              <path d="M8.5 14c1 1.6 2.2 2.3 3.5 2.300s2.5-.7 3.5-2.3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="9" cy="10" r="1.2" fill="currentColor" />
              <circle cx="15" cy="10" r="1.2" fill="currentColor" />
            </svg>
            {UI.home.practice}
          </button>
        </div>
        <p className="privacy">
          {UI.home.privacyShort}
          <br />
          {UI.home.credits}
          <br />
          {UI.home.openSource}{' '}
          <a href={UI.home.repoUrl} target="_blank" rel="noopener noreferrer">
            {UI.home.sourceLink}
          </a>
        </p>
      </div>
    </div>
  )
}
