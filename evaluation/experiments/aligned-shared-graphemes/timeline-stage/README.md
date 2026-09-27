# Q13b complete operation chronology — preparation stage

The unactivated v4 trace now includes a shared.timeline array with explicit
pre-operation cursors for original appends, unguarded rewrites, shared decisions,
normalization checks/episodes, direct normalization commits and coverage commits.
Shared decisions reference the existing ordered shared.events array, avoiding
separate guesses about interleaving. Empty appends are recorded even though they
allocate no cells. No-op generic rewrites remain absent because they do not mutate
or perform a shared guard. Guarded/batched/gap operations appear once through
their shared event; coverage records one operation for its complete atomic plan.

Observed normalization episodes wrap their successful commit as one timeline
operation. Direct commit calls have a distinct normalization entry; a full
writer verifier can reject a standalone commit that lacks its required episode.
A private applyNormalization helper prevents double-recording without exposing
a public option to suppress timeline records. Refused commits record nothing.
Timeline cursors and returned arrays are detached in snapshots.

Tests cover interleaved shared history, empty appends, unguarded/no-op edits,
returned cursor mutation, normalized episode versus direct-commit chronology,
and single/multiple replacement coverage as one operation. All 346 affected tests
pass. TypeScript and changed-file lint pass; the initial optional-guard narrowing
error and successful correction are preserved. All eleven registration pins
remain unchanged. No public shared generator or v4 acceptance is activated.

This records chronology; it does not authenticate it. The enclosing replay must
check every entry against live state and the writer schedule, including missing
or reordered zero-edit decisions. It must also account for all units, edits,
normalization observations and certificates, coverage certificates and shared
events exactly once, then compare final state. Earlier preparation traces lacking
this field remain incomplete evidence, not silently upgraded traces.

Full suite/corpus/performance measurements were not rerun. Existing registration,
legacy behavior requirements, quality gates and measurement scope are unchanged.
