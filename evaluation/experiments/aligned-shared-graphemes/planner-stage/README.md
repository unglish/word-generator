# Q13b event-time planning — preparation stage

The planner combines complete source-unit ownership, scope-relative context,
configured support and local sampling. Attempts retain the live append/edit
cursor and source-unit request. Replay recomputes the decision against supplied
authoritative state, slot, configured rule and ordered unit IDs, without using
a generator RNG. A recorded random value is checked against its probability;
this does not independently prove where that random value originated. Later
full-ledger replay and public-API RNG parity remain required.

Syllable scope cannot consume phones from another source part. Word scope can
retain cross-part ownership. A failed eligible syllable ks attempt can retry
at the word slot. Unknown following ownership cannot satisfy the gz vowel
condition. Neither planning nor replay mutates the base spelling.

The planner returns decisions, not committed output-cell certificates. Shared
origins, atomic commits, trace versioning, named writer-slot activation, later
edit guards, independent corpus recount and performance capture are still open.
No generated-output change, corpus result or human-quality gain is claimed.

Validation: 222 tests pass across five related suites (25 planner, 27 ownership,
36 policy, 89 normalization and 45 coverage); strict TypeScript and changed-source
ESLint pass. Tests reject forged cursor, phone order, cell extent, parts, text,
context, outcome, probability and version; missing/invented draws, changed policy
and stale state also fail replay. Positive cases cover all three registered rules,
cross-part gz, scope-relative initial position, retries, zero/100 no-draw laws,
refusal replay and detached returned plans.

Focused code-simplifier review retained separate scope validation and offset
helpers; no unrelated generator refactor was needed. All eleven registered
files retain their original hashes. Earlier ownership-stage evidence is unchanged.
