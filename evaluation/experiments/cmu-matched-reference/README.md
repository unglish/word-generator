# CMU matched reference (fixed input)

`reference.json.gz` is the pinned joint CMU reference. The length, phoneme,
transition and score builders in `evaluation/corpus/` read it as their parent and
check its SHA-256; `evaluation/review/cmu-joint.test.ts` also reads
`baseline-manifest.json.gz`. See [the matched-reference doc](../../../docs/cmu-matched-reference.md).

The packet's verification reports, sensitivity study and test logs are kept at tag
`archive/evidence-pre-cleanup`:

```sh
git show archive/evidence-pre-cleanup:evaluation/experiments/cmu-matched-reference/README.md
```
