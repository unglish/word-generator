# Explicit score-reference construction: formal evidence

The repaired manual builder scores the shared pinned CMU population with the
**unchanged historical scorer and table**, then writes a fresh versioned artifact.
Both formal builds were byte-identical. Independent Python matched every ordered
row, metadata field and score/summary value. These are construction and provenance
results; no generator output, scorer model, active reference consumer or quality
gate was changed.

The protocol and fixture plan were frozen before implementation. Parent source
review authorized the exact closure before any full-corpus score construction.
The first formal attempt passed; there was no failed formal artifact to discard.
The original builder and its actual API failure are retained separately.

## Recorded results

| Quantity | Result |
|---|---:|
| Selected source spellings | 117,485 |
| Source phone occurrences | 742,333 |
| Scored transitions, including both word boundaries | 859,818 |
| Complete scored rows; dropped/invalid rows | 117,485; 0/0 |
| Historical model rows/vocabulary | 40/40 |
| Historical model observed pair bins, all independently parsed | 1,338 |
| Independent numeric comparisons (two scores per row + eight summary fields) | 234,978 |
| Maximum absolute / relative discrepancy | 0 / 0 |
| Real CLI/check commands with expected status and diagnostic | 32 |
| Protected tracked parent files unchanged | 289 |

The first exact tie is recorded at `scores.rows[0].total`: both implementations
returned `-8.731094963567834`. Complete coordinate/value witnesses and the frozen
`tolerance = 1e-10 + 1e-12 * abs(reference)` are in `verification.json`. The tolerance
was never adjusted; this execution did not use its allowance.

| Statistic | Total log2 score | Within-word mean log2 per transition |
|---|---:|---:|
| Mean over selected entries | -28.401300194936404 | -3.905332152470734 |
| Upper-middle median | -27.30310972778124 | -3.8492028595566405 |
| Minimum | -108.04680161371668 | -8.1942420364111 |
| Supplemental maximum | -8.36322192495201 | -2.3725021069327754 |

These numbers describe the 117,485 selected source spellings under a fixed legacy
model. The old active summary declares a different, unresolved 123,892-word
population. Its rounded values and generated gap are preserved. An unpaired
comparison with them cannot establish a generator improvement or justify a gate
change. Corpus/model overlap is unresolved; this is not held-out prediction or a
human naturalness result.

## Identities and checks

- Parent: `bd70cbfef2a9f58442cf9bb066faec23b79ee2ef` (transition builder #332).
- Protocol SHA-256: `be46836df65c94d2e61f4e713de004e8581db75c81abdd4ebcf8aa74a43b1f78`.
- Source review freeze SHA-256: `cb0e284b1b694b51308df3e13223b018f9dc4a7201e9f1df9b0e5f95e0ee92d1`.
- Production digest: `9164fecf511fb20a64c580c3e6edb709e3a8b1bfd6c8c3ab95e000ea770f73ff`.
- Verifier closure digest: `21b4d7511b5db1e16ade7da5c84fb209ccd3dc8a5bb2073d43d308fa6d349e8f`.
- Uncompressed reference SHA-256: `ab9702442d1d3ca78610b3f9d90b91e431964b911f7c7e9b556e457dfc2a799f`.
- Reference artifact digest: `efeb3a9a94d37b477c31633281044adbd6a3074b19c147954ee119f9e4fceeb4`.
- Independent proof SHA-256: `3e4a1beb731949de9b3cbd153880763c8922b6030ecf0fd386913f5aaee66ea5`.

Digest schemes are labeled in `source-review-freeze-v1.json`: production uses the
ordered `{path,content}` snapshots with the existing canonical JSON digest;
verifier closure uses an ordered `{path,sha256}` list. They are different identities.
The scorer/table retain their pinned old hashes. The reused output guard's source
closure is included, but the new transition reference is never read as model data.

Validation passed: 248 review tests, including 37 new TypeScript fixtures; nine
independent Python fixture groups; three unchanged scorer-only tests (the 11
other tests in that file were deliberately skipped); both strict TypeScript
configurations; explicit touched-file lint; and diff checks. Synthetic envelope
fixtures contain artificial parent-sized rows, not hidden corpus scores.

Formal CLI checks cover both Node+tsx and an aliased tsx entrypoint, another working
directory, spaced/relative paths, unsupported/missing/duplicate/valueless options,
raw-source corruption, protected runtime/demo/prior evidence paths and aliases,
existing files/hardlinks/dangling symlinks, and missing output parents. Isolated
entrypoint copies reject changed historical scorer/table and parent bytes before
scoring; original files never change. Failure cases assert the intended error
message and absence of a partial output, not merely a nonzero exit code.

No generator capture, quality retuning or performance measurement was needed for
this offline change. The repository's workflow targets `main`; a stacked PR does
not automatically run it. All checks reported here are local.

## Files and preservation

`reference.json.gz` contains the complete ordered reference artifact. The second
build was verified byte-for-byte equal, so one compressed copy is retained.
`verification.json` is the independent full-row proof; `acceptance.json` records
construction and CLI outcomes. `execution-plan.json`, `acceptance-runner.py`,
`acceptance.log.gz` and `command-records.json.gz` preserve the exact execution.
Each archived command record retains its original text, byte count and hash.

`source-review-files.json.gz` preserves the exact original contents of all 36
reviewed files, including the pending-status guide. `parent-source-review.json`
and `parent-acceptance-review.json` retain the independent parent's checks.
`packaging-amendment-01.json` records the sole post-acceptance change to a reviewed
file: the new guide's completion status and evidence link. Production, verifier,
fixtures and protocol bytes stayed frozen. `parent-files.json` pins all 292
tracked parent files; only the approved old entrypoint, relevant scoring guide
paragraphs and single TUNING row differ.

The original API failure is in `api-reproduction.json` with the old
`legacy-builder.ts.gz`. Its decompressed bytes are unchanged. The initial staged
whitespace check flagged 19 lines inherited from that exact old source; transport-only
compression preserves them without treating them as newly written code.
`packaging-amendment-02.json` records the failure and transport change;
`manifest-before-transport.json.gz` preserves the previously approved manifest.
The final staged check passes. No historical source bytes were cleaned up. `checks.json` and compressed test logs retain local results.
`environment-after-acceptance.json` is reproduction context recorded during
packaging, not a performance observation or a cross-platform numerical guarantee.
`manifest.json` pins every packaged file and each gzip's uncompressed content.
The raw dictionary is not duplicated here.

## Reproduce construction and independent verification

Use the pinned raw CMU file described in [the construction contract](../../../docs/cmu-score-reference.md),
with the package's source checksum. Choose fresh output paths and an existing
parent directory:

```sh
node --import tsx scripts/generate-baseline.ts \
  --source /absolute/path/to/pinned-cmudict.dict \
  --policy cmu-ascii-first-v1 \
  --projection cmu-arpabet-base-v1 \
  --scorer legacy-arpabet-add-one-log2-v1 \
  --out /private/tmp/new-score-reference.json

python3 evaluation/corpus/verify-score-reference.py \
  --root "$PWD" \
  --source /absolute/path/to/pinned-cmudict.dict \
  --artifact /private/tmp/new-score-reference.json \
  --out /private/tmp/new-score-reference-proof.json
```

The independent verifier requires regular, nonsymlink input paths (including path
ancestors), so use canonical paths. The formal runner is a frozen execution record
with historical checkout/tmp locations and the original reviewed guide status;
it is not a portable replacement for these commands. Replaying that exact matrix
requires restoring its saved source snapshot and fresh run directory. Nothing in
this package activates the new reference in a consumer. That remains separate
work requiring a frozen same-output sensitivity protocol.
