# Root stop junction gate across seeds (PR #559)

Evidence for replacing the fixed ±3 slack in "samples root stop junctions near
the audited English rates (#499, #540)" with a 3σ Poisson band.

- `junctions.ts`: generates N (default 40,000) lexicon-mode words per seed and
  prints observed and expected counts per pair. The counting matches the test.
  Run it with `node --import tsx junctions.ts <seed>...`.
- `regress.ts`: the same counts with groups of `clusterWeights.boundary`
  removed (`DROP=all`, `DROP=ŋ`, `DROP=m,t,d`, `DROP=n`).
- `summarize.mjs <jsonl>...`: per-pair spread and old-band failures.
- `evaluate.mjs <z> <jsonl>...`: the new band at z standard deviations.

Data:

- `main/`: 439d2079, seeds 1000–1099 plus the pinned seed 20261123.
- `pr-556/`: 2fc2bc5d (`t3/per-stage-rng-streams`), same seeds.
- `weight-removal/`: 439d2079, seeds 20261123 and 1001.

The results are summarized in the PR #559 description.
