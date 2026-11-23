Fixes #503, fixes #498.

## Change

English lexicon mode uses positive weights for two root repetition patterns. Nucleus selection in roots of four syllables or more downweights a candidate that would complete three equal vowels in a row. Surface reduction has its own multiplier for changes that would produce such a run.

Both sequential coda construction and the audited root-final table downweight codas whose first sound matches the last sound of the onset. Stronger pressure applies to /l/. Existing coda eligibility rules still apply. The weighting preserves the probability of unpenalized /r s z ŋ/ coda starts within each choice set. This avoids shifting the removed weight into rhotic rimes or other already common starts.

Each selection uses the existing RNG draw. Fixed seeds retain deterministic behavior with the new weights. The golden fixture records the intentional output changes.

## Matched seed evaluation

`generateWord({ mode: "lexicon", seed, trace: true })` on seeds 5,000,000–5,019,999, with default morphology. Baseline is `ce03627a`. The CMU reference contains all 21,197 stripped roots from #492, independently verified with the pinned sources. Roots use the wordlikeness model's maximal attested onsets. CMU rates are weighted to the generated root-length mix. The analysis ignores stress digits except when distinguishing AH0 from stressed AH. Generated surface roots are sliced at their realized offset. Each root counts at most once for each pattern.

| Root pattern | Before | After | Matched CMU roots |
| --- | ---: | ---: | ---: |
| Vowel triple, all roots | 146 (0.730%) | 51 (0.255%) | 0.234% |
| Adjacent vowel pair, including triples | 1,806 (9.030%) | 1,783 (8.915%) | 7.760% |
| Matching onset-final/coda-initial consonants | 1,394 (6.970%) | 563 (2.815%) | 2.586% |
| /l/ match | 335 (1.675%) | 8 (0.040%) | 0.027% |
| /n/ match | 294 (1.470%) | 163 (0.815%) | 0.694% |
| /t/ match | 256 (1.280%) | 94 (0.470%) | 0.417% |
| /k/ match | 166 (0.830%) | 64 (0.320%) | 0.217% |
| /s/ match | 104 (0.520%) | 97 (0.485%) | 0.461% |
| Vowel triple, 3 syllables | 13/3504 (0.371%) | 13/3504 (0.371%) | 0.405% |
| Vowel triple, 4 syllables | 60/1221 (4.914%) | 20/1221 (1.638%) | 1.465% |
| Vowel triple, 5+ syllables | 73/400 (18.250%) | 18/400 (4.500%) | 3.693% |

The holdout (seeds 6,000,000–6,019,999) moved from 135 to 53 triples and from 1,322 to 529 matching consonants.

## Trace attribution

- Triple counts at generated went 190 → 80.
- Triple counts at lexical went 107 → 41.
- Triple counts at surface went 146 → 51.
- Surface /ɪ/ triples went 43 → 24 against 29.7 expected. Schwa triples went 101 → 25 against 12.2 expected.
- In the baseline, 70 of the surface triple hits first appeared after lexical selection. An earlier generation-only trial left 100 surface triples on the same seeds, motivating the reduction multiplier.
- Seed 5,000,119, `tobitchritat` → `tobitchriter`. `generateSyllables` shows /tɑ bətʃ rə tət/ → /tɑ bətʃ rə tɛr/.
- Seed 5,000,261, `entilol` → `entilom`. `generateSyllables` shows /ənt ɪ ləʊl/ → /ənt ɪ ləʊm/.
- Seed 5,000,381 with only the reduction multiplier toggled, `ikyickodar` → `ikyickodar`. `generatePronunciation` shows /ɪk jə kəd ər/ → /ɪk jɪ kəd ər/.

## Side effects

The phoneme comparison below uses 50,000 words per profile and revision, sampled
from the five development RNG streams in the committed quality protocol. JS uses
the full CMU phoneme reference. Bare-root TV uses the audited stage reference.
Text mode is outside the calibrated lexicon policy. A separate 2,000-seed
comparison verified exact text-mode word and trace parity with the baseline.

| Profile | Phoneme JS (bits) | Phoneme TV (pp) |
| --- | ---: | ---: |
| lexicon-default | 0.005007 → 0.005075 | 6.533 → 6.556 |
| lexicon-bare | 0.005121 → 0.005012 | 7.139 → 6.858 |
| monosyllables-bare | 0.043541 → 0.043478 | 18.401 → 18.258 |
| text-default | 0.006550 → 0.006550 | 7.743 → 7.743 |

- #509 rhotic onset plus rhotic rime in both traced cohorts (40,000 roots per side) went 0 → 0.
- Tense nucleus plus coda /r/ in both traced cohorts (40,000 roots per side) went 1,046 → 1,043.
- /ə ʌ/ plus coda /r/ in both traced cohorts (40,000 roots per side) went 541 → 546.
- Root-final /ɚl/ in both traced cohorts (40,000 roots per side) went 545 → 502.
- Mean phones went 6.6338 → 6.6332.
- Mean letters went 7.8571 → 7.8572.
- Mean syllables went 2.4668 → 2.4664.
- Mean CMU normalized spelling log score went -2.5676 → -2.5613.
- Primary trigram JS went 0.150307 → 0.148909 bits.

The two 20,000-seed trace cohorts show lower finished phoneme JS
(0.005038 → 0.004952 and 0.005131 → 0.005019). The separate 50,000-word
default lexicon cohort shows a small increase in both JS and TV, so the
distribution non-regression criterion is still open. English applies the
calibrated weights only to lexicon mode because an earlier two-mode trial
showed a larger divergence increase in text mode.

## Verification

The final revision passed 85 targeted tests for configuration, root repetition,
RNG parity, and golden output. The pre-scope refinement passed the existing
`#509` rhotic-rime suite, and the two traced cohorts retained zero targeted
rhotic rimes. The full `npm run check` run on the refined revision hit timeouts
in existing long spelling and morphology tests. The exact final revision is
running separately in a writable checkout so the regeneration tests can
create their Git worktrees.
