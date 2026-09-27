# Q13b coverage search with joint ownership — preparation stage

Coverage projection distinguishes shared construction cells from unknown owners.
An explicitly configured shared planner requires live construction state referring
to the same cells, units and phones as its current-state view. It checks complete
joint extents, reading policy, missing/duplicate construction records and repeated
source-unit membership before skipping joint source phones in single-unit checks.
Joint units cannot be assigned replacement spellings by the singular-unit search.
Their original choices still participate in the existing conditional option law;
no new sampling or source-history rewriting is introduced.

Every proposed repair is checked against a complete licensed cell projection and
prospective coverage certificate. Plans retain preservedSharedConstructionIds;
the verifier reconstructs the candidate, checks singular readings, exact changed
phone coverage and preserved joint readings. Missing configuration, missing joint
records and altered preserved IDs fail verification. The same guard runs again
at atomic commit. The required live views share array identity; replay adapters
must construct both views from the same authoritative replay state.

Four earlier structural fixtures now also exercise real search, verification
and commit beside gz-to-x: one/two replacements with an allowed e or incompatible
h spelling for the following vowel. Positive repairs keep /g,z/ jointly owned;
incompatible ones report construction-obligation and preserve the ledger. The
old structural commit checks remain independent assertions.

All 328 related tests in nine suites pass. The expanded coverage suite passes
50/50; TypeScript and changed-file lint pass. The initial closure-narrowing type
errors and successful correction are retained. Eleven registration pins remain
unchanged. Shared-context classification and final joint projection are separate
helpers; no unrelated simplification was needed. No full-suite, corpus, timing
or public writer activation is claimed at this preparation stage.

Remaining: mixed coverage/normalization legality (coverage still refuses after
normalization; normalizer intact checks still exclude coverage-repaired units),
full v4 semantic replay, public configuration/named writer slots, compiled-model
reuse, registered compatibility and frozen corpus/performance measurements.
