import { useState } from 'react'
import type { Shapes } from '../face/score'
import { tracker } from '../face/tracker'
import { store } from '../game/settings'
import { fill, UI } from '../game/story'
import type { CharacterId } from '../rig/characters'
import { SceneView } from '../scene/SceneView'
import { useScript } from '../ui/narrator'
import { CameraPreview, Caption } from '../ui/widgets'
import { useSaved } from '../game/settings'

/** Samples the child's face for 3 s; false if the face was mostly out of view. */
async function sample(pause: (ms: number) => Promise<void>, onCount: (n: string) => void): Promise<Shapes | null> {
  const sum: Shapes = {}
  let seen = 0
  let total = 0
  for (let step = 0; step < 30; step++) {
    if (step % 10 === 0) onCount(UI.calibration.countdown[step / 10])
    await pause(100)
    total++
    const f = tracker.frame
    if (!f.present) continue
    seen++
    for (const [k, v] of Object.entries(f.shapes)) sum[k] = (sum[k] ?? 0) + v
  }
  if (seen < total * 0.6) return null
  for (const k of Object.keys(sum)) sum[k] /= seen
  return sum
}

/** "Show me your calm face." The calm values become the baseline for the meter. */
export function Calibrate({ hero, onDone }: { hero: CharacterId; onDone: () => void }) {
  const { settings } = useSaved()
  const [count, setCount] = useState('')
  const [hint, setHint] = useState('')

  useScript(async (s) => {
    await s.sayAll(UI.calibration.prompt.map((l) => fill(l, hero)))
    let baseline: Shapes | null = null
    for (let attempt = 0; attempt < 3 && !baseline; attempt++) {
      if (attempt > 0) await s.say(UI.calibration.retry)
      const size = tracker.frame.size
      setHint(!tracker.frame.present ? '' : size < 0.2 ? UI.camera.tooFar : size > 0.8 ? UI.camera.tooClose : '')
      baseline = await sample(s.pause, setCount)
      setCount('')
    }
    // a child who cannot hold still is not blocked: without a baseline the meter uses zero
    store.set({ baseline })
    await s.say(UI.calibration.done)
    onDone()
  }, [])

  return (
    <div className="screen">
      <SceneView hero={hero} place="living_room" time="morning" sceneId="calibrate" shot="face">
        {settings.cameraPreview && <CameraPreview />}
      </SceneView>
      <div className="panel">
        <Caption />
        <p className="count">{count}</p>
        <p className="coach">{hint}</p>
      </div>
    </div>
  )
}
