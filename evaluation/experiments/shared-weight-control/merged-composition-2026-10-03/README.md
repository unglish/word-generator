# Q07 and Q08a together on merged main

This full comparison measures main `cd96f54f72038efb48e37c2003c4f700f9076671`
after merging Q07 / #314 and Q08a / #319. Control is the complete Q08a candidate
`c15565aca3e613a5f321e3128e22098cf6c9aff5`, before Q07. It follows the
[Q08a cumulative checkpoint](../current-composition-2026-10-03/README.md),
which separately verifies Q08a against Q06-containing `233b455`.

The original four profiles, five development seeds per profile and 10,000
continuous draws per seed remain unchanged: 200,000 traced words per arm.
The exact-head control archive is reused after every artifact is authenticated;
all 200,000 candidate words are freshly captured. Frozen evaluator `ad7bf798…`
and reference `38cf9d0b…` remain unchanged. Validation seeds were not used.

## Full composition evidence

Untouched public APIs reproduce all 400,000 complete archived words and traces.
The original 1,000-word trace-off prefixes per stream and arm reproduce all
40,000 corresponding words and callback boundaries. Every full-stream RNG
boundary and next value is recorded. Q07 changes proposal streams, so these
are not asserted equal across arms or against unrecorded archival RNG history.

A separate Python implementation recounts all 400,000 records, all thirteen
core metrics, actual morphology/length strata, complete phone/trigram counts,
histograms, review samples, diagnostic traces, every nucleus layer/repair,
resolved-allomorph selection/boundary/cleanup observation, root quantity,
primary/secondary stress and their full bounded witnesses. All independently
computed counts and witnesses match the native reports. Both complete measured
source closures remain unchanged.

Every one of the 200,000 candidate legacy payloads matches the earlier fully
verified Q07 candidate `fa8c537`, after removing only the added
`trace.stressWeight`. No written, pronunciation, syllable or other legacy
payload changes remain. Complete core summaries except run ID and complete
phone/trigram distributions also match that earlier result. This verifies
sampled preservation of the earlier Q07 behavior when Q08a is composed with it.

| Observation | Q08a control | Q07 + Q08a main |
| --- | ---: | ---: |
| Generated final-base FOOT | 0 / 200,000 | 2,484 / 200,000 |
| Prepared closed-final FOOT | 15 / 159,868 | 2,506 / 159,945 |
| Output open-final FOOT | 2 / 30,880 | 0 / 31,130 |
| Preserved source-derived `im` forms | 248 / 248 | 243 / 243 |
| Configured affix selections checked | 64,031 | 63,792 |
| Emitted-part/output mismatches | 0 | 0 |
| Root nuclear segments with unspecified quantity | 340,840 | 341,105 |
| Secondary-stress candidates / applied | 125,832 / 35,131 | 126,044 / 35,215 |
| Bare words with final root stress corroborated | 142,491 | 142,644 |
| Affixed words with final root correspondence unavailable | 57,509 | 57,356 |

Changing opportunity counts reflect changing proposal streams; 248 to 243 is
not an allomorph preservation failure or an improvement. Default inventory
quantities remain unspecified. Weight diagnostics concern the root at
`applyStress`, before nucleus repair and morphology; final affixed-root stress
correspondence remains unavailable. Default edge-repair exposure remains zero
in both arms, leaving broader repair safety unobserved. The forced custom
/ʊ/→/æ/ fixture still exposes the broader rime limitation documented for Q10.

Read the complete diagnostic comparisons for mixed stress, hiatus, grapheme,
open-vowel, diversity and corpus-fit results:

- [Merged candidate versus Q08a control](candidate-vs-control.md)
- [Merged candidate versus original baseline](candidate-vs-original.md)
- [Q08a control versus original baseline](control-vs-original.md)

The observed FOOT coverage correction survives composition. These results
do not establish an overall human wordlikeness gain or English quantity model.

## Original gates and timing

Fifteen commands complete: thirteen pass and two whole-checkout lint commands
fail on exactly the same ten inherited errors after checkout-path normalization.
Units pass 551 control tests and 565 candidate tests, with one existing skip
per arm. Both strict type checks and twelve current quality tests per arm pass.
All 63 targeted Q06/Q07/Q08a fixtures pass. Separate exact original five n-gram,
one phoneme-distribution and twelve quality tests per arm pass without changing
their helpers, configurations, thresholds, seeds or sample sizes. Current
upstream policy and original gate results remain separate.

All twelve original native performance tests pass in six alternating pairs:
10,000 words, 50 warmup, 4,500 words/sec floor, variance below 3× and 20,000 ms
timeout. Median candidate/control rounded-log throughput ratio is 0.959941;
all six ratios are below one, from 0.893654 to 0.985915. These observed lower
throughputs are retained as a tradeoff, without inferring a stable general
effect from this run. Main replay/recount/gates and full legacy comparison
finished before timing. An additional brief Python compact-summary/distribution
check overlapped the timing sequence, ending shortly after pair 3 control
began; [the activity qualification](timing-activity-qualification.json) preserves
that fact. Ambient desktop/simulator activity, JIT and GC remain uncontrolled.
No run or original bound was reduced, discarded or restarted.

## Retention and verification

The complete retained checkpoint contains 456 independent inodes / 446,089,973
bytes, including both current arms and the earlier full 200,000-word Q07
legacy reference. Index SHA-256:
`ac0e658c59cf9b662c7bafe23da50b269f11d759e52af21feb7eb915c49f4b50`.
COW files share extents; this is not an independent-device or history backup.

The 323-member lossless compact archive carries complete measured source,
frozen evaluators/observers, nine operators, all three comparisons, complete
compact reports, bounded full trace witnesses and all execution outcomes/logs.
Its manifest pins sixty external full raw shards and 75 selected actual
Node/TSX runtime files. Original-baseline compact evidence is also retained;
its twenty raw shards remain separately external with explicit bindings.
Full Node/Python/Vitest/ESLint/TypeScript installations and Git history remain
external. Scripts preserve actual paths; fresh scientific reruns require
adapting those paths and supplying their complete registered prerequisites.

Authenticate compact bytes and recorded outcomes from the repository root:

```sh
python3 -B evaluation/experiments/shared-weight-control/merged-composition-2026-10-03/verify.py
```

With all original archives available, additionally rehash every retained file
and every original-baseline artifact:

```sh
python3 -B evaluation/experiments/shared-weight-control/merged-composition-2026-10-03/verify.py --retained /path/to/q07-q08-merged-composition-retained-v1 --original-baseline /path/to/2026-09-26-development-standalone
```

Both modes authenticate integrity and recorded outcomes. They do not rerun the
scientific analysis or supply human observations. This checkpoint names two
exact heads; future main and other model changes require their own evidence.
