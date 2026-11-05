# PR #312 rebased review evidence

Measured on November 5, 2026 against main `ac2e5c48a48afcf169e2d821a8e2e8056669e211`
(after #309, #310, #381/#385, #386 and #316). Candidate:
`e41eddc6c83d94bb511f66683074ae8892a75c04`, clean. Trace counts come from
[`measure.mts`](measure.mts) (`node --import tsx measure.mts <repoRoot> <out.json>`),
run over the 200,000 development words of `evaluation/quality/protocol.json`
(four profiles × five streams × 10,000 traced draws). Raw counts and examples for
main, for rebased #312 without the magic-e fix, and for the candidate are in
[`trace-measurements.json.gz`](trace-measurements.json.gz).

## What changed in the rebase

The two original #312 commits rebased onto main with no conflicts. #385's `ea`
changes (`notBeforeVowelLetter`, `neverDoubleAfter`) sit beside the deleted
`notRightContext: ["t"]` condition and are unaffected. Added after the rebase:

1. The #312 tests now find their examples by property through the public API
   (no seed or draw pins, per #380).
2. The declared fallback "initial/isolated /ɛ/ before /t/ → `ea`" from #310 is
   removed: with `e` legal before /t/ it cannot fire (0 uses in the candidate,
   2,699 on main). Tests that encoded the old ban were updated; the golden fixture
   was regenerated.
3. The magic-e fix (below), in its own commit.

The original branch's `revalidation-2026-10-04/` packet (an old-base reproduction
of the original probe, about 3.7 MB) is not carried forward: this evidence
supersedes it, and the original commits are kept at tag `archive/pr-312-original`.

## /ɛ/ before /t/

Every /ɛ/ grapheme choice directly followed by /t/ in `graphemeSelections`,
split by whether /t/ is in the same syllable.

| Context | Main: total / e / ea | Candidate: total / e / ea |
|---|---|---|
| Same syllable | 1,564 / 0 / 1,564 | 1,402 / 1,296 / 106 |
| Across syllables | 2,096 / 0 / 2,096 | 1,652 / 1,527 / 125 |
| Total | 3,660 / 0 / 3,660 | 3,054 / 2,823 / 231 |
| …via the declared `ea` fallback | 2,699 | 0 |

`e` survives the condition filter in all 3,054 candidate choices. Raw word-final
`eat` falls from 410 to 101.

Same sound, same context: over `generateWord({ seed, mode: "lexicon", morphology: false })`
for seeds 0–39,999, 38,283 words are identical, 635 differ only in spelling (same
pronunciation) and 1,082 change pronunciation (RNG and root acceptance moved).
Of the spelling-only changes, 547 are `ea` → `e` before /t/ and 71 are blocked
magic-e misfires:

| Seed | Main | Candidate | Pronunciation |
|---:|---|---|---|
| 99 | eatals | ettals | ˈɛt.əls |
| 192 | meatir | metir | mɛˈtʰɚ |
| 534 | cheatmab | chetmab | ˈtʃɛtˌmɑb |
| 770 | ceatoman | cetoman | ˈsɛ.tɔ.mən |
| 973 | beatuceenk | betuceenk | ˈbɛ.təˌsi:ŋk |
| 511 | ydeshooc | yedshooc | ˈjɛdˌʃʊk |
| 1243 | ysevorm | yesverm | ˈjɛsˌvɚm |
| 2123 | yletamp | yeltamp | ˈjɛl.tʰəmp |
| 3450 | becyre | becyer | ˈbɛkˌjɚ |

Seeds are evidence, not test pins.

### Fewer /ɛ/+/t/ words: root letter-length acceptance

The candidate has 17% fewer /ɛ/+/t/ pairs (3,660 → 3,054), almost all word-initial
(956 → 530; medial 2,704 → 2,524). The roots are still proposed: instrumenting root
attempts in lexicon-bare (temporary hook, not committed) gives 711 → 650 proposals
starting /ɛt/, with similar phoneme-count rejections (173 → 160). But two-syllable
proposals rejected for letter length rise from 133 to 231, and accepted two-syllable
roots fall from 182 to 68. Vowel-initial /ɛt/ roots are short, and `e…` is one
letter shorter than `ea…`, so more of them fall below the two-syllable 6–8-letter
peak in `LETTER_LENGTH_TARGETS` and lose to another attempt (`scoreGenerationAttempt`).
This is the known letter-count side effect, reported rather than tuned.

## The magic-e bug

The `magic-e` spelling rule rewrote a split vowel digraph by letters alone
(`([aiouy])e(C)$` → vowel + C + e). `trace.baseSpelling` records which phoneme owns
each letter, so every firing can be classified by the segments of its three letters:

| Roles of the matched letters | Example | Main | #312 rebased, no fix | Candidate |
|---|---|---:|---:|---:|
| nucleus + nucleus + coda (legitimate) | tiem → time | 6,175 | 6,203 | 6,155 |
| onset + nucleus + coda | yet → yte, yen → yne | 259 | 252 | 0 |
| onset + nucleus + nucleus | yer /jɚ/ → yre | 39 | 43 | 0 |
| nucleus + coda + coda | slaed /slæd/ → slade | 60 | 69 | 0 |
| coda + coda + coda | uez → uze | 2 | 2 | 0 |
| **Misfires** | | **360** | **366** | **0** |
| …of which consonantal y + e before /t/ (yte) | | 5 | 12 | 0 |

So #312 did not create the defect: it already misfired 360 times on main, and
allowing `e` before /t/ added the `yet` → `yte` case (5 → 12).

The fix is config-driven. `SpellingRule.letterRoles` names, per capture group, the
syllable segment whose phonemes must own those letters, read from the live
alignment (`BaseSpelling.segmentAt`). `magic-e` now matches `([aiouy])(e)(C)$` and
requires nucleus, nucleus, coda. A failing match is left unchanged and draws no
roll. The tests (`src/core/magic-e-roles.test.ts`) fail with the role check
removed (`ylekel`: `yel` → `yle`, onset + nucleus + coda) and pass with it.
Legitimate firings stay at about 3% of words.

## Quality comparison (`npm run quality:pr -- --base origin/main`)

Full report: [quality-comparison.md](quality-comparison.md) (JSON alongside).

| Profile | Trigram JSD (bits) | Missing-reference trigram mass | Unique spellings | Mean letters |
|---|---|---|---|---|
| lexicon-default | 0.1463 → 0.1447 | 0.0298 → 0.0301 | 49,492 → 49,458 | 9.220 → 9.190 |
| lexicon-bare | 0.1760 → 0.1743 | 0.0483 → 0.0508 | 47,525 → 47,535 | 7.392 → 7.379 |
| monosyllables-bare | 0.4971 → 0.4966 | 0.3459 → 0.3458 | 16,828 → 16,785 | 5.450 → 5.446 |
| text-default | 0.1558 → 0.1553 | 0.0384 → 0.0384 | 39,286 → 39,375 | 6.599 → 6.594 |

Trigram divergence falls in all four profiles. Lexicon-bare missing-reference
trigram mass rises by 0.0024, as in the original PR (+0.0030). Every invariant
metric stays at 0. Other rate changes are within their replicate ranges, for example
lexicon-bare disyllables with adjacent primary and secondary stress
40.75% → 41.01% (replicates −0.79 to +1.11 pp) and text-default words ending in an
open checked vowel 1.79% → 1.89% (−0.05 to +0.27 pp).

## Gates

`ngram-quality.test.ts` (seed 42, 200,000 words; limits unchanged):

| Measure | Candidate | Limit |
|---|---|---|
| Rarest common bigram | `ex` 0.0408× | ≥ 0.0215 |
| Most over-represented bigram | `ds` 2.846× | ≤ 4.25 |
| Most over-represented trigram | `abl` 2.199× | ≤ 3.21 |
| Rarest common trigram (report-only) | `ugh` 0.0121× | 0.0062 |

### Ten-seed phoneme calibration

Both revisions ran `npm run calibrate:phonemes -- --count 10 --jobs 4 --output ...`
(200,000 words per seed): [main](main-calibration.json), [candidate](branch-calibration.json).

| Measure | Main (min–max, mean) | Candidate (min–max, mean) | Limit |
|---|---|---|---|
| Total variation % | 1.549–1.654, 1.597 | 1.521–1.630, 1.576 | ≤ 1.78 |
| Max over-representation | 1.0489–1.0595, 1.0553 | 1.0512–1.0594, 1.0560 | ≤ 1.066 |
| Min representation | 0.9429–0.9494, 0.9473 | 0.9383–0.9502, 0.9440 | ≥ 0.918 |
| Max absolute gap (pp) | 0.299–0.362, 0.334 | 0.304–0.384, 0.335 | ≤ 0.39 |
| Pearson r (report-only) | 0.99825–0.99841 | 0.99820–0.99843 | — |

Every seed passes every limit on both sides. The candidate's worst absolute gap
(/n/ 0.384 pp on seed 947753547) is the closest to its limit.

## Performance

Three alternating `npm run test:perf` runs: main 6,366–6,752 words/s (median 6,713),
candidate 6,435–6,593 (median 6,543), about 2.5% slower; floor 4,500.

## Checks

`npm run check` (784 tests + 260 review tests), `npm run build` and
`npm run test:diagnostics` pass.
