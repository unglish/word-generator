Stress-driven nucleus replacement could introduce a configured forbidden vowel/coda pair after legal coda selection. Both existing replacement pools now filter against every retained coda segment, preserve candidate order and relative weights, and reject empty or nonfinite-total pools before selection RNG. Original coda selection and optional extensions share the same configured pair predicate. Every root nucleus×coda segment pair is checked immediately before root spelling.

Rebased onto freshly fetched main `3853180d9724c8d59c432c22a32605f9363f6bd2`. Prerequisites #314 and #313 are merged and their current integration is covered by the passing nucleus-edge and coda-extension suites. Only changes after dependency-control boundary `13c2524dccabd58d37f5a8ec675eeffe1181df95` were carried forward; the obsolete dependency-only commit was not replayed.

Current main also repairs final lexical stress before spelling and copies changed vowels back into the root. This integration constrains those existing root replacements against the retained root coda, maps through prefix offsets, and preserves main's assembled-edge eligibility and look-ahead RNG. Affix-only repairs remain unconstrained by this rule. No new exclusions, weight tuning, broader stress-repair triggers, or final morphology legality are introduced.

## Fresh measurements

Validated generator commit: `a9a6be2e047ba92b21c5c442fb02b74cf0e31d20`. Both revisions were captured clean using the same current harness, references, dependency lock, environment, and fixed development protocol: four profiles × five seeds × 10,000 traced returned words = **200,000 per revision**. All source files were checked against their recorded Git commits. An independent Python pass verified artifact hashes and all pair counts.

| Profile (50,000 words each) | Main excluded pairs / root pair slots | Candidate excluded pairs / root pair slots | Unique spellings, main → candidate | Trigram JSD change (bits) |
|---|---:|---:|---:|---:|
| Lexicon default | 43 / 91,376 | 0 / 91,443 | 49,441 → 49,426 | +0.0001698 |
| Lexicon bare | 40 / 91,569 | 0 / 91,629 | 47,532 → 47,566 | −0.0006049 |
| Monosyllables bare | 202 / 109,264 | 0 / 109,258 | 16,303 → 16,247 | +0.0002179 |
| Text default | 117 / 73,829 | 0 / 73,720 | 39,485 → 39,439 | −0.0003091 |

Total: **402 / 366,038 → 0 / 366,050** at `generateWrittenForm.before`. Sampling and structural stages have zero observed exclusions on both sides. Main has 397 after root stress/edge repair and 402 before root spelling; the candidate has zero in every observed root layer. These are selected returned attempts, not every rejected proposal.

All 52,352 changed candidate root nuclei reconcile bijectively to structured repair events: 51,603 initial stress repairs and 749 final-stress root repairs. 2,983 repairs exclude 5,966 positive candidate entries. Neither revision has an observed edge repair in this cohort; that path is covered by explicit multi-segment, retained-coda, relative-weight, and invalid-pool fixtures.

Quality effects are mixed. Open-final checked-vowel observations change 549→562 / 1,222→1,253 / 272→270 / 899→877 across the four profiles (50,000-word denominators each). Surface adjacent-duplicate-coda observations change 7→8 in default lexicon and 6→5 in default text. These are outside the root-pair contract: for example, candidate lexicon-default seed `69212153`, draw `2434`, `ellerssity`, has retained root coda `/s k/`; `assembleMorphology.after` has `/s s/`. Full distributions, denominators, strata, witnesses, and tradeoffs are retained. This correction does not establish improved human wordlikeness or linguistic justification for the configured exclusions.

## Determinism and validation

- `CI=true npm run check`: 833 unit/quality tests pass, one existing skip; all 260 review tests pass. Includes 29 scoped compatibility fixtures, the current 14 nucleus-edge tests, and 25 coda-extension tests.
- `npm run build` and `npm run test:diagnostics`: pass on the restored final candidate (6 diagnostic tests).
- Default trace-on/off parity: 4,000 full outputs per revision, with equal RNG counts and next values. Cleared-exclusion conditional parity: 20,000 full outputs across 20 fixed streams match current main, including RNG counts and next values.
- Golden outputs regenerated and reviewed against traces. The first changed text word repairs `/ə ŋ/` to `/ɑ ŋ/` instead of forbidden `/æ ŋ/`. The bare-lexicon change filters the same coda-dependent pool; subsequent continuous-stream outputs change. No default-output parity claim is made.
- Unchanged performance gates pass on both revisions: main 5,375 words/sec and 1.12× median batch variance; candidate 5,234 words/sec and 1.14× (floors/limits: 4,500 words/sec and <3×).
- Controlled repeated batches, run without simultaneous tests/captures in candidate/main/main/candidate order: 280,000 timed words per revision, fourteen 20,000-word batches. Median main 5,701.4 words/sec; candidate 5,694.7 (−0.12%). Round medians favor different revisions; this is comparable observed performance, not a causal speedup claim.
- The unchanged n-gram diagnostic reports `ugh` 0.0093× against floor 0.0062 in the candidate check. No thresholds or test timeouts changed.

The first parallel/sandbox check attempt failed on restricted Git-fixture metadata, worker-contention timeouts, and the old golden fixture. Its log is retained. After reviewing/updating goldens, the repository's existing serial CI preset with Git-fixture access passes the full check. No remaining local validation failures are known.

## Evidence and review

Historical head `a5885c28b798b809078dbef04d490ca079829a91`, its original measurements, and all 58 removed experiment/probe files are preserved byte-for-byte in [archive/pr-324-before-main-2026-11-05](https://github.com/unglish/word-generator/tree/archive/pr-324-before-main-2026-11-05). Those measurements do not certify this head.

Fresh evidence is retained in [archive/pr-324-current-main-2026-11-05](https://github.com/unglish/word-generator/tree/archive/pr-324-current-main-2026-11-05/evaluation/experiments/root-rime-current-main-2026-11-05): verified manifests and source freezes, current-main comparison, independent counts, review samples and trace witnesses, parity/performance results, reproduction scripts, original PR metadata, and validation logs. Raw word shards remain a local regenerable cache, as documented in `docs/quality-baselines.md`. The mergeable commit contains only implementation, regression tests/goldens, and behavior documentation, following `docs/experiments.md`.

Review `docs/root-rime-compatibility.md`, `src/core/rime-compatibility.ts`, both replacement pools, the pre-spelling and final-root integration in `generate.ts`, and `rime-compatibility.test.ts`. Retargeted to main; not merged.
