// Records the narrator's lines with ElevenLabs into public/voice/<id>.mp3,
// then writes public/voice/index.json (text -> file) for the game.
// Reads design/voice_lines.csv (make it with voice-lines.mjs). Main-game lines
// go first, extra-scene lines after. Lines that already have a file are
// skipped, so a stopped run (e.g. out of credits) continues where it stopped.
//   ELEVENLABS_API_KEY=... node scripts/voice-record.mjs <voice-id> [--only "text part"] [--limit n] [--model id]
//   node scripts/voice-record.mjs --index    (only rewrite index.json)
// The key is read from the environment and never written to a file.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined)
const key = process.env.ELEVENLABS_API_KEY
const voice = args[0]
const model = opt('--model') ?? 'eleven_multilingual_v2'
const only = opt('--only')
const limit = Number(opt('--limit') ?? Infinity)

const rows = readFileSync('../design/voice_lines.csv', 'utf8')
  .trim()
  .split('\n')
  .slice(1)
  .map((line) => {
    const [id, part] = line.split(',', 2)
    const text = line.slice(id.length + part.length + 3, -1).replaceAll('""', '"')
    return { id, part, text }
  })
  .sort((a, b) => (a.part === b.part ? 0 : a.part === 'main' ? -1 : 1))

const file = (r) => `public/voice/${r.id}.mp3`

function writeIndex() {
  const index = {}
  for (const r of rows) if (existsSync(file(r))) index[r.text] = `${r.id}.mp3`
  writeFileSync('public/voice/index.json', JSON.stringify(index, null, 1) + '\n')
  return Object.keys(index).length
}

mkdirSync('public/voice', { recursive: true })
if (!args.includes('--index')) {
  if (!key || !voice) {
    console.error('Set ELEVENLABS_API_KEY and give a voice id.')
    process.exit(1)
  }
  let made = 0
  let chars = 0
  for (const row of rows) {
    if (existsSync(file(row)) || (only && !row.text.includes(only))) continue
    if (made >= limit) break
    let res
    for (let attempt = 0; attempt < 3; attempt++) {
      res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_64`, {
        method: 'POST',
        headers: { 'xi-api-key': key, 'content-type': 'application/json' },
        body: JSON.stringify({ text: row.text, model_id: model, voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: 0.92 } }),
      })
      if (res.status !== 429 && res.status < 500) break
      await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)))
    }
    if (!res.ok) {
      console.error(`Stopped at "${row.text}": ${res.status} ${(await res.text()).slice(0, 300)}`)
      break
    }
    writeFileSync(file(row), Buffer.from(await res.arrayBuffer()))
    made++
    chars += row.text.length
    console.log(`${row.part}  ${row.id}  ${row.text}`)
  }
  console.log(`\nRecorded ${made} lines (${chars} characters).`)
}
const have = writeIndex()
const left = rows.filter((r) => !existsSync(file(r)))
console.log(`${have} lines have a recording. Still without: ${left.filter((r) => r.part === 'main').length} main, ${left.filter((r) => r.part === 'extra').length} extra (${left.reduce((n, r) => n + r.text.length, 0)} characters).`)
