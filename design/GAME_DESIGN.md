# Face Feelings: game design document

Working title: "Face Feelings" (folder name; see open question Q1).
Script file: `story.json` in this folder. The app loads all copy from it.
Status: draft, 2026-11-17. Updated 2026-11-17: two characters (Miso, Sam); Pip dropped.

How to read this document:

- **Part A** lists what the owner has decided. It is binding.
- **Part B** is my design that fills in the details (screen flow, copy, session picker, defaults). Every item in Part B is a proposal until the owner approves it. Items that need a decision carry an id (P1, P2, ...) and are collected in section B12.
- **Part C** lists open questions.

Copy lines that the owner gave word for word ("Let's look closer", "Nice try!", "How does {name} feel?", "Can you show {name}'s ___ face?", "Show me your calm face") are decided. All other copy in `story.json` is my draft.

---

## Overview

A mobile web game (React, phone browsers on iOS and Android) that helps children with special needs, mainly autistic children aged about 4 to 10, learn to recognise six emotions. A cartoon character, Miso the cat or Sam the kid, goes through one day. The narrator tells a short situation, the child taps the face card that matches how the character feels, and then makes that face. The front camera follows the child's face with MediaPipe Face Landmarker blendshapes and fills a gentle "getting closer" meter.

It is a showcase demo, not a medical or therapy product.

---

# Part A: Decided by the owner

## A1. Rules for the child's experience

1. The child is never penalised. No failure sounds, no red X, no "wrong".
2. If the child taps a different card than the target, the character says something like "Let's look closer", shows the face, and a hint points at the brows and mouth. The game always continues.
3. If the face timer runs out, the game says "Nice try!" and continues.
4. A Skip button is always available.
5. Every scene gives a sticker, whatever happens in it.
6. The game never tells the child what they feel. All feedback is about the face ("raise your eyebrows a bit more"), never "you look sad". The game does expression detection, not emotion inference (EU AI Act reason). This applies to all copy.
7. Every non-happy scene gets a short comfort line afterwards (narration only, no task), so no scene leaves the child in a bad feeling.
8. The game always ends with a happy finale. If the adult sets a shorter session, fewer scenes are picked, and the finale is always last.
9. The same place appears with different outcomes, so the child cannot learn shortcuts like "birthday = happy".

## A2. Language and content

- English. Short, simple sentences for ages 4 to 10.
- Most text is also read aloud (Web Speech API), so it is written for the ear.
- Do not use the word "nobody" in copy.
- No sarcasm, idioms or figurative language (autistic children may take them literally).
- Gentle content: no injuries, no lost parents, no bullying. The one exception is "someone knocks the tower over on purpose", which resolves with an apology.

## A3. Emotions and what the camera checks

| Emotion | Camera checks |
|---|---|
| Happy | mouth corners up, cheeks up |
| Sad | eyebrows up in the middle, mouth corners down |
| Angry | eyebrows down and together, lips pressed |
| Surprised | eyebrows up high, eyes wide, mouth open |
| Scared | eyebrows up, eyes wide, mouth stretched sideways |
| Disgusted | nose wrinkles, top lip goes up |

Introduction order: happy, sad, surprised, angry, then scared and disgusted.
Each emotion has a child-friendly face hint of one or two short lines, about brows, eyes and mouth only.

## A4. Characters

The child picks one of two. Both use the same rig and the same face rules. Chibi proportions: big head, small body.

- **Miso**: cartoon cat, front-facing flat face, tabby marks that work as eyebrows.
- **Sam**: cartoon kid, gender-neutral. Use "Sam" or they/them, never he/she.

Pip (the blob creature) is dropped from the game (owner decision, 2026-11-17).

The story has only these two characters (owner decision, 2026-11-17). The character the child did not pick is the friend (`{friend}`) and plays every other role: helper, guest, the one who knocks the tower over and says sorry, the dog's owner. No grown-ups, baker or other children appear.

Story text works for both: it uses a `{name}` placeholder and avoids pronouns where it can. If a pronoun is needed, it is they/them.

## A5. The day (structure fixed, wording may be refined)

| # | Situation | Emotion | Comfort |
|---|---|---|---|
| 1 | Wakes up, it's snowing in summer | surprised | (none given, see P3) |
| 2 | Breakfast milk has gone bad | disgusted | the friend gives fresh juice instead |
| 3 | Gets a red balloon at the park | happy | none |
| 4 | The balloon floats away | sad | the friend shares theirs |
| 5 | Builds the tallest tower ever | happy | none |
| 6 | The friend knocks it over on purpose | angry | the friend says sorry and helps rebuild |
| 7 | A big dog barks loudly | scared | the friend calls the dog (it is the friend's dog), it wags its tail |
| 8 | A jack-in-the-box springs out | surprised | (none given, see P3) |
| 9 | Finds a worm in the apple | disgusted | the friend gives a banana |
| 10 | Drops a cake at the bakery | sad | the friend shares a cupcake |
| 11 | Afternoon thunderstorm | scared | the friend holds their hand until it passes |
| 12 | FINALE: the friend arrives for a party | happy | day ends, sticker book |

Plus a short intro (morning greeting, explains the game in 2 to 3 lines) and an outro.

## A6. Gameplay loop per scene

1. **Story**: picture plus 1 to 2 narrated sentences. The character's face is neutral or shows the feeling, depending on difficulty level.
2. **Guess**: "How does {name} feel?" The child taps one of N face cards (N set by the adult, 2 to 6). Target card: celebration line. Other card: gentle look-closer flow.
3. **Make the face**: "Can you show {name}'s ___ face?" Live meter with 4 tiers of encouragement, hold about 1 s, optional time limit, Skip.
4. **Comfort** line if the scene is not happy, then **sticker**.

## A7. Modes on the home screen

- **Story**: the main game.
- **Mirror**: the character copies the child's face live. Free play and warm-up.
- **Practice**: pick one emotion and copy it, no story.

## A8. Difficulty ladder (adult chooses)

1. Copy the character's face (no story).
2. Story where the character shows the feeling.
3. Story where the face stays neutral (the child works it out from the situation).
4. Subtler faces.
5. Real human faces. Not in the demo; future work.

## A9. Calibration

At each session start: "Show me your calm face" for 3 s. The character makes its calm face too.

## A10. Adult settings

Behind a 3-second press on a gear icon. Settings: emotions on/off, number of cards, sensitivity, hold time, time limit (off/10/20/30 s), face style (big/medium/subtle), difficulty level, read aloud on/off, camera preview on/off, session length (short 4 / medium 8 / full 12 scenes), show detection details (debug bars), recalibrate.

## A11. Privacy

Everything stays on the phone: only settings and the calm-face baseline are stored. No accounts, no recording, no uploads. A short plain privacy note is shown on the home or settings screen.

---

# Part B: Proposed design (needs owner approval)

## B1. Screen-by-screen flow

```
Home ──► Character pick ──► Camera permission (first time) ──► Calibration ──► Intro
  │                                                                            │
  │                                                     ┌──────────────────────┘
  │                                                     ▼
  │                                          Scene loop (x session length − 1)
  │                                                     │
  │                                                     ▼
  │                                     Finale scene ──► Outro ──► Sticker book
  │                                                                   │
  │◄──────────────────────── Play again / Home ◄──────────────────────┘
  │
  ├──► Mirror   (character pick if none chosen yet, calibration if not done)
  └──► Practice (same)
```

### Home
- Three big buttons with icons: Story, Mirror, Practice.
- Gear icon in the top corner. Press and hold 3 s; a ring fills around the icon while held. A small label appears on touch: "Grown-ups: press and hold for 3 seconds." Releasing early does nothing.
- Short privacy line at the bottom (`ui.home.privacyShort`).
- The last chosen character stands on the home screen, idle animation, calm face.

### Character pick
- "Who do you want to play with today?" Miso and Sam side by side. Tapping one makes it wave and says its `pickLine` ("This is Miso."). A big "Let's go!" button confirms.
- The choice is remembered on the phone and preselected next time (P1).

### Camera permission
- Shown only before the browser's own permission prompt, the first time (`ui.camera.askPermission`). Addressed to grown-ups, because a young child cannot judge the browser dialog.
- If permission is denied, the game still runs without the camera (P2): the make-face step shows "Make {name}'s {word} face. Tap Done when you are ready." with a Done button, and Mirror is hidden.

### Calibration
- Narration: "Show me your calm face." / "Keep your face still, like {name}."
- The character shows its calm face. A 3-2-1 count runs while the app samples the child's blendshapes for 3 s. "Thank you! All ready."
- If the face is lost during the 3 s: restart the count with "Let's try that again. Keep your face still." After two failed tries, use a default baseline and continue, so a child who cannot hold still is not blocked.
- "Session" means one app launch (P4). Calibration runs once, before the first mode that uses the camera, and again from settings. Changing the character does not recalibrate.
- Light and distance helpers during calibration and any camera step: "A little more light will help.", "Come a little closer to the phone.", "Move back a little."

### Intro (Story mode only)
1. "Good morning! This is {name}."
2. "Let's watch {name}'s day."
3. "Find out how {name} feels. Then make the same face!"

### Scene (Story mode), see B2 for the detailed loop.

### Finale and outro
- The finale (`party`) runs the normal loop: story, guess, make the happy face, sticker.
- Outro: "What a big day for {name}!" / "Now the sun goes down. It is time for bed." / "Good night, {name}!" / "Look at all your stickers!"
- Then the sticker book opens.

### Sticker book
- Title "Your sticker book". Shows the stickers earned, newest at the end, in a simple grid. Tapping a sticker reads its label ("a red balloon").
- Shows earned stickers only, no empty slots (P5). Empty slots can read as "missing" to some children.
- Buttons: "Play again", "Home".
- Stickers collect across sessions on this phone until "Clear saved data".

### Mirror
- "Make a face. {name} will copy you!" The character copies the child's face live, blendshape to blendshape.
- No emotion labels at all in Mirror. The game never says "that is a sad face" about the child (rule A1.6). It only shows the character copying.
- Every 8 to 10 s of low movement, the narrator offers one idea from `ui.mirror.ideas` ("Try lifting your eyebrows up high."). The ideas name face parts, not emotions.
- "Done" returns home. No stickers, no score.

### Practice
- "Pick a face to practice." Cards for the enabled emotions in introduction order.
- After a pick: the character shows the face large, the hint lines are read, then the normal make-face step (meter, coach line, hold, Skip, time limit if set).
- Success: "You did it!" or "Great face!" with a small star burst. Buttons: "Again", "Another face". No stickers; stickers belong to the story (P6).

## B2. Gameplay loop with exact copy

All strings below live in `story.json`. `{word}` is the lower-case emotion word, `{label}` the card label.

### Step 1: Story
- Scene picture fills the top of the screen; the character stands in it.
- Each `text` line is shown and read in turn. A "Hear again" button replays them.
- Character face during the story:
  - Level 2: shows the scene's emotion at the chosen face style.
  - Level 3 and 4: calm face.
- The cards appear only after narration ends (P7), so the child hears the situation before choosing. If read-aloud is off, the cards appear after 2 s.

### Step 2: Guess
- Prompt: "How does {name} feel?"
- N cards in a row (or 2 rows for 5 to 6). Each card shows the chosen character's face for one emotion, plus the label under it. The target is always included; the others are picked at random from the enabled emotions. Card order is random.
- One tap selects; the card label is spoken.

**Target card tapped**: one random line from `ui.guess.celebrate`:
- "Yes! {name} feels {word}."
- "You found it! {name} feels {word}."
- "That's it! {name} feels {word}."
- "Good thinking! {name} feels {word}."

A short soft chime and a small sparkle on the card.

**Another card tapped** (look-closer flow). Same calm sound as any other tap; no special "miss" sound.
1. The tapped card shrinks back quietly. The character speaks one line from `lookCloser.open`: "Let's look closer." or "Let's look at {name}'s face together."
2. The camera zooms in on the character's face, which now shows the target emotion at "big" style (even at level 3 and 4).
3. "Look at the eyebrows. Look at the mouth." A soft glowing pointer moves to the brows, then to the mouth (and to the nose for disgusted, eyes for surprised and scared).
4. The emotion's `hint` lines are read while the pointer rests on each part.
5. "This is {name}'s {word} face."
6. The target card gently pulses. "Can you find the {word} face?" When tapped: "Yes, that one! {name} feels {word}." If no tap within 6 s, the game continues on its own.

The flow never says which card the child picked and never uses "no", "not quite" or "wrong".

### Step 3: Make the face
- Prompt: the emotion's `makePrompt`, e.g. "Can you show {name}'s sad face?"
- The character holds the target face (big style) next to the meter. The emotion's hint lines are shown in small text under the meter.
- Optional camera preview (small window, mirrored) in a corner.
- The meter is a soft bar or a filling shape, never red. It reflects a 0 to 1 score that the app computes from blendshapes relative to the calm baseline.

**Meter tiers** (`ui.make.meterTiers`):

| Tier | Score | Lines |
|---|---|---|
| 1 | 0 to 0.25 | "Let's try. Look at {name}'s face." / "Let's start. Watch {name}'s face." |
| 2 | 0.25 to 0.5 | "Getting closer!" / "That's a good start!" |
| 3 | 0.5 to 0.8 | "Almost there!" / "Very close now!" |
| 4 | 0.8 to 1.0 | "That's it! Hold it." / "Yes! Keep it still." |

**Coach line**: in tiers 1 to 3, the app also shows the `coach` line for the feature with the lowest score, e.g. "Lift the middle of your eyebrows." This is how the "raise your eyebrows a bit more" feedback from A1.6 works: it names a face part and an action, never a feeling.

Speech throttling (P8): speak a tier line only when the tier goes up, and at most once every 4 s. Coach lines are spoken at most once every 6 s. The meter never goes down in speech; if the score drops, the bar drops quietly.

**Success**: the score stays in tier 4 for the hold time (default 1 s). One line from `ui.make.success`: "You did it! That's {name}'s {word} face." / "Great face! Just like {name}." / "You made the {word} face!"

**Time limit** (if set): when time ends, one line from `ui.make.niceTry`: "Nice try!" / "Nice try! Let's see what happens next." / "Thank you for trying! On we go." No countdown is shown to the child (P9); the meter simply fades out.

**Skip**: always visible, same size and color as other secondary buttons, so it does not look like a punishment. Spoken: "OK! Let's see what happens next."

**Face lost** for more than 2 s: "Let's find your face. Look at the phone." The timer pauses while the face is lost.

### Step 4: Comfort and sticker
- For any non-happy scene, the `comfort` lines are read with the `comfortIllustration` picture. The character's face eases from the emotion to calm, then to a small smile at the last line.
- Surprised scenes also have a closing line in the `comfort` field (P3).
- Sticker: the sticker flies into a small book icon. "A sticker for your book!" or "Here is your sticker: {sticker}."
- "Next" button, or auto-advance after 3 s.

### Level 1 (copy, no story)
Story mode still walks through the selected scenes in order, but:
- The scene picture is shown without narration and without the guess step.
- "This is {name}'s {word} face." Then the normal make-face step.
- Instead of the scene comfort lines (which refer to a story the child did not hear), non-happy faces end with "Now {name}'s face is calm again." (P10)
- Sticker as normal.

## B3. Difficulty ladder in practice

| Level | Story text | Character face in story | Cards | Make-face target |
|---|---|---|---|---|
| 1 | none | shows emotion (big) | no guess step | big |
| 2 | yes | shows emotion at face style | face style | big |
| 3 | yes | calm | face style | big |
| 4 | yes | calm | subtle | big |
| 5 | future: real human faces on cards and in story pictures | | | |

- Default level: 2.
- The face style setting applies to level 2 and 3. Level 4 always uses subtle and ignores the setting.
- The make-face target always uses the big style, so the child has a clear model to copy.
- The camera threshold does not depend on level; sensitivity is its own setting.

## B4. How sessions pick scenes

Session lengths: short = 4 scenes, medium = 8, full = 12. The finale `party` is always last, so the picker chooses `k = length − 1` scenes.

**Pool**: main scenes 1 to 11 whose emotion is enabled. If the pool is smaller than `k`, add extra scenes (`extraScenes`) whose emotion is enabled.

**Full (12)**: all scenes in the pool in day order. If emotions are turned off and scenes drop out, fill with extras of enabled emotions up to 11 where possible; otherwise the session is shorter.

**Short (4) and medium (8)**:
1. **Choose emotions.** Walk the enabled emotions in introduction order (happy, sad, surprised, angry, scared, disgusted) as a rotating list. For short sessions, skip happy in this walk, because the finale already gives a happy scene. Start where the previous session stopped (stored on the phone), so repeated sessions cover all emotions over time. The first session ever starts at the beginning, so a beginner meets sad, surprised and angry before scared and disgusted.
2. **Choose a scene for each emotion.** Prefer a main scene not played in the last session; use an extra scene only if no main scene fits.
3. **Keep a same-place pair (medium only).** If the picks include scene 3 or 4, or 5 or 6, try to include its partner, so the child sees the same place with two outcomes in one session. Replace the lowest-priority duplicate emotion to make room.
4. **No long runs of hard feelings.** Avoid three non-happy scenes in a row in medium sessions, by swapping in a happy main or extra scene where possible.
5. **Sort by `order`** (time of day), then append the finale.

Example, first short session with all emotions on: emotions sad, surprised, angry → `snow_summer` (1), `balloon_away` (4), `tower_knocked` (6), `party` (12). The second short session continues with scared, disgusted, sad → e.g. `old_milk` (2), `big_dog` (7), `cake_drop` (10), `party`.

Dependent scenes (`followsId`: 4 follows 3, 6 follows 5) are written to stand alone, so they can be picked without their partner.

**If happy is turned off**: the finale still plays (rule A1.8) but as narration and sticker only, with no guess or make step (P11).

**Minimum**: at least 2 emotions must be on (the guess needs 2 cards). The number of cards is capped at the number of enabled emotions.

## B5. Same place, different outcomes

| Place | Main scenes | Extra scenes |
|---|---|---|
| bedroom | surprised (1) | sad (toy car) |
| kitchen | disgusted (2) | happy (pancakes), surprised (popcorn) |
| park | happy (3), sad (4), scared (7) | |
| playroom | happy (5), angry (6) | angry (drawing stopped) |
| living room | surprised (8), scared (11) | |
| garden | disgusted (9), happy (12) | surprised (rabbit), scared (dark shed) |
| bakery | sad (10) | happy (sprinkles), disgusted (moldy roll) |
| hallway | | angry (stuck zip) |
| beach | | sad (sandcastle), scared (wave), disgusted (seaweed) |

The bakery appears in the main day only once (sad); the extras add a happy and a disgusted bakery scene. Turning extras into regular variety (B4 step 2) needs the owner's view on how often extras should show (Q7).

## B6. Adult settings

Opened by a 3-second press on the gear icon. All labels and help texts are in `story.json` under `settings`.

| Setting | Options | Default (proposed) | Explanation shown to the adult |
|---|---|---|---|
| Emotions | each on/off, at least 2 | all 6 on | Choose which faces appear. For a child who is new to this, start with Happy and Sad, then add Surprised and Angry, then Scared and Disgusted. |
| Number of cards | 2 to 6 | 3 | How many faces the child chooses from. Fewer cards is easier. Cannot be more than the number of emotions that are on. |
| Sensitivity | low / medium / high | medium | How big a face movement fills the meter. High: a small movement is enough (easier). Low: the face must be bigger and clearer. |
| Hold time | 0.5 / 1 / 1.5 / 2 s | 1 s | How long the face must stay full on the meter before it counts. |
| Time limit | off / 10 / 20 / 30 s | off | How long the child has to make the face. When time ends, the game says "Nice try!" and moves on. Off: the game waits until the face is made or Skip is tapped. |
| Face style | big / medium / subtle | big | How strongly the character shows each feeling. Big is easiest to read. Level 4 always uses Subtle. |
| Difficulty level | 1 to 4 | 2 | 1: copy the face, no story. 2: story, the character shows the feeling. 3: story, the face stays calm. 4: like 3, with subtle faces on the cards. |
| Read aloud | on / off | on | The phone's voice reads the story and the instructions. |
| Camera preview | on / off | on | Shows the child's camera picture in a small window. Some children find it helpful. Others find it distracting. |
| Session length | short 4 / medium 8 / full 12 | short | How many scenes in one story. The happy party scene is always last. |
| Show detection details | on / off | off | For grown-ups: shows bars with what the camera measures. Useful for testing. Turn it off for children. |
| Recalibrate | button | | Measure the calm face again. Do this when the light changes or a different person plays. |
| Sound effects (P12) | on / soft / off | soft | Story sounds like the dog barking or thunder. Soft keeps them quiet, for children who are sensitive to sudden sounds. |
| Clear saved data (P13) | button, with confirm | | Deletes settings, the calm-face measurement and the sticker book from this phone. |

Default reasoning:
- **Time limit off**: no pressure by default; Skip covers the stuck case. If the owner wants the "Nice try!" path visible in the demo, 20 s is the alternative.
- **Session short**: a demo viewer or a 4-year-old will finish 4 scenes; full is available.
- **Cards 3**: two is close to a coin toss, six is a lot for a beginner.
- **Sensitivity medium**: needs testing with real children; many autistic children show smaller facial movements, so high may be the better default after testing.

The debug bars show, per emotion: the 0 to 1 score, and the raw blendshape values that feed it, next to the baseline.

## B7. Privacy note

Short version (home screen):
> Everything stays on this phone. No accounts. No recording. Nothing is uploaded.

Full version (settings screen, `ui.privacyNote`):
> Face Feelings uses the front camera to follow the shape of the face: eyebrows, eyes, nose and mouth.
> The camera picture is checked on this phone and then thrown away. Nothing is recorded, saved or sent anywhere.
> There are no accounts. The game saves only your settings, the calm-face measurement and the sticker book, and only on this phone.
> The game measures face movements only. It does not decide how anyone feels.
> Tap "Clear saved data" to delete everything the game has saved.

Note: the decided list of stored items (A11) is settings and calm-face baseline. The sticker book and "last character" and "where the session picker stopped" are also small local data. They contain nothing about the face. See Q5.

## B8. Copy rules used in the script

- Scene text never names the emotion (so level 3 works). Celebration and reveal lines name the character's feeling, never the child's.
- Coach and hint lines name a face part and an action only.
- No all-caps words ("Woof", not "WOOF"); some speech engines read capitals letter by letter.
- No he/she. `{name}` is repeated rather than replaced by a pronoun. "They" appears only for groups ("they run up the sand together").
- `{hand}` placeholder: "paw" for Miso, "hand" for Sam. Used once (thunderstorm).
- `{friend}` placeholder: the character the child did not pick (A4). Used wherever a second person appears in a scene.
- US spelling (color, favorite, practice, moldy). See Q2.
- Quotes from the friend stay in the narrator voice. The character's own lines ("Let's look closer") use the same voice with slightly higher pitch (P14).

## B9. Scene illustration notes

General rules for all scene backgrounds:
- Simple and uncluttered: one place, 3 to 6 objects, soft flat colors, plain sky or wall.
- One strong color at most, used for the object the story is about (the red balloon, the cake).
- No text in pictures.
- The friend character has a calm, kind face, or is seen from the side or behind. The friend must never show a stronger emotion than the main character, so they do not compete with the face the child should read.
- No flashing. Lightning is a soft glow, never a white-screen flash (photosensitivity).
- Recurring places reuse the same background (the park in scenes 3, 4, 7; the living room in 8 and 11; the garden in 9 and 12), so "same place, different outcome" is visible.
- Each scene has two pictures: the event moment (`illustration`) and the comfort moment (`comfortIllustration`). Happy scenes need only one.
- The character is rendered in 3D over the background; leave a clear space in the lower middle third for the character.

Per scene (main day):

| # | Scene | Event picture | Comfort picture |
|---|---|---|---|
| 1 | snow_summer | Bedroom, bed, big window. Green summer tree outside with snow falling. Sun hat on a chair. | Same window, sun out, snow almost gone. |
| 2 | old_milk | Kitchen table, bowl, milk carton, glass of milk with two wavy green smell lines. | Glass of orange juice instead. |
| 3 | red_balloon | Park: grass, one tree, bench, path, balloon stand. The red balloon is the only strong color. | (happy) |
| 4 | balloon_away | Same park. Red balloon small and high in the sky; a few leaves blowing. | The friend character (the one not picked) with a calm, kind face holds out a yellow balloon. |
| 5 | tall_tower | Playroom: soft rug, toy shelf, window. Tower of colored blocks taller than the character. | (happy) |
| 6 | tower_knocked | Same playroom. Blocks scattered. The friend character seen from behind, walking away; no mean face. | Miso and Sam building a new tower side by side. |
| 7 | big_dog | Same park. Big brown dog mid-bark, all four paws on the ground. The friend character far back with a leash. | Dog sitting by the friend character, tail up. |
| 8 | jack_in_box | Living room: sofa, lamp, rug. Box with crank handle; a smiling sun or bird puppet on a spring. No clown. | Box closed again. |
| 9 | apple_worm | Garden: grass, picnic blanket, fence, flower bed. Bitten green apple with a small pink cartoon worm. | Apple on the grass; banana on the blanket. |
| 10 | cake_drop | Bakery: glass counter, cakes on shelves, small round table. Chocolate cake upside down on the floor, one brown splat. | The friend character holding out a cupcake with a cherry. |
| 11 | thunderstorm | Same living room. Big window: grey sky, rain, one lightning bolt as a soft glow. | Same window with rainbow and sun; Miso and Sam on the sofa. |
| 12 | party | Same garden with bunting, table with cake and balloons. The friend character (the one not picked) at the door, both characters waving. | (happy) |

Extra scene drawing notes are in `story.json`, same fields.

## B10. Sound (proposal)

- One soft chime for every successful step (target card, face made, sticker).
- No sound at all for "other card", timeout or Skip, beyond normal speech.
- Story sound effects (bark, thunder, pop, splat) are short and, by default, soft (P12).
- Speech: Web Speech API, rate about 0.9, an English voice picked once per device and kept.

## B11. `story.json` format

Top-level fields:

| Field | Type | Meaning |
|---|---|---|
| `version` | number | Script format version. |
| `language` | string | `en-US`. |
| `meta` | object | Placeholder list and text rules, for people reading the file. |
| `characters[]` | array | `id`, `name`, `friendId` (the other character, fills `{friend}`), `words.hand`, `pickLine`. |
| `emotionOrder` | string[] | Introduction order. Use for Practice cards, settings list and the session picker. |
| `emotions.<id>` | object | See below. Ids: `happy`, `sad`, `angry`, `surprised`, `scared`, `disgusted`. |
| `ui` | object | All shared copy, grouped by screen. |
| `settings[]` | array | `id`, `label`, `default`, `options`, `help`; `type: "action"` for buttons; `proposal: true` marks settings not in the decided list. |
| `scenes[]` | array | The 12 main scenes in day order. |
| `finaleId` | string | `party`. Always the last scene of every session. |
| `extraScenes[]` | array | Optional scenes, same shape. 2 per emotion. |

`emotions.<id>`:

| Field | Meaning |
|---|---|
| `label` | Card label, capitalised ("Sad"). |
| `word` | Lower-case word for sentences ("sad"). Fills `{word}`. |
| `introOrder` | 1 to 6. |
| `hint[]` | 1 to 2 lines describing the face. Used in look-closer and under the meter. |
| `makePrompt` | "Can you show {name}'s sad face?" |
| `coach[]` | `feature`, `text` (second person, face part + action), `blendshapes` (suggested MediaPipe blendshape names that measure this feature). The app shows the coach line of the weakest feature. The blendshape mapping is a suggestion for the app developer, not a tuned model. |

Scene object:

| Field | Meaning |
|---|---|
| `id` | Stable id. Extras start with `x_`. |
| `order` | Position in the day. Main scenes 1 to 12; extras use decimals (e.g. 7.5) so they sort into the right time of day. |
| `timeOfDay` | `morning`, `midday`, `afternoon`, `evening`. Can drive sky color. |
| `place` | Background id. Same id = same background picture. |
| `emotion` | Emotion id. |
| `followsId` | Optional. The scene this one continues. Text still stands alone. |
| `finale` | `true` on the finale only. |
| `text[]` | Story lines, each shown and spoken in turn. Never names the emotion. |
| `comfort[]` or `null` | Lines after the task. `null` only for happy scenes. |
| `illustration` | What to draw for the event moment. |
| `comfortIllustration` | What to draw for the comfort moment, or `null`. |
| `sticker` | `id` (asset name) and `label` (spoken, fills `{sticker}`). |

Changes from the suggested shape: `text` and `comfort` are arrays of lines (for pacing in speech), `sticker` is an object, and `order`, `timeOfDay`, `followsId`, `finale`, `comfortIllustration` are new.

## B12. List of proposals that need the owner's decision

| Id | Proposal |
|---|---|
| P1 | Remember the last chosen character on the phone and preselect it. |
| P2 | Without camera permission, the game still runs: make-face step becomes "make the face, then tap Done"; Mirror is hidden. |
| P3 | Surprised scenes (1 and 8, and extras) also get a short calm closing line in the `comfort` field, because A1.7 says every non-happy scene gets one. The day table gave none for them. |
| P4 | "Session" for calibration = one app launch. Calibrate once before the first camera mode; after 2 failed tries, use a default baseline and continue. |
| P5 | Sticker book shows earned stickers only, no empty slots. Stickers persist across sessions on the phone. |
| P6 | Practice gives a star burst, not stickers. |
| P7 | Cards appear only after narration ends (2 s delay when read-aloud is off). |
| P8 | Speech throttling for meter tiers and coach lines (tier lines only on the way up, max one per 4 s; coach max one per 6 s). |
| P9 | No visible countdown for the time limit. |
| P10 | Level 1 in Story mode: scene pictures without narration or guess; comfort lines replaced with "Now {name}'s face is calm again." |
| P11 | If happy is turned off, the finale plays as narration and sticker only. |
| P12 | New setting: Sound effects on / soft / off, default soft. |
| P13 | New setting: Clear saved data. |
| P14 | Character's own lines use the narrator voice at a slightly higher pitch. |
| P15 | Defaults in B6: all emotions on, 3 cards, sensitivity medium, hold 1 s, time limit off, face style big, level 2, read aloud on, camera preview on, session short, debug off. |
| P16 | Session picker in B4 (rotating emotions in introduction order, skip happy in short sessions, same-place pairs in medium, no 3 hard scenes in a row). |
| P17 | Level ladder details in B3: make-face target always big; level 4 forces subtle cards. |
| P18 | Look-closer flow in B2: zoom, pointer on brows then mouth, hint, then the target card pulses for a tap; auto-continue after 6 s. |
| P19 | Decided 2026-11-17, now in A4: the character the child did not pick is the friend and plays every other role. Still open: the exact wording of the rewritten lines. |
| P20 | The dog has a name (Rufus); the jack-in-the-box toy is a sun or bird puppet, not a clown. |
| P21 | The 12 extra scenes in `extraScenes`, including two new places (hallway, beach). |
| P22 | All draft copy in `story.json` beyond the lines the owner gave. |

---

# Part C: Open questions

| Id | Question |
|---|---|
| Q1 | Title. "Face Feelings" is only the folder name. |
| Q2 | US or UK English spelling, and which speech voice (en-US or en-GB)? Brief used "recognise"; script uses US spelling. |
| Q3 | (Closed: Pip is dropped. Miso and Sam both have visible eyebrows.) |
| Q4 | Should the MediaPipe model and WASM files be hosted with the app instead of loaded from a public CDN? A CDN request sends nothing about the face, but it does contact a third party, which matters for the "nothing leaves the phone" claim. |
| Q5 | The decided storage list is settings and calm-face baseline. The design also stores stickers, last character and the session-picker position (no face data). OK to add these, and to say so in the privacy note? |
| Q6 | The introduction order (happy, sad, surprised, angry, scared, disgusted) differs from the day order (the day opens with surprised, then disgusted). This design applies the introduction order to the settings advice, Practice, and the short-session picker, and keeps the day order for full sessions. Is that the intended reading? |
| Q7 | How often should extra scenes appear: only to fill gaps when emotions are off, or also at random for variety on replays (e.g. one extra per medium session)? |
| Q8 | Scene 6 is the one allowed unkind act, and the friend now does it (and says sorry). Is that OK for the friend, or should the tower fall another way? Also: should the apology show the friend's face (calm, sorry), or stay narrated only? |
| Q9 | Background art: 2D painted backgrounds behind the 3D character, or simple 3D sets? Affects the illustration workload. |
| Q10 | Should the level 1 story still show scene pictures at all, or should level 1 in Story mode simply redirect to Practice? |
| Q11 | Startle scenes (dog, thunder, jack-in-the-box, wave, dark shed) may be hard for sound-sensitive children even with soft sounds. Is turning Scared off in settings enough, or should the settings help text warn about these scenes? |
