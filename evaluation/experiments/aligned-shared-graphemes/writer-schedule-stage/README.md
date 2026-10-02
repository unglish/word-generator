# Q13b complete writer-schedule verification

Following local 43f2918, the writer records all pass and rule-slot boundaries,
including regex no-ops and empty shared scans. The schedule verifier derives
required slots from the pinned configuration and syllable passes from original
phone boundaries. It rejects missing/reordered slots, incomplete scans,
misplaced attempts/repairs, early word passes and foreign configuration.

The combined public v4 evidence verifier now requires an explicit matching
shared policy, configured schedule verification and event-time ledger replay.
The primitive ledger replayer remains schedule-unverified. This distinction is
covered by adversarial generated traces: deleting a complete empty scan or no-op
slot and compacting all references remains ledger-consistent but fails schedule
and public verification. Public acceptance also rejects a correct schedule with
forged final ledger content. The verifier is producer-assisted; unrelated regex
sampling and gap eligibility are not independently regenerated. Final morphology
ownership remains separate.

All 500 public fixture coordinates still preserve trace-on/off complete words,
RNG consumption and next values, with public verification of every v4 root
ledger. Explicit empty policy is also verified. Fourteen schedule/capability
tests cover generated positives and tampered traces. The full focused regression
set passes 390 tests in 12 suites. TypeScript and changed-file lint pass (empty
logs, exit zero). No threshold or implementation correction followed a failure.

Full run: 917 passes, five assertion failures, four skipped tests. The five
assertion values exactly match the preceding integration stage. Additionally,
the phonotactic beforeAll exceeded its existing 60-second timeout while the
large legacy-parity job was also running, leaving three quality tests unrun.
The isolated unchanged suite then passed all 14 tests in 28.881 seconds. Both
raw results are retained; the full run is not described as clean or as only
five failures. The original single skip remains. No timeout was relaxed.

The sibling legacy-parity-stage separately records 20,768 coordinates / 83,072
public calls against exact #338, including the registered 20,000 and custom
policies. Current source hashes were checked against that authority. This is
legacy compatibility, not active-policy quality. All eleven registration files
remain byte-identical.

English shared spelling remains opt-in. Required next work: prepare the active
registered English candidate, freeze source/tooling/reference/dependency/runtime
identity, capture 200,000 words against original and exact #338, independently
recount registered integers and witnesses, reconfirm final-source legacy parity,
run six fixed fresh-process paired performance trials and full/quality/perf
gates, then publish a measured PR. No distribution, final-pronunciation or human
preference improvement is claimed by this stage.
