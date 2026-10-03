# Q08a shared syllable weight: preregistered parity

Registered 2026-09-26 before modifying runtime source. Q08a adds explicit
model-qualified nuclear quantity and a shared analysis for OT, the alternative
weight-sensitive primary strategy, and secondary stress. The default remains the
exact legacy coda/segment-count decision. English inventory quantities stay
unspecified. No probability, stress constraint, nucleus repair, rhythm, reduction,
affix, dialect, or spelling behavior is changed.

Compare unchanged `origin/main` (8e9ceb2) against the candidate using the four
development profiles and five seeds per profile from the frozen quality protocol,
1,000 continuous public-API draws per stream, with tracing on and off. Hash
complete words without trace, legacy trace content excluding only the additive
weight observation, cumulative RNG calls after each draw, and the next RNG value.
All 20,000 draws must match exactly. Verify source fingerprints before and after
each run. Reports must pin evaluator source, runtime source, schedule and Node
version and refuse overwriting evidence.

Candidate analysis checks distinguish analytical light/heavy/unknown from the
operational legacy decision. Missing nuclear metadata is unknown, not one mora;
no quantity may be inferred from tense, stress marks, IPA length, or spelling.
Closed-syllable weight may be known under an explicit coda policy while nuclear
quantity is still unknown. Historical decision traces are unavailable, not zero
unknowns. Report quantity availability, analysis/operational bases and actual
stress strategy by profile and replicate, retaining bounded full witnesses.

Public-API fixtures must cover omitted/explicit legacy policy, a custom moraic
model, atomic versus multi-element nuclei, quantity/tense disagreement, coda
policy, unspecified and mismatched model metadata, strict unknown handling,
fixed/initial/penultimate/weight-sensitive/OT primary strategies, shared secondary
analysis, detached snapshots, malformed configuration, and trace/no-trace RNG
parity. A controlled opt-in model verifies behavior without activating English
inventory quantity. Existing constraint weights and gates remain unchanged.

Q08b may separately activate a named partial English quantity profile after this
representation is reviewed. This experiment proves compatibility and observable
shared analysis, not improved human wordlikeness or a completed English stress
theory. Final-[i] effects, rhythm, canonical WSP redesign and phonetic duration
remain independent. The reference dialect preference remains unsettled; no
legacy sound identity, including /ɜ/, is silently reinterpreted.

Run from this checkout, substituting paths to the original and candidate:

```sh
npx vitest run --config evaluation/quality/probes/syllable-weight/vitest.config.ts
node --import tsx evaluation/quality/probes/syllable-weight/capture.ts ORIGINAL /tmp/weight-original.json original
node --import tsx evaluation/quality/probes/syllable-weight/capture.ts CANDIDATE /tmp/weight-candidate.json candidate
node --import tsx evaluation/quality/probes/syllable-weight/compare.ts /tmp/weight-original.json /tmp/weight-candidate.json /tmp/weight-comparison.json
```

The original capture verifies tracked runtime bytes against the pinned Git ref
and rejects extra runtime source files. Both captures verify runtime and evaluator
stability. Comparison validates the complete schedule and trace/no-trace parity,
then compares every stream hash. The observer independently checks candidate
weight coordinates against `applyStress.before` and secondary candidates against
the unchanged 70/30 policy. Legacy stage snapshots omit stress marks, so only
bare final words independently corroborate selected primary and applied secondary
marks; affixed-word final correspondence is reported unavailable. Bounded witnesses retain
complete public words and traces; they are examples, not the counting sample.
