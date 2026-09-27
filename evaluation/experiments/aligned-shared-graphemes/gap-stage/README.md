# Q13b lexical gap supersession — preparation stage

Whole-root gap replacement now uses an explicit ledger operation. In shared
mode it records the event-time cursor, edit, rule, all consumed/output cell IDs,
original root phone IDs and the IDs of retired live constructions. Historical
construction/attempt records and original source units remain unchanged. Trace
v4 distinguishes liveConstructionIds from supersessions, and the new spelling's
ownership is explicitly unavailable. Subsequent generic guards examine only
live constructions. A gap-like generic rule name does not bypass preservation.

Explicit same-text lexical replacement in shared mode still creates new
unresolved cells and retires the old shared ownership. This differs deliberately
from an ordinary same-text edit, which remains a no-op. The legacy path retains
its old same-text/no-edit behavior and permissive empty rule names. Validation
specific to shared supersession does not narrow legacy custom configuration.
The applicator still selects its configured lexical variant using the same
existing RNG path; no new sampling occurs in the ledger.

All 279 targeted tests pass across eight suites, including public gap spelling
regressions and eight new supersession/compatibility cases. Strict TypeScript and
changed-source lint pass. Six check logs are retained. Eleven preregistered files
are unchanged. Focused code-simplifier review extracted the already validated
rewrite commit so generic and lexical operations share cell creation without a
public bypass flag, duplicate input slicing, or a live-construction scan on the
legacy path. A source-review compatibility issue (empty legacy rule names) was
corrected and regression-tested before committing.

Remaining work includes transaction-safe observer refusal handling in the other
writer paths, shared coverage/normalization and neighboring reading obligations,
full v4 replay including supersessions, named-slot activation and the registered
legacy/corpus/independent-count/performance studies. The public generator still
does not activate shared mode. No corpus or human-quality result is claimed.
The full suite was not rerun for this stage; prior full-suite evidence remains
bound to its original source revision.
