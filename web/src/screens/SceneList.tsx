import { STORY } from '../game/story'

/** Dev view (?allscenes): links to every scene picture, event and comfort, and to play each scene. */
export function SceneList() {
  const all = [...STORY.scenes, ...STORY.extraScenes]
  return (
    <div className="scene-list">
      <h1>All scenes</h1>
      <p>Pictures open in the scene preview (add &amp;hero=miso to switch character, &amp;beat=0 to see the first line). "Play" runs that scene in the game.</p>
      <table>
        <tbody>
          {all.map((s, i) => (
            <tr key={s.id}>
              <td>{i < STORY.scenes.length ? i + 1 : 'extra'}</td>
              <td>{s.id}</td>
              <td>{s.emotion}</td>
              <td>{s.place}</td>
              <td>
                <a href={`?scene=${s.id}&hero=sam`}>event</a>
                {s.comfort && (
                  <>
                    {' · '}
                    <a href={`?scene=${s.id}&hero=sam&moment=comfort`}>comfort</a>
                  </>
                )}
                {' · '}
                <a href={`?scenes=${s.id}`}>play</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
