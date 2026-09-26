# Registered design: preserve the sound through doubling

## Linguistic scope

English spelling distinguishes sound and letter: c can represent /k/ or /s/, whereas ordinary ck represents /k/. The [DfE phonics correspondence table](https://www.gov.uk/government/publications/assessment-framework-for-the-development-of-the-year-1-phonics-screening-check/assessment-framework-for-the-development-of-the-year-1-phonics-screening-check) lists ck for /k/, ss for /s/, and s for both /s/ and /z/. Its scope is a teaching/assessment inventory, not an exhaustive grammar.

The [DfE spelling framework](https://www.gov.uk/government/publications/key-stage-1-english-grammar-punctuation-and-spelling-test-framework/key-stage-1-english-grammar-punctuation-and-spelling-test-framework) groups ff, ll, ss, zz and ck with their corresponding sounds. This motivates explicit sound/spelling relations; it does not establish the generator's probabilities. Lexical ss can represent /z/, as [Collins documents for scissors](https://www.collinsdictionary.com/dictionary/english-pronunciations/scissors). Therefore this experiment measures unsupported ordinary expansions separately from the concrete /s/→ck mismatch. It does not label every /z/→ss or /ʃ/→ss string linguistically impossible.

## Proposed representation and behavior

Add a typed, optional structured realization policy to DoublingConfig. Each relation binds a phoneme sound, selected form, resulting form, resulting reading obligation, and explicit coda-cluster permission. English declares b/b/bb, d/d/dd, f/f/ff, g/g/gg, k/c/ck, k/k/ck, l/l/ll, m/m/mm, n/n/nn, p/p/pp, r/r/rr, s/s/ss, t/t/tt and z/z/zz. Only the two ck relations permit the existing first-coda-cluster exception. Missing relations do not fall back to repeating letters. Existing stress, reduction, vowel, position, probability and quota guards remain. This is a correspondence-support change, not a retuning of those guards.

Absent structured policy retains the legacy custom-config behavior exactly, including its form-keyed overrides and RNG behavior. An explicit legacy opt-out must be documented for callers who spread English config and change old doubling fields. Validate ambiguous duplicate relations and impossible realization shapes at the existing config/model construction boundary. Do not silently pick the first duplicate or interpret an unknown spelling as a licensed rule.

Count direct selections against the quota by sound plus realized spelling under the structured policy. Preserve historical ordering of the cluster and cross-syllable guards; do not conflate quota redesign with this change. Direct ck selection and successful sampler expansion are separate events. No extra RNG is allowed in policy lookup, support enumeration or certificate verification.

The pure description and sampled transition must share the same relation. Coverage and normalization must use the resulting reading obligation after a supported expansion, rather than blindly retaining the input c/g condition. Unchanged selections keep their original reading. Certificate verification must recompute this from pinned config, not trust a supplied reading claim. No generic regular-expression edit receives a new pronunciation certificate.

Structured realization does not certify every selected grapheme or final word. Refusing to expand /s/ c leaves its following-letter obligation to Q14b; refusing a lexical /ʃ/ s expansion does not solve that inventory's lexical identity. Shared spellings remain Q13b, split markers Q14a, final morphology ownership Q02.

## Required fixtures and interpretation

Test every declared relation, same-letter/different-phone counterexamples, direct selection accounting, first versus later coda cluster, following-consonant guards, quota boundary, failed/successful draws including probability 100, legacy identity-form overrides, and immutable pure lookup. Test output-reading propagation in coverage/normalization and reject forged licenses. Generate integration words only through public APIs; use the recorded seeds and new fixed synthetic configurations, never a private generator path.

Legacy-mode parity covers complete words, trace presence/absence, RNG call counts and next values against exact #335. Positive-mode determinism is checked independently. Existing custom tests that spread English must explicitly choose legacy when testing legacy overrides; do not weaken their assertions.

The primary mechanism endpoint is zero sampled expansions outside the declared ordinary sound/selected/result relation set, with /s/→ck reported separately. Report attempted and successful events, directly selected counted units, skipped reasons, all source-sound/form strata, and affected words. Report legal-relation coverage rather than achieving zero by disabling doubling. Recompute corpus diagnostics, rejection, diversity, spelling integrity and local timing. A mechanistic pass cannot erase distribution or performance regressions and cannot establish human preference.
