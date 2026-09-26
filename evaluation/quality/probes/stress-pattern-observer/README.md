# Complete stress-pattern observation protocol

Q09a observes the published metadata-detached Q04 + Q08b + Q06 combination. It does not activate a rhythm fix or change any sampling, weighting, rejection, reduction or morphology rule. The exact immutable immediate control and frozen core evaluator are pinned in `protocol.json`. Draft dependencies and inherited failing assertions remain documented in `docs/stress-pattern-observation.md`.

The new optional `trace.stressPattern` v1 is scoped to the returned attempt, excluding rejected attempts and non-stress random calls. Its seven domains are root before primary, root after primary, root after explicit secondary, root after left-to-right rhythm, assembled after morphology, final lexical before pronunciation, and surface after pronunciation. The first four use root syllable indices; the last three use assembled-word indices. Actual resolved affix arrays determine the root offset. Zero-syllable affixes can contribute phones inside the root syllable span; the span is not a phone-ownership claim.

Every executed assignment has a sequential ID, before/after label, previous origin and cause. This retains overwritten secondary marks and demote/re-promote sequences even when their net label change is zero. Prefix and suffix effects run in that order and refer to existing Q06 realized selections by word-local role. Spelling is not treated as a unique affix identity. Raw draws are only values returned by existing stress RNG calls; disabled/skipped branches carry null, while existing probability 0/100 calls remain executed.

`validate.ts` independently derives the expected assignment sequence from primary/explicit/rhythm decisions and each morphological effect, comparing every event and every origin-bearing snapshot, then checks actual final phones/metadata and old trace fields. Config checks use pinned declared rule values and recorded operational root weights; they never run a new weight policy on affix or surface vowels. Primary draw counts are checked against the pinned OT constraint registry/noise behavior. This validates recorded decisions and parity; it does not reconstruct the full generator RNG stream from one selected attempt.

`observe.ts` reports exact P/S/U patterns, ordered marked adjacencies (PP, PS, SP, SS), maximal unmarked runs, signed secondary distance to every primary, boundary/origin pair counts, declared quantity and observed operational root strata. A label gap is not an acoustic lapse or universal linguistic error. The pinned historical control supplies five exact label domains; primary-only and explicit-secondary-only stages plus all origins are unavailable. Unmarked is an observed label, not missing data. Per-domain quantity and stress-draw counters have explicit available/unavailable word denominators; the control's absent new quantity snapshots and draw records are not measured zeroes. Root metadata/fallback and per-domain declared quantity remain distinct; nothing equates tense, duration and quantity.

Before formal capture, freeze `sourceSnapshot()` and declare its `digest()` to the parent review. `analyze.ts` is an import-safe runner requiring that exact predeclared digest. It uses the existing pinned #307 capture/serialization tooling and the already tracked Q08b archive reader; these are required dependencies, not a standalone script. It verifies all compressed artifact bytes, source/evaluator/reference digests, exact filesystem/pinned/expected shard sets, summary schedules, every raw draw identity/order/count and current reviewed candidate source. It compares each complete candidate to the control after deleting only `trace.stressPattern`; all old trace fields and summaries must match. No pair is interpreted as a counterfactual behavioral improvement.

```sh
node --import tsx evaluation/quality/probes/stress-pattern-observer/analyze.ts CONTROL_DIR CANDIDATE_DIR PREDECLARED_OBSERVER_SHA REPORT.json
```

The reader rejects symlink metadata/artifacts and re-verifies the full archive against its initial identity at completion. Every stream also has resolved-morphology (bare/prefixed/suffixed/both) × final-syllable-count strata; every numeric count reconciles exactly to stream totals.

The report embeds observer sources, per-stream denominators/hashes and first-occurrence complete witnesses under the fixed policy. A separate 20,000-draw public-API source comparison checks old traces, outputs, RNG counts at every word boundary and next value, with trace on/off; it is separate from the full 200,000 raw-archive comparison. Parent's independent Python implementation recounts raw label-pattern/adjacency/run histograms and ordered origins. No existing baseline or historical tool is rewritten.


The new `parity.ts` and `compare-parity.ts` tools preserve the previously published detachment tools byte-for-byte. Run the same new parity tool once against each exact committed runtime checkout; it verifies every source/package byte before and after generation. It removes only `trace.stressPattern` from legacy trace hashing and requires the field absent in control/present in candidate. Compare the resulting reports to require identical full output/legacy-trace hashes, RNG boundary hashes, call totals and next values across all 20 pinned streams.

```sh
node --import tsx evaluation/quality/probes/stress-pattern-observer/parity.ts CONTROL_CHECKOUT control FULL_CONTROL_COMMIT control-parity.json
node --import tsx evaluation/quality/probes/stress-pattern-observer/parity.ts CANDIDATE_CHECKOUT candidate FULL_CANDIDATE_COMMIT candidate-parity.json
node --import tsx evaluation/quality/probes/stress-pattern-observer/compare-parity.ts control-parity.json candidate-parity.json rng-proof.json
```
