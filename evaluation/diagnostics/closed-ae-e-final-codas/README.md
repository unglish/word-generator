# PR #480 (closed `ae` follow-up to #459 / #468) — evidence

Not part of the branch. Local checkout paths are replaced with `<scratch>`.

- `probe.mts`: counts closed `ae` syllables that no syllable spelling rule
  rewrote (`probe-main-5000000.txt` vs `probe-pr-5000000.txt`, 100k traced seeds
  from 5000000).
- `diff3.mts`: untraced baseline-vs-PR diff split into spelling-only changes
  and different words (`diff-untraced-6000000.txt`, 100k seeds from 6000000).
- `one.mts`, `one2.mts`: trace individual seeds.
- `check-summary.txt`: `npm run check` at the PR head.
