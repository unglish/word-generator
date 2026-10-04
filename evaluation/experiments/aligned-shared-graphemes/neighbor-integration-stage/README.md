# Q13b mandatory neighbor checks — preparation stage

Shared construction planning now requires the actual grapheme/doubling reading
configuration. It resolves complete input ownership and configured policy support,
checks neighboring reading obligations, then samples. Neighbor refusal has its
own recorded result and consumes no RNG. Policy refusals, including probability
zero, remain unsampled without claiming that a neighbor check was performed.
Successful or failed eligible trials retain the preserved-neighbor evidence.

A shared-enabled BaseSpelling also requires that reading configuration and uses
it when replaying an attempted commit. There is no optional unguarded shared
commit path. The ledger rejects a formed attempt made using a more permissive
reading model, or forged neighboring input-cell evidence, before mutation. The
pure policy-only component remains separate from ownership/neighbor licensing.

Earlier primitive fixtures now declare their synthetic single-phone inventories
explicitly, with indices matching their selected units. They do not borrow those
indices from the unrelated English inventory. Five new integration cases verify
pre-draw refusal and recorded no-edit outcome, retained positive certificates,
stricter-ledger rejection, forged-check rejection and mandatory configuration.
All 313 related tests pass across nine suites. Strict TypeScript and changed-source
lint pass. Four logs are retained and eleven preregistered files remain unchanged.
Focused simplification review retains the explicit support→neighbors→sampling
sequence; no additional unrelated refactor was needed.

Existing shared neighbors still need composition with shared-reading preservation;
joint coverage/normalization and full v4 replay remain unfinished. Public writer
configuration and named-slot activation are not connected yet. Compile/reuse of
the reading machinery must be addressed during that integration rather than
assuming per-word construction is free. Registered legacy parity, full freeze,
200k comparisons, independent counts and paired timing remain. No new corpus or
human-quality claim is made, and the full suite was not rerun for this stage.
