# Supplementary coda-extension probe

Preregistered 2026-09-26 before reading the candidate archive results. This probe
supplements the already frozen adjacent-duplicate-coda metric. It does not change
the generator, evaluator, protocol, thresholds, or the meaning of that metric.

Compare the original `2026-09-26-development-standalone` archive with the frozen
`legal-coda-extensions` archive. Require completed manifests and matching protocol,
evaluator, and reference fingerprints. Verify every compressed word shard against
its manifest checksum. Analyze all archived draws, retaining profile, replicate
seed, and draw index for examples. Historical absence of rejection events is
unobserved instrumentation, not evidence that zero proposals were rejected.

Report totals by profile and actual applied morphology (none, prefix, suffix,
both), with words and coda-bearing syllables as denominators:

- Final adjacent duplicate coda pairs and affected words; retain full trace
  examples so root-extension and later morphology sources remain distinguishable.
- Successful `finalS` and `nasalStopExtension` events and their probabilities;
  rejected extensions by type and first recorded reason. These event totals are
  selected-word traces, not all internally attempted words or proposal rates.
- Adjacent duplicates in each recorded phonological stage's before/after coda
  snapshots. Attribute a transition only when the stage introduces the duplicate;
  do not infer that an event elsewhere in the word caused it.
- Occurrence counts for every final multi-segment coda and whether it is an exact
  entry in that run's configured attested inventory. Separately count codas with
  separated repeated sounds (for example /sts/ and /ksts/) and retain examples.

The expected mechanism is fewer adjacent duplicates from root extension while
preserving licensed separated repetition. Remaining morphology-induced /sk/→/ss/
collisions are an explicit separate issue, Q11b. No requirement that all affixed
outputs reach zero is introduced after examining candidate results. Counts of
licensed clusters assess retained reachability and observed coverage, not a claim
that their natural-language frequencies are correct. Equal stream indices across
runs are not matched lexical candidates, because eligibility changes RNG use.

Run after both captures complete:

```sh
node evaluation/quality/probes/coda-extensions/analyze.mjs BASELINE CANDIDATE OUTPUT
```

The output contains the preregistration and script hashes, input manifest hashes,
aggregate counts, and bounded full-trace examples. It is an additional development
diagnostic; it must not be used to tune the held-out validation set.
