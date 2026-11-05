# PR #324 current-main renewal

The baseline is `3853180d9724c8d59c432c22a32605f9363f6bd2` and the candidate is
`a9a6be2e` (full SHA in each manifest). Both were captured clean in the existing
thread worktree, by temporarily switching that worktree between revisions. No
additional implementation checkout was created. The harness, fixed protocol,
reference tables, package lock, and environment are identical on both sides.

The committed development protocol supplies four profiles, five streams per
profile, and 10,000 returned words per stream: 200,000 traced words per revision.
These are selected returned attempts, not every rejected proposal.

Copy the `.mjs` and `.py` files from this packet into `memory/pr324/` in the
repository before running them (their imports are relative to that directory).
Install the locked dependencies with `npm ci`. Use the same existing worktree at
each revision, with no uncommitted generator changes:

```sh
npm run quality:capture -- --id pr324-current-main-baseline --out memory/pr324/main
# Restore the candidate revision before this capture:
npm run quality:capture -- --id pr324-current-main-candidate --out memory/pr324/candidate
node --import tsx memory/pr324/observe.mjs memory/pr324/main memory/pr324/main-observation.json main
node --import tsx memory/pr324/observe.mjs memory/pr324/candidate memory/pr324/candidate-observation.json candidate
python3 memory/pr324/independent.py memory/pr324/main memory/pr324/main-observation.json
python3 memory/pr324/independent.py memory/pr324/candidate memory/pr324/candidate-observation.json
npm run quality:compare -- --baseline memory/pr324/main --candidate memory/pr324/candidate --out memory/pr324/comparison
```

Capture refuses an existing output directory. The observer first verifies every
archive artifact, then checks draw order, counts all nucleus×coda pairs, and
reconciles candidate root-repair events bijectively with changed stage coordinates.
Final-stress stage coordinates are mapped through `lexical.rootSyllableStart`.
A separate Python implementation verifies artifact hashes and recounts all five
layers. The event reconciliation also requires unchanged onsets, codas, and
segment counts, and validates retained-root codas and eligible weight totals.

The evidence tag retains manifests, summaries, complete source freezes,
distributions, unfiltered review samples, up to five complete trace witnesses per
profile/layer, independent
counts, comparison reports, scripts, and validation logs. Raw compressed word
shards are retained locally in `memory/pr324/{main,candidate}/words/`; they are an
optional regenerable cache, omitted from Git in accordance with
`docs/quality-baselines.md`. Their sizes and SHA-256 hashes remain in the manifests.
No historical dependency-control measurements are treated as current evidence.

Performance uses separate Node processes with no simultaneous test/capture jobs:
5,000 warm-up words then seven 20,000-word seeded batches per process. The order
is candidate, main, main, candidate, giving 280,000 measured words per revision.
The same seven seeds repeat across rounds; timings are paired descriptions of
this machine, not independent linguistic samples or proof of a causal speedup.
The original `npm run test:perf` gates run separately on both revisions.

`parity-perf.mjs` additionally clears only configured pair exclusions on both
sides and compares full-output SHA-256 hashes, RNG call counts, and next draws
across 20 streams × 1,000 words. Default trace-on/off parity checks compare full
outputs and RNG state across 1,000 words per profile on each revision.
`golden-traces.mjs` records all 160 golden outputs with traces; `golden-review.json`
retains the first changed output in each changed profile and all changed indices.

Validation logs include the unsuccessful first parallel/sandbox run. The final
full check uses the repository's existing `CI=true` serial-worker preset with
Git-fixture filesystem access. No gate thresholds or test timeouts were edited.
