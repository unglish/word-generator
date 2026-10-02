# Final-word operational provenance

Q02 adds persistent UTF-16 cell identities and phone identities across lexical
stress, morphology, pronunciation, final spelling cleanup and bare gap overrides.
It records resolved-affix origins, executed edits and operation draw tapes.
Configured replay and an independent structural/count recount have separate
scopes. The ledger does not certify complete spelling-to-phone licenses or human
reading agreement.

Read [RESULTS.md](RESULTS.md) for the current measurement state, failed gates and
costs. The measured control is Q04 + Q14b composition `905ba3e`, reviewed in draft
PR #347. The measured candidate is recovered snapshot `7e34a17`; publication
implementation `3dd6cf1` preserves all 176 source files byte for byte. The
prospective [measurement.json](measurement.json) remains unchanged.

Review the added contracts in `src/core/trace.ts`, identity handling in
`final-spelling.ts` and `final-phones.ts`, then generator integration and configured
replay in `lexical-spelling-evidence.ts`. Source-link checks and morphology,
pronunciation and nucleus evidence modules retain the operation boundaries.
Tests cover serialized records, native regex replacement semantics, structured
metadata isolation, forced repairs/gaps/bridges/cleanup and corrupted histories.

The `checkpoint/` and `lexical-parity*/` directories are historical implementation
checks. Their source bindings and local execution paths are retained; earlier
checkpoints are not formal evidence for the final integrated corpus. The final
measurement uses 200,000 words per arm, with identical active spelling policies,
full archived legacy-field comparison, registered RNG checks, independent
recount, unchanged quality gates and six fixed local performance pairs.

Raw generation archives remain separately retained and are required for full
analytical replay. Committed summaries, seals, scripts and artifact hashes alone
cannot reproduce an absent word corpus. Executed scripts preserve their actual
local paths and measured roots; they are not advertised as a portable one-command
runner or a hermetic execution proof.
