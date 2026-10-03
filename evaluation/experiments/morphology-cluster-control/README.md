# Q11 dependency control for morphological cluster legality

This control composes the Q11 root-cluster change (`5aa948a`) with the current
operation/source trace base (`4a5defa`). It prepares Q11b measurement; it does
not implement morphological collision handling or establish Q11b improvement.

The writer merge retains current imports, construction scheduling and mutable
coverage spelling. Its only Q11 addition is handling the rejected-extension
structural event. The original Q11 tests, samples and timeouts are unchanged.

TypeScript and lint of all six changed source/test files pass. Twenty focused tests pass; the original 20,000-word traced
bare-stream test exceeds its 30-second timeout. The failure log is retained.
A separate public-API stream diagnostic checks the same seed and 20,000 words
without retaining the full array: zero adjacent duplicate coda pairs, 500 accepted
extensions and 191 rejected repetitions. One hundred complete traced words and
one next-RNG probe verify public batch/stream equivalence. Source hashes and
patch identity match before/after. This diagnostic does not turn the timed-out
test into a pass or prove full-corpus quality.

The first stream adapter used the unsupported `rng` option instead of `rand`.
Its initial equality check failed before the 20,000-word scan; source and log
are retained. The corrected adapter retains sample and assertions.

A simplification review found the imported Q11 helpers already separate
classification and mutation. No additional behavioral refactor was applied.

Full repository gates and a frozen composed-control capture remain required
before publishing Q11b. No morphology-only attribution, overall quality gain,
human preference or release readiness is established here. Runner paths record
this workstation and are not a portable execution interface.
