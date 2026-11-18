# Face Feelings: game design

This document describes the game as it is built, the rules behind it, and what is still open. All story text, UI copy and settings live in [`story.json`](story.json) (a link to `web/src/game/story.json`, which the app loads). The research behind the design is in [`research/`](../research/).

## 1. Purpose

Face Feelings is a mobile web game that helps children with special needs, mainly autistic children aged about 4 to 10, learn to recognise six emotions: happy, sad, surprised, angry, scared and disgusted.

A cartoon character, Miso the cat or Sam the kid, goes through one day. The narrator tells a short situation, the child taps the face that matches how the character feels, and then makes that face. The front camera follows the child's face and fills a gentle "getting closer" meter.

The game trains **recognising** emotions in others. Making the face is play that supports it, not a skill to pass. It is a showcase demo, not a medical or therapy product.

## 2. Principles

### The child's experience

1. The child is never penalised. No failure sounds, no red marks, no "wrong".
2. If the child taps a different card than the target, the game says "Let's look closer", shows the face and points at the brows and mouth. The game always continues.
3. If a time limit is set and runs out, the game says "Nice try!" and continues.
4. A Skip button is always available.
5. Every scene gives a sticker, whatever happens in it.
6. The game never tells the child what they feel. Feedback is about face parts ("Lift the middle of your eyebrows"), never "you look sad". The game checks expressions against a target; it does not infer emotions (see [research/face-tracking.md](../research/face-tracking.md)).
7. Every non-happy scene ends with a short comfort part, so no scene leaves the child in a bad feeling.
8. The day always ends with a happy finale. Shorter sessions pick fewer scenes; the finale is always last.
9. The same place appears with different outcomes, so the child cannot learn shortcuts like "balloon means happy".

### Language and content

- English (US spelling), short and simple sentences for ages 4 to 10, written for the ear: most text is read aloud.
- No sarcasm, idioms or figurative language; autistic children may take them literally.
- Gentle content: no injuries, no lost parents, no bullying. The one unkind act (the tower knocked over on purpose) ends with an apology.
- Scene text never names the emotion, so the child works it out from the situation (needed for difficulty level 3).
- Celebration and reveal lines name the character's feeling, never the child's.
- No he/she: `{name}` is repeated instead. "They" only for groups.
- No all-caps words: some speech engines spell them letter by letter.

## 3. Characters

The child picks one of two characters. Both are cel-shaded 3D models built in Blender from code, on one shared skeleton, with chibi proportions (big head, small body).

- **Miso**: a cartoon cat with a flat, front-facing face and tabby marks that work as eyebrows.
- **Sam**: a cartoon kid, gender-neutral. "Sam" or they/them, never he/she.

The character the child did not pick is the **friend** (`{friend}` in the script). The story has no other people: the friend plays every other role, such as sharing a balloon, knocking the tower over and saying sorry, or owning the dog.

Faces show feelings only with the parts the camera reads on the child (brows, eyes, mouth, nose), so copying the character's face is close to one-to-one. Each expression has three strengths (face style big, medium, subtle).

## 4. Emotions and what the camera checks

| Emotion | Face hint (read to the child) | Camera checks |
|---|---|---|
| Happy | Mouth corners up in a big smile; cheeks go up | mouth corners up, cheeks up |
| Sad | Eyebrows up in the middle; mouth corners down | inner brows up, mouth corners down |
| Surprised | Eyebrows up high, eyes wide; mouth opens | brows up, eyes wide, jaw open |
| Angry | Eyebrows down and together; lips press tight | brows down, lips pressed |
| Scared | Eyebrows up, eyes wide; mouth stretches sideways | brows up, eyes wide, mouth stretched |
| Disgusted | Nose wrinkles; top lip goes up | nose wrinkle, upper lip up |

Introduction order: happy, sad, surprised, angry, scared, disgusted. Practice, the settings advice and the short-session picker use this order.

The exact blendshape checks and their limits are in [research/face-tracking.md](../research/face-tracking.md) and `web/src/face/score.ts`.

## 5. Screens

```
Home ──► Character pick ──► Camera notice (first time) ──► Calibration ──► Intro
  │                                                                        │
  │                                                                        ▼
  │                                                       Scenes (session length − 1)
  │                                                                        │
  │                                                                        ▼
  │                                                  Finale ──► Outro ──► Sticker book
  │◄──────────────────────── Play again / Home ◄──────────────────────────────┘
  ├──► Mirror    (character pick and calibration first if needed)
  └──► Practice  (same)
```

- **Home**: Story, Mirror and Practice buttons, the last chosen character standing in the park, a short privacy line, and a gear icon for grown-ups. The gear needs a 3-second press; a ring fills while it is held.
- **Character pick**: "Who do you want to play with today?" Tapping a character smiles and says its line ("This is Miso."); "Let's go!" confirms. The choice is remembered.
- **Camera notice**: shown once, before the browser's own permission prompt, and addressed to grown-ups. If the camera is refused or fails, the game runs without it: the make-face step becomes "make the face, then tap Done", and Mirror is hidden.
- **Calibration**: "Show me your calm face." A 3-2-1 count samples the child's face for 3 seconds; this calm face is the baseline for the meter. If the face is out of view, it tries again; after three tries it continues without a baseline, so a child who cannot hold still is never blocked. It runs once per app launch, and again from settings.
- **Intro**: "Good morning! This is {name}." / "Let's watch {name}'s day." / "Find out how {name} feels. Then make the same face!"
- **Outro and sticker book**: "What a big day for {name}!" ... "Good night, {name}!" The book shows earned stickers only, with no empty slots (an empty slot can read as "missing"); tapping one reads its name. Stickers collect across sessions until saved data is cleared.
- **Mirror**: the character copies the child's face live. No emotion words at all; every few seconds the narrator suggests a face-part idea ("Try lifting your eyebrows up high."). No score, no stickers.
- **Practice**: pick one face, the character shows it and the hints are read, then the normal make-face step. No stickers.

## 6. The scene loop

1. **Story.** The scene picture with the character in it; each story line is shown and read. At level 2 the character shows the feeling; at levels 3 and 4 the face stays calm. The friend walks into the picture when the text first names them.
2. **Guess.** "How does {name} feel?" The child taps one of 2 to 6 face cards (the target plus random other enabled emotions, in random order). "Hear again" replays the story.
   - **Target card**: a soft chime and a celebration line, such as "Yes! {name} feels {word}."
   - **Another card**: the same tap sound as any card. "Let's look closer." The view zooms in on the character's face, which shows the target feeling; a glowing pointer moves to the brows, then the mouth, while the hints are read. "This is {name}'s {word} face." Then the target card pulses: "Can you find the {word} face?" If there is no tap within 6 seconds, the game goes on by itself. The flow never says which card was tapped and never uses "no" or "not quite".
3. **Make the face.** "Can you show {name}'s {word} face?" The character holds the face (always big style) and the meter fills with how close the child's face is to the target, measured against their calm face.
   - Encouragement in four tiers: "Let's try. Look at {name}'s face.", "Getting closer!", "Almost there!", "That's it! Hold it." A tier line is spoken only when the score goes up, at most once every 4 seconds; a falling score is silent.
   - Below the top tier, a coach line names the weakest face part ("Pull the corners of your mouth down."), spoken at most once every 6 seconds.
   - Success: the face stays at the top for the hold time (default 1 s). "You did it! That's {name}'s {word} face."
   - If the face is out of view for 2 seconds: "Let's find your face. Look at the phone." The time limit pauses meanwhile.
   - The time limit is off by default and never shown as a countdown.
4. **Comfort and sticker.** Non-happy scenes play their comfort lines with the comfort picture; the character's face eases to calm, then to a small smile. The sticker appears with a chime ("A sticker for your book!"), and the game moves on after a few seconds or on "Next".

### Difficulty levels

| Level | Story | Character's face in the story | Cards | Make-face target |
|---|---|---|---|---|
| 1 | No story or guess: "This is {name}'s {word} face." | the feeling, big | none | big |
| 2 (default) | yes | the feeling, at the face style setting | face style | big |
| 3 | yes | calm | face style | big |
| 4 | yes | calm | subtle | big |

At level 1, comfort lines (which refer to a story the child did not hear) are replaced by "Now {name}'s face is calm again." A fifth level with real human faces is future work.

## 7. The day

Main scenes, in day order. The finale is always the last scene of a session.

| # | Scene | Place | Emotion | Comfort |
|---|---|---|---|---|
| 1 | It snows in summer | bedroom | surprised | the sun melts the snow |
| 2 | The breakfast milk smells bad | kitchen | disgusted | the friend pours fresh juice |
| 3 | A big red balloon | park | happy | |
| 4 | The wind takes the balloon | park | sad | the friend shares one of two balloons |
| 5 | The tallest block tower | playroom | happy | |
| 6 | The friend knocks the tower over on purpose | playroom | angry | the friend says sorry; they rebuild together |
| 7 | A big dog barks loudly | park | scared | it is the friend's friendly dog, Rufus |
| 8 | A jack-in-the-box pops out | living room | surprised | the toy goes back in its box |
| 9 | A worm in the apple | garden | disgusted | the friend gives a banana |
| 10 | The cake falls on the floor | bakery | sad | the friend shares a cupcake |
| 11 | A thunderstorm | living room | scared | the friend holds {name}'s {hand} until the sun comes out |
| 12 | Party: the friend arrives with cake and balloons | garden | happy (finale) | |

Twelve extra scenes (two per emotion) fill gaps when emotions are switched off: pancakes, sprinkles, broken toy car, sandcastle, popcorn, rabbit, stuck zip, drawing interrupted, dark shed, big wave, moldy roll, seaweed. They add two places, a hallway and a beach.

### How a session picks scenes

Session lengths are short (4 scenes), medium (8) or full (12), always ending with the finale.

- **Full**: every main scene whose emotion is on, in day order, topped up with extras if emotions are off.
- **Short and medium**: walk the enabled emotions in introduction order, starting where the last session stopped, so repeated short sessions cover every emotion over time. Short sessions skip happy here, because the finale is happy. For each emotion, prefer a main scene that was not in the last session; use an extra only when no main scene fits. Medium sessions try to keep same-place pairs together (balloon 3 and 4, tower 5 and 6). The chosen scenes are sorted into day order.
- If happy is switched off, the finale is still played, as story and sticker only.
- At least two emotions must be on, and the number of cards can't exceed the number of emotions on.

## 8. Settings for grown-ups

Behind a 3-second press on the gear icon. Labels and help texts are in `story.json`.

| Setting | Options | Default |
|---|---|---|
| Emotions | any, at least 2 | all six |
| Number of cards | 2 to 6 | 3 |
| Sensitivity | low, medium, high | medium |
| Hold time | 0.5, 1, 1.5, 2 s | 1 s |
| Time limit | off, 10, 20, 30 s | off |
| Face style | big, medium, subtle | big |
| Difficulty level | 1 to 4 | 2 |
| Read aloud | on, off | on |
| Camera preview | on, off | on |
| Session length | short 4, medium 8, full 12 | short |
| Sound effects | on, soft, off | soft |
| Show detection details | on, off | off |
| Recalibrate | button | |
| Clear saved data | button, with confirm | |

Why these defaults: no time pressure (Skip covers being stuck); a short session that a young child finishes; three cards, because two is close to a coin toss and six is a lot for a beginner. Sensitivity needs testing with real children: many autistic children show smaller facial movements, so high may turn out to be the better default.

## 9. Privacy

Everything stays on the phone. The camera picture is read in the browser and thrown away; nothing is recorded, uploaded or sent. There are no accounts. The game saves only settings, the calm-face measurement, the chosen character, the sticker book and where the session picker stopped, in the browser's local storage. "Clear saved data" deletes all of it. The face-tracking model and runtime are served with the app, not from a third-party CDN.

## 10. Art and sound

### Scene pictures

- Each place is a layered SVG picture (sky, far, middle, front) with gentle parallax: layers slide in when a scene opens and follow the camera when it zooms to the face. Motion stops when the phone asks for reduced motion.
- Flat colours and dark outlines, matching the cel-shaded characters.
- Simple and uncluttered: one place, a few objects, no text.
- At most one strong colour, for the object the story is about (the red balloon).
- The friend has a calm, kind face, and never shows a stronger feeling than the main character.
- No flashing: lightning is a soft glow, never a white flash.
- Recurring places reuse the same picture, so "same place, different outcome" is visible.
- Each scene has an event picture and, for non-happy scenes, a comfort picture. Drawing notes for every scene are in `story.json` (`illustration`, `comfortIllustration`).

### Sound

- The narrator lines are recorded (ElevenLabs, voice "Jessica"); any line without a recording uses the phone's built-in voice.
- Two soft sounds made in the browser: a tap (the same for every card) and a chime (target card, face made, sticker). There is no sound for another card, a timeout or Skip.

## 11. Status

Built and playable at https://faces.rapu.ai:

- all screens and the full scene loop, levels 1 to 4, settings, calibration, Mirror and Practice
- face tracking and scoring on the device
- both characters with six expressions at three strengths
- the park, with its props and animations for the balloon scenes and Rufus the dog
- story props that move with the narration for the block tower and the dropped cake (in simple stand-in rooms)
- recorded narration for every line

Not built yet:

- pictures for the other places (bedroom, kitchen, playroom, living room, garden, bakery, hallway, beach): these show simple stand-in rooms and fields
- props for the other scenes (milk, apple and worm, jack-in-the-box, thunderstorm, party and the extras)
- story sound effects (bark, thunder, pop); the setting only affects the tap and chime for now
- speaking a card's label when it is tapped, and the "a little more light" hint
- level 5, real human faces

Not yet tested with children. The camera thresholds are first estimates.

## 12. Open questions

- **Title.** "Face Feelings" is a working title.
- **Extra scenes.** Only to fill gaps when emotions are off, or also now and then for variety on replays?
- **The tower scene.** The friend knocks the tower over on purpose and says sorry. Is that right for the friend, or should the tower fall another way? Should the apology show the friend's face?
- **Level 1 in Story mode.** Keep the scene pictures, or send level 1 to Practice?
- **Startle scenes.** The dog, thunder, jack-in-the-box, wave and dark shed may be hard for sound-sensitive children even with soft sounds. Is switching Scared off enough, or should the settings warn about these scenes?
- **Masking.** Many autistic adults object to tools that train children to produce expressions on cue. The design keeps recognition as the goal and face-making as play, but it should be reviewed by autistic adults as well as therapists.

## 13. `story.json` format

| Field | Meaning |
|---|---|
| `characters[]` | `id`, `name`, `friendId` (the other character, fills `{friend}`), `words.hand` (hand or paw), `pickLine`. |
| `emotionOrder` | Introduction order. |
| `emotions.<id>` | `label` (card label, "Sad"), `word` ("sad", fills `{word}`), `introOrder`, `hint[]` (one or two lines about the face), `makePrompt`, `coach[]` (`feature`, `text`, suggested MediaPipe `blendshapes`). |
| `ui` | All shared copy, grouped by screen. |
| `settings[]` | `id`, `label`, `default`, `options`, `help`; `type: "action"` for buttons. |
| `scenes[]` | The 12 main scenes in day order. |
| `finaleId` | `party`. |
| `extraScenes[]` | Optional scenes, same shape. |

Scene fields: `id` (extras start with `x_`), `order` (position in the day; extras use decimals such as 7.5), `timeOfDay` (morning, midday, afternoon, evening), `place` (same place = same picture), `emotion`, optional `followsId` (the scene this one continues; the text still stands alone), `finale`, `text[]` (story lines, never naming the emotion), `comfort[]` or `null` (only happy scenes have none), `illustration`, `comfortIllustration`, `sticker` (`id`, and a `label` that fills `{sticker}`).

Placeholders: `{name}` (the chosen character), `{friend}` (the other one), `{hand}` (hand or paw), `{word}`, `{label}`, `{sticker}`.
