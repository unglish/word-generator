# Root stop junctions in #499 and #540

The comparison uses two development cohorts of 200,000 traced words each.
The baseline is main at `c83e5e57`. The candidate adds English boundary
weights and raises the non-final coda weight of /ŋ/ by a factor of 1.3.

`junctions.jsonl` gives the reference buckets and one result per stream.
`parsedCounts` counts words with each junction after the shared maximal-onset
parse. Both sides use that parse. A counted junction has one coda consonant and
one onset consonant. `rootCounts` uses the boundaries recorded in the generator
trace instead. Each word contributes at most one hit per pair.

The reference uses the Phase 2 root population derived from the Phase 1
ledger. Expected counts match each stream's root syllable mix. The fifth
bucket includes roots of five or more syllables. Each witness contains the
two syllables as proposed, the same syllables at spelling, and the finished
pronunciation. The exposure tallies include all words with a long vowel or
diphthong before an initial /ŋ/ in a root coda.

`quality-comparison.md` records the wider distribution comparison.
`matched-examples.jsonl` gives same-seed examples where one lexical sound
changes. These examples use bare, two-syllable lexicon words and include the
syllable proposal from each run.

## Reproduce

Regenerate the Phase 1 root artifact using the corpus guide. Run the quality
comparison from the candidate, then pass both archived runs to the probe.

```sh
npm run quality:pr -- --base c83e5e57 --out "$QUALITY_RUN"
node --import tsx evaluation/experiments/root-stop-junctions/measure-root-joins.mjs \
  "$ROOT_JSON" "$QUALITY_RUN/baseline" "$QUALITY_RUN/candidate"
node --import tsx evaluation/experiments/root-stop-junctions/matched-examples.mjs \
  "$BASE_CHECKOUT"
```

Set `BASE_CHECKOUT` to a checkout of `c83e5e57` for the seed replays.

[Phase 1 corpus reproduction](../../../docs/cmu-root-reference.md#reproduce)
