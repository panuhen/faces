import { useSaved } from '../game/settings'
import { UI } from '../game/story'
import { speak } from '../game/speech'
import { Sticker } from '../ui/Sticker'
import { tap } from '../ui/sound'

/** Earned stickers only, no empty slots (an empty slot can read as "missing"). */
export function Book({ onAgain, onHome }: { onAgain: () => void; onHome: () => void }) {
  const { stickers } = useSaved()
  return (
    <div className="screen book">
      <h2>{UI.sticker.bookTitle}</h2>
      <div className="book-grid">
        {stickers.map((s, i) => (
          <button
            key={i}
            className="book-sticker"
            aria-label={s.label}
            onClick={() => {
              tap()
              void speak(s.label)
            }}
          >
            <Sticker id={s.id} size={88} />
          </button>
        ))}
      </div>
      <div className="buttons">
        <button className="btn quiet" onClick={onHome}>
          {UI.sticker.home}
        </button>
        <button className="btn" onClick={onAgain}>
          {UI.sticker.playAgain}
        </button>
      </div>
    </div>
  )
}
