# Spelling budget scan performance experiment

This revision removes repeated string reconstruction from spelling budget
measurement. It preserves the frozen Q13 candidate's output and improves median
paired throughput by **6.4% on this machine**. All six optimized runs pass the
unchanged 4,500 words/sec floor; all six original Q13 runs fail it. This does not
recover every performance cost introduced by Q13 or resolve its quality failures.

## Review entry points

1. `src/core/spelling-budget.ts`: the only runtime change, confined to
   `measureSpellingBudgets` and its unused import. The raw-letter scan classifies
   each code unit once; the separate token scan retains full-surface context and
   advances one UTF-16 offset. Tokenizer/shared helper behavior is unchanged.
2. `src/core/spelling-budget.test.ts` and the nested `linear-spelling-budget`
   probe: 248,042 frozen-reference comparisons, hand expectations, terminal and
   contextual y, custom token ordering/mutations, Unicode offsets, getter order,
   limit truthiness, and detached results.
3. This package: exact parity, preserved failures, all timed observations, and
   independent reconciliation. `artifacts.json` pins every packaged file.

## Exact controls and provenance

The branch starts at #328 commit `973406761e17f9b1795ba519a694cade68a7c2db` and targets
`codex/preserve-spelling-coverage`. Original runtime identity (52 files):
`f0a9da1fa95cb7f0d8901b82567d94f1b565a36a83c58d404f7c8b0528a79666`.
Candidate identity (52 files):
`3dfffb12c5f595507276983f0eae78fedf010726c928ed69cd182db987c3da5b`.

`generator-sources.json.gz` retains both complete runtime source sets;
`observer-sources.json.gz` retains the 23-file observer/definition closure. The
production reading/certificate verifier is loaded from the frozen original
runtime. The v1 evaluator, protocol and original 200,000-word archive stay
unchanged. Original raw words remain in
`memory/quality-runs/spelling-coverage-candidate`; this compact package pins its
manifest and every shard hash rather than duplicating those words.

The approved profiling/design plan is preserved verbatim. Preregistration SHA:
`f5d372ac34ab7f92f1c46c7fec946907c4964745f8b8860ef7ef1451437dac4b`.
The protocol, reference and 25 new fixtures were frozen and passed on the original
before the runtime edit. The formal observer implementation was then pinned
before generation; all source, observer, definition, dependency and archive
fingerprints were checked again after the study. No runtime amendment or tuning
followed the formal capture or timing.

## Correctness and inherited failures

- **800,000 public API calls:** four paths over the same 200,000 coordinates
  (original/candidate × trace on/off). Complete traced words, every nontrace
  field, per-draw RNG counts and replicate-end next RNG values match exactly.
  All candidate serialized words/traces also equal the immutable archive.
- **1,517 certificates:** every proposed ledger/certificate verifies against the
  original production verifier. All visit/options/refusal counters and IDs match
  through full trace equality. This is not an independent reading implementation.
- **84,800 supplementary calls:** 20,000 four-way omitted-policy draws, 1,600
  paired custom doubling draws and 800 paired factory-mutation draws all match.
- **Focused checks:** 88/88 pass. Strict source, fixture and observer TypeScript,
  scoped ESLint and whitespace checks pass. The simplifier review needed no
  further changes.
- **Full suite:** 558 pass, one skip, five inherited failures with identical
  assertions and values: ex=0.016088431920679963, ugh=0.004918725049806447, and cap
  counts 9/100k, 31/100k and 36/10k. The 31 additional passes relative to the older
  full-run capture comprise 25 new fixtures plus six existing observer fixtures.
- **Quality suite:** 11/12 pass; the inherited cap failure remains 62/50k.
  The complete quality report is byte-identical to frozen Q13. An initial
  sandboxed attempt also failed to write the report; it is retained separately.
  The authorized rerun resolved that environment failure only.

This is executed schedule/fixture equivalence, not proof for every possible
custom configuration or installed binary. No quality threshold changed.

## Preregistered isolated timing

Node v24.11.1, Apple M1 Max, Darwin arm64. Twelve fresh `npm run test:perf`
processes ran in an explicitly reserved quiet interval, after all correctness
and other agents' heavy jobs finished. Fixed pair order: A/B, B/A, A/B, B/A,
A/B, B/A. A is original Q13, B this revision. The unchanged suite warms 50 words
at seed 0, times 10,000 at seed 42, and runs its unchanged variance gate.

| Pair | A words/sec | B words/sec | B/A gain |
| --- | ---: | ---: | ---: |
| 1 (A/B) | 4,362 | 4,669 | 7.04% |
| 2 (B/A) | 4,328 | 4,594 | 6.15% |
| 3 (A/B) | 4,390 | 4,653 | 5.99% |
| 4 (B/A) | 4,353 | 4,668 | 7.24% |
| 5 (A/B) | 4,355 | 4,628 | 6.27% |
| 6 (B/A) | 4,363 | 4,647 | 6.51% |

Median paired B/A is **1.0638897**, range 1.0599089–1.0723639; all six pairs
improve, satisfying the registered requirement of median >1 and at least five
positive pairs. Separate version medians are 4,358.5 and 4,650 words/sec.
Throughput-floor passes change from 0/6 to 6/6; variance passes are 6/6 for both.

The table and paired arithmetic use the unchanged harness's rounded displayed
throughput. Actual gate assertions use unrounded values. Every raw log, outcome,
environment, ordering and source pin is retained under `performance/`, including
rounding intervals. No trial was discarded and no interruption occurred. This is
one local series, not a general speed estimate. The prior one-order Q13 comparison
measured about 38% lower throughput against its prerequisite control; that broader
regression is not remeasured or claimed recovered here.

The initial CPU profiles and exact function counts are retained under `profiling/`.
Their timings are diagnostic, not isolated performance evidence. They identified
129,611 budget measurements per 10,000 outputs; this revision leaves that count,
the search bound and all decision points intact. More costly detached snapshots
remain a separate hypothesis because their aliasing/mutation contracts differ.

## Reproduction and CI scope

The formal probe uses the unchanged frozen #307 quality reader/serialization
tooling (retained in the observer bundle); top-level evaluator files are not
modified or added by this PR. Materialize the original runtime bundle, install
the pinned dependencies, and use the preserved raw Q13 archive. Run the nested
`linear-spelling-budget/parity.ts` with ORIGINAL_RUNTIME, CANDIDATE_RUNTIME,
Q13_ARCHIVE and an exclusive NEW_REPORT path. The runner validates all pins and
refuses a partial or different schedule. Timing additionally requires a reserved
quiet window and the unchanged predeclared sequence.

This is stacked on #328. Current Actions only target `main`, so those checks do
not run automatically against this intermediate branch; the reported validation
is local. No claim that the inherited failing Q13 behavior is ready to merge is
made here.
