# Initial-sequence conditioning: resolved planner direction

This supersedes the local-pair direction in `joint-selection-design.md`.
It is an implementation specification, not a frozen candidate or a quality
claim. Root preservation and infeasible-path behavior remain separate required
integration work before candidate registration.

## State established from the writer

In `write.ts`, `prevGraphemeForm` is assigned the realized doubling form before
normalization. `currentNucleusForm` is assigned the selected nucleus form before
doubling. At a syllable boundary the current nucleus becomes the previous
nucleus and the current nucleus resets to empty. Normalization and syllable
passes modify the written cells, but do not assign these selection-state
variables. The doubling count changes only through the doubling sampler.
Consequently the initial sequence law can be represented without simulating
cell rewrites. This conclusion concerns initial selected/realized forms only,
not the final root surface.

For a fixed ordered phone/structure sequence, the sufficient state at slot i
is (i, previous realized form, doubling count, current nucleus form, previous
nucleus form, pending required following letters). Fixed slot data includes
stress, syllable/segment position, neighbors and next nucleus. The pending
requirement is the reading obligation of the preceding relevant realized
unit. Empty realizations carry that obligation forward until a visible letter
or root edge; conflicting pending obligations require their intersection.

## Whole initial-sequence law

Use the existing resolver in each state, including its ordinary/fallback and
quota-relaxation decisions. Normalize its positive inventory weights locally.
For each inventory identity enumerate the pure doubling model's outcomes:
fixed outcomes have probability one; probabilistic outcomes have masses
p/100 and 1-p/100, omitting zero-mass edges. Inventory duplicates remain
separate outcomes. A realized unit's reading comes from `readingFor`, not
from an assumption that selected and doubled forms have identical readings.

Reject an edge if its first visible letter violates the incoming requirement.
Attach any configured following-letter obligation of its realized reading to
the successor state. At the root edge evaluate any remaining requirement
against the empty following context using the same declared reading semantics.
Unknown reading metadata must remain explicit; it cannot prove compatibility.
The policy's typed target set defines which obligations it enforces.

Let w(s,a) be the original local probability of edge a. Define H(terminal) as
one for a legal terminal state and zero otherwise, and

    H(s) = sum_a w(s,a) H(next(s,a)).

Sample outgoing edges with probability w(s,a) H(next(s,a)) / H(s). This yields
the original *initial realized sequence* distribution conditioned on the
declared following-letter obligations. It resolves overlapping obligations
through the same recurrence, rather than reserving an unvalidated next choice.
It is not conditioning the entire writer on final-output legality.

Memoize states and use log probabilities/log-sum-exp to avoid deleting viable
paths through floating-point underflow. The phone index strictly increases,
so the graph is acyclic. There is no arbitrary search-depth or retry limit.
Record evaluated states/edges and zero-support outcomes so complexity and
infeasibility remain measurable. Large custom inventories need performance
measurement; finite does not imply inexpensive.

## Sampling and execution boundary

Planning is pure and consumes no RNG. Execute one registered edge draw per
slot with positive support, including a singleton, so the enabled law has a
simple explicit schedule. The chosen edge includes the realized doubling
outcome; do not call the legacy doubling sampler a second time. Retain the
existing interleaving of syllable passes and their draws. These draws are not
part of the initial-sequence conditioning event. Omitted-policy execution must
retain the legacy path and exact RNG stream.

Enabled traces need their own versioned selection/doubling evidence, including
local original mass, continuation mass, conditioned probability and roll.
Legacy trace fields cannot misleadingly imply the old weights generated the
new choice. The initial-sequence observer and replay verifier must understand
that evidence before any candidate capture.

A zero H at the initial state is a real infeasible configuration/phone sequence.
Do not silently regenerate phones, discard the word, widen inventory support,
or choose an arbitrary shortest alternative. Establish typed diagnostics and
a declared behavior consistent with public API guarantees before integration.

## Remaining proof obligations

Implement the pure state transition and recurrence, then compare against an
independent exhaustive enumerator on finite custom examples, including chains,
empty forms, duplicate entries, quotas, fallback and zero/one support. Verify
probability normalization, deterministic boundary draws and omitted-policy
parity through public APIs. Root edits, split/shared construction, completion
and morphology require preservation logic and separate evidence; initial
conditioning alone does not satisfy the Q14b output-quality acceptance target.
