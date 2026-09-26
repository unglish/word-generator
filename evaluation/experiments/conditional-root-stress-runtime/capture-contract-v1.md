# Configured capture boundary before active-corpus execution

`capture.mjs` is a new producer; it does not modify the frozen #307 evaluator.
Its CLI has separate `freeze`, `capture`, and `rescore` commands. A reviewed freeze
SHA must be supplied externally for capture and rescore. The source freeze pins
both #334 control and candidate runtime bytes, the complete new tool directory
(excluding only `outcomes/` and `evidence/`), all eight frozen evaluator files, the exact published v1 observer and independent
literal-history oracle dependency bytes, unchanged #334 references/packages, effective configurations, the exact original
schedule, and the Node executable hash/version/platform/architecture. The old 77
published law/proof files and registered documents are also checked throughout.
The freeze is created only after the observer/tools are ready for review.

The control comes from the exact #334 source materialization and omits the new
policy field. The active configuration changes only the registered root policy
to positive lambda ln(2); no English default, weight, gate or cohort changes.
Each profile/seed receives one fresh public generator and RNG stream. Only
trace-enabled calls are made: exactly 200,000 returned words per cohort, with no
peek/next RNG calls. Attempted and completed API calls are separate; internal
rejection attempts are not falsely represented as separate API calls. Each draw
retains cumulative before/after RNG counts, and each stream records a boundary
hash and consumed binary64 RNG-byte hash. The raw reader independently recounts
all coordinates and boundary hashes/counts. The RNG byte hash is a producer
record, not an independent replay of those hidden values.

The raw manifest retains schemaVersion 1 for the existing archive reader and
adds explicit producer identity with `metricStatus: "not-evaluated"`. Its summary
uses the distinct `q09-raw-capture-v1` schema, with only capture counts and empty
metric/profile arrays. This is intentionally not a quality RunSummary. The
unchanged frozen `compareSummaries` rejects raw-vs-raw and raw-vs-scored inputs.
Frozen `readRun` and `rescoreRun` can read the pinned raw words; this precise
compatibility is covered by synthetic roundtrip tests. It does not require a
validator exception or an altered frozen source file.

Rescoring uses the unchanged evaluator to emit a real scored schemaVersion 1
summary and its evaluator identity. It copies every compressed shard unchanged,
keeps producer configuration/source/environment, and archives the raw manifest
and source bundle in provenance. The frozen rescorer writes to a fresh `.pending`
directory. Its exact manifest bytes are retained as `unpublished-manifest.json`;
there is no completed manifest in that staging directory after validation.
Only after the adapter's broader source gate passes does exclusive publication
copy the scored artifacts into the requested directory. A second gate passes
before the manifest is copied last. Either gate's failure retains its bytes and
an explicit `adapter-failure.json`; frozen readRun cannot accept the incomplete
publication. An early rescorer validation error also receives an incomplete
pending directory with its original error, without masking it as a missing-path
write error. This avoids treating an evaluator-complete but adapter-failed run
as comparison evidence. The adapter checks those identities, all
profile sample sizes and exact shard hashes. Its strict raw reader requires
externally expected producer/config/source bytes, full artifact and filesystem
sets, exact draw order/counts, consistent RNG boundaries, and source digests.
Self-consistent redigesting alone is not authenticity. Neither raw nor scored
words are regenerated during rescore.

Fresh outputs are exclusive, and source/proof trees are protected through
resolved directory aliases as well as their lexical paths. An interrupted or
failed capture retains its files and a failed outcome when catchable; it receives
no completed manifest. Failures are not silently retried. The declared source,
config and engine must remain unchanged through successful capture/rescore.
Dependencies are pinned by package-lock; installed dependency bytes are not an
additional independently verified package mirror.

Synthetic fixture words are hand-authored and make no generator-quality claim.
Tests cover frozen roundtrip acceptance and compressed-word preservation,
unsupported raw comparison, omitted/duplicate draw coordinates, missing/extra
artifacts, fake score schemas, altered source/config/producer and RNG accounting,
occupied output paths, source drift, and publication aliases. Original failed
test logs remain available; the first synthetic run used an incorrect repository
ancestor path, corrected before any formal capture or source freeze.

No active corpus, rescore, performance study, or default activation is authorized
by preparing or testing this adapter. Source/probe review and an explicitly
reviewed freeze precede those operations.
