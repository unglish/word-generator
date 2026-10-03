# Base-spelling provenance: additive parity result

The supplementary preregistered probe passed. Four profiles × five fixed
continuous development seeds × 1,000 draws = **20,000 scheduled draws**, repeated
with trace off/on in each checkout (**80,000 generated words total**).

| Check | Result |
| --- | --- |
| Complete word objects excluding trace | Identical |
| RNG call count after every draw | Identical |
| Next RNG value after every stream | Identical |
| All existing trace content, excluding the two additive fields | Identical |
| Trace on/off output and RNG streams | Identical |
| Candidate exact source-cell/edit replay | 20,000 / 20,000 pass |

`original.json.gz` and `candidate.json.gz` contain runtime source hashes, fixed
schedule and evaluator hashes, Node version, per-stream output/RNG/legacy-trace
hashes, and operational edit counts. `comparison.json` pins the uncompressed
reports and evaluator hashes. These compact reports supplement the frozen v1
evaluator; they do not alter or replace its immutable original archives.

Source starts from `origin/main` commit `8e9ceb2`. The reference checkout's HEAD
also contains audit/tooling work, but its runtime source was verified equal to
`origin/main`. The original package scripts additionally expose the frozen quality tooling; its
lockfile and TypeScript config still match main. Reported digests cover runtime
TS/JS/JSON plus package, lockfile, and TypeScript configuration:

- Original: `9167a8ca0387526c9c546c255f601f15aa28867d51d1b4c012afa803e50b3412`
- Candidate: `cb34edaa3e93a50d8af56cdf047ef20ef7d96eda54a639b8e00d0069936fc275`

`original-sources.json.gz` and `candidate-sources.json.gz` embed all source
contents covered by each report. `source-bundles.json` pins compressed and
uncompressed checksums. Every archived file was checked against its report hash.

The standalone [capture and comparison commands](../../../evaluation/quality/probes/base-spelling/README.md)
reproduce the check. Decompress reports before passing them to `compare.ts`.

## Verification

- Full unit suite: 410 passed, 1 skipped.
- Quality suite: 12 passed. The initial attempt passed every behavior gate but
  could not write its report through the worktree sandbox; the authorized rerun
  passed completely.
- Runtime and standalone probe typechecks: passed.
- Touched-file lint: passed. Global lint retains eight existing errors in untouched
  `src/config/language.test.ts` and `src/core/generate.ts`.
- Independent read-only review: no blocker found.
- Isolated existing performance suite: both checkouts passed the unchanged
  4,500 words/sec floor and variance gate. Candidate 7,117 words/sec (1.32× median
  variance); original 7,636 words/sec (1.31×). This single paired run suggests
  6.8% lower throughput; it is not a precise overhead estimate.

## Meaning and limits

The ledger exposes actual edits and source lineage. It does not certify the
phonological correctness of existing rules: direct source selection ownership is
exact, while inserted/replaced cell ownership remains unresolved. Selected unit
state records doubling before deduplication. Full affix ownership is outside the
base scope. Legacy edit-distance ownership remains available and explicitly
inferred. Historical archives without this ledger have unavailable provenance,
not a zero rate of damage.

The known `canes`, `spam`, and clipped `th` witnesses remain unchanged. Q13 sound
coverage policy and Q14 construction-aware spellings require independent changes
and measurements after this instrumentation foundation.
