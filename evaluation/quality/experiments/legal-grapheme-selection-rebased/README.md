# PR #310 rebased review evidence

Measured on November 4, 2026 against main `5e69f89db1013e455a19166f43eee5bbffdb3bbc`
(after #309). Candidate: `9127edf11a4de1325550a1ec10ab5fc5b0310368`, clean.

## What changed in the rebase

The two original #310 commits rebased onto post-#309 main. The only conflicts were
in `src/core/write.ts`: main's added base-spelling imports, and a `let`→`const`
change on a variable main has since removed. Both resolved to main's side.

One generator change was added: medial coda /z/ after /g/ is written `z` instead
of `s` (`src/elements/graphemes/fricatives.ts`), so the existing `gz-to-x`
spelling rule still writes /gz/ before a vowel as `x` (exact, exist). See
"Common-bigram gate" below. The golden fixture was regenerated with
`npm run golden:update`.

## Quality comparison (`npm run quality:pr`, development cohort)

Full report: [quality-comparison.md](quality-comparison.md) (JSON alongside).
200,000 words per side, four profiles, five seed streams each.

| Profile | Words with a zero-total-weight choice | Trigram JSD to CMU (bits) | Unique spellings |
|---|---|---|---|
| lexicon-default | 6.238% → 0% | 0.1504 → 0.1459 | 49,491 → 49,458 |
| lexicon-bare | 6.362% → 0% | 0.1844 → 0.1759 | 47,478 → 47,522 |
| monosyllables-bare | 0% → 0% | 0.5073 → 0.4972 | 16,216 → 16,828 |
| text-default | 2.592% → 0% | 0.1588 → 0.1565 | 39,095 → 39,348 |

Every replicate stream moved the zero-weight rate the same way. One other metric
moved consistently in the "worse" direction: lexicon-default disyllables with
adjacent primary and secondary stress, 39.72% → 40.63% (+0.91 pp; replicate range
+0.26 to +2.14). Stress assignment itself is unchanged. Each root attempt is scored
partly on its written letter count (`scoreGenerationAttempt` in
`src/core/generate.ts`), so shorter or longer spellings change which candidate
roots are accepted, and with them the stress-pattern mix.

## Common-bigram gate

Without the /z/ change, the rebased PR fails `ngram-quality.test.ts`: `ex` falls to
0.0176× its CMU frequency, under the unchanged 0.0215× limit (the original PR
measured 0.0155×). On main, /gz/ before a vowel reached `gz-to-x` only through the
zero-weight `ze` accident, leaving a stray `e` (`exeiffary` /ˌɛgzˈɪf.ɛr.i:/).
Legal selection writes that /z/ as `s`, which the rule does not match.

Widening the rule to `g[sz]` was tried and rejected: letters cannot separate /gz/
from /gs/, and it wrote /gs/ as `x` (`cexinsitife` /ˈsɛg.sɪn.sə.taɪv/).

`ex` sources over 250,000 default words (seeds 42, 123, 456, 789, 1337):

| Source | Main | Rebased #310 | With /z/ change |
|---|---:|---:|---:|
| /gz/ written x | 70 | 11 | 78 |
| /ks/ written x | 44 | 26 | 28 |

The /ks/ drop is a side effect, not a correction. With segment scope, /k/ before a
word-final /s/ is a medial segment, so `c` uses its mid-word weight (300 × 80 =
24,000; main used its word-final weight, 300 × 10 = 3,000), while syllable-scoped
`ck` keeps 80 × 150 = 12,000. Fewer `k`/`ck` spellings reach `ks-to-x`. Over the
same 250,000 words, word-final /ks/ written `x` falls from 119 to 58 and `-ks`
from 252 to 199; `-cks` is unchanged (410 → 401) and `-cs` stays the most common
ending on both sides (1,937 → 1,994). This is left for review rather than tuned.

Gate results (seed 42, 200,000 words; limits unchanged):

| Measure | Main | Candidate | Limit |
|---|---|---|---|
| Rarest common bigram | `ex` 0.0446× | `ex` 0.0434× | ≥ 0.0215 |
| Most over-represented bigram | `ze` 3.700× | `ds` 2.914× | ≤ 4.25 |
| Most over-represented trigram | `abl` 2.209× | `abl` 2.145× | ≤ 3.21 |
| Rarest common trigram (report-only) | `ugh` 0.0056× | `ugh` 0.0121× | 0.0062 |

This keeps the letter-rule route to `x`. A cluster-level /gz/→`x` spelling with
segment ownership remains possible future work.

## Ten-seed phoneme calibration

Both revisions ran `npm run calibrate:phonemes -- --count 10 --jobs 4 --output ...`
(200,000 words per seed). Limits unchanged and not retuned.

| Measure | Main (min–max, mean) | Candidate (min–max, mean) | Limit |
|---|---|---|---|
| Pearson r | 0.99827–0.99855, 0.99842 | 0.99820–0.99840, 0.99833 | ≥ 0.9983 |
| Max over-representation | 1.0442–1.0558, 1.0495 | 1.0491–1.0627, 1.0564 | ≤ 1.066 |
| Min representation | 0.9429–0.9530, 0.9484 | 0.9421–0.9521, 0.9483 | ≥ 0.918 |
| Max absolute gap (pp) | 0.284–0.351, 0.318 | 0.301–0.364, 0.328 | ≤ 0.39 |

One seed falls under the r floor on each side (main 0.99827, candidate 0.99820), as
on main before. The candidate is slightly further from CMU on r and
over-representation (/z/ and /k/ lead), through the same letter-count acceptance
effect; the margin to the 1.066 limit narrows to 0.003 on the worst seed.

## Issue #384 reproduction

At this commit, the #384 snippet (seed 4167471042, text mode, morphology, trace)
yields zero zero-total-weight choices at draws 53 and 62, and across its first
50,000 draws (main: 1,202 affected words). 646 words used a declared fallback
(`ɛ→ea`, `ʊ→oo`). Draw indices are evidence, not test pins.

## Performance

Three alternating `test:perf` runs: main 6,846–6,977 words/s (median 6,970),
candidate 6,436–6,791 (median 6,667), about 4% slower; floor 4,500.

## Checks

`npm run check` (747 tests + 260 review tests), `npm run build`, and
`npm run test:diagnostics` pass.
