# Q15c2 length-builder acceptance

The preregistered builder-only migration passed on the pinned dictionary. This
is reference construction and publication evidence; generator output, runtime
weights, quality gates and existing consumer inputs are unchanged.

## Exact reconstruction

| Histogram | Selected entries | Occupied bins | Maximum label | Weighted sum |
| --- | ---: | ---: | ---: | ---: |
| Written length | 117,485 | 22 | 28 letters | 869,802 letters |
| Phone length | 117,485 | 21 | 28 tokens | 742,333 phone events |
| Syllable count | 117,485 | 10 | 12 vowels | 289,275 vowel events |

Independent Python reconstructed every marginal and conditional bin from raw
records, plus the full Q15b parent, old character/length reference and #304 derived
model. All ten syllable-count strata survive: `1:15106`, `2:54063`, `3:32395`,
`4:11739`, `5:3342`, `6:712`, `7:110`, `8:15`, `9:2`, `12:1`. The entry digest
remains `d6a702f18c1bc17f7d7b41206d37498ecab0a7712c862f0398c9a8fde7a13d29`.
Both validator suites reject re-digested 2×2 conditional swaps that preserve all
row totals and overall marginals. Conservation is not the acceptance criterion.

The parent independently reread the raw selected entries and confirmed every
length bin, all nine embedded source files, all 247 protected prior tracked files
against base Git bytes, and all fifteen recorded CLI outcomes. Its separate proof
is included as `parent-verification.json.gz`.

## Commands and checks

Fifteen real command cases passed: no arguments; help from another cwd; direct
`node --import tsx`; the local TS runner from another cwd; existing output;
existing and dangling symlinks; empty, wrong-case-transformed, invalid-UTF-8,
truncated and missing source; protected output; unsupported units; duplicate
source flag. Spaced source/output paths remained intact. The two successful
builds produced byte-identical artifacts. Rejected writes preserved their existing
targets, and a dangling target was never created.

Focused corpus suites passed 144 tests, including 49 new length fixtures;
independent Python passed eight tests with corruption subcases. Both corpus and
review strict TypeScript checks, touched ESLint and `git diff --check` passed.
No generator test, capture or performance claim is made for this offline change.

The initial focused test invocation had one environment failure: the sandbox
refused the TS runner's local IPC socket. Its full log is retained in
`development-runs.json.gz`; the authorized rerun passed all 49 tests. The first
formal pinned-source acceptance passed; no successful candidate run was discarded.

## Identities and scope

- Base: `e8d81e341950c68876c4fa2df7272e95d8ec0093` (#327).
- Artifact SHA-256: `35105944543fe844b14c24f94a78362d8126e25b23e0fac5026bf078bfb3435e`.
- Envelope digest: `2b6519af4b55e8e9313c9736d584b019fee83c94f5401df7490562ac90fc90b3`.
- Implementation digest: `236dda1141b265f9ec96bc4d7c87a98a0028f0582f52d76f99db93f5a8dc2b3c`.
- Preregistration SHA-256: `4132b4df3ffb0bbfcdf23d90e8cf57cac48b75a18c0f6fe331c0c642e929b9e5`.

The artifact embeds reviewed builder/CLI/dependency/lockfile bytes. The verifier
uses externally expected checkout bytes and independent raw reconstruction; an
internally re-digested source tree alone cannot pass. The lockfile records
dependency declarations rather than attesting installed binaries.

All prior tracked files except the intentionally migrated length script and
focused TUNING rows were checked before and after every real command. This
includes all Q15a/b/c1 implementation/evidence, the old length baseline, its
consumers, runtime, package scripts, weights and gates. Prior verifiers were not
edited to accept the later checkout.

The old 135,158 pronunciation-line baseline is a distinct population from the
new 117,485 selected-entry reference. No digit/vowel-count mismatch was found in
the pinned old-policy population, and reconstruction does not establish historical
build provenance. The new tables preserve all tails without summaries; they do
not encode written/phone correlation within a syllable-count stratum.

## Reproduction

With the pinned raw dictionary and existing development dependencies installed:

```sh
python3 evaluation/experiments/cmu-length-builder/verify_test.py -v
python3 evaluation/experiments/cmu-length-builder/verify.py \
  --root "$PWD" --source /absolute/path/to/pinned-cmudict.dict \
  --new-directory /absolute/path/to/new-acceptance-directory
```

Use a fresh acceptance directory. Outputs and logs are created exclusively.
`manifest.json` records compressed and uncompressed checksums; deterministic
gzip archives retain exact artifact, proof and log bytes. The raw dictionary is
not republished in this package.
