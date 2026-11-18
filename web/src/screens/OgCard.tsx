import { useMemo } from 'react'
import { PRESETS, scaled } from '../rig/features'
import { SceneView } from '../scene/SceneView'

/**
 * Dev view for the link preview picture (public/og.png, 1200 x 630).
 * Open ?og at a 1200 x 630 window and take a screenshot.
 */
export function OgCard() {
  const smile = useMemo(() => scaled(PRESETS.happy, 0.8), [])
  return (
    <div className="og">
      <div className="og-band">
        <h1>
          Face
          <br />
          Feelings
        </h1>
        <p>A gentle game for learning six feelings with Miso and Sam</p>
      </div>
      <div className="og-picture">
        <SceneView hero="miso" place="park" time="morning" sceneId="og" shot="duo" heroFace={smile} friendFace={smile} />
      </div>
    </div>
  )
}
