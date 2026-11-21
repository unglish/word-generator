# PR #482 (#460, #469 hard c) — evidence

Not part of the branch. Local checkout paths are replaced with `<scratch>`.

- `count.mts`: the #460/#469 counts by base-spelling phone ownership (both
  sides); `analyze.mts`, `bypat.mts`: diff classification and before→after
  patterns; `score.mts`: CMU letter-trigram scores on changed words.
- `ngram.mts`: bigram ratios (`cc`, rk, sk, sc, lk) over 5 seeds × 200k words.
- `examples.mts`: traced examples; `dedupe.mts`: the k+s single-`c` cases;
  `budget.mts`: the coverage-planner interaction.
- `ident.mts`: output identity of the final guard; `speed3way*.mts` and
  `speed*.txt`: rotated per-process CPU timings (main / closed-ae base / PR).
- `quality-pr/`: `npm run quality:pr` comparison (generator identical to the
  PR head).
- `check-summary.txt`: `npm run check` and `npm run build` at the PR head.
