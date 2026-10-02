# Q13b semantic shared-event replay — preparation stage

createSharedEventReplayer compiles configured construction and edit-guard logic.
For an authoritative input ledger and next cell ID, it recomputes a shared
attempt's complete ownership, reading eligibility and recorded draw/skip result.
It derives exact formed cells, construction and edit. Single generic guards are
recomputed against live joint readings. Atomic transactions evaluate the evolving
provisional surface; a refused batch returns the original state and allocation
cursor. Applied batches and explicit lexical supersession reconstruct exact edits
and compare them with the trace. Supersession checks retired joint IDs, root
phones, input/output cells and unavailable new ownership.

The caller must authenticate the supplied input state, prior licenses, allocation
cursor and scheduled operation. This helper does not establish event-stream
completeness, append ordering, original selections, repair certificates or named
writer-slot schedules. It does not establish the lexical gap rule's eligibility
or sampling; it checks the explicit supersession's effect. It validates the shared
sampling law against recorded draws, not provenance of the generator RNG stream.
Full v4 trace acceptance remains disabled pending the enclosing semantic replay.

Ten new tests cover complete interleaved replay, failed and successful trials,
allowed/refused guards, atomic applied/refused/no-op batches, lexical retirement,
input immutability, changed rule probability, forged roll/decision/retirement,
and wrong allocation. Refused-batch coverage includes a provisional first edit,
so rollback is tested rather than inferred from a first-step refusal.

All 345 related tests in nine suites pass. TypeScript and changed-file lint pass;
the initial prefer-const lint failure is preserved with its successful correction.
Eleven registration pins remain unchanged. A local rewrite helper shares replay
allocation/ancestry across guards, batches and gaps. No unrelated refactor or
public generator behavior change is included. Full-suite/corpus/performance and
human evaluation were not run; no new output-quality result is claimed.

Next: enclosing v4 ledger replay must reconstruct actual append/edit chronology,
authenticate selections and prior normalization/coverage licenses, consume each
shared decision exactly once, verify guard and named-slot completeness, and
check final cells, counters, ownership and live construction IDs. Combine the
structural event-order and formation-binding validators with this semantic step.
Then finish public writer integration and the registered measurements.
