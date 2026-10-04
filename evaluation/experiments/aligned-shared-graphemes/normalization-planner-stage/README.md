# Q13b joint-neighbor normalization planning — preparation stage

The normalizer accepts optional typed live construction and coverage records plus
an explicitly configured shared-rule set. Before treating joint phones as covered,
it validates live joint extents, policy support, unique records and source-unit
membership. Missing records or configuration refuse. A shared target remains
atomic; a single-owned target may normalize beside a shared predecessor.

Single-unit neighbor checks include every source part of a shared predecessor.
The final prospective normalization includes its certificate, so shared reading
checks resolve the complete repaired vowel rather than guessing from letters.
Successful plans retain preservedSharedConstructionIds. The verifier recomputes
the decision and refuses forged preserved-ID evidence. Prior construction and
coverage license authentication remains the producer/replay's responsibility.

The existing commit fixtures now also run the actual planner and verifier on
shared state, then commit the returned positive plan. The four cases cover
ordinary/restricted qu in one part and across two parts. Restricted following-u
rules refuse ue-to-e normalization; ordinary qu allows it. Additional assertions
reject missing construction records, missing rule configuration and forged joint
preservation evidence. The separate structurally rebound old-plan refusal still
checks the commit safeguard independently.

All 328 tests across nine affected suites pass. TypeScript and changed-file lint
pass. Eleven registration pins remain unchanged. Focused simplification isolates
shared-context validation from the local decision flow. No public writer wiring,
full-suite, corpus or performance run is included; no quality gain is claimed.

Remaining: coverage search integration, full v4 semantic replay, writer/config
activation and compiled-model reuse, registered legacy parity, frozen corpus
comparisons, independent recount and paired timing. Normalization planning with
prior coverage-repaired single neighbors retains the earlier limitations of its
intact-unit resolver and needs review during mixed repair integration.
