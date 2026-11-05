# PR 313: small coda-weight experiment

Exploratory experiment requested after the selective gate recalibration. Source remains f65dcf09291c4c8cabe6ee05ea1d2d086f6ae76b. No production weight or threshold was edited. Public createGenerator configurations vary only phoneme coda weights:

- control: /z/ 92, /n/ 450;
- z-only: /z/ 89 (-3.26%);
- n-only: /n/ 455 (+1.11%);
- combined: both adjustments.

Initial protocol: three existing development seeds, 200,000 bare lexicon words per variant/seed (2.4 million words). Each stream's first 10,000 words has trace:true. Additionally each variant generates 50,000 default-morphology text words with trace:true (200,000 words), retaining n-gram counts, unique spellings, root/final phone counts and bounded complete witnesses. These are exploratory development samples, not held-out confirmation or the full frozen four-profile quality protocol.

Both promising candidates also receive 200,000 default lexicon words at seed42 with trace:true to reproduce all four spelling gates including strict trigram underrepresentation. Both pass; /z/-only yields 15 ugh occurrences (ratio .0139823), combined 18 (.0167830), above unchanged .0062.

After the three-stream results, two additional development stress seeds were selected BEFORE evaluating them: the worst /z/ ratio (3706769306) and worst /n/ gap (2358853210) from the previous 30-stream candidate cohort. Both promising candidates get these full 200,000-word runs. This deliberately tests difficult known development cases; it is not independent confirmation and is not a seed search for a passing gate. See stress-protocol.json and *-stress.json.

## Validation and operator corrections

The control matches the previously archived metrics, all common-phone rows and RNG draws exactly for all three seeds (summarize.mjs assertions). 100 seeded outputs per variant retain trace/nontrace spelling and pronunciation parity; control serialized outputs also match the default public API. All public configs remap phonemeMaps to the cloned inventory objects, as required by validateConfig.

The initial diagnostic operator needed two corrections: object snapshots differ from full Phoneme objects, so trace tallying now handles both string snapshots and objects; adding optional undefined coda fields to cloned inventory objects required serialized-output comparison rather than object-own-property identity for the control. These affected the diagnostic operator, not generator code or measured phoneme counts. The control was replayed after the assertion correction. Every variant's trace cohort was independently replayed by verify-traces.mjs; default-text trigram counts match exactly and root n/z tallies are asserted nonzero. Final JSON replaces invalid interim trace tallies; traceVerified is true. The initial failed control log is retained for audit. Do not count replays as extra samples.

Raw full generated corpora are not retained. JSON includes sufficient phoneme/ngram counts, metrics, loss/coverage results, bounded full WordTrace witnesses and aggregate trace data. All measurements live only in this archive. Existing PR code, exceptions and golden outputs remain unchanged.

Reproduce from the recorded source using `node --import tsx <packet>/probe.mjs <checkout> <variant>`, followed by verify-traces.mjs and summarize.mjs; ngrams.mjs and stress.mjs measure the selected candidates. Operators use /tmp/pr313-weight-nudge for outputs and prior calibration JSON under /tmp/pr313-recalibration; adjust those paths or restore the corresponding earlier archive. Use a fresh output directory because primary writes reject existing output files. The baseline comparison helper asserts against archive/pr-313-recalibration's development-policy-verification.json.

## Results and decision

The combined nudge passes all original phoneme bounds in all five tested streams. /z/-only passes the first three and the worst-/n/ stress stream, but narrowly fails the unchanged /ʃ/ ratio bound in the worst-/z/ stress stream: 1.0663428574 versus 1.066. /n/-only reduces the /n/ gap in all three initial streams, but /z/ remains above its bound in each. No other limits were changed or waived. Total variation, inventory coverage and normalization-loss requirements pass throughout.

In the 50,000 default-text words per variant, selected-root adjacent duplicate codas remain zero and licensed /ksts/ remains present (control 14, z-only 9, n-only 11, combined 16). Trace root/final positional counts are in summary.json; default morphology adds further phones, so root counts must not be confused with final counts. Trigram Jensen–Shannon divergence is control .156878619, z-only .156928048, n-only .156239799, combined .156917570 bits. Combined is slightly worse on this single-seed spelling metric (+.000038951 bits), while unique spellings rise from 39,389 to 39,442. These small differences establish neither significance nor human preference.

This experiment supports pursuing the combined nudge rather than assuming looser limits are necessary. It does not certify promotion: full 30-stream development, newly reserved confirmation, four-profile frozen quality comparison, golden review, performance and full checks would be required before shipping changed weights or removing the exceptions. No production changes were made, so no full implementation check was rerun for this configuration-only experiment. The current PR remains unchanged.
