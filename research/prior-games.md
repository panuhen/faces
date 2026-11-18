# Prior games and studies

Earlier games and trainings that teach children, mostly autistic children, to recognise or make facial expressions. Summaries are from the papers or their abstracts as we read them in November 2026.

## Studies

| Study | What it is | What it found |
|---|---|---|
| **JEMImE** (Grossard et al., 2019, *Creative Education*) [link](https://www.scirp.org/journal/paperinformation?paperid=96253) | The closest match to this game: the child sees a social situation and makes the matching face (happy, angry, sad), with live gauges as feedback. | 23 autistic children aged 6 to 12, one 75-minute session. They improved during the session and 94% liked it. Sad was clearly the hardest face to produce. The children learned to satisfy the algorithm, and the authors could not show that their expressions really got better. |
| **Serious games review** (Grossard et al., 2017, *Computers & Education*) [link](https://www.sciencedirect.com/science/article/abs/pii/S0360131517301070) | Review of serious games that teach social interaction and emotions to autistic people. | 31 games. Only 4 trained making expressions. Most were weak as games: little personalisation and dull visuals. |
| **LIFEisGAME** (Alves et al., 2013, *PsychNology*) [link](https://www.psychnology.org/File/PNJ11%283%29/PSYCHNOLOGY_JOURNAL_11_3_QUEIROS.pdf) | iPad game about recognising and making expressions. | 11 children aged 5 to 15 enjoyed it, but it needed simplifying. Fear, disgust and surprise were the hardest to recognise. Parents asked for music; therapists asked for picture-based instructions. |
| **MODU** (Park, Lee & Lee, KAIST, IDC 2021) [link](https://dl.acm.org/doi/10.1145/3459990.3465205) | Story-based "empathy expression" training game for children with mild intellectual disability. | The format closest to our narrator-and-story design. We could not read the full text, so the results are not summarised here. |
| **The Transporters** (Golan et al., 2010, *J Autism Dev Disord*) [link](https://pubmed.ncbi.nlm.nih.gov/19763807/) | Animated vehicles with real human faces. | 20 children aged 4 to 7 watched daily for 4 weeks and caught up with typically developing children on emotion recognition, including faces and situations not shown in the series. |
| **Let's Face It!** (Tanaka et al., 2010, randomised trial) [link](https://pubmed.ncbi.nlm.nih.gov/20646129/) | 7 computer games, 20 hours of play. | Real but narrow gains: recognising mouths, and recognising faces from the eyes. |
| **Superpower Glass** (Voss et al., 2019, *JAMA Pediatrics*, randomised trial) [link](https://pubmed.ncbi.nlm.nih.gov/30907929/) | Google Glass recognises expressions on people around the child; used at home. | 71 children. Social skills improved about as much as with standard therapy. Evidence that home-based digital tools can work. |
| **Meta-analysis** (Revilla et al., 2025, *Clinical Psychology & Psychotherapy*) [link](https://onlinelibrary.wiley.com/doi/full/10.1002/cpp.70116) | 29 facial emotion recognition training studies, ages 4 to 18, autistic children and other groups. | Moderate improvement (effect size about 0.7) in both groups, but few studies checked whether the gains last. |
| **CopyMe** (Harrold et al., 2014) [link](https://ch3k.com/projects/2014/04/26/copyme.html) | Mobile game where children copy facial expressions shown on screen. | An early example of the copy-the-face mechanic on a phone. |

The research is mostly on autistic children. MODU and the 2025 meta-analysis are the only sources here that also cover other groups.

## What we took from it

1. **Recognise first, then make the face.** The child taps a face card (the recognition skill, which can be checked reliably), then makes the face (play, with a forgiving detector). A weak sad detector never blocks a child who understood the story.
2. **Steps that add one difficulty at a time**, after JEMImE: copy the character's face, then the story where the character shows the feeling, then the story with a calm face, then subtler faces. (Design A8.)
3. **The same place with different outcomes**, also after JEMImE, so children cannot learn shortcuts like "balloon means happy": the red balloon scene is happy, the next one in the same park is sad. (Design A1.9.)
4. **Grown-ups set the controls**: sensitivity, hold time, time limit, number of cards, which emotions are on. JEMImE let adults set the threshold, repeats and time limit.
5. **No penalties, gentle feedback**: no failure sounds, a "getting closer" meter, Skip always available.
6. **A good game matters.** The 2017 review found most games in this field dull and unpersonalised; that is a gap this game tries to fill with characters, a story and stickers.
7. **Picture support and sound**: hints show the face, lines are read aloud, and LIFEisGAME's parents asked for music.

## Not done yet

- **Real human faces.** The Transporters used real faces because cartoon expressions don't reliably carry over to people. Design level 5 (real human faces) is future work.
- **Evidence of learning.** A rising score in the game does not prove learning (the JEMImE caveat). Evidence would need a simple before-and-after picture test outside the game.
- **Masking criticism.** Many autistic adults object to tools that train children to produce neurotypical expressions on cue. The game keeps the goal as recognising emotions in others, treats making the face as play, and never marks the child's natural expression as wrong. The design should still be reviewed by autistic adults, not only therapists.
