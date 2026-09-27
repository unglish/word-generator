# Q13b shared decision order — preparation stage

Trace v4 now records one chronological list of references to attempts, single
edit guards, transactions and lexical supersessions. Each reference includes
its original append/edit cursor. This retains the order of decisions that do
not advance an edit ID or consume randomness; sorting four independent arrays
by cursor alone cannot recover that order. Applied records retain their pre-edit
cursor even though the trace reference is appended after their atomic commit.

validateSharedEventOrder checks the expected capability/version, exact reference
coverage, per-kind index order, record/event cursor agreement, integer bounds
and nondecreasing append/edit cursors. It rejects missing, duplicated, mismatched,
out-of-order per-kind, backwards and unreferenced records. It treats cross-kind
order at an identical cursor as recorded data. It does not independently prove
historical execution order, authenticate a random stream, or validate linguistic
licenses. Full event-time semantic and schedule replay remains required.

All 296 targeted tests pass across eight suites; nine new cases exercise actual
mixed event emission, seven forms of structural corruption and detached cursors.
Strict TypeScript and changed-source lint pass. A focused simplification combines
shared-history initialization into one block; all 52 ledger tests pass again.
Five logs are retained, and eleven preregistered files remain unchanged. The
full suite was not rerun for this trace-only preparation stage; its prior 808
pass/one skip/five failing values remain tied to the batch-stage source.

Shared generation remains unactivated. Neighbor-reading preservation, joint-unit
repair handling, full v4 replay, named slots/configuration, registered legacy
parity, source/tool freeze, candidate capture, independent counts and paired
performance remain outstanding. No corpus or human-quality result is claimed.
