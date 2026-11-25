# Per-stage random streams (#556, PR #560)

Evidence for PR #560. Not part of `main`.

- `comparison.md`, `comparison.json`: `npm run quality:pr -- --base origin/main`
  (70d9674c), 50,000 words per run in four cohorts. Raw run output is omitted
  (about 400 MB).
- `paired.mts`, `paired-main.json`, `paired-branch.json`, `paired.md`: seeds
  1–20 through `generateWord({ seed })` on main and on this branch.
- `barematch.mts`, `barematch-*.txt`: for seeds 0–1,999 in lexicon mode, how
  many words whose affix plan is bare equal the `morphology: false` word.
- `keycollide.mts`, `keycollide-branch.txt`: over one million word keys, seed
  collisions per stream and whole-word collisions (every stream at once).
- `clash.mts`, `clash.txt`: disyllables with adjacent primary and secondary
  stress over 300,000 words per side and mode (columns: clashes,
  disyllables, percent).
- `hyphex.mts`: the probe behind #557 (hyphenated spelling missing whole-word
  rules); present on main, unchanged by this PR.

Run a probe with `npx tsx <probe> <repoRoot> [mode]` from a checkout.
