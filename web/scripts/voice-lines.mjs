// Writes every line the narrator can say, with the placeholders filled in,
// to design/voice_lines.md (to read) and design/voice_lines.csv (id, text).
// The id is the first 10 hex digits of the SHA-1 of the text, so a recorded
// file can be named <id>.mp3 and found again from the text alone.
//   node scripts/voice-lines.mjs
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

const story = JSON.parse(readFileSync('src/game/story.json', 'utf8'))
const ui = story.ui
const emotions = story.emotionOrder.map((id) => ({ id, ...story.emotions[id] }))
const scenes = [...story.scenes, ...story.extraScenes]
const id = (text) => createHash('sha1').update(text).digest('hex').slice(0, 10)

const seen = new Map() // text -> id, in first-seen order
const extra = new Set() // lines used only in extra scenes
const sections = []
let current

function section(title, isExtra = false) {
  current = { title, lines: [], isExtra }
  sections.push(current)
}
function add(text) {
  if (!seen.has(text)) {
    seen.set(text, id(text))
    if (current.isExtra) extra.add(text)
  }
  if (!current.lines.includes(text)) current.lines.push(text)
}
/** Fills the placeholders; a line with {word} or {sticker} is written once per value. */
function expand(raw, hero) {
  const friend = story.characters.find((c) => c.id === hero.friendId)
  let lines = [raw.replaceAll('{name}', hero.name).replaceAll('{friend}', friend.name).replaceAll('{hand}', hero.words.hand)]
  if (raw.includes('{word}')) lines = lines.flatMap((l) => emotions.map((e) => l.replaceAll('{word}', e.word)))
  if (raw.includes('{sticker}')) lines = lines.flatMap((l) => scenes.map((s) => l.replaceAll('{sticker}', s.sticker.label)))
  return lines
}
const all = (list, hero) => list.forEach((raw) => expand(raw, hero).forEach(add))

const shared = { name: '', friendId: story.characters[0].id, words: { hand: '' } }
section('Shared lines (same for both characters)')
all(
  [
    ui.characterPick.prompt,
    ...story.characters.map((c) => c.pickLine),
    ...ui.camera.askPermission,
    ...ui.camera.denied,
    ...ui.camera.faceLost,
    ui.camera.tooDark,
    ui.camera.tooFar,
    ui.camera.tooClose,
    ui.calibration.prompt[0],
    ui.calibration.done,
    ui.calibration.retry,
    ui.guess.lookCloser.open[0],
    ui.guess.lookCloser.point,
    ui.guess.lookCloser.tapPrompt,
    ...ui.make.meterTiers.flatMap((t) => t.lines).filter((l) => !l.includes('{name}')),
    ui.make.success[2],
    ...ui.make.niceTry,
    ...ui.make.skip.spoken,
    ui.make.noCamera.after,
    ...ui.sticker.earned,
    ui.sticker.bookIntro,
    ...ui.mirror.ideas,
    ui.practice.prompt,
    ...ui.practice.success,
  ],
  shared,
)
section('Face hints and coach lines')
for (const e of emotions) all([e.label, ...e.hint, ...e.coach.map((c) => c.text)], shared)
section('Sticker names (spoken when a sticker is tapped)')
all(scenes.map((s) => s.sticker.label), shared)

// Game lines spoken in Story, Mirror and Practice. The ones without a name in
// them are the same for both characters and go to the shared section.
const gameLines = [
  ...ui.calibration.prompt,
  ...ui.intro,
  ...ui.outro,
  ui.guess.prompt,
  ...ui.guess.celebrate,
  ...ui.guess.lookCloser.open,
  ui.guess.lookCloser.reveal,
  ui.guess.lookCloser.found,
  ...ui.make.meterTiers.flatMap((t) => t.lines),
  ...ui.make.success,
  ui.make.noCamera.prompt,
  ui.level1.show,
  ui.level1.reset,
  ui.mirror.intro,
  ...emotions.map((e) => e.makePrompt),
]
const hasName = (l) => /\{(name|friend|hand)\}/.test(l)
section('Shared game lines')
all(gameLines.filter((l) => !hasName(l)), shared)

for (const hero of story.characters) {
  const named = (list) => list.filter(hasName)
  section(`${hero.name}: game lines`)
  all(
    named([
      ...ui.calibration.prompt,
      ...ui.intro,
      ...ui.outro,
      ui.guess.prompt,
      ...ui.guess.celebrate,
      ...ui.guess.lookCloser.open,
      ui.guess.lookCloser.reveal,
      ui.guess.lookCloser.found,
      ...ui.make.meterTiers.flatMap((t) => t.lines),
      ...ui.make.success,
      ui.make.noCamera.prompt,
      ui.level1.show,
      ui.level1.reset,
      ui.mirror.intro,
      ...emotions.map((e) => e.makePrompt),
    ]),
    hero,
  )
  section(`${hero.name}: the day`)
  for (const s of story.scenes) all([...s.text, ...(s.comfort ?? [])], hero)
  section(`${hero.name}: extra scenes`, true)
  for (const s of story.extraScenes) all([...s.text, ...(s.comfort ?? [])], hero)
}
// lines without a name in the story scenes were added under a character; that is fine, ids are by text

const md = ['# Face Feelings: voice lines', '', `${seen.size} different lines. Made by \`web/scripts/voice-lines.mjs\` from \`story.json\`; do not edit by hand.`, 'Record each line once. Name the file by its id (for example `' + [...seen.values()][0] + '.mp3`).', '']
for (const s of sections) {
  md.push(`## ${s.title}`, '', '| id | line |', '|---|---|')
  for (const l of s.lines) md.push(`| \`${seen.get(l)}\` | ${l} |`)
  md.push('')
}
writeFileSync('../design/voice_lines.md', md.join('\n'))
// part: 'main' for everything in the normal game, 'extra' for lines only the extra scenes use
const csv = ['id,part,text', ...[...seen].map(([text, i]) => `${i},${extra.has(text) ? 'extra' : 'main'},"${text.replaceAll('"', '""')}"`)]
writeFileSync('../design/voice_lines.csv', csv.join('\n') + '\n')
console.log(`${seen.size} lines`)
