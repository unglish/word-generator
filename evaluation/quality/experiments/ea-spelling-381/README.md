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
| | prefix `re`/`pre` + root `a…` (*readdress*) | 85 | 94 |
| | root + identical suffix consonant (`cupean`+`ness`, `sleat`+`tion`) | 27 | 41 |
| | letters from separate graphemes | 8 | 1 |
| | **Total** | **535 (0.535%)** | **136 (0.136%)** |
| `ea[aeiou]` | root-final `ea` grapheme + vowel-initial suffix | 196 | 0 |
| | prefix `re`/`pre` + root `a…`/`e…` | 8 | 11 |
| | root-final `dge`/`ce` + `a` + suffix (not an `ea` grapheme) | 5 | 10 |
| | **Total** | **209 (0.209%)** | **21 (0.021%)** |

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
  only be enforced when the consonant is written: `tryDoubling` skips doubling
  after an `ea` nucleus (reason `never-double-after`; like its other skips, it
  draws no roll), and a consonant directly after `ea` does
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
97,979 are identical, 369 change spelling only (same pronunciation, so same
sounds in the same context), and 1,652 change pronunciation (root acceptance
or the RNG stream moved; see below).

| Main | Branch | Pronunciation |
|---|---|---|
| `eattercoal` | `eatercoal` | ˌɛˌtʰɚkˈəʊ.həl |
| `holeassilled` | `holeasilled` | hɔˈlɛzˌɪld |
| `geattirn` | `geatirn` | ˈdʒɛt.ɪrn |
| `outeattor` | `outeater` | ˈaʊtˌɛtˌɚr |
| `breaed` | `breed` | bri:d |
| `misspeaal` | `misspeal` | ˌmɪsˈspi:.həl |
| `smeaing` | `smeing` | ˈsmi:.həŋ |
| `seckeaing` | `secking` | sɛkˈɛ.hɪŋ |

## Side effects

- **`drop-silent-e` deletes more root-final vowel letters.** This bug is
  already on main: the `drop-silent-e` boundary transform (`/e$/`) also deletes
  an `e` that spells the root's final vowel. Root-final /ɛ/ before a vowel
  suffix can now only be `e`, and the /i:/ `ee` fallback loses one `e`. Words
  hit rise 383 → 448 per 100,000 (`toloshickeaary` → `toloshickary`,
  `seckeaing` → `secking`). It is not fixed here: deciding which vowel-final
  `e` English drops (*agreed*, *died*, *truing*, but *seeing*, *being*) is its
  own change.
- `eack` falls 64 → 21 per 100,000 batch words (78 → 21 over the 100,000
  per-seed words). In the per-seed sample, `ealk` (the /k/ spelling `lk`
  after `ea`) rises 7 → 15.
- `ea` share of nucleus choices (seed 7, 20,000 words): /ɛ/ 18.85% → 18.27%,
  /i:/ 24.18% → 22.30%.
- Written length changes root acceptance (`scoreGenerationAttempt`): on the
  phoneme gate sample, mean letters fall 7.3926 → 7.3853 and phonemes per word
  6.3506 → 6.3448.

## Quality comparison (`npm run quality:pr -- --base origin/main`)

Full report: [quality-comparison.md](quality-comparison.md) (JSON alongside).

| Profile | Zero-weight words | Trigram JSD (bits) | Phoneme JSD (bits) | Unique spellings |
|---|---|---|---|---|
| lexicon-default | 0% → 0% | 0.14587 → 0.14594 | 0.004700 → 0.004738 | 49,458 → 49,496 |
| lexicon-bare | 0% → 0% | 0.17588 → 0.17595 | 0.000576 → 0.000564 | 47,522 → 47,525 |
| monosyllables-bare | 0% → 0% | 0.49715 → 0.49714 | 0.095373 → 0.095363 | 16,828 → 16,828 |
| text-default | 0% → 0% | 0.15646 → 0.15576 | 0.006309 → 0.006264 | 39,348 → 39,314 |

No metric moved the same way in every replicate.

## Phoneme gate and calibration

The gate (seed 42, 200,000 bare lexicon words) does not use morphology, so only
the doubling half can move it. `generateWords` shares one RNG across the batch,
so a skipped doubling roll re-samples every later word in the gate's sample.

**Old Pearson r floor.** On current main this version fails:
r 0.998289 < 0.9983 (main 0.998303). The per-phoneme shifts are spread thinly
(largest /ɪ/ −0.036 pp; `branch-phoneme-gate.json`). An earlier commit of this
PR drew the roll and then blocked the doubled result. It spelled the same words
and gave r 0.998353 at seed 42, but neither version keeps batches aligned with
main: a vowel pool reduced to one candidate also stops drawing. The difference
was a re-sample, not a real effect: across 10 seeds, main and both versions all
average r 0.99833.

**New total-variation gate (#386).** That gate replaces the r floor; this
version passes it. Ten seeds per revision, the same seeds on each
(`npm run calibrate:phonemes -- --count 10`, main measured with #386's metrics):

| Revision | Total variation, pp (min–max, mean) | Pearson r, report-only | Max over-rep. | Min rep. | Max gap (pp) |
|---|---|---|---|---|---|
| Main | 1.5458–1.6302, 1.5805 | 0.99820–0.99840, 0.99833 | 1.0491–1.0627, 1.0564 | 0.9421–0.9521, 0.9483 | 0.301–0.364, 0.328 |
| This PR (skip before roll) | 1.5490–1.6544, 1.5974 | 0.99825–0.99841, 0.99833 | 1.0488–1.0595, 1.0553 | 0.9429–0.9494, 0.9473 | 0.299–0.362, 0.334 |
| Limit | ≤ 1.78 | — | ≤ 1.066 | ≥ 0.918 | ≤ 0.39 |

Every seed passes every limit; seed 42 measures 1.640% (limit 1.78). Total
variation rises by a mean of 0.017 pp, higher on 8 of 10 paired seeds. That is
small, about 0.4 SD of the seed spread, and is reported here, not tuned. Files:
`main-calibration.json`, `branch-calibration.json`, and
`variant-draw-then-veto-calibration.json` (the earlier version, r only).

## Performance

Three alternating `npm run test:perf` runs: main 5,904–6,590 words/s
(median 6,563), candidate 6,413–6,765 (median 6,439); floor 4,500. The
difference is within run-to-run noise.

## Checks

With #386 applied, `npm run check` (756 tests + 260 review tests) passes. On
current main the only failure is the old r floor above. `npm run build` and
`npm run test:diagnostics` pass. `src/core/ea-spelling.test.ts` fails four of
its seven tests on main (the three property tests and the fallback-throw test). The golden fixture was regenerated with
`npm run golden:update`.

## Reproducing

```sh
node --import tsx evaluation/quality/experiments/ea-spelling-381/measure.ts 100000 7
node --import tsx evaluation/quality/experiments/ea-spelling-381/per-seed.ts 100000
node --import tsx evaluation/quality/experiments/ea-spelling-381/phoneme-gate.ts
```
