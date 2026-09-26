# Activation preregistration amendment — 2026-09-26

Recorded after the full Q08a control proof and before Q08b runtime activation or
candidate capture. This clarifies the legacy opt-out comparison; it changes no
quantity assignments, hypotheses, denominators, thresholds, or sampling schedule.

Setting `syllableWeight` to `{ type: "legacy-segment-count" }` restores the
previous stress decisions and random draw behavior. The activated inventory still
adds `nuclearQuantity` to output phoneme objects and declared quantity snapshots.
Exact object comparisons must explicitly strip that additive metadata. Merely
removing metadata from a supplied configuration is insufficient: the existing
vowel-reduction implementation can select replacement phones from the module's
default inventory. Refactoring that implementation is outside Q08b.

The full-control proof and its embedded observer source remain unchanged. Its
embedded `README.md` is the exact preregistration version used for that proof;
this separate amendment governs the activation's opt-out interpretation. The
activation report embeds both documents and fingerprints their bytes.
