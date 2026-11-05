# Issue #381: `ea` before a doubled consonant or a vowel letter

Measured on November 4, 2026 against main `30466c312dcba618333f9f5a6f470baf2135516e`
(after #309 and #310). Samples are `generateWords(100000, { seed: 7, morphology: true, trace: true })`
unless stated; tracing does not change output (checked).

## Baseline and routes on main

`measure.ts` attributes every match to a route using `trace.orthography`
(root surface and grapheme units), `graphemeSelections` (doubling decisions,
fallback reasons) and `morphology`. Full output: `main-routes.json`, `branch-routes.json`.

| Pattern | Route | Main | Branch |
|---|---|---:|---:|
| `ea([^aeiou])\1` | `ea` vowel, then `tryDoubling` on a coda | 267 | 0 |
| | `ea` vowel, then `tryDoubling` on the next onset | 147 | 0 |
| | `ea` vowel, then a doubled grapheme (`ssi`) | 1 | 0 |
| | prefix `re`/`pre` + root `a…` (*readdress*) | 85 | 98 |
| | root + identical suffix consonant (`cupean`+`ness`, `meat`+`tion`) | 27 | 35 |
| | letters from separate graphemes | 8 | 6 |
| | **Total** | **535 (0.535%)** | **139 (0.139%)** |
| `ea[aeiou]` | root-final `ea` grapheme + vowel-initial suffix | 196 | 0 |
| | prefix `re`/`pre` + root `a…`/`e…` | 8 | 7 |
| | root-final `dge`/`ce` + `a` + suffix (not an `ea` grapheme) | 5 | 4 |
| | **Total** | **209 (0.209%)** | **11 (0.011%)** |

The issue's numbers (0.53%, 0.15%) predate #309/#310; the doubled rate is
unchanged, and the vowel rate rose to 0.209%. Of the 414 doubling cases on
main, 241 follow #310's declared `ɛ→ea` fallback (word-initial /ɛ/ before /t/:
`eattons` /ˈɛt.ənz/, `ineatteanorg`). No root-internal `ea` + vowel was found:
hiatus inside the root is already repaired, so every `ea` + vowel case comes at
the root/suffix join. The remaining branch matches are out of scope: prefix
joins are ordinary English (*reassess*, *preamble*), and same-letter suffix joins
are *leanness*-type (the `-tion` after /t/ concatenation is a separate,
vowel-independent issue).

## Where each half lives

- **Doubling (`doubling.neverDoubleAfter: ["ea"]`).** The vowel is chosen
  before the consonant, so "`ea` gets no weight before a doubled consonant" can
  only be enforced when the consonant is written: `tryDoubling` vetoes the
  doubled result after an `ea` nucleus, and a consonant directly after `ea` does
  not choose a doubled spelling (`ck`, `ssi`) while another candidate remains.
  This is doubling config next to `neverDouble`/`neverDoubleFinal`, not a
  grapheme weight.
- **Vowel letter (`GraphemeCondition.notRightGraphemeContext`).** The root is
  spelled before its suffix is written, but the suffix is already planned
  (#309 look-ahead). The root writer now receives the suffix's spelling
  (`orthographyFollowing`), and every ordinary `ea` carries the English alias
  `notBeforeVowelLetter` (`a e i o u`). The condition is only checked where the
  next letter is fixed (the root's last grapheme), so it never guesses.

### Unspellable context and the new fallback

Banning a root-final `ea` made one context unspellable: a one-syllable root
ending in /i:/ before a vowel suffix (`blea`+`ed`). `ea` is the only ordinary
isolated /i:/ spelling (`ee`, `e`, `y`, `ie` have isolated weight 0), so
generation threw `No legal grapheme for /i:/ at segment 1 (nucleus, syllable 0;
no-positional-candidates)`. A declared `fallbackOnly` /i:/→`ee`, limited to the
literal final segment, covers it: 82 uses per 100,000 words. A test removes the
fallback and asserts the throw. `preferenceRelaxed: "never-double-after"` never
fired (no consonant pool is emptied).

## Same-context before/after

`per-seed.ts` writes one word per `generateWord({ seed })`. Of 100,000 seeds,
98,371 are identical, 471 change spelling only (same pronunciation, so same
sounds in the same context), and 1,158 change pronunciation (root acceptance
moved; see below).

| Main | Branch | Pronunciation |
|---|---|---|
| `eattercoal` | `eatercoal` | ˌɛˌtʰɚkˈəʊ.həl |
| `antodeallive` | `antodealive` | ənˌtʰʌˈdɛl.ɪv |
| `geattirn` | `geatirn` | ˈdʒɛt.ɪrn |
| `azeacker` | `azeaker` | əˈzɛˌkʰɚ |
| `breaed` | `breed` | bri:d |
| `misspeaal` | `misspeal` | ˌmɪsˈspi:.həl |
| `smeaing` | `smeing` | ˈsmi:.həŋ |
| `seckeaing` | `secking` | sɛkˈɛ.hɪŋ |

## Side effects

- **`drop-silent-e` deletes more root-final vowel letters.** This bug is
  already on main: the `drop-silent-e` boundary transform (`/e$/`) also deletes
  an `e` that spells the root's final vowel. Root-final /ɛ/ before a vowel
  suffix can now only be `e`, and the /i:/ `ee` fallback loses one `e`. Words
  hit rise 383 → 455 per 100,000 (`toloshickeaary` → `toloshickary`,
  `seckeaing` → `secking`). It is not fixed here: deciding which vowel-final
  `e` English drops (*agreed*, *died*, *truing*, but *seeing*, *being*) is its
  own change.
- `eack` falls 64 → 22 per 100,000; `ealk` stays flat (12 → 13).
- `ea` share of nucleus choices (seed 7, 20,000 words): /ɛ/ 18.85% → 18.46%,
  /i:/ 24.18% → 23.19%.
- Written length changes root acceptance (`scoreGenerationAttempt`): on the
  phoneme gate sample, mean letters fall 7.3926 → 7.3861 and phonemes per word
  6.3506 → 6.3461.

## Quality comparison (`npm run quality:pr -- --base origin/main`)

Full report: [quality-comparison.md](quality-comparison.md) (JSON alongside).

| Profile | Zero-weight words | Trigram JSD (bits) | Phoneme JSD (bits) | Unique spellings |
|---|---|---|---|---|
| lexicon-default | 0% → 0% | 0.14587 → 0.14603 | 0.004700 → 0.004650 | 49,458 → 49,468 |
| lexicon-bare | 0% → 0% | 0.17588 → 0.17597 | 0.000576 → 0.000578 | 47,522 → 47,464 |
| monosyllables-bare | 0% → 0% | 0.49715 → 0.49714 | 0.095373 → 0.095363 | 16,828 → 16,828 |
| text-default | 0% → 0% | 0.15646 → 0.15552 | 0.006309 → 0.006264 | 39,348 → 39,325 |

One metric moved the same way in every replicate: lexicon-default affixed
words with a morphological hiatus fallback, 8.893% → 8.633% (−0.26 pp,
replicates −0.817 to −0.003). Its cause was not traced. Adjacent primary and
secondary stress in lexicon-default disyllables moved +0.26 pp, with
replicates ranging −1.55 to +1.39.

## Phoneme gate and calibration

The gate (seed 42, 200,000 bare lexicon words) does not use morphology, so only
the doubling half can move it. With the doubling check placed before the roll,
like the other `tryDoubling` skips, `npm run check` failed:
Pearson r 0.998289 < 0.9983 (main 0.998303). The per-phoneme shifts are spread
thinly (largest /ɪ/ −0.036 pp). `generateWords` shares one RNG across the batch,
so a changed draw count re-samples every later word. The shipped version still
draws the roll and then vetoes the doubled result; seed 42 gives r 0.998353
(`branch-phoneme-gate.json`). The limit was not changed.

The two variants spell identically. Drawing the roll does not keep batches
aligned with main anyway: a vowel pool reduced to one candidate stops drawing
(seed-7 batches diverge from word 59). So the seed-42 result for either variant
is a re-sample, and the ten-seed calibration is the real evidence.
`npm run calibrate:phonemes -- --count 10 --jobs 4`; limits unchanged:

| Revision | Pearson r (min–max, mean) | Max over-rep. | Min rep. | Max gap (pp) | Seeds below r 0.9983 |
|---|---|---|---|---|---:|
| Main | 0.99820–0.99840, 0.99833 | 1.0491–1.0627, 1.0564 | 0.9421–0.9521, 0.9483 | 0.301–0.364, 0.328 | 1 |
| Candidate (draw, then veto) | 0.99822–0.99842, 0.99833 | 1.0498–1.0608, 1.0561 | 0.9455–0.9517, 0.9483 | 0.301–0.356, 0.330 | 2 |
| Variant (skip before roll) | 0.99825–0.99841, 0.99833 | 1.0488–1.0595, 1.0553 | 0.9429–0.9494, 0.9473 | 0.299–0.362, 0.334 | 5 |

All three have the same mean r (SD ≈ 0.000055 across seeds) and overlapping
ranges, and no other limit is approached. Files: `main-calibration.json`,
`branch-calibration.json`, `variant-skip-before-roll-calibration.json`.

## Performance

Three alternating `npm run test:perf` runs: main 6,425–6,645 words/s
(median 6,587), candidate 6,527–6,627 (median 6,574); floor 4,500.

## Checks

`npm run check` (755 tests + 260 review tests), `npm run build`, and
`npm run test:diagnostics` pass. `src/core/ea-spelling.test.ts` fails four of
its seven tests on main (the three property tests and the fallback-throw test). The golden fixture was regenerated with
`npm run golden:update`.

## Reproducing

```sh
node --import tsx evaluation/quality/experiments/ea-spelling-381/measure.ts 100000 7
node --import tsx evaluation/quality/experiments/ea-spelling-381/per-seed.ts 100000
node --import tsx evaluation/quality/experiments/ea-spelling-381/phoneme-gate.ts
```
