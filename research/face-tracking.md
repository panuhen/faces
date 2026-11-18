# Face tracking: libraries and approach

How the game reads the child's face, which alternatives we looked at, what the approach can and cannot do, and how it relates to the EU AI Act. Numbers in brackets refer to the [references](#references). Sources were checked in November 2026; web pages were accessed on 18 November 2026.

## The choice in one line

The game uses **MediaPipe Face Landmarker** [1] in the browser and scores the child's face from its **blendshapes** (brow raise, smile, jaw open and so on) against a target expression. It never runs an emotion classifier on the child.

## Options we looked at

| Option | What it gives | Where it runs | Notes |
|---|---|---|---|
| **MediaPipe Face Landmarker** (Google) [1]–[5] | 478 face landmarks and 52 blendshape scores, named like ARKit's | On the device: web (WebAssembly, GPU or CPU), Android, iOS | Runs in real time on phones [1]; the blendshape model reports 30+ frames per second on modern phones [5]. Chosen for the game. |
| **ARKit face tracking** (Apple) [6]–[8] | The same 52 blendshapes | iPhone and iPad only | Since ARKit 4 (iOS 14), face tracking also works without a TrueDepth camera on devices with an A12 Bionic chip or later; TrueDepth adds depth data [8]. Native iOS only. |
| **face-api.js** [9] | Landmarks and a 7-class expression label (neutral, happy, sad, angry, fearful, disgusted, surprised) | Browser | No release since March 2020. Gives emotion labels, which we avoid (see below). |
| **DeepFace** [10], [11] | Facial attribute analysis, including a 7-class emotion label | Python | Actively maintained. |
| **FER** [12] | 7-class emotion label | Python | Bundles an older Keras model trained on FER2013. |
| **HSEmotion**, now **EmotiEffLib** [13]–[15] | 7 or 8-class emotion label, plus valence and arousal in some models | Python, runs on a phone CPU | EfficientNet models trained on AffectNet. |

Datasets for training such classifiers: **FER2013** [16], 35,887 face images of 48×48 pixels in greyscale, published for a Kaggle contest; **AffectNet** [17], released for research only, on request; **RAF-DB** [18], non-commercial research only, on request.

## Why blendshapes, not an emotion classifier

1. **It matches the task.** The game asks the child to *make* a face ("Can you show Miso's sad face?"). Checking face parts against a target is exactly that, and the feedback can name the part: "Lift the middle of your eyebrows."
2. **It is expression detection, not emotion inference.** The game never says what the child feels. This keeps it apart from the EU AI Act's rules on emotion recognition as we read them (below), and it is also the kinder design.
3. **It can be tuned per child.** The game sets its own thresholds, measures each face against the child's own calm face, and lets a grown-up change the sensitivity. The vendor gives no accuracy figures for children's faces [4], [5].
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

- **Some blendshapes are weak.** In practice `mouthFrown`, `cheekSquint` and `noseSneer` often stay near zero even on clear expressions. This is a common experience with MediaPipe rather than something this project has measured yet. That is why sad, angry and disgusted accept alternatives (the "or" items above). Happy and surprised are the most reliable. Sadness was also the hardest expression for autistic children to produce in an earlier game [19].
- **Fear and surprise look alike.** Both raise the brows and widen the eyes; the mouth (stretched sideways or open) is the main difference.
- **Children's faces.** The model cards list augmented-reality effects as the intended use and evaluate fairness by geographic region, but give no figures by age [4], [5]. The game therefore uses forgiving thresholds, a sensitivity setting and an always-available Skip. The thresholds are first estimates and need testing with children.
- **A rising score does not prove learning.** Children in an earlier game learned to satisfy the algorithm without measurably better expressions [19]. See [prior-games.md](prior-games.md).

## EU AI Act

Our reading, not legal advice.

- **The ban.** Article 5(1)(f) of the AI Act [20] prohibits "the use of AI systems to infer emotions of a natural person in the areas of workplace and education institutions, except where the use of the AI system is intended to be put in place or into the market for medical or safety reasons". It applies from 2 February 2025. A parent using the game at home is outside it; use in a school would need a closer look.
- **Expressions are not emotions.** An emotion recognition system identifies or infers emotions or intentions from biometric data (Article 3(39)). Recital 18 adds that this "does also not include the mere detection of readily apparent expressions, gestures or movements, unless they are used for identifying or inferring emotions", for example "a frown or a smile" [20]. The Commission's guidelines put it plainly: "The observation that a person is smiling is not emotion recognition." "Concluding that a person is happy is emotion recognition." [21]
- **What the game does about it.** It only checks whether the face matches a target, never says "you look sad", never logs emotion labels about the child, and keeps all feedback about face parts. Scores stay on the phone.
- **Therapy claims.** The medical exception is to be read narrowly: the guidelines tie therapeutic use to CE-marked medical devices [21]. Marketing the game as therapy, or selling it to schools or therapists, would bring in other rules, including medical device rules. Get legal advice before that.
- **High-risk rules.** Emotion recognition systems are listed as high-risk in Annex III, point 1(c), and people exposed to them must be informed (Article 50(3)) [20]. The Digital Omnibus on AI, Regulation (EU) 2026/1744 [22], moved the high-risk obligations for Annex III systems to 2 December 2027.

## App store rules

The same design keeps the game compatible with the stores' rules for children's apps. Apple's Kids Category does not allow third-party analytics or advertising, and Kids apps may not send personal or device information to third parties [23]. Google Play's Families policy allows only SDKs approved for child-directed services, and lists camera data from children as sensitive information that must be disclosed [24]. The web version uses no analytics or third-party services at all.

## References

1. Google AI Edge. (2026, November 17). *Face landmarker guide*. Retrieved November 18, 2026, from https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker
2. Lugaresi, C., Tang, J., Nash, H., McClanahan, C., Uboweja, E., Hays, M., Zhang, F., Chang, C.-L., Yong, M. G., Lee, J., Chang, W.-T., Hua, W., Georg, M., & Grundmann, M. (2019). *MediaPipe: A framework for building perception pipelines* (arXiv:1906.08172). arXiv. https://doi.org/10.48550/arXiv.1906.08172
3. Kartynnik, Y., Ablavatski, A., Grishchenko, I., & Grundmann, M. (2019). *Real-time facial surface geometry from monocular video on mobile GPUs* (arXiv:1907.06724). arXiv. https://doi.org/10.48550/arXiv.1907.06724
4. Google. (2022). *Model card: MediaPipe Face Mesh V2*. https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Face%20Mesh%20V2.pdf
5. Grishchenko, I., Yan, G., Bazavan, E. G., Zanfir, A., Chinaev, N., Raveendran, K., Grundmann, M., & Sminchisescu, C. (2023). *Blendshapes GHUM: Real-time monocular facial blendshape prediction* (arXiv:2309.05782). arXiv. https://doi.org/10.48550/arXiv.2309.05782. Model card: Google. (2022). *Model card: Blendshape V2*. https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Blendshape%20V2.pdf
6. Apple Inc. (n.d.). *ARFaceAnchor.BlendShapeLocation*. Apple Developer Documentation. Retrieved November 18, 2026, from https://developer.apple.com/documentation/arkit/arfaceanchor/blendshapelocation
7. Apple Inc. (n.d.). *ARFaceTrackingConfiguration*. Apple Developer Documentation. Retrieved November 18, 2026, from https://developer.apple.com/documentation/arkit/arfacetrackingconfiguration
8. Apple Inc. (2020). *Explore ARKit 4* [Video]. WWDC20, session 10611. https://developer.apple.com/videos/play/wwdc2020/10611/
9. Mühler, V. (2020). *face-api.js* (Version 0.22.2) [Computer software]. GitHub. https://github.com/justadudewhohacks/face-api.js
10. Serengil, S. I., & Ozpinar, A. (2021). HyperExtended LightFace: A facial attribute analysis framework. In *2021 International Conference on Engineering and Emerging Technologies (ICEET)* (pp. 1–4). IEEE. https://doi.org/10.1109/ICEET53442.2021.9659697
11. Serengil, S. I. (n.d.). *deepface* [Computer software]. GitHub. Retrieved November 18, 2026, from https://github.com/serengil/deepface
12. Shenk, J. (2025). *FER* (Version 25.10.3) [Computer software]. GitHub. https://github.com/justinshenk/fer
13. Savchenko, A. V. (2021). Facial expression and attributes recognition based on multi-task learning of lightweight neural networks. In *2021 IEEE 19th International Symposium on Intelligent Systems and Informatics (SISY)* (pp. 119–124). IEEE. https://doi.org/10.1109/SISY52375.2021.9582508
14. Savchenko, A. V., Savchenko, L. V., & Makarov, I. (2022). Classifying emotions and engagement in online learning based on a single facial expression recognition neural network. *IEEE Transactions on Affective Computing, 13*(4), 2132–2143. https://doi.org/10.1109/TAFFC.2022.3188390
15. Savchenko, A. V. (n.d.). *EmotiEffLib (formerly HSEmotion)* [Computer software]. GitHub. Retrieved November 18, 2026, from https://github.com/sb-ai-lab/EmotiEffLib
16. Goodfellow, I. J., Erhan, D., Carrier, P. L., Courville, A., Mirza, M., Hamner, B., Cukierski, W., Tang, Y., Thaler, D., Lee, D.-H., Zhou, Y., Ramaiah, C., Feng, F., Li, R., Wang, X., Athanasakis, D., Shawe-Taylor, J., Milakov, M., Park, J., … Bengio, Y. (2013). Challenges in representation learning: A report on three machine learning contests. In M. Lee, A. Hirose, Z.-G. Hou, & R. M. Kil (Eds.), *Neural Information Processing (ICONIP 2013)* (pp. 117–124). Springer. https://doi.org/10.1007/978-3-642-42051-1_16
17. Mollahosseini, A., Hasani, B., & Mahoor, M. H. (2019). AffectNet: A database for facial expression, valence, and arousal computing in the wild. *IEEE Transactions on Affective Computing, 10*(1), 18–31. https://doi.org/10.1109/TAFFC.2017.2740923
18. Li, S., Deng, W., & Du, J. (2017). Reliable crowdsourcing and deep locality-preserving learning for expression recognition in the wild. In *2017 IEEE Conference on Computer Vision and Pattern Recognition (CVPR)* (pp. 2584–2593). IEEE. https://doi.org/10.1109/CVPR.2017.277
19. Grossard, C., Hun, S., Dapogny, A., Juillet, E., Hamel, F., Jean-Marie, H., Bourgeois, J., Pellerin, H., Foulon, P., Serret, S., Grynszpan, O., Bailly, K., & Cohen, D. (2019). Teaching facial expression production in autism: The serious game JEMImE. *Creative Education, 10*(11), 2347–2366. https://doi.org/10.4236/ce.2019.1011167
20. Regulation (EU) 2024/1689 of the European Parliament and of the Council of 13 June 2024 laying down harmonised rules on artificial intelligence (Artificial Intelligence Act). (2024). *Official Journal of the European Union*, L, 2024/1689. http://data.europa.eu/eli/reg/2024/1689/oj
21. European Commission. (2025). *Commission guidelines on prohibited artificial intelligence practices established by Regulation (EU) 2024/1689 (AI Act)* (C(2025) 5052 final). https://digital-strategy.ec.europa.eu/en/library/commission-publishes-guidelines-prohibited-artificial-intelligence-ai-practices-defined-ai-act
22. Regulation (EU) 2026/1744 of the European Parliament and of the Council of 8 July 2026 amending Regulations (EU) 2024/1689, (EU) 2018/1139 and (EU) 2023/1230 as regards the simplification of the implementation of harmonised rules on artificial intelligence (Digital Omnibus on AI). (2026). *Official Journal of the European Union*, L, 2026/1744. http://data.europa.eu/eli/reg/2026/1744/oj
23. Apple Inc. (2026, October 16). *App Store Review Guidelines*, section 1.3 Kids Category. Retrieved November 18, 2026, from https://developer.apple.com/app-store/review/guidelines/#kids
24. Google. (n.d.). *Google Play Families policies*. Play Console Help. Retrieved November 18, 2026, from https://support.google.com/googleplay/android-developer/answer/9893335
