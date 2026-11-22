# Evidence for PR #509 (#497)

- `probe.mjs <generator-root> <harness-root> <cmudict.dict> [startSeed] [count]`: counts the #497 patterns, CMU expectations stratified by syllable count, letter-trigram scorer, phone shares. `main-*.json` were run against main 439b77b0, `pr-*.json` against the PR head (before the final no-op refactor of the root assertion).
- `witness.mjs`: before-fix trace witnesses.
- `comparison.md`/`.json`: `npm run quality:pr -- --base origin/main` (development cohort).
