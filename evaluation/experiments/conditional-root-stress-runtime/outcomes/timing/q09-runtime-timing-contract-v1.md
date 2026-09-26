# Q09 opt-in runtime timing — fixed before any timing outcome

This timing study is separate from corpus capture duration. It uses exact #334
control and the reviewed Q09 active configuration at binary64 ln(2), bound to
capture freeze c217a04a03b0613e1121283b95f5d16396d23182bc32a1e647e34728aa517b38.
No production/evaluator file changes are needed. The performance window begins
only after all parent generation/analysis/tests and other agents' CPU-heavy jobs
are stopped or terminal. No claim of eliminating background OS noise is made.

The original runtime design placed timing before capture. Execution was deferred
until a quiet window; corpus and source evidence were frozen first. This document
fixes the timing schedule before timing outcomes. No speed threshold or penalty
was selected from timing results, and no outcome is discarded for being slow.

Run the unchanged candidate `npm run test:perf` once to retain its default legacy
API gates. Separately measure configured control and active factories through
public APIs with the exact existing performance-test workload: warm up 50 words
at seed 0; time one 10,000-word generateWords batch at seed 42; warm up 50 serial
seeds 900000..900049; then three trials of five 200-word batches with individual
seeds trial*100000+batch*200+i. Factory construction is outside these times.
Report all raw timings, not rounded stdout alone. Return the main batch's output
hash after the clock stops. This is a configured-factory benchmark; it does not
pretend the module-level API and factory initialization have identical costs.

Each trace mode has six control/active pairs in fixed chronological order
A B B A A B B A A B B A (A=control, B=active). Complete trace-off before trace-on;
every A/B invocation is a fresh Node process. Thus 24 configured processes each
return 13,100 words, total 314,400. No retries to replace an unfavorable valid run.
A failed process remains an outcome. Record output/source/config/engine hashes,
13,100 completed-word accounting, both original 20-second test deadlines,
throughput and all variance trials. Keep the local original 4,500 words/sec floor
and median-variance <3 threshold unchanged for trace-off. Trace-on receives the
same workload and descriptive timing/overhead; the preexisting gate does not
claim a trace-on speed requirement. No new percentage-regression gate is added.

Summarize the six unrounded paired active/control throughput ratios per trace
mode (median and range), all gate failures and all trace overhead ratios.
Comparisons of same-seed active/control outputs are not matched-word comparisons.
Record trace off/on output hashes for reproducibility, without requiring full
trace bytes equal. Source/config/Node identity is checked before and after each
process using the already reviewed capture boundary; this external benchmark's
own bytes are bound to an externally supplied SHA. Outputs must be fresh,
exclusive, and outside both source trees. A caught generation/check failure
retains partial call accounting and the actual error.

## Preparation fixes before any real timing

The initially reviewed benchmark, tests, and contract are retained byte-for-byte
as `q09-runtime-timing-before-fixes-v1.mjs`,
`q09-runtime-timing-test-before-fixes-v1.mjs`, and
`q09-runtime-timing-contract-before-fixes-v1.md`; their exact pins remain in
`q09-runtime-timing-before-fixes-v1.json` and the original source review.

The revised benchmark reserves a fresh output file before loading any runtime
tool, preflight, runtime import, effective-configuration validation, or factory
construction. Failures in those phases retain JSON with zero/partial accounting,
phase and error. Invalid or occupied output destinations are rejected without
writing them. Both immutable raw archive trees are protected in addition to the
two source trees, including aliases through symlinks. A process kill or a failed
report write may leave the exclusively reserved partial file; the matrix ledger
retains that process outcome and its stdout/stderr.

Each variance trial is attached to the report before its batches run. A failure
during a later batch retains all earlier completed batch times, marks the trial
incomplete and leaves its variance null. A completed slow run remains a completed
workload with false gate values; the CLI exits nonzero for any untraced gate
failure. The matrix retains and continues past such valid outcomes without
replacement. This changes no gate or timing workload.

The separate matrix driver requires an explicit `--run` command and a reviewed
external manifest SHA. It records each of the 24 fixed schedule slots with trace
mode, ordinal, adjacent A/B pair id, pair position, variant, complete command,
exclusive child report path, stdout/stderr, exit status and outcome. Each launch
uses a fresh process with the pinned Node executable and pinned tsx loader;
trace-off finishes before trace-on starts. It never retries a slot. Source or
configuration authority failure aborts the remaining slots and remains in the
ledger; ordinary workload/gate failures remain scheduled observations.
The ledger and output directory must be fresh and outside protected inputs.

The reviewed matrix manifest binds the matrix, benchmark, their tests, this
contract, the tsx loader and the existing capture freeze. Check those pins before
and after each child. A final summary distinguishes attempted/completed slots,
valid failed workloads/gates, authority failures and missing/malformed reports;
it never equates successful process exit with passing unchanged gates. The
contract and executable matrix supply the pair order; no order is chosen from
timing outcomes. Synthetic launcher tests are not performance evidence.
