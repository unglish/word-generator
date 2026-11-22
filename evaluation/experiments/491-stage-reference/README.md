# Issue 491 evidence

The PR generator commit is the parent of this archive commit. Reports and
one-off probes are kept here so they stay out of the merge commit.

- `before.json` and `final-sample.json` count public `generateWord` output at
  seeds 3000000–3019999 per mode. Codas are from the
  `repairNucleusWordPositions` stage. The sampled templates and affixes are
  from the morphology plan.
- `stripped-review.tsv` and `stripped-review.md` contain the sample and the
  reviewer judgments. The Phase 1 artifact was independently verified.
- `coda-audit.tsv` records all multi-phone tails from the Phase 1 roots and
  their inclusion in the audited population.
- `transitions-singles.json` is the fixed input to the final fit. The probe
  samples 30,000 generated words per forced length 1 through 5, using the
  first pass of weights from the corpus transition matrix as its phone-length
  prior and the final audited coda and affix tables. The fitted weight changes
  only the syllable marginal, preserving those root conditional phone lengths.
- `final-calibration-{roots,full}.json` record five 200,000-word streams each.
- `cc-before-42.json` and `cc/` record one baseline and ten candidate
  streams, each 200,000 words, with the complete trace evidence for every
  doubled-c hit. The baseline probe replays each hit through the candidate
  generator under the old configuration and compares the full result.
- `perf-before.log` and `perf-after.log` record the absolute performance
  test observations. Compare captures share one evaluator and its original
  descriptive CMU references.
