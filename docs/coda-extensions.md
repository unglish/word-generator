# Optional coda extensions

Final /s/ and nasal-stop proposals are validated before mutation against the
configured coda inventory, positional weights, nucleus restrictions, cluster
weights, length, voicing, place, and cluster-sequence constraints. Rejected
proposals preserve the original coda and emit `codaExtensionRejected`, with the
candidate, original coda, extension type, first rejection reason, and root
syllable index. Rejections do not own spelling units.

Adjacent identical phones are rejected. An attested inventory can license
separated repetition, including /kst/ + /s/ → /ksts/, during extension.
Construction may traverse a proper prefix of a listed cluster;
an optional extension must itself complete an exact listed cluster. Without an
inventory, the configured sonority and pattern filters apply.

Coda appendants grant an extra length slot; they do not bypass other constraints.
Nasal-stop extensions choose eligible voiced stops with the nasal's configured
place of articulation. Shape checks reject extensions that would otherwise
trigger a repair of the original coda. Normal construction and safety-net repair
rules are unchanged. Default /n/ and /z/ coda selection weights are calibrated
for this preservation behavior; their onset weights are unchanged.

These rules apply to the root before morphology attaches, with root-only length
budgeting. Morphological alternations can subsequently change coda phones; they
are outside this extension guarantee. Final spelling and affix ownership remain
separate concerns. Trace stages distinguish root construction from later changes.

The same configuration and RNG stream remain deterministic, and enabling trace
is observational. Eligibility changes intentionally change historical seeded
outputs. Per-PR measurements are kept in the PR description and archive tags,
following [the evidence policy](experiments.md#where-evidence-lives).
