# Q07 after merged resolved-allomorph handling

This checkpoint measures candidate `fa8c537ee523a082e5d9859a75a7dddb271dabd8`
against control `233b455732920ac529b2dda2a623df0a6ca17446`. The control includes
Q06 / PR #315, merged as `7c79d34496e915f1b0bad4ea372c370b27d54365`
(PR head `8e3b53ac142b34ab02d53628497e23cf015a1573`). It supplies a fresh
cumulative comparison without relabeling the earlier standalone measurement.

The original protocol, frozen evaluator `ad7bf798…`, reference `38cf9d0b…`,
four profiles, five development seeds per profile, and 10,000 continuous draws
per seed remain unchanged: **200,000 complete traced words per arm**.
Validation seeds were not used for tuning. The separate untouched checkouts
replay all 400,000 complete words and traces through `generateWord` exactly.
Their full measured source pins remain unchanged before and after execution.
A separate Python implementation independently recounts every raw word, all
thirteen core diagnostics, distributions, actual morphology/length strata,
review samples, and every nucleus/morphology counter and bounded full witness.

## What the result establishes

| Observation | Control | Candidate |
| --- | ---: | ---: |
| Generated final-base FOOT | 0 / 200,000 | 2,484 / 200,000 |
| Prepared closed-final FOOT | 15 / 159,868 | 2,506 / 159,945 |
| Output open-final FOOT | 2 / 30,880 | 0 / 31,130 |
| Preserved source-derived `im` forms | 248 / 248 | 243 / 243 |
| Selected affix forms checked against configuration and assembly | 64,031 | 63,792 |
| Affixed words with explicit realized parts | 57,509 | 57,356 |
| Emitted-part/output mismatches | 0 | 0 |
| Words with root cleanup changes | 50 | 42 |

Both arms retain all their observed resolved forms. The changing opportunity
counts reflect different proposal streams; 248 to 243 is not a preservation
failure or an improvement. No selected default word exercises the final
edge-repair replacement path. Its zero exposure leaves its safety unobserved;
the forced custom /ʊ/→/æ/ fixture still exposes the broader Q10 rime limitation.

All twenty current-control raw shards are byte-identical to the complete
historical Q06 candidate reproduction. All ten morphology-disabled candidate
shards are byte-identical to the complete historical Q07 reproduction.
The full 200,000 old/current Q07 ordinal comparisons show 243 changed written
forms (173 lexicon-default, 70 text-default), zero changed syllable or
pronunciation payloads, and zero other legacy payload changes after removing
only the newly recorded `trace.morphology.realization` field. These comparisons
do not establish unrecorded historical RNG-call equality, probabilistic seed
independence, or a causal matched-word design.

Read the complete comparisons for changes in stress, hiatus, open checked
vowels, grapheme fallback, diversity, and corpus fit:

- [Candidate versus cumulative control](candidate-vs-control.md)
- [Candidate versus original baseline](candidate-vs-original.md)
- [Cumulative control versus original baseline](control-vs-original.md)

The result supports the FOOT coverage and edge correction in these samples.
Broader diagnostics remain mixed; no overall human wordlikeness gain is claimed.

## Gates and timing

Fifteen commands completed: thirteen pass, two whole-checkout lint commands fail.
Their logs have exactly the same ten inherited errors after normalizing checkout
paths (seven quote errors in `language.test.ts`, two unused symbols and one
`prefer-const` error in `write.ts`). Full current unit suites pass 513 tests in
control and 527 in candidate, with one existing skip each. Current quality
passes twelve tests per arm. All forty candidate Q06/Q07 targeted tests pass.
Strict project types pass in both arms.

Separate clones run the original blocking five n-gram, one phoneme-distribution,
and twelve quality tests per arm with their exact historical helpers, configs,
samples, and thresholds. All pass. The current upstream gate policy differs;
its passing results do not replace the original checks. An initial preparation
assumed a nonexistent standalone n-gram helper and failed before any gate ran.
The failed preparation is retained; the corrected preparation uses the actual
unchanged inline historical implementation in separate clones.

All twelve native performance runs pass: six alternating pairs, original
10,000-word sample, 50 warmup words, 4,500 words/sec floor, 3× variance bound,
and 20,000 ms timeouts. The median candidate/control ratio is 0.985001 using
rounded native logs, with pair ratios from 0.885130 to 1.146323. Concurrent owned
Q23 reconstruction was briefly paused and the same process resumed afterward;
other system activity and JIT/GC variability remain. This is gate evidence,
not a stable general performance improvement.

## Evidence and reproduction limits

`evidence.tar.gz` contains 300 losslessly retained members: measured source,
frozen evaluators/probes, seven execution operators, all three complete
comparisons, compact capture reports, distributions, full bounded trace
witnesses, public replay records, independent recount, original/current gate
sources and complete logs, preparation failure, and all twelve timing logs.
`manifest.json` binds every member by full bytes and SHA-256. The original
scripts retain their execution paths; rerunning them requires configuring those
paths and their documented original baseline/runtime prerequisites.

The complete local archive contains 413 independently owned files / 334,079,112
bytes. Its index SHA-256 is
`c1052cb6b6729de8b7bc9ff9d9a79543f1f326c20a61981ed0f2a32ff4421d01`.
All forty full raw word/trace shards and 75 selected actual runtime files remain
external and explicitly indexed. A shared Git clone is not an independent
history backup. Full Vitest/ESLint/TypeScript installations remain external with
lockfile provenance and recorded outcomes. The packet must not be described as
a complete standalone installation or as carrying all raw words.

From the repository root, verify the published compact bytes and recorded outcomes:

```sh
python3 -B evaluation/experiments/nucleus-word-edges/verify-current-packet-v1.py
```

With the complete retained archive available, additionally rehash every retained file:

```sh
python3 -B evaluation/experiments/nucleus-word-edges/verify-current-packet-v1.py --retained /path/to/q07-current-composition-retained-v1
```

These checks authenticate bytes and the recorded outcomes. They do not rerun
the scientific counts or supply human observations. Fresh full replay/recount
requires the external raw files. This checkpoint certifies the two named heads;
later main revisions and composition with Q04 require their own measurements.
