# Pure policy stage

The Q13b registration was committed at 2810ff0 before source edits. Its pinned
files remain byte-identical. The new SharedSpellingRule type, English rule data
and pure createSharedSpellingPolicy implement the registered sound/context
support and local draw law. No existing generator path imports or activates
this module yet. This is preparation for the complete shared-ownership change,
not completion of Q13b or an output-quality result.

The final policy suite passes 36 tests. It checks the exact registered data,
all three positive rules, wrong-sound counterexamples, scope-relative initial
position, separate following-phone and following-letter constraints, zero/100
no-draw behavior, strict decision boundaries, the complete 10,000-combination
two-attempt ks grid (4,375 successes and 17,500 draws), compiled/returned-data
isolation, malformed configuration, invalid RNG values and input immutability.
These pure tests do not establish runtime ledger ownership or integrated retry
scheduling. The full writer must still satisfy those contracts.

Strict TypeScript with --noEmit --incremental false and changed-source lint
pass. The first lint invocation found quote escaping in a new JSON fixture;
that formatting was corrected, and both failing/passing logs are preserved.
No generation, corpus capture, performance run or validation-cohort access
occurred at this stage. The full generator suites will run after integration.

Next: authenticate complete live source units; add versioned joint origins and
certificates with ordered phone/source-part ownership; integrate at the named
rule slots; make coverage, normalization and later edits construction-aware;
then run the preregistered compatibility, fixture, corpus and timing checks.
