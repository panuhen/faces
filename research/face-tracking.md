# Face tracking: libraries and approach

## The choice in one line

The game uses **MediaPipe Face Landmarker** in the browser and scores the child's face from its **blendshapes** (brow raise, smile, jaw open and so on) against a target expression. It never runs an emotion classifier on the child.

## Options we looked at

| Option | What it gives | Where it runs | Notes |
|---|---|---|---|
| **MediaPipe Face Landmarker** (Google) | 478 face landmarks and 52 blendshape scores (ARKit-style names) | On device: web (WASM, GPU or CPU), Android, iOS | Real time on a normal phone. Chosen for the game. |
| **ARKit face tracking** (Apple) | The same 52 blendshapes | iPhone and iPad only (A12 chip or newer since iOS 14; TrueDepth not required, but more stable) | Very stable, but native iOS only. |
| **face-api.js** | Landmarks plus a 7-class expression label | Browser | Older project; gives emotion labels, which we avoid (see below). |
| **DeepFace**, **FER** | 7-class emotion label per face | Python, desktop or server | Quick to try on a webcam. FER's model is older and trained on FER2013. |
| **HSEmotion** | 7 or 8-class emotion label (EfficientNet, trained on AffectNet) | Python, runs on CPU | More accurate than the FER2013 models, but still a classifier. |
| Hugging Face image classifiers | Emotion label (often ViT-based) | Python | Easy to wire up with `transformers`. |

Datasets, for anyone who wants to train a model: FER2013 (free, 48x48 greyscale, low quality), AffectNet and RAF-DB (better; access on request for research).

## Why blendshapes, not an emotion classifier

1. **It matches the task.** The game asks the child to *make* a face ("Can you show Miso's sad face?"). Checking face parts against a target is exactly that, and the feedback can name the part: "Lift the middle of your eyebrows."
2. **It is expression detection, not emotion inference.** The game never says what the child feels. This keeps it out of the EU AI Act's emotion-recognition rules as we read them (see below), and it is also the kinder design.
3. **It is tunable per child.** Off-the-shelf models are trained mostly on adult, often acted, neurotypical faces. With blendshapes the game sets its own thresholds, measures them against the child's own calm face, and lets a grown-up change the sensitivity.
4. **It stays on the device.** The model and runtime are served from the game's own origin; camera frames are read in the browser and thrown away.

## What the game checks

Each emotion is scored from two or three face features, measured as the rise above the child's calm face (recorded at the start of a session). The full table is in `web/src/face/score.ts`.

| Emotion | Features checked (MediaPipe blendshapes) |
|---|---|
| Happy | mouth: `mouthSmile`; cheeks: `cheekSquint` or `eyeSquint` |
| Sad | brows: `browInnerUp`; mouth: `mouthFrown` or `mouthShrugLower` |
| Angry | brows: `browDown`; mouth: `mouthPress`, `mouthShrugLower` or `mouthFrown` |
| Surprised | brows: `browInnerUp` + `browOuterUp`; eyes: `eyeWide`; mouth: `jawOpen` |
| Scared | brows: `browInnerUp` + `browOuterUp`; eyes: `eyeWide`; mouth: `mouthStretch` or `mouthLowerDown` |
| Disgusted | nose: `noseSneer`, `cheekSquint` or `browDown`; mouth: `mouthUpperUp` |

## Known limits

- **Some blendshapes are weak.** `mouthFrown`, `cheekSquint` and `noseSneer` often stay near zero even on clear expressions. That is why sad, angry and disgusted accept alternatives (the "or" columns above). Happy and surprised are the reliable ones.
- **Fear and surprise look alike.** Both raise the brows and widen the eyes; the mouth (stretched sideways or open) is the main difference.
- **Children and atypical faces.** Detection is less reliable on children's faces, and many autistic children show smaller facial movements. The meter is forgiving, there is a sensitivity setting, and Skip is always there. The thresholds are first guesses and need testing with real children.
- **A rising score does not prove learning.** See the JEMImE note in [prior-games.md](prior-games.md).

## EU AI Act framing

Our reading, not legal advice:

- Article 5(1)(f) bans emotion inference in workplaces and education institutions, with narrow medical and safety exceptions. A parent using the game at home is outside that ban; use in a school or special-education class would need a closer look.
- The Act's definition of emotion recognition leaves out the mere detection of readily apparent expressions (a smile, a frown), as long as they are not used to infer an emotion.
- So the game only checks whether the face matches a target, never says "you look sad", never logs emotion labels about the child, and keeps all feedback about face parts. Scores stay on the phone.
- The dates for the high-risk (Annex III) obligations may have moved (the EU's Digital Omnibus proposal from late 2025 pushed them back). Check the current state before relying on any date.
- Selling to schools or therapists, or marketing the game as therapy, could bring in other rules (including medical device rules). Talk to a lawyer before that.

Mobile store rules point the same way: Apple's Kids category and Google Play's Families policy restrict third-party SDKs and analytics, and keeping everything on the device avoids most of that.
