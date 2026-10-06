# Joint completion authentication

The baseline public API reproduces both residuals. A nucleus-only proposal changes the following context of lexical j=/j/ or s=/ʃ/, so the existing guard correctly refuses it.

Preserve the ordinary single-unit path and its RNG behavior. Only when every ordinary proposal is infeasible because a neighbor reading changes, enumerate eligible supported consonant forms for that affected unit, then validate the combined consonant and nucleus surface. Candidate eligibility must use the configured position and context, not hardcoded y/sh substitutions. Reject unsupported readings, shared or split-owned spans, noncontiguous inputs and all existing surface constraints.

A joint certificate needs separate replacement records with unit ID, phone IDs, original/input and output cell IDs, before/after form, part, inventory index and reading. Cell origins retain their own unit and replacement-local offsets. The encompassing edit replaces the contiguous combined input atomically. No live mutation or allocation occurs before complete validation.

Current ownership validation in spelling-construction-ownership.ts assumes certificate.unitId is the only owner. Completion obligation, completion projection and split-neighbor reading lookup likewise assume one certificate reading. All must select and authenticate the exact replacement for the current unit; returning the nucleus reading for consonant-origin cells is invalid. Existing single-unit certificates must retain their shape and semantics.

Planner verification rederives joint proposals and sampling from the frozen view and recorded roll. BaseSpelling replay calls the same authenticated operation, while the separate final-pass schedule still requires one ordered attempt per nucleus, with the joint edit inside that attempt. Independent recount must inspect both replacement records and count completed nuclei separately from respelled consonants.

Before integration, detached fixtures must prove y+/u/ and sh+/u/ combined projections, atomic source ownership, reading selection by unit, and rejection of tampered neighbor inventory/phone IDs/reading/output cells. Public API comparison follows integration; seed-coordinate identity after intervention cannot be assumed because new completion draws can diverge later RNG streams.
