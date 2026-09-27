# Q13b neighboring readings — preparation stage

The configured neighbor guard projects a proposed shared form without mutation
or RNG and examines retained units in consumed and immediately adjacent parts.
Complete single-unit resolution now reuses the same extent, identity and prior
license checks as shared-input resolution. Initial readings come from the exact
selected inventory entry and the existing phoneme-aware doubling model; repaired
readings come from their previously authenticated coverage/normalization records.
The guard is not a replacement for authenticating those earlier certificates.

For changed next-letter/open-part context it requires declared reading support.
It checks required/forbidden following letters and the actual nucleus, coda and
written-part conditions for open-vowel readings. Unsupported constructions,
unknown readings and unresolved neighbors are refused. Unchanged observed
context is separately reported in unchangedContextUnitIds, not counted as a
positively licensed reading. Unknown future context remains unavailable.

Positive tests preserve hard g before ck+s→x, an open /i:/ spelling before a
following-syllable qu, and a neighboring f produced by a real coverage planner
whose certificate passes production replay. Negative tests cover required and
forbidden next letters, unsupported/open obligations, undeclared readings,
unresolved ancestry and incomplete consumed ck. Configuration and returned
reading mutation are detached. These are primitive/model fixtures, not generated
word preference results or an independent linguistic certification.

All 308 related tests pass across nine suites, including eleven neighbor tests
and the additional authenticated coverage-neighbor case. Strict TypeScript and
changed-source lint pass. Eight logs are retained. Eleven preregistered files
remain unchanged. Focused simplification shares single/multi-unit resolution and
uses explicit branches for the three-valued open-part context.

Integration remains open: this guard is not yet invoked by the construction
planner or ledger. Existing shared neighbors currently refuse singular ownership
resolution; composing their own reading guard, joint coverage/normalization and
formation sampling requires further work. Full v4 replay, named slots/config,
registered legacy parity, freeze/corpus/independent recount and paired timing
remain. Public shared generation is unactivated, and no quality gain is claimed.
The full suite was not rerun for this preparation stage.
