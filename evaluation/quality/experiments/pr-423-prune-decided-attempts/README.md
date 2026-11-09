# PR #423 evidence: reject attempts decided by phoneme count before spelling

Generator at the parent commit of this tag (PR head 94f05ae6), compared against
merge base aeb4e9c9 (`main`).

- `comparison.md` / `comparison.json`: `npm run quality:pr -- --base origin/main`,
  development cohort, 200k words per side.
- `rej.json`: `npm run audit:rejections` on the candidate (consistency validation passed).
- `count2.mjs`: attempt-outcome instrumentation (run against an instrumented dist copy):
  2.72 attempts/word, 39.7% miss the phoneme target, 23.8% decided (prunable).
- `bench.mjs`: 50k-word timing; main 183.3 vs branch 163.7 µs/word (6 interleaved runs).
- `dist-check.mjs`: TVD of letter/phoneme/syllable/bigram distributions, pruning on vs off,
  against an off-vs-off seed noise floor (prototype toggle build).
- `letters.mjs`: 40-stream mean-letter comparison, main vs branch; no shift (|z| < 0.8).

Scripts contain absolute scratch paths from the original run; adjust imports to rerun.
