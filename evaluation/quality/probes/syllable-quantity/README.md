# Q08b partial English quantity: preregistered design

Registered 2026-09-26 before behavioral source changes. Implementation awaits
design review. This branch will explicitly stack on Q08a commit
`82b9152eb8610d9e99f8501e50d37e1463705f85` (#319). First regenerate a complete
200,000-word legacy control using the unchanged Q08a source and frozen #307
evaluator, then verify every word and pre-existing trace against the immutable
original. Only `trace.stressWeight` may be removed for that control comparison.
All core summary fields except the run ID must match. Run the Q08a analytical
observer over every archived control record, not only its retained examples.

## Proposed model and behavior boundary

The named analysis is `english-legacy-partial-quantity-v1`. It is a partial model
for this source inventory, not a completed dialect specification or an acoustic
duration claim. Preserve all existing symbols and tense classifications.

| Existing source entries | Nuclear contribution |
| --- | --- |
| /eɪ aɪ əʊ ɔɪ aʊ/ | 2 moras each |
| /ɪ ɛ æ ʊ ʌ ə/ | 1 mora each |
| /i: u ɑ ɔ ɚ ɜ/ | Unspecified |

The existing GOAT symbol remains /əʊ/; it is not renamed to /oʊ/. The ambiguous
/ɜ/ source identity stays unresolved. /ʊ/ keeps its current `tense: true` flag
while receiving the model's independent one-mora nuclear contribution. Assigning
/ə/ one mora does not license it under primary stress or repair absent lexical
stress. Existing nucleus repair and reduction behavior remain unchanged.

Activate `pronunciation.stress.syllableWeight` with `type: "moraic"`, this analysis
name, `coda: "weight-by-position"`, and explicit
`unknown: "legacy-segment-count"`. Add structured quantity metadata only to the
eleven declared inventory entries. All primary/secondary constraint weights,
noise, candidate order, WSP's current objective, rhythmic rules, tense behavior,
affix behavior and generation weights remain unchanged. Custom configurations
can explicitly select the legacy policy or supply a different named model.
The legacy opt-out preserves prior stress behavior and RNG use, but the new
quantity metadata remains on output phoneme objects when inherited from the
English inventory. Exact object comparisons must explicitly remove only that
additive metadata, or use a configuration with the metadata removed as well.

For the generated single-segment nuclei, the operational difference from legacy
is precisely an open syllable containing one of the five declared diphthongs:
it becomes heavy. Declared one-mora open syllables remain light; closed syllables
remain heavy; unspecified open nuclei retain the explicit legacy fallback.
Known coda weight does not fabricate an exact nuclear mora count.

This conservative activation follows the distinction between vowel quantity and
duration in [Hayes (1989)](https://brucehayes.org/papers/HayesCompensatoryLengthening1989Searchable.pdf).
[Moore-Cantwell (2021)](https://www.cambridge.org/core/journals/phonology/article/weight-and-final-vowels-in-the-english-stress-system/30EDBFA90E382F68C400EEFCFC0DA31D)
treats diphthongs as long, discusses disagreements over some monophthongs, and
models final-vowel effects separately. The present scope leaves all six listed
uncertain/underspecified entries unknown rather than settling that debate via a
legacy tense flag. A rhotic General American reference remains provisional; no
dialect preference is inferred from this source inventory.

## Registered comparisons and denominators

Use the frozen development protocol: four profiles, five distinct seeded streams
per profile, 10,000 words per stream. Keep the same immutable original and the
new full Q08a control. Compare the candidate to both; no gate, probability or
reference corpus will be tuned. Preserve full raw draws, source bytes, manifests,
profile/stream summaries and bounded complete witnesses. Validation seeds remain
unseen until the approved development result warrants a separate confirmation.

The supplementary observer is independent of the frozen evaluator and measures:

1. **Quantity availability at the root stress decision.** Count all words, root
   syllables and nuclear segments, then known-one, known-two, unspecified and
   model-mismatch observations by profile, stream, source vowel, root syllable
   count, position and actual morphology. Analytical and operational categories
   and their bases are distinct. Historical missing decision fields remain
   unavailable. Root stage phones can support explicitly labeled retrospective
   eligibility under the proposed model; they cannot recover historical mora
   declarations or stress decisions.
2. **Activation correctness.** The primary mechanism metric is open atomic
   diphthongs classified operationally light, divided by all root decision-time
   open atomic diphthongs in the registered five-entry set. Target zero for the
   candidate, with every declared diphthong receiving two moras. Report all five
   vowel denominators, including zero opportunities. Independently recompute the
   legacy predicate on every candidate decision: differences must occur only in
   the declared open-diphthong context. Report observed coverage, not a forced
   quota of examples. All other contexts must retain the legacy operational
   classification, and all six unspecified entries must retain unknown nuclear
   quantity. No missing trace is counted as success.
3. **Stress use of the classification.** Count selected primary positions and
   operational weights by root syllable count and weight pattern. Count secondary
   candidate weights and selections, separately identifying newly heavy open
   diphthongs. Check candidate weights against the unchanged 70/30 configuration.
   Report selections on newly heavy syllables as observed outcomes, not as
   counterfactual changes to individual words. Q08a trace does not store perturbed
   OT weights, so it cannot reconstruct the alternative noisy winner. Same draw
   coordinates across changed generators are not automatically the same root.
4. **Downstream consequences and guardrails.** Preserve the frozen evaluator's
   final primary-stress, stressed-schwa, clash, hiatus, coda, spelling, uniqueness
   and distribution metrics. Report root decision evidence separately from final
   words: later nucleus repair, reduction and morphology can alter the relevant
   structure. Break out bare/actually affixed words and root syllable counts.
   Report stress-position/window and clash distributions descriptively; this
   activation alone is not a complete theory of English stress.

Absolute all-word/all-syllable denominators accompany every conditioned rate,
because changed stress can alter repair/reduction draws and later rejection
streams. Retain stream-specific results; do not claim stochastic independence or
infer a causal per-word change from paired indices. Frequency shifts outside the
target context are reported and inspected, not tuned away.

## Integrity and validation

Before reading draws, validate the protocol, cohort, manifest digest, artifact
hashes, and exact scheduled/pinned/filesystem shard sets. Process the verified
compressed bytes, check every profile/seed/draw coordinate and full stream count,
and reject partial, reordered, duplicate, extra or stale archives. Cross-check
archived generator/evaluator/reference sources against their provenance and pin
the observer's own source before and after analysis. Reports are exclusive writes.

The complete Q08a control comparison must pass first. Its original/runtime
source sets must match the verified Q08a source bundles; do not merely compare
current branch names. Every control record runs the shared Q08a observer, with
aggregate nonnegative-integer and nuclear-segment count reconciliation added to
the full-control report.

Behavioral fixtures will use public generation APIs and the public pure analysis
API. Cover every declared/unknown inventory entry, current /əʊ/ and /ʊ/ identity,
explicit legacy opt-out, detached quantity snapshots, open versus closed nuclei,
OT and alternate primary strategies, and secondary candidate weighting. Controlled
WSP-only/no-noise fixtures can isolate the intended stress preference without
changing production weights. Check trace/no-trace determinism and public custom
configuration composability, full unit/quality checks, and isolated performance.

No behavioral source edit starts until this protocol is reviewed. Final lexical
stress/morphology ordering remains Q04/#309, and English final-[i] effects, rhythm,
different WSP constraints, phonetic duration and identity migration remain outside
this activation.
