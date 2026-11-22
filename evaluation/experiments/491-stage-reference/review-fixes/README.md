# PR #502 adversarial review evidence

This directory supplements the original evidence in the parent directory.
`generator-revision.txt` identifies the revised PR head used for the final
quality capture and checks.

- The main reference is 0de88f5cd4ab51fe2485e38698ca8f528f804a34. The first PR
  generator is a12624f3375d5b1c49507df084899b9f9df506a7.
- `main-{full,roots}.json` and `final-{full,roots}.json` retain all 30 independent
  streams per stage. Each stream uses 200,000 words. `paired-calibration.json`
  recomputes the comparisons from raw phone counts against the final pinned
  stage references, including all baseline root rows sampled while the
  reference's fitted weights were being finalized.
- `*-spellings.json` retain traces for all initial digraph, ia/ian and sion
  observations in the fixed spelling samples. `*-attribution.json` give root,
  prefix and suffix phone contributions from the same 40,000-draw schedule per
  revision, plus final coda counts from the 40,000 bare roots at seed 7.
- `past-coda-spot-check.tsv` contains the 182 sampled residuals and judgments.
  `revised-coda-audit.tsv` gives every corpus candidate with a multi-phone final
  coda and its final keep/drop decision.
- `transition-generator.bundle` pins the measurement source. Clone it, then run
  `node --import tsx evaluation/corpus/sample-stage-transitions.ts <clone>`
  from the feature checkout. Use its JSON as the stage builder's required
  `--transitions` input. The bundle's source differs from the final revision
  in the bootstrap marginal and coda configuration placement. The sampler fixes a root-length bucket before
  generating and instead samples the conditional phone probabilities.
- `final-seeds.json` and `text-parity-final.json` reproduce the fixed 20,000
  per-word seeds in the PR description. The paired quality comparison is in
  `quality/`. The raw check and performance logs are retained as text.
