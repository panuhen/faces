import { useState } from 'react'
import { store, useSaved } from '../game/settings'
import { STORY, UI } from '../game/story'
import { CHARACTERS, type CharacterId } from '../rig/characters'
import { useScript } from '../ui/narrator'
import { tap } from '../ui/sound'
import { Caption, Face } from '../ui/widgets'

/** "Who do you want to play with today?" */
export function Pick({ onDone }: { onDone: () => void }) {
  const saved = useSaved()
  const [chosen, setChosen] = useState<CharacterId | null>(saved.character)
  const [said, setSaid] = useState(0)

  useScript(
    async (s) => {
      if (said === 0) await s.say(UI.characterPick.prompt)
      else if (chosen) await s.say(STORY.characters.find((c) => c.id === chosen)!.pickLine)
    },
    [said],
  )

  return (
    <div className="screen pick">
      <Caption />
      <div className="pick-row">
        {CHARACTERS.map((id) => (
          <button
            key={id}
            className={id === chosen ? 'pick-card on' : 'pick-card'}
            onClick={() => {
              tap()
              setChosen(id)
              setSaid(said + 1)
            }}
          >
            <Face character={id} expression={id === chosen ? 'happy' : 'neutral'} />
            <span>{STORY.characters.find((c) => c.id === id)!.name}</span>
          </button>
        ))}
      </div>
      <div className="buttons">
        <button
          className="btn big"
          disabled={!chosen}
          onClick={() => {
            store.set({ character: chosen })
            onDone()
          }}
        >
          {UI.characterPick.confirm}
        </button>
      </div>
    </div>
  )
}
