# Q13b joint-cell ledger — preparation stage

Explicit shared cell origins carry ordered source units and phones, construction
identity, edit identity and output offsets. They carry no singular unitId.
A shared construction separately retains exact input/output cell IDs, source
parts, the first-part display anchor, shared phone reading and full event-time
attempt. Original selections, phone IDs and doubling histories remain unchanged.

The new atomic commit replays the attempted decision against live state before
mutating cells, counters, construction records or attempt records. Failed trials
record their outcome without advancing edit or cell IDs. Consumed phones cannot
form another construction. Returned traces and caller attempts are detached.
The internal constructor's optional shared-rules argument explicitly selects
trace v4 and its sharedConstructions capability; no public generator path passes
that argument yet. Old evidence readers reject v4 pending full replay support.

## Validation

- 248 targeted tests pass across seven suites, including thirteen new atomic
  ledger tests. They cover exact ck+s consumption, cross-part display versus
  ownership, joint qu cells, failed-trial accounting, forged inputs, repeat
  consumption, mutation isolation, trace-history parity and old-reader rejection.
- Strict TypeScript and changed-source ESLint pass. The first TypeScript run's
  failures identify consumers that assumed every non-rewrite origin had one
  owner; all failed and passing logs remain preserved.
- Full npm test: 778 pass, one skip, five failures. Values match the previously
  recorded #338 control: ex representation 0.010933806812024306 versus 0.0215;
  consonant-run counts 10 and 33 in 100k schedules and 39 in the custom 10k;
  six ck/double regex matches versus maximum five. Gates remain unchanged.
- Focused code-simplifier review moved ownership classification into a small
  helper module with type-only ledger imports, avoiding a runtime import cycle.
- Eleven registration files and previous ownership/planner evidence manifests
  retain their original bytes and hashes.

## Incomplete integration

This is a formation-time ledger primitive, not a completed preservation claim.
Generic subsequent edits are not yet guarded against splitting/erasing shared
cells or invalidating neighboring reading obligations. Coverage/normalization
currently distinguish joint ownership but do not yet implement complete shared
repair handling. Full v4 ledger replay, named writer slots, public configuration,
gap supersession, legacy parity, candidate capture, independent recount and
paired timing remain required before activation and a measured PR. No new corpus
or human-quality gain is claimed.
