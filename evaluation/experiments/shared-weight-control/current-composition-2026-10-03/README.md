# Q08a cumulative compatibility checkpoint

This measurement compares candidate `c15565aca3e613a5f321e3128e22098cf6c9aff5`
with control `233b455732920ac529b2dda2a623df0a6ca17446`, which includes resolved
allomorph handling from Q06. It preserves the earlier standalone Q08a study
and adds a complete comparison at the rebased head.

PR #319 merged as `d2c083aa04a6b3c744017e3b09626b29b6bdc9e3` on
2026-10-03 at 23:33:31 UTC. A subsequent Git comparison finds no changed
measured source, CMU reference, package or test configuration bytes between
the measured candidate and that merge. Main subsequently advanced to
`cd96f54f72038efb48e37c2003c4f700f9076671`; eight source paths differ from
the Q08a merge. [The merge binding](merge-binding.json) records those paths.
This checkpoint does not certify their combined behavior or future main.

## Recorded results

The original protocol remains four profiles, five development seeds per
profile and 10,000 continuous draws per seed: **200,000 traced words per arm**.
The frozen evaluator is `ad7bf798…`, reference `38cf9d0b…`. Validation seeds
were not used. The control archive is the fully authenticated exact-head
archive from the cumulative Q07 comparison; the candidate archive is fresh.

Untouched public checkouts reproduce all 400,000 complete archived words and
traces. All 200,000 legacy payload pairs match after removing only the added
`trace.stressWeight` field. Every per-draw cumulative RNG boundary, total
callback count and next RNG value matches across the twenty full streams.
The original trace-off scope remains 1,000 words per stream per arm: all
40,000 words match their traced prefixes. A separate 40,000-word trace-on
prefix replay matches every trace-off callback boundary and next RNG value.
That supplement closes a prefix callback comparison omitted from the first
full replay report; it does not expand the scientific sample or replace it.

An independent Python implementation recounts all 400,000 raw records and
checks every legacy pair, all thirteen core metrics, actual morphology and
length strata, complete phone/trigram counts, histograms, review samples,
diagnostic traces, weight/stress observations and complete bounded witnesses.
**All core summary fields except run ID and all distributions are identical.**
Read the [complete diagnostic comparison](candidate-vs-control.md); unchanged
diagnostics include existing stress, hiatus, grapheme and open-vowel problems.

| Candidate observation | Count |
| --- | ---: |
| Observed root syllables | 340,840 |
| Nuclear segments with unspecified quantity | 340,840 |
| Secondary-stress candidates | 125,832 |
| Applied secondary-stress selections | 35,131 |
| Bare words with final root stress corroborated | 142,491 |
| Affixed words with earlier root/final stress correspondence unavailable | 57,509 |

Weight diagnostics refer to `applyStress`, in the root before nucleus repair
and morphology. The default `legacy-segment-count` policy remains unchanged;
analytical quantity stays unknown when the inventory does not declare it.
This establishes sampled compatibility and adds observability. It does not
assign English vowel quantity or demonstrate better human wordlikeness.

## Gates and performance

Fifteen commands complete: thirteen pass and two whole-checkout lint commands
fail. Normalized full lint logs are identical, with ten inherited errors:
seven quote errors in `language.test.ts`, two unused symbols and one
`prefer-const` error in `write.ts`. Current unit suites pass 513 control tests
and 551 candidate tests, with one existing skip per arm. Both type checks and
twelve current quality tests per arm pass. All 49 targeted syllable-weight and
resolved-allomorph fixtures pass.

Separate clones run the original five n-gram, one phoneme-distribution and
twelve quality tests per arm with their exact historical helpers, thresholds,
seeds, sample sizes and configurations. All pass. Their passing results remain
separate from the current upstream gate policy. No gate was relaxed.

All twelve unchanged native performance tests pass in six alternating pairs:
10,000 words, 50 warmup words, 4,500 words/sec floor, variance below 3× and
20,000 ms timeout. Median candidate/control throughput ratio is 0.985235 from
rounded native logs; pair ratios range from 0.976320 to 1.062625. Owned replay,
recount, gates and Q23 reconstruction/decisions jobs finished before timing.
Ambient desktop and simulator activity remains uncontrolled. These timings
do not establish a stable general performance improvement.

## Evidence and reproduction

`evidence.tar.gz` retains 284 lossless members: complete measured source and
references, frozen evaluator/observer, original gate sources, nine operators,
compact capture reports, complete diagnostic comparison, full bounded trace
witnesses, public and independent records, all gate and timing logs. The
manifest authenticates every member by bytes and SHA-256. Scripts preserve
their actual execution paths; a fresh replay requires adapting those paths
and supplying their complete original prerequisites.

The full local retained archive contains 397 independent inodes / 332,621,609
bytes. Index SHA-256:
`99b4e6671f7178229118331d4961e563d8ec2e50709041f7088bee5e6b54003f`.
All forty raw word/trace shards and 75 selected actual Node/TSX runtime files
remain external, with explicit pins in the manifest. COW files share storage
extents and are not an independent-device backup. Full Python, Node, Vitest,
ESLint and TypeScript installations and Git history remain external; lockfile
provenance and recorded outcomes do not replace those installations.

From the repository root, authenticate the compact bytes and recorded outcomes:

```sh
python3 -B evaluation/experiments/shared-weight-control/current-composition-2026-10-03/verify.py
```

With the complete retained archive available, rehash every retained file too:

```sh
python3 -B evaluation/experiments/shared-weight-control/current-composition-2026-10-03/verify.py --retained /path/to/q08a-current-composition-retained-v1
```

These commands verify integrity and recorded outcomes. They do not rerun the
scientific analysis, establish statistical independence of seeds, or supply
actual human observations. Full scientific replay/recount requires the
external raw archives and runtime prerequisites. Later composition remains
a separate measurement.
