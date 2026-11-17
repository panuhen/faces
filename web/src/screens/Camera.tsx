import { useEffect, useRef, useState } from 'react'
import { tracker } from '../face/tracker'
import { UI } from '../game/story'
import { useScript } from '../ui/narrator'

/**
 * Explains the camera to the grown-up before the browser asks. If the camera
 * is refused or does not work, the game goes on without it.
 */
export function Camera({ onDone }: { onDone: () => void }) {
  const [state, setState] = useState<'ask' | 'starting' | 'denied'>('ask')

  useScript(
    async (s) => {
      if (state === 'ask') await s.say(UI.camera.askPermission[0])
      if (state === 'denied') await s.sayAll(UI.camera.denied)
    },
    [state],
  )

  const left = useRef(false) // leave this screen only once
  const start = async () => {
    setState('starting')
    const result = await tracker.start()
    if (result !== 'on') return setState('denied')
    if (left.current) return
    left.current = true
    onDone()
  }

  // The explanation is for the first time only: if the browser already has
  // permission (or the camera is simulated), start straight away.
  useEffect(() => {
    if (tracker.simulated) return void start()
    navigator.permissions
      ?.query({ name: 'camera' as PermissionName })
      .then((p) => {
        if (p.state === 'granted') void start()
      })
      .catch(() => undefined)
    // runs once when the screen opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="screen notice">
      <svg className="notice-icon" viewBox="0 0 48 48" aria-hidden="true">
        <rect x="6" y="14" width="36" height="24" rx="6" fill="none" stroke="currentColor" strokeWidth="3" />
        <circle cx="24" cy="26" r="7" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M17 14l3-5h8l3 5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      </svg>
      {state === 'denied' ? (
        <>
          {UI.camera.denied.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <button className="btn big" onClick={onDone}>
            {UI.storyControls.next}
          </button>
        </>
      ) : (
        <>
          {UI.camera.askPermission.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <button className="btn big" disabled={state === 'starting'} onClick={() => void start()}>
            {UI.storyControls.next}
          </button>
        </>
      )}
    </div>
  )
}
