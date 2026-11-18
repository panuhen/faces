# Face Feelings

A mobile web game that helps children, mainly autistic children aged about 4 to 10, learn to recognise six emotions: happy, sad, surprised, angry, scared and disgusted.

The child picks a character, Miso the cat or Sam the kid, and follows them through one day. After each short situation the child taps the face that matches how the character feels, then makes that face. The front camera follows the child's face with MediaPipe Face Landmarker and fills a gentle "getting closer" meter.

The game never penalises the child, every scene gives a sticker, and the day always ends with a happy party. It measures face movements only and never tells the child what they feel.

This is a showcase demo, not a medical or therapy product.

## Privacy

Everything runs on the phone. The camera picture is read frame by frame in the browser and thrown away; nothing is recorded or uploaded. There are no accounts. The game stores only settings, the calm-face measurement and the sticker book, in the browser's local storage. The MediaPipe model and runtime are served from the game's own origin, not a CDN.

## Run it locally

Needs Node 24.

```sh
cd web
npm install
npm run dev            # http://localhost:5173
```

The camera works on `localhost` and on HTTPS only. To test on a phone, use a deployed HTTPS copy.

Useful URL parameters:

| Parameter | What it does |
|---|---|
| `?sim=1` | Fake camera: a face that slowly makes the target expression. For testing without a camera. |
| `?scenes=red_balloon,balloon_away` | Play only these scenes, in this order. |
| `?c=sam` | Character gallery: all expressions plus feature sliders. Also `&style=subtle`, `&pose=sad`, `&yaw=90`, `&size=1000`. |
| `?compare` | Both characters, all expressions side by side. |
| `?scene=balloon_away&moment=comfort&hero=miso` | One scene picture, without the game. Also `&shot=duo|face`, `&face=sad`. |

Grown-up settings open with a 3-second press on the gear icon on the home screen.

## Project layout

| Path | What is there |
|---|---|
| `design/GAME_DESIGN.md` | The game design. Part A is decided by the owner, Part B is proposals, Part C open questions. |
| `web/src/game/story.json` | All story text, UI copy, emotions, hints and settings. `design/story.json` links to it. |
| `web/src/game/` | Story data, settings and saved data, session scene picker, read-aloud. |
| `web/src/face/` | Camera and MediaPipe tracking, face scoring against the calm baseline, mirror mapping. |
| `web/src/scene/` | Scene pictures (layered SVG with parallax) and the 3D characters drawn over them. Only the park is drawn so far; other places are simple stand-ins. |
| `web/src/three/` | Cel-shaded character rendering (three.js, toon materials, outlines) and the face-card pictures. |
| `web/src/rig/` | Face features and expression presets, shared by the characters and the camera checks. |
| `web/src/screens/`, `web/src/ui/` | Game screens and shared pieces (cards, meter, narrator, stickers). |
| `web/public/characters/` | Character models (GLB), built by Blender. |
| `web/public/voice/` | Recorded narrator lines (MP3) and `index.json` (text to file). |
| `web/public/models/` | MediaPipe Face Landmarker model. |
| `blender/build_character.py` | Builds the characters from code. |
| `concepts/`, `review/`, `codex/` | Concept art, review renders, and task notes for Codex runs. |

## Characters

Both characters are built headless in Blender from one script, on one shared skeleton. Expressions are bone poses exported as additive animation clips named like ARKit/MediaPipe blendshapes (`browInnerUp`, `mouthSmile_L`, ...).

```sh
blender -b --factory-startup --python blender/build_character.py -- sam    # or miso
```

This writes `web/public/characters/<name>.glb`. Check the result in the gallery (`?c=sam`).

## Narrator voice

Lines with a recording play as audio; any other line uses the phone's built-in voice. The recordings use the ElevenLabs voice "Jessica", made on the ElevenLabs free plan: non-commercial use only, with a credit to elevenlabs.io (shown on the home and settings screens).

After changing text in `story.json`:

```sh
cd web
node scripts/voice-lines.mjs        # updates design/voice_lines.md and .csv
ELEVENLABS_API_KEY=... node scripts/voice-record.mjs cgSgspJ2msm6clMCkdW9
```

The recording script records only lines that have no file yet (a changed line counts as new), and stops cleanly when the credits run out; run it again to continue. The API key is read from the environment and never written to a file.

## Deploy

The `Dockerfile` builds the web app and serves it with nginx on port 80. No environment variables or database.

```sh
docker build -t faces .
docker run -p 8080:80 faces
```

Live at https://faces.rapu.ai, on Coolify at `faces.rapu.ai` (Dockerfile build pack, branch `main`). Cloudflare provides HTTPS, which the camera needs.

## License

The code, characters, scene art and story text are under the [MIT License](LICENSE).

Not covered by the MIT License:

- **Narrator recordings** (`web/public/voice/*.mp3`): made with ElevenLabs on the free plan. They follow the ElevenLabs terms: non-commercial use only, with a credit to elevenlabs.io. For commercial use, record them again on a paid plan, or delete them; the game then uses the phone's built-in voice.
- **MediaPipe** Face Landmarker model and runtime (`web/public/models/`, the `@mediapipe/tasks-vision` package): Apache License 2.0, by Google.

