# Q16b identity/stress scoring experiment

This follow-up supplies the separate probability diagnostics missing from the
Q16 identity observer. It depends on the exact open PR #318 head
`d95167be2adae19c41927f1bcf20b1a4cc4983e2`. Its data dependency is the authenticated
Q15c PR #332 transition artifact, built from the same 117,485 selected CMU spelling
types. The artifact is copied unchanged with its source/license metadata.

`protocol-v1.json` was registered before implementation or corpus measurement.
Its original SHA-256 is
`423f9e3ab8653e330c8e2a5fbc6a1a5b5ff55f67b89113347d1b250c612d69ba`.
The study uses all original 200,000 baseline words and both complete Q09
200,000-word archives, preserving their 60 original seed streams. No new study
sample, validation cohort, human judgment, old quality-score change, or generator
change is introduced.

The native and coarse models use alpha 0.5 with their own complete observed
vocabularies, including both word-boundary transitions. They report mean negative
log2 probability per transition. Their alphabets differ, so a native-minus-coarse
number is not a quality gain. Scores retain aligned unavailable items and reject
partial-word normalization. Explicit-only and final-surface-trace coverage stay
separate. Matched totals include exactly the same eligible words for both views
within an arm; coverage may differ across arms.

The native collector writes every word's scores, evidence binding, projections,
and losses to compressed streams. It also retains all profile/seed/morphology/
syllable-count/segment-count strata and first-observed witnesses for every status
and unavailable reason. The Python operator independently recomputes every row,
transition, score, loss, aggregate and witness. Numeric comparisons use only the
registered `1e-12` absolute plus `1e-12` relative tolerance; counts and identities
are exact. All source and archive bytes are checked before and after measurement.

Three initial attempts are retained outside the production diff. The first handled
the historical quality summary but stopped at Q09's explicitly unevaluated
capture-only summary. The second completed all native observations but its
independent provenance hash used Python's JSON numeric rendering/key order.
The third completed the entire native and independent corpus proof, then its public
checker compared an absent off-word `trace` property with an own property holding
`undefined`. Parent/candidate equality at that coordinate had passed. The correction
removes only the trace field before comparing every remaining field exactly.
All source snapshots, freezes, partial/full streams and errors were preserved
before adding exact capture-schedule decoding and a canonical provenance
serializer retaining pinned producer numeric lexemes and JavaScript integer-key
ordering, and the explicit trace-field omission in the parity checker. Corpus words, model counts, scientific formula, thresholds, sample,
and tolerance never changed. Final evidence must establish the complete original
scope; these failures do not count as a passing study.

The collector and verifier require the absolute archived locations in the
protocol and the full pinned source closure in `freeze-v1.json`. Reproduction
uses a new output directory and proof filename:

```sh
node --import tsx evaluation/experiments/identity-stress-score/study.ts --out /new/output
python3 -B evaluation/experiments/identity-stress-score/verify.py /new/output /new/proof.json
node --import tsx evaluation/experiments/identity-stress-score/public-parity.ts \
  --base /exact/pr318/checkout --out /new/public-parity.json
npx vitest run --config vitest.identity-stress.config.ts
npx tsc -p evaluation/experiments/identity-stress-score/tsconfig.json
```

The public parity check covers 2,000 coordinates across all four profiles and
8,000 parent/candidate trace-on/off API calls, full word equality, RNG call counts,
next-draw probes and mutation isolation. These regression coordinates are separate
from the fixed archived study. The dedicated fixture configuration includes both
the scorer tests and the archive-schedule tests; the default test configuration
excludes the experiment directory. The final source freeze pins this configuration.

See [the API contract](../../../docs/identity-stress-score.md) for interpretation
and limits. Whole-study verification, exact baseline/candidate checks, two review
passes, behavior-preserving elevation and dependent PR publication remain required.
This experiment record alone does not certify those gates or current-main integration.
