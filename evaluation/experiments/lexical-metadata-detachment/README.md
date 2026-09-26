# Lexical quantity metadata detachment

This evidence measures a caller-mutation correction on an explicit Q04 +
Q08b + Q06 composition. The composition includes draft behavioral models;
this correction does not establish that those models improve human quality.

| Control | Source commit | Generator digest |
| --- | --- | --- |
| Before cloning correction | `ca6654cfff2b827bee16bb5cc8d9fbc5f9fd34d2` | `3f5b125a15e9a2aaa98ab79d14feeb5502fc77b8584307da025162fe55f2ea63` |
| After cloning correction | `72222591a3b8fd03c7be40d7c54766ef4163529c` | `d2370383c8a3be674c18d37ccb3ca11b55e3d9687ee68eb09195ef01cd02ad2e` |

Both full controls use 200,000 returned words under the unchanged #307
four-profile, five-stream development schedule. All 20 raw gzip word
shards are byte-identical, including complete serialized word values and
all old trace fields. Every frozen profile summary is equal. An additional
20,000-draw schedule is repeated with trace off/on for each source:
outputs, full traces, every word-boundary RNG call count, total calls and
the next RNG value all match. No trace field is removed for comparison.

Five public mutation fixtures fail against the composition and pass after
the correction. They verify independent quantity objects across ordinary
root/assembled/surface views, inventory and later generations, including
promoted root replacements and reduced surface targets. This improvement
is bounded by those fixtures; sampled serialization/RNG parity is a
separate claim.

The full before/after unit results retain the same three failures:
Q06's seed-167 historical expected spelling (`immamsed` versus integrated
`inlodsed`), Q06's `im` sample count (29 versus >30), and the unchanged
`ugh` ratio (0.004901× versus the 0.0062× floor). Unit passes increase
463→468 with the five mutation cases; both runs have one skip. Dedicated
quality passes 12/12 before and after and does not include the n-gram
unit gate. Strict runtime/proof-tool TypeScript and touched lint pass.

`control/` and `candidate/` contain the exact compact capture artifacts,
including complete generator/evaluator/reference source snapshots,
unfiltered review samples and witnesses. Raw shards remain in immutable
local runs `memory/quality-runs/stress-pattern-composition` and
`memory/quality-runs/lexical-metadata-detachment`; their exact hashes are
in the manifests and comparison. The manifests pin the same evaluator
`ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007`.
The exact top-level #307 evaluator/protocol files can be recovered from
either source bundle's `evaluator` list for reproduction, without changing
generator source or staging the copied tooling.

`comparison.json` records complete shard equality and RNG parity;
`before-parity.json.gz` and `after-parity.json.gz` retain every scheduled
stream hash. Independent Python reports verify all 400,000 draw
coordinates and counts, artifact hashes and source content against the
pinned commits. The parent review separately confirmed every shard pair
and all 45 archived generator source files. Gzipped logs retain the
mutation red/green runs and both full unit/quality runs.

Reproduction commands and proof-tool scope are in the
[probe README](../../quality/probes/stress-pattern/README.md).
The unchanged isolated performance suite passes 2/2 for both sources:
control 6,898 words/sec, 1.29× median batch variance; correction 6,778
words/sec, 1.37×. Gates remain 4,500 words/sec and <3×. One control-first
then candidate interval was measured with other task-heavy jobs paused;
normal desktop activity was not controlled. Logs, environment and exact
control-source verification are retained. This is not a stable causal
throughput estimate.
