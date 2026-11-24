# Medial root /z/ benchmark for #496

The benchmark compares the development cohort from main at `7ae32788` with the
candidate config. Each run has 200,000 traced words across four profiles.
`quality-comparison.md` is the standard quality harness report.
`junction-counts.jsonl` records the Phase 2 reference buckets, then one row per
profile and seed. The witnesses come from the selected attempt.

The corpus comparison uses one root per included surface type in the pinned
Phase 1 ledger, with the Phase 2 exclusions. It applies the same maximal-onset
parser to both the CMU and generated phoneme sequences. The expected counts
match the generated syllable mix, with roots of five or more syllables pooled.
Raw junction tallies use the generated syllable boundaries at proposal, cluster
repair, spelling, and in the final lexical root.

This is a pronunciation diagnostic. Maximal-onset parsing can group /s/ and the
following consonant as an onset. The flat V-s-C-V and V-z-C-V tallies also
measure these sound sequences across all syllable assignments. The lexicon
trigram distances are reported separately by the quality harness.

## Reproduce

Regenerate the Phase 1 root artifact following the corpus reference guide.
Run the quality comparison from the candidate source and pass the two runs
to the probe.

```sh
npm run quality:pr -- --base 7ae32788 --out "$QUALITY_RUN"
node --import tsx evaluation/experiments/medial-root-z/measure-junctions.mjs \
  "$ROOT_JSON" "$QUALITY_RUN/baseline" "$QUALITY_RUN/candidate"
```

[Phase 1 corpus reproduction](../../../docs/cmu-root-reference.md#reproduce)
