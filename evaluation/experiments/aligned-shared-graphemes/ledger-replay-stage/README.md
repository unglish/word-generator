# Q13b enclosing ledger replay — preparation stage

createSharedLedgerReplayer reconstructs the v4 operation timeline from an empty
ledger. Original selection support and doubling history are checked against the
supplied configuration and writer-boundary contexts. Appends must consume the
exact next source-cell IDs, including empty appends. Shared events run through
the semantic event replayer and the ledger, with resulting states compared.
Unguarded rewrites are disallowed while shared constructions are live.

Normalization checks are reconstructed from current cells; a collision requires
its immediate episode. Normalization decisions and prior licenses are recomputed,
and standalone commits without an observed episode are rejected. Coverage verifies
the entire plan against authoritative contexts and prior choices, then commits
atomically. The existing normalization schedule verifier is reused through a
narrowed structural input type, with no runtime logic change. All operations,
references and final trace fields are reconciled by exact reconstructed snapshot
comparison, including final ownership, counters, chronology and live joint IDs.

This is producer-assisted semantic reconstruction, not an independent reference
implementation or the registered independent corpus recount. Generic rewrite and
lexical gap eligibility/sampling are not rederived from the spelling-rule program.
Most importantly, shared-rule slot/candidate completeness is not yet authenticated.
The result explicitly returns sharedWriterSchedule: unverified. Public
createBaseSpellingEvidenceVerifier still rejects v4; this helper is not a bypass
for complete trace acceptance. Named writer scheduling and integration remain.

Fifteen new tests cover actual normalization observation schedules, original
empty units, appends after syllable-level formation, shared trials/guards/batches/
gaps, coverage after shared formation, and corrupt original allocation, missing
checks/events, reordered entries, final live IDs, standalone normalization and
altered normalization support/history/episode/certificate multiplicity.

All 361 tests across ten affected suites pass. Strict TypeScript and changed-file
lint pass. Initial fixture segment indices failed writer-boundary validation;
that failure and its corrected run are retained. All eleven registration hashes
remain unchanged. The replay branches follow operation kinds and reuse compiled
policy planners; no unrelated simplification was introduced.

No public generator activation, full-suite run, corpus capture, performance or
human evaluation result is claimed. Next: authenticate the shared writer slots
and candidate schedule, wire configuration and factory reuse, then execute the
registered legacy parity, frozen comparisons, independent recount and timing.
