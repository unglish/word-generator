# Q13b writer integration stage

Local opt-in implementation following c30349d. This is not the registered
200,000-word candidate capture and establishes no distribution or human gain.
The English default remains absent/legacy. No evaluation gate was changed.

Implemented: unique named predecessor slots, explicit empty-policy disabling,
ordered original-source sound windows, live candidate revalidation, empty scan
boundaries, candidate-complete scan replay, opt-in public writer passes,
joint-state normalization/coverage, and factory-level reuse of stateless shared
policies. Custom IDs require a unique equal-name predecessor and cannot expand
its scope; cx cleanup cannot be repurposed. Source and returned schedule mutation
is isolated. Shared source rules are detached when the writer is compiled.

The public-API fixture runs 500 successive coordinates (1,000 traced/untraced
calls) on seed 129, alternating morphology and mixing text/lexicon modes. Complete
words, consumed RNG counts and the next RNG value agree. Every traced root ledger
replays; nonzero formations occur. This is integration evidence, not the
registered 20,000-coordinate legacy check, per-rule positive corpus support,
independent recount or complete final-pronunciation evidence.

Targeted: 376 passes across 11 suites. TypeScript --noEmit --incremental false
and lint of all changed source/test files pass (empty logs, process exit 0).
Final full suite: 906 passes, one skip, five failures. failure-comparison.json
compares every assertion message/value against the retained batch-stage run:
ex ratio 0.010933806812024306 below 0.0215; consonant-run counts 10, 33, 39;
ck plus another double count 6 above 5. No failure is waived.

full.log is the initial full-suite run (905 passes), begun before the final
policy-reuse/mutation-test changes. final-full.log is the completed final-source
rerun (906 passes). Both raw logs are retained. Targeted, types and lint logs
correspond to the final source revision. The source digest lists all changed
implementation/tests/documentation, not an independently pinned runtime corpus.
All eleven original registration files remain byte-identical.

Still required: authenticate complete named-slot/pass scheduling relative to
other writer operations (including absent/no-op regex slots), reject all missing
scans, enable public v4 evidence acceptance only after that proof, activate the
registered English candidate, freeze tooling/dependencies/reference, compare
200,000 words against both original and exact #338, independently recount all
required evidence, complete legacy/custom parity and six paired performance
runs, retain full/quality/performance outcomes, and prepare a measured PR.
The current replayer deliberately returns sharedWriterSchedule: unverified.
