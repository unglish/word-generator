# Conditional root-stress law and sampler evidence

This PR adds the pure `createRootStressLaw` analytical API on exact #330 commit
`3d5f1a9feb07b7c13cd384b8c0daf9036295da60`. The generator does not call it. Default
generation, stress traces, weights, gates and sampling remain unchanged. This
is a mathematical and implementation prerequisite for a later root-rhythm
experiment; it does not establish improved English output.

Start with [the API contract](../../../docs/conditional-root-stress-law.md),
then `src/core/root-stress-law-types.ts`, `src/core/root-stress-law.ts`, and the
24 public API fixtures. The independent proof tools and their predeclared limits
are under [`protocol/`](protocol/) and [`sampler/`](sampler/README.md). Large
binary evidence is grouped under [`evidence/`](evidence/package-index.json).

## Declared law and scope

The API sums the legacy explicit-secondary and directional rhythm histories
that produce each complete root pattern, retaining duplicate histories. Given
primary position and secondary count K, it tilts their summed mass by
`exp(-lambda * adjacentMarkedPairs)` and normalizes. It exposes count and pattern
analysis plus a log-space backward sampler with detached inputs/results and
explicit zero-support/error states. It does not infer morphological class,
quantity, or final-word stress from missing annotations.

There is no universal no-clash rule. A disyllable with fixed K=1 has no alternative
without adjacency. Morphemes can later overwrite root stress; preserving final
word origins and introducing honest proposal/applied v2 traces remain separate
work. The analytical `lambda=0` case does not itself promise legacy generator
RNG parity; the future zero-lambda adapter must delegate to legacy execution.

The numerical contract has explicit restrictions, including the accumulated
log-magnitude bound of 1024. Its conservative bound includes rhythmic probability
terms even when rhythm is disabled. Unsupported numerical inputs produce errors,
not clipping or fallback. Positive real probability does not imply a realizable
event below finite RNG resolution. None of these conditions was loosened after
results.

## Independent analytical proof

The frozen Python Fraction/Decimal oracle enumerates literal histories without
the production recurrence. A separately frozen Node comparator calls only the
public law API. It queries every same-primary pattern, including absent patterns,
and every K on the registered small-root grid. Long-root cases check all K and
the bounded support of deterministic-rhythm endpoints, not exponentially many
arbitrary patterns.

| Check | Result |
| --- | ---: |
| Configuration/factor cases | 229,587 |
| K strata | 1,013,770 |
| Zero-support K strata | 691,613 |
| Pattern queries | 3,717,680 |
| Exact-zero pattern queries | 3,174,685 |
| Component mass comparisons | 6,283,316 |
| Finite log/probability comparisons | 4,274,666 |
| Normalizations | 873,901 |

All passed the original limits. The largest finite-log/probability absolute or
relative error was `1.2789769243681803e-13`. Original protocol v1, its declared v2
fixture correction, oracle/comparator source, reports, logs and historical
absolute execution paths remain unchanged. A separately named portable self-test
retains all eleven original test groups.

## Sampler prerequisite and frequency study

The source freeze pins 116 files, including all 22 sampler source/design/fixture
files, before the first numerical-tree run. All six cases passed the independent
rational prefix/suffix check and same-Node replay. Python does not assert that
its libm reproduces Node's exact branch decisions; the separately pinned Node
replay binds the public-API transcripts and declared predicate to the executable
SHA and full engine identity.

| Prerequisite | Result |
| --- | ---: |
| Numerical-tree nodes | 94 |
| Positive final patterns across cases | 34 |
| Initial deterministic calls | 1,674 |
| Separately executed Node replay calls | 1,674 |
| Numeric decisions checked per pass | 7,294 |
| Largest numeric-grid vs continuous total variation | `2.948682965847836e-10` |
| Registered TV ceiling | `1e-8` |

Each 1,674-call pass comprises 72 fixed-row/detached-result calls, 12 input-mutation
calls, and 1,590 tree calls. These supplementary calls never enter frequency N.
The finite-grid law is conditional on the reviewed monotonic same-engine
predicate and its boundary/endpoint/quartile probes; it is not exhaustive libm
testing or a universal cross-engine claim. Numeric-grid and ideal-arithmetic
grid differences remain reported separately.

One 36,000,000-byte OS-random tape was frozen before frequency outputs. Six cases
each received five blocks of 20,000 rows, with fifteen little-endian uint32 cells
per row. Exactly 600,000 primary calls produced the full archived transcripts.
The independent verifier checked all rows, used uniforms, finite-grid branches,
complete accepted leaf transcripts, counts, block hashes and first witnesses.

All 1,440 predeclared mask/block/aggregate comparisons passed the fixed
Hoeffding/union-bound criterion. Its independent-uniform-input assumption is
explicit; the result does not certify the OS entropy source as mathematically
IID and does not prove exactness from empirical frequencies. The largest absolute
deviation was `0.008747336433729106`, below its bound `0.017727602600970952`.
The tape retains 1,501,143 used and 7,498,857 unused cells; none was reassigned.

Coverage is reported without padding: 33 of 34 positive patterns appeared. In
`zero-weight-rare-rhythm`, mask `20` had numeric probability
`8.947825773513944e-6`, expected count `0.8947825773513944` in 100,000 draws,
and observed count zero. Its witness is unavailable. The 104 retained first
witness coordinates refer only to actual records; no additional draws were made.

The parent independently reread every raw schedule/mask and used uniform, all
thirty block hashes, 1,440 exact fraction errors/limits, and every source/artifact
identity. That additional audit does not claim to reimplement all leaf semantics;
those are established by the separately reviewed frozen verifier. Its source,
successful log, report and the earlier explicit review gates are included.

## Published bytes and reproduction

`evidence/package-index.json` identifies every copied artifact and its original
path/hash. The package includes the entire 14,682,873-byte analytical oracle
archive, the exact 36,000,000-byte tape, and the entire 37,191,354-byte compressed
600,000-transcript archive. It does not depend on a private local raw archive.
This publication supersedes only the historical package note saying the oracle
archive was outside Git; that original note's bytes remain preserved.

`evidence/source-bundle-v1.json.gz` contains all 116 source files as exact bytes,
each checked against the original freeze. The packaged freeze is the same
`624794b43f79bbb21e7e0c762a25b893ab89c571d313986757502eee80b70b0a` file used
throughout the study. New guides and outcomes are outside its declared source
roots, so publishing them does not invalidate exact-file-set replay.

The [sampler guide](sampler/README.md) gives all gated commands. To reproduce the
accepted study, use the packaged tape and manifest with new output paths; do not
create a replacement tape. Use the pinned Node binary/engine and lockfile, and
verify every external digest before replay. The full capture can be regenerated
deterministically from that tape, source and engine; every raw transcript is also
available for verification without rerunning the sampler.

The analytical comparator accepts a root path, grid archive path, and fresh output
path. The archive's adjacent `.manifest.json` is included for relocation:

```sh
node --import tsx evaluation/experiments/conditional-root-stress/law-evidence/q09-oracle-comparator.mjs \
  "$PWD" \
  evaluation/experiments/conditional-root-stress/evidence/law/q09-oracle-grid-v2.jsonl.gz \
  /private/tmp/new-law-comparison.json
```

## Ordinary source validation

The public-law fixture suite passes 24/24, strict TypeScript and touched lint
pass, and all 47 synthetic/portable proof-test groups pass. Full unit validation
has 517 passes, one skip and the same three inherited failures documented by
[#330's evidence](../complete-stress-patterns/README.md):

- Q06 seed 167 produces `inlodsed` instead of the historical `immamsed` assertion.
- The fixed Q06 stream contains 29 `im` selections against its unchanged `>30`
  assertion.
- The existing `ugh` ratio is `0.004901057711283718` against the unchanged `0.0062`
  floor.

These ordinary generator failures are separate from the passing analytical and
sampler proof; they are neither waived nor mislabeled as new sampler failures.
Dedicated quality passes 12/12. The first run could not write its normal report
under the filesystem sandbox; its log is retained alongside the successful
authorized rerun. No quality
threshold or inherited test was changed. No performance claim is made by this
PR or by the timing of its correctness runs.
