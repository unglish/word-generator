# Morphological hiatus: preregistered comparison

Registered 2026-09-26 before modifying runtime behavior. The hypothesis is that
default English morphology should preserve adjacent vowels at affix boundaries
instead of introducing an unspelled /h/. This is a phonemic representation
decision, not a claim that all spoken vowel transitions lack phonetic detail.

Compare the original immutable 200,000-word development archive with the same
four-profile, five-stream candidate protocol. Keep validation sealed. Change only
the English morphology boundary policy and additive boundary-decision tracing;
root hiatus policy, stress, spelling, affixes, weights and gates stay fixed.
Legacy custom configurations may still explicitly enable bridge insertion.

Primary measures are words and events with traced morphology bridge insertion,
separated into prefix/root and root/suffix boundaries, profile, seed and actual
morphology. Candidate decisions additionally report retained vowel boundaries,
the two nuclei and their assembled syllable coordinates, policy, and outcome.
Absent historical decision fields are unknown; existing fallback events are
positive insertion evidence and must not be interpreted as exhaustive boundary
opportunity metadata. Cross-check each candidate decision against final adjacent
syllables, retaining any mismatches as failures. Later vowel reduction can change
the recorded pre-realization nuclei; compare boundary structure, not exact vowel
identity, for this check.

Retain all frozen diagnostics, distribution changes, diversity and performance.
Increased surface V.V counts are an expected consequence, not an automatic
regression. Reduced /h/ frequency and changed rejection sampling may affect other
metrics. Equal draw indices after such changes are not paired lexical items.

Public API fixtures must cover both boundaries, both on one root, open/closed
and consonant-initial controls, explicitly enabled custom bridges, an empty
bridge inventory, deterministic trace/no-trace output and RNG state, and the
seed-3 broing witness. Verify morphology-disabled output parity separately.
No claim of improved human wordlikeness is made without reader/auditory evidence.

Linguistic grounding: Davidson & Erker (2014),
[Hiatus resolution in American English: the case against glide insertion](https://blogs.bu.edu/danerker/files/2020/10/Davidson-Erker-2014_Case-against-hiatus-resolution_Language.pdf),
distinguishes within-word vowel adjacency from word-boundary realizations and
lexical glides. It supports rejecting universal phonemic consonant insertion;
it does not specify an output frequency target for this generator.

Review clarification before capture: the current root pipeline has already
applied pronunciation once when morphology runs. Boundary-time nucleus strings
are not guaranteed lexical identities; the later stress-order PR addresses that
separate issue. The structural comparison here does not infer underlying vowels.

The probe requires the frozen `evaluation/quality/capture.ts`, `model.ts` and
`serialization.ts` tooling from PR #307. Copy that evaluator unchanged into the
checkout when evaluating this independent branch; it is not part of this diff.
Run from the repository root with `node --import tsx
evaluation/quality/probes/morphological-hiatus/analyze.ts --run RUN --out NEW.json`.
The report embeds the probe and imported implementation sources and their digest.
