# Final-word provenance implementation checkpoint

This Q02 branch adds exact operational cell and phone lineage from writer output
through morphology, realization, final cleanup and bare gap overrides. It retains
root identities, resolved-affix origins, executed edits, pronunciation draw tapes,
and morphology/gap operation packets. The validators replay configured operations
and reject tested provenance corruption. This is operational provenance, not a
claim that every spelling has a licensed phonemic interpretation.

The checkpoint is based on Q14b `0d841bda8504bce34ec97220ec8c5737d87cbbf6`.
Q04 pipeline composition, formal development-corpus capture, independent recount,
quality/performance measurement and publication remain required. English generator
behavior has not intentionally changed. The 4,000-case parent probe preserves all
legacy words/traces and RNG use across 8,000 public calls; only explicitly listed
new fields are removed by the comparison. Current source hashes are retained in
its report. All 133 focused tests and strict TypeScript checking pass.

Read `src/core/trace.ts` for added trace contracts, the final-spelling/final-phones
modules for identity handling, and morphology/operation-evidence.ts plus
bare-word-evidence.ts for replay. The retained tests include native regex parity,
serialized traces, forced gap/bridge/cleanup fixtures and fabricated histories.

`checkpoint/index.json` binds the retained checks and parity script. The script
records the actual local paths and requires the exact parent sources restored
with git archive and the existing Node/tsx runtime. It is not presented as a
portable one-command runner or a hermetic runtime proof. Earlier exploratory
results remain local; the v3 report is the checkpoint's current-source parity proof.
