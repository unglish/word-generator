# Q14b evidence review package

This package reports an opt-in following-letter conditioner for soft c/sc and g.
The intended immediate base is Q14a commit
`f284fb8c3321606f2a1cc3d61a5aad029c7f018f`. It is not an overall quality approval.
Performance measurement is complete: median paired throughput falls 50.75%.
Both arms fail all six speed gates and pass all six variance gates.

## Read in this order

1. `independent-recount.json`: complete independent accounting, including its scope limits.
2. `candidate-report.json.gz`: stratified counts and cohort transitions.
3. `comparison.md`: original baseline, immediate control and candidate comparisons.
4. `capture-complete.json.gz`, `capture-before.json.gz`, and
   `candidate-analysis-complete.json`: hashes binding the measured source and artifacts.
5. `independent-authority.json` and `candidate-analysis-authority.json.gz`:
   tool/runtime identities and analysis provenance.

`index.json` lists byte lengths and SHA-256 hashes of the packaged evidence.
Raw corpora and observation shards remain in the local `.local-evidence/q14b`
archive. They are not included in this compact review package. The seals enumerate
those external artifacts; a seal alone is not a substitute for checking them.

## Interpretation

The immediate control has 2,065 incompatible initial target units out of 6,736;
the candidate has zero out of 4,803. At the final root boundary the candidate has
zero incompatible units in its 4,786-unit target stratum. The initial cohort has
4,784 compatible survivors and 19 jointly owned outcomes. These denominators
answer different questions and must not be merged. Joint outcomes are not
certified compatible single-owned readings. Final morphology is outside the
root-preservation claim. The original baseline lacks this ownership ledger and
cannot supply a certified root comparison.

The independent Python recount checks event/count accounting; inherited semantic
licenses and the conditional sampling law are not independently rederived by it.
Production evidence replay separately reconstructs the initial selection law.
Trigram divergence is worse in all four profiles. The enabled quality suite has
two failures. These are retained adverse findings, not waived acceptance gates.

## Reproduction boundaries

The registered capture entry point is
`node --import tsx evaluation/experiments/following-letter-conditions/freeze-capture.mjs <fresh-archive>`.
It requires the original pinned inputs and control manifest; do not replace pins
to force it through. Analysis uses the exported `analyzeFollowing` function with
the exact registered configuration and candidate manifest hash. The preserved
`analyze-candidate-v1.mjs` records the actual invocation. The independent recount
entry point is `recount_corpus.py`, taking archive directory, analysis directory,
manifest SHA-256 and analysis-complete SHA-256 in that order. Actual wrappers and
runtime pins are preserved outside this compact package in the local archive.
Their machine-specific paths require deliberate relocation for another host;
this package does not claim a portable one-command reproduction environment.

The performance directory retains all twelve runs and the fixed-order report.
Before publication, complete the final source/comment review and commit packaging.
