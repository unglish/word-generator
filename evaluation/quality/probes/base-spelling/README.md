# Base spelling provenance: preregistered parity check

The first Q02a/Q13 foundation changes instrumentation only. Before accepting it,
compare four development profiles and their five fixed seeds, 1,000 continuous
public-API draws each, against origin/main 8e9ceb2. Hash complete words excluding
traces, count RNG calls, and compare the next RNG value; repeat trace on/off.
No output or RNG change is acceptable. Source snapshots and evaluator hashes must
accompany reports. The original 200,000-word archives remain immutable; historical
absence of baseSpelling is unavailable rather than a clean coverage result.

Check that live cells render exactly the base surface after every edit and that
edit IDs/input/output cell IDs are consistent. Direct selection ownership is exact;
regex replacements and inserted markers remain semantically unresolved rather than
being assigned to a neighboring phone. Record all actual edit sites, including
adjacent-choice deduplication, syllable joins, silent-e operations, boundary insertion,
letter caps, regex replacements and bare gap spellings. Traces only retain history;
live units/cells and all edit decisions are independent of tracing.

This PR does not solve destructive spelling repairs. Later preregistered behavior
changes must measure clipped units, lost phone coverage, split-digraph obligations,
letter-conditioned c/g choices, and licensed long consonant spellings separately.

## Reproduce

Run from this checkout, with the original checkout's `src` verified against
`origin/main` commit `8e9ceb2`. Both checkouts must have dependencies available.
The probe uses public APIs and its own fixed development schedule; it does not
import or modify the frozen v1 quality evaluator.

```sh
node --import tsx evaluation/quality/probes/base-spelling/capture.ts ORIGINAL_CHECKOUT original.json original
node --import tsx evaluation/quality/probes/base-spelling/capture.ts . candidate.json candidate
node --import tsx evaluation/quality/probes/base-spelling/compare.ts original.json candidate.json comparison.json
```

Each report records all runtime TS/JS/JSON source files plus package, lockfile, and
TypeScript configuration hashes, a combined source digest, Node
version, evaluator hash, and schedule hash. Runtime files are checked again at
completion to reject source changes during the run. Each stream hashes complete
word objects excluding trace, RNG calls after every draw, and legacy trace content
excluding only the two additive fields. It records the next RNG value without
advancing generation, and asserts trace on/off parity before writing the report.
The comparator requires identical evaluator/schedule/Node versions and all 20
streams, plus 20,000 successfully replayed candidate ledgers.

Edit counts are operational exposure counts, **not linguistic correctness
metrics**: a regex may produce a legitimate spelling while remaining unresolved
in this first representation. Missing historical ledgers cannot be rescored as
if they were exact alignments.
