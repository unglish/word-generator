Fixes #476

## Changes

- Exclude /ə/ and /ɚ/ from English secondary and rhythmic stress candidates. Recheck secondary stress after nucleus repairs and affix stress changes.
- Keep occasional primary stress on a final rhotic vowel, as in *occur*. The English OT nonfinality penalty is stronger for /ɚ/ and uses the same noise draw.
- Let a selected full short root-final vowel retain secondary stress more often, as in *handicap*. Reduce unstressed vowels after spelling, with per-vowel probabilities at the word and lexical-root ends. In particular this lets LOT and THOUGHT reduce at those edges despite their inventory's `tense` flag.

## Stress and reduction

Public `generateWord({ seed, trace: true })` on 20,000 default lexicon draws, seeds 5000000–5019999, against `ce03627a`. Counted exact nucleus sounds, so /əʊ/ is excluded from schwa. CMU columns use the repository-pinned dictionary, one unlabelled pronunciation per lowercase alphabetic entry, with stress and syllable count read from the vowel tokens.

| Surface measure | Main | Candidate | CMU |
| --- | ---: | ---: | ---: |
| Words with secondary /ə/ | 1,494 (7.47%) | 0 | AH0 represents unstressed schwa |
| Polysyllables with a stressed final /ɚ/ among final rhotics | 1,005 / 2,977 (33.76%) | 107 / 2,919 (3.67%), all primary | 541 / 14,211 (3.81%) |
| Polysyllables with an unstressed full short final /ɛ æ ʌ ɑ ɔ/ | 723 / 17,508 (4.13%) | 393 / 17,508 (2.24%) | 3,168 / 102,379 (3.09%; EH0, AE0, AA0, AO0) |
| Final secondary stress among polysyllables | 3,473 (19.84%) | 2,435 (13.91%) | 13,425 (13.11%) |
| Final primary stress among polysyllables | 1,773 (10.13%) | 1,579 (9.02%) | 8,113 (7.92%) |

CMU's stressed ER endings split into 266 primary and 275 secondary. The tuning target is the combined 3.81% because English generation uses one rhotic nucleus symbol for stressed and unstressed realizations and the issue calls for secondary stress to stay off /ɚ/.

The issue's original seeds (2000000–2019999) independently give 1,478 → 0 words with secondary schwa, 980/2,918 → 96/2,899 stressed final rhotics, and 723 → 381 unstressed full short word-final vowels.

## #516 suffix doubling

The denominator uses the #516 letter shape on `trace.baseSpelling.surface` before *-ing*, *-ed*, *-er*, *-est* or *-able*. The class comes from `lexical.root` and the doubling outcome from `morphology.realization.assembledParts`.

| Root-final class | Main eligible / doubled | Candidate eligible / doubled |
| --- | ---: | ---: |
| Monosyllabic, full short | 203 / 203 | 203 / 203 |
| Monosyllabic, /ɚ/ | 13 / 13 | 13 / 13 |
| Polysyllabic, primary full short | 31 / 31 | 25 / 25 |
| Polysyllabic, primary /ɚ/ | 20 / 20 | 9 / 9 |
| Secondary full short | 72 / 72 | 103 / 103 |
| **Stressed short total** | **339 / 339** | **353 / 353** |
| Unstressed | 499 / 0 | 634 / 0 |
| Stressed long or diphthong | 66 / 0 | 60 / 0 |
| Secondary /ə/ | 27 / 0 | 0 / 0 |
| Secondary /ɚ/ | 85 / 0 | 0 / 0 |
| **All** | **1,016 / 339** | **1,047 / 353** |

Among these joins, unstressed full short root-final vowels fall 114 → 98 lexically and 71 → 52 at the surface. The remaining surface cases reflect probabilistic retention. On the issue's original seeds the corresponding counts are 149 → 98 and 87 → 53.

- Seed `5000009`: `applyStress` formerly put rhythmic secondary stress on an existing root schwa. The candidate assigns secondary stress to /æ/ and keeps the /ə/ unstressed.
- Seed `5000022`: `assembleMorphology` puts secondary stress on *re-*. The surface formerly reduced /ɪ/ to /ə/ under that mark. The candidate retains /ɪ/.
- Seed `5000028`: root-final /ɛ/ gets secondary stress before `generateWrittenForm` and retains it through `generatePronunciation`. The assembled root changes from `wetret` to `wetrett` before *-ing*.
- Seed `5001063`: affixation demotes a root /ɚ/ from primary stress. `clearBannedSecondaryStress` removes the secondary mark before spelling and surface realization.

## Side effects

On the same 20,000-seed sample, spelling trigram Jensen–Shannon divergence to the repository's CMU reference rose from **0.15031 to 0.15079 bits** (+0.00048). The share of CMU mass missing from the generated trigrams fell from 5.61% to 5.56%.

A separate `quality:pr` capture used all four development profiles and five seeds per profile at 2,000 draws each (40,000 words per side). Trigram divergence moved by −0.00057 bits on lexicon-default, −0.00031 on lexicon-bare, 0 on monosyllables-bare, and +0.00013 on text-default. The two lexicon-default samples give different directions for this small change. Mean spellings shortened 0.054 letters on lexicon-default. All sampled polysyllables retained exactly one primary stress, and the monosyllable profile was identical.

Disyllables with adjacent primary and secondary stress fell from 36.29% to 23.82% on lexicon-default. The reported root/surface spelling mismatch changed from 5,147 to 5,172 of 10,000. Both counts match the number of affixed words in their cohorts, whose root orthography is recorded separately from assembled morphology.

## Reproduce

Run `npm ci` in the candidate checkout. Export main's `ce03627a` tree to a separate directory with `git archive` and extract it. Run this packet's `probe.mjs <checkout>` through `node --import tsx` for each checkout. The optional second argument sets the first seed (use 2000000 for the holdout). Set `WITNESSES=5000009,5000022,5000028` to include the relevant stage traces. The probe's `lot` subtallies single out /ɑ/.

The CMU file is `cmudict.dict` from revision `74790861f652b15e4ac49015a90074ad62a27690`, SHA-256 `81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22`. Run `python3 cmu.py /path/to/cmudict.dict` for the reference counts.

Run `npm run quality:pr -- --base ce03627a --protocol /path/to/quality-protocol.json --out /new/output/directory` to reproduce the four-profile comparison. The manifests record the generator commit independently of the run IDs.
