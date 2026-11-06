# Evidence for #331's coverage-planner performance commits

Run with `npx tsx <script> <generator checkout>`.

- `bench.mts`: warmed throughput, median of 7 × 10k words. `bench-caps.txt` holds 5 interleaved
  rounds for `main` (ba568097), #331 before these commits (`base`), this head with the
  2,048 limit (`stack`), and the same with 1,024 (`c1024`).
- `prof.py <dir> incl|self [n]`: summarizes a `--cpu-prof` profile of `bench.mts`.
- `covcount.mts`, `covmax.mts`: need a temporary counter in `apply` (`globalThis.__cov`, keyed by
  outcome with call count, ms, visited assignments and max). Results on #331 before these commits:

  20k default words: 106,112 planner calls, 105,513 satisfied, 599 searched, 560 ms of 6,073 ms.

  | outcome | n | ms | visited | max |
  |---|---:|---:|---:|---:|
  | respell | 120 | 28 | 4,422 | 176 |
  | infeasible: construction-obligation | 292 | 168 | 131,369 | 7,250 |
  | infeasible: unresolved-ownership | 159 | 84 | 57,745 | 6,090 |
  | infeasible: search-budget | 10 | 154 | 81,920 | 8,192 |

  200k words (100k lexicon + 100k text): respell n 1,542, mean 28 visits, max 924.

- `fulltrace.mts`: SHA-256 of full `JSON.stringify(word)` with `trace: true` over 96k words
  (lexicon/text × morphology on/off × syllableCount none/1/3). Identical before and after
  `clonePhoneme` (`c1c7e01a556e2798`).
- `words.mts`: spelling plus spelling-budget outcomes for 600k words. At limit 2,048 vs 8,192:
  0 spelling differences, 23 trace-label differences (all to `search-budget`).
