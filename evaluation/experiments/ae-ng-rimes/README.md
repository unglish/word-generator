# /æŋ/ restoration evidence

This directory contains the compact artifacts for the one-entry default
exclusion removal described in [the design/results document](../../../docs/ae-ng-rimes.md).
It is a draft candidate because the unchanged `ang` trigram gate fails.

`manifest.json` belongs to the complete candidate run `ae-ng-restoration`.
Its raw 20 gzip word shards remain in ignored
`memory/quality-runs/ae-ng-restoration/words/`. This compact directory is not a
complete raw run; full checksum verification requires those retained shards.
The original run is the immutable Q00 standalone development baseline at
`evaluation/quality/baselines/2026-09-26-development-standalone` in the foundation
checkout. No baseline files were changed.

- `original-rime-probe.json.gz` and `candidate-rime-probe.json.gz` contain the
  complete same-observer measurements, source/protocol text and full witnesses.
- `original-independent.json` and `candidate-independent.json` attest to
  independently recounted agreement over 200,000 words each. Their report hashes
  refer to the decompressed JSON bytes. The verifier imports no generator or
  TypeScript measurement code.
- `comparison.md` and `comparison.json.gz` preserve all frozen core metrics and
  distribution shifts, including worsened outcomes.
- `ang-regression-witnesses.json.gz` records the first three seed-42 `ang`
  matches and first three matching draws with initial /æŋ/, found within 1,364
  draws. Each includes the full trace and the candidate source digest.
  `antimangs` and `wolcang` involve schwa; `pacteang` involves FLEECE.
  `angless`, `unangs` and `wang` have initial /æŋ/ and /æ/→a, /ŋ/→ng decisions;
  `angless` subsequently reduces the vowel. These examples do not attribute all
  `ang` counts to one source.
- `reference-evidence.json` is a compact extraction from the existing PR #304
  model. It preserves the commit, raw artifact SHA, model digest, pinned CMU
  provenance and exact counts, without copying the source dataset or model.
- `sources.json.gz`, `summary.json`, `distributions.json.gz`,
  `review-samples.json.gz` and `witnesses.json.gz` are exact candidate artifacts.
- `validation.json` and `perf.log.gz` record the isolated performance pass:
  7,624 words/second and 1.29× median batch variance.
- The compressed test/lint logs retain the `ang` gate failure and the 11
  pre-existing whole-repository lint errors in untouched files.

The frozen candidate runtime digest is
`35218689ea4c1f5174b27cedd1dc83d5fcde13bcda99bd895fa7360b31623875`;
the observer digest is
`03c00ca25a4c78ac3564210d8b716b7306c36d0ff689da5dfad9a86a380d566a`.
The pinned foundation prerequisite and reproduction commands are in the linked
document. No human preference result is claimed.
