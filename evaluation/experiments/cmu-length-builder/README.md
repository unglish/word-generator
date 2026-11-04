# Q15c2 explicit length-reference builder

Preregistered 2026-09-26, before implementation and successful candidate builds.
Base: Q15c1 `e8d81e341950c68876c4fa2df7272e95d8ec0093` (#327). Shared
reference dependency: Q15b `7ce4bd370bf3f260d477887e7ed7f1095c0b788a` (#325).
This is offline reference construction, not a generator improvement or adoption.

Retain `scripts/build-cmu-baseline.ts` and require `--source`,
`--policy cmu-ascii-first-v1`, `--units integer-selected-entry-counts`, and
`--out`. No implicit source/output, fallback, force, legacy-shape output, rounded
summaries, runtime weight derivation, or consumer migration is permitted.

Acceptance is fixed before candidate outcomes:

1. Require pinned valid UTF-8 bytes, SHA-256
   `81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22`.
   Reconstruct the unchanged full Q15b reference, then emit its exact
   `JointLengths` and explicit axes. Each marginal has 117,485 selected entries;
   written/phone/syllable histograms contain 22/21/10 bins with maximum labels
   28/28/12 and weighted event totals 869,802/742,333/289,275. Preserve every
   conditional row and tail, with no probability or percentile conversion.
2. Preserve entry digest
   `d6a702f18c1bc17f7d7b41206d37498ecab0a7712c862f0398c9a8fde7a13d29`
   and parent reference digest
   `3a0e0c9c3eb0ba4990f6607e22946dd2971474d405c10b1246779ee13be534f6`.
   Independent Python must reconstruct every marginal/conditional bin from raw
   records and verify the exact envelope, license, population and expected
   implementation. A self-consistent embedded source digest is not authenticity.
3. Reject re-digested changes to units, axes, counts, source/population/license,
   extra/missing fields, and tail bins. Include a 2×2 conditional swap preserving
   both row totals and the overall marginal: conservation alone is insufficient.
   Percentages and fractional/negative counts cannot masquerade as entry counts.
4. No arguments, missing/empty/truncated/wrong-case/invalid-UTF-8 source,
   unsupported/duplicate/ambiguous flags, stale source snapshots or corrupt parent
   evidence must fail before publication. Help alone requires no dictionary.
   The current length builder already fails on absent source; do not invent a
   historical fallback or an observed digit-count mismatch in the pinned source.
5. Exclusive output requires an existing parent and a fresh destination. Protect
   legacy/runtime/frozen evidence and source paths, including directory aliases
   and absent protected files; reject existing files and existing/dangling
   symlinks without changing their bytes or creating a dangling target.
6. Direct local TS invocations, including another cwd and spaced paths, produce
   byte-identical artifacts. Omit local paths/timestamps from the artifact;
   success output names the new artifact/digest and selected-entry denominator.
7. Include the TS entrypoint, new builder, six frozen Q15b dependency sources and
   lockfile in the new identity; recheck bytes around construction. Preserve all
   prior Q15a/b/c1 sources/evidence, old baselines, consumers, runtime, weights,
   package scripts and gates. Do not amend older verifiers for the new checkout.

Run focused validator/CLI fixtures and shared corpus checks first. Parent reviews
implemented source and those fixtures before the formal full-source acceptance
or compact evidence packaging. The full run uses fresh output/proof paths and
retains failed runs. No generator capture/performance study is needed here.
