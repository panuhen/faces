import { useState } from 'react'
import { tracker } from '../face/tracker'
import { store, useSaved, type Settings as SettingsData } from '../game/settings'
import { STORY, UI, type SettingDef } from '../game/story'
import type { Emotion } from '../rig/features'

const BUTTONS = { clear: 'Clear saved data', confirm: 'Yes, delete everything', cancel: 'Keep it', back: 'Back', yes: 'On', no: 'Off' }

function optionLabel(def: SettingDef, value: unknown): string {
  if (typeof value === 'boolean') return value ? BUTTONS.yes : BUTTONS.no
  const text = String(value)
  const shown = def.unit && typeof value === 'number' ? `${text} ${def.unit}` : text
  return shown.charAt(0).toUpperCase() + shown.slice(1)
}

/** Grown-ups' settings. Labels, options and help texts come from story.json. */
export function Settings({ onBack, onRecalibrate }: { onBack: () => void; onRecalibrate: () => void }) {
  const { settings } = useSaved()
  const [confirming, setConfirming] = useState(false)

  const toggleEmotion = (e: Emotion) => {
    const on = settings.emotions.includes(e)
    const next = on ? settings.emotions.filter((x) => x !== e) : STORY.emotionOrder.filter((x) => x === e || settings.emotions.includes(x))
    store.setSettings({ emotions: next })
  }

  return (
    <div className="screen settings">
      <header>
        <button className="btn quiet" onClick={onBack}>
          {BUTTONS.back}
        </button>
        <h2>Settings</h2>
      </header>
      <div className="settings-list">
        {STORY.settings.map((def) => {
          const key = def.id as keyof SettingsData
          return (
            <section key={def.id}>
              <h3>{def.label}</h3>
              <p>{def.help}</p>
              {def.id === 'emotions' ? (
                <div className="options">
                  {STORY.emotionOrder.map((e) => (
                    <button key={e} className={settings.emotions.includes(e) ? 'on' : ''} onClick={() => toggleEmotion(e)}>
                      {STORY.emotions[e].label}
                    </button>
                  ))}
                </div>
              ) : def.id === 'recalibrate' ? (
                <button className="btn quiet" disabled={tracker.state === 'denied' || tracker.state === 'failed'} onClick={onRecalibrate}>
                  {def.label}
                </button>
              ) : def.id === 'clearData' ? (
                confirming ? (
                  <div className="options">
                    <button
                      onClick={() => {
                        store.clear()
                        setConfirming(false)
                      }}
                    >
                      {BUTTONS.confirm}
                    </button>
                    <button onClick={() => setConfirming(false)}>{BUTTONS.cancel}</button>
                  </div>
                ) : (
                  <button className="btn quiet" onClick={() => setConfirming(true)}>
                    {def.label}
                  </button>
                )
              ) : Array.isArray(def.options) ? (
                <div className="options">
                  {(def.options as unknown[]).map((o) => (
                    <button
                      key={String(o)}
                      className={settings[key] === o ? 'on' : ''}
                      disabled={def.id === 'cards' && (o as number) > settings.emotions.length}
                      onClick={() => store.setSettings({ [key]: o } as Partial<SettingsData>)}
                    >
                      {optionLabel(def, o)}
                    </button>
                  ))}
                </div>
              ) : null}
            </section>
          )
        })}
        <section>
          <h3>Privacy</h3>
          {UI.privacyNote.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </section>
        <section>
          <h3>Credits</h3>
          <p>{UI.home.credits}</p>
        </section>
      </div>
    </div>
  )
}
