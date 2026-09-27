# Q12c paired local performance

Six preregistered pairs ran in AB, BA, AB, BA, AB, BA order, each slot in a
fresh process using unchanged `npm run test:perf`. A is exact #335; B is the
captured Q12c generator. All 93 control files match exact Git blobs and all 57
candidate generator files match the captured source. The source closure, actual
Node/npm, relevant installed dependency graph and harness were pinned; source
and dependency bytes matched after all twelve slots. No other controlled
corpus scan or benchmark ran concurrently. External host activity is not ruled out.

Candidate/control throughput ratios are 1.12369, 1.06664, 1.11352, 1.07282,
1.07420, and 1.10038. The median paired gain is 8.73% (range 6.66–12.37%).
The unchanged speed floor passes 0/6 control slots and 6/6 candidate slots;
the variance gate passes 6/6 on both. All control failure statuses are retained.
These are local descriptive results from rounded printed rates, not confidence
intervals or a general platform speed claim. The report retains ratio rounding
bounds. A separate JavaScript pass agrees with all twelve raw log hashes,
rate/gate parsing, ordering, pair ratios and median; it is not another timing run.

The runner is the previously tested Q13c runner with only reviewed authority
paths, hashes and labels changed. Its 23 synthetic checks pass, including
interruption and failed-slot retention. The exact replacement list, old/new
source hashes, plan, test source, all starts/terminal records, configuration
preflights, raw logs and arithmetic proof are packaged under byte hashes.
External control materialization remains `/private/tmp/q12c-performance-control-v1`.
