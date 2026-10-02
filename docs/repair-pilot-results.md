# Rust repair pilot evidence and decision

Decision: retain the **opt-in repair pilot**, keep TypeScript as the default, and
pause further migration. The bounded verification and executable parity checks
provide useful implementation evidence. The tiny native algorithm is fast, but
crossing the JS/Wasm boundary costs more than it saves. No whole-engine speedup,
linguistic improvement, or default-backend change is justified by this experiment.
Expansion issues are therefore not opened. Any later proposal for length budgeting,
RNG/weighted selection, trace alignment or a larger pipeline must supply its own
contract and measurements. Browser threading, Rayon and Node addons remain outside
this pilot.

## Correctness evidence

- 488 frozen repair fixtures pass against TypeScript, native Rust, Node Wasm,
  browser main thread and a module Web Worker. The corpus includes public,
  trace-enabled generation, empty words/sides, cascading/repeated phonemes,
  both policies, multiple boundaries and arbitrary focused banned relations.
- Each Node/browser/worker run compares 3,456 full words, including phoneme
  metadata, stages, repair details, structural/grapheme/morphology/orthography
  traces, pronunciations and spellings. The matrix covers 3 configs, 3 seeds,
  2 modes, automatic/1/3/7 syllables, morphology and trace on/off. The only
  intentionally excluded comparison field is experimental backend provenance.
- The shared suite makes 11,148 assertions per run. It checks surviving object
  identity and order, repeated repairs, explicit disposal, configuration identity,
  malformed packets, unknown phonemes, ambiguous inventory symbols, missing
  bindings and invalid Wasm initialization. Counted custom RNG callbacks prove
  equal draw counts and shared sequential stream output for tested batches.
- The production page passes at `/word-generator/repair-pilot.html`, including
  repeated initialization and a module worker. Existing classic `importScripts`
  workers still load the separately built standalone library.
- A real npm tarball, unpacked outside the repository, passes the same 488-fixture
  and 3,456-word suite, including the default binding URL and hash verification.
  Generated structured packet/result types and binding/Wasm sync checks pass.
- Existing tests: 404 unit tests pass, 1 skipped; 12 quality checks pass using
  120,000 gate samples and 30,000 samples/mode; both CI-mode performance checks
  pass (4,971 words/s and 1.52× median batch variance). A first performance run
  overlapped the unit/quality suites and failed under contention; the isolated
  recheck passed. No thresholds were weakened.
- The 5,000-word trace audit (seed 342, lexicon, morphology on) and trigram
  diagnostics (2,000 words each for 42/342/1337, lexicon, morphology off) complete.
  Small-sample trigram rankings are diagnostic observations, not migration
  regressions. No outlier or linguistic-quality improvement is claimed. The
  complete parity comparison is the relevant distribution-preservation evidence.
- New-file lint passes. Repository-wide lint has 11 inherited errors in
  `language.test.ts`, `generate.ts` and `write.ts`; the unused function in the
  touched generator also reproduces when linting its original HEAD content.
  These are recorded rather than changing unrelated implementation.

## Cost measurements

Measured locally on Linux x64, Intel Xeon Platinum 8573C, Node 24.19.0, release
Rust 1.85.1 and wasm-bindgen 0.2.100. Five samples, 20,000 calls/sample after 2,000
warmup calls; medians below. Native measurements use `black_box`. The focused
repair workload has two syllables and a cascading `ŋ|t` ban. Adapter/TypeScript
measurements include creating equivalent mutable input objects; raw Wasm includes
packet decoding and result transfer but excludes TypeScript object conversion.

| Workload | Median |
| --- | ---: |
| Cold local import + initialization | 23.52 ms |
| Native core result allocation + repair | 50.20 ns/call |
| Typed packet copy only | 44.45 ns/call |
| Raw Wasm call (decode/core/return transfer) | 388.68 ns/call |
| TypeScript repair, trace off | 343.94 ns/call |
| Full Rust adapter, trace off | 1,432.86 ns/call |
| TypeScript repair, trace on | 1,247.20 ns/call |
| Full Rust adapter, trace on | 2,962.29 ns/call |
| 2,000 complete words, TypeScript, trace off | 344.53 ms |
| 2,000 complete words, Rust repair, trace off | 351.64 ms (+2.06%) |
| 2,000 complete words, TypeScript, trace on | 447.00 ms |
| 2,000 complete words, Rust repair, trace on | 472.15 ms (+5.63%) |

Whole-generator samples alternate backend order. Options: seed 342, lexicon,
morphology on, automatic syllable counts. The overhead is within the initial
20% retention budget; this does not establish stable performance across machines.
The final measured run started after proof processes exited. Host/JIT/GC noise
still applies; run the checked-in benchmark on release hardware before making
performance promises.
The trace/nontrace split helps show how little work this repair stage performs.

Bindings: 8,601 bytes (2,293 gzip). Wasm: 22,471 bytes (10,204 gzip). Combined runtime
assets: 31,072 bytes, 12,497 gzip, below the 100 KiB gzip budget. Node cold startup is
below the 100 ms local budget. Network transfer and low-end mobile startup remain
unmeasured. Process memory totals are in the raw report but mix JS heap/JIT/GC and
Wasm; they are not an isolated Wasm memory measurement.

See `evaluation/repair-pilot/results.json` for raw samples, source/config/backend
provenance, corpus digest, artifact hashes and memory limitations. Reproduce with
`npm run bench:repair` after the build commands in the [contract guide](rust-repair-pilot.md).
This produces a separate `results.local.json`, preserving the checked-in evidence.

These frozen measurements describe the source and artifact hashes in the raw
report. Later Rust-practices hardening declares the MSRV, shares dependency/lint
settings, checks formatting/Clippy in CI, and separates native validation from
JavaScript error construction. It preserves the repair algorithm and ABI but
changes source/artifact hashes; the table is historical evidence, not a new
measurement of those edits. No performance gain is claimed from the hardening.

## Adapter optimization measurements

A later performance pass removes the intermediate JavaScript number array,
writes the packet directly into a `Uint32Array`, reads cut triples by index
instead of allocating two subarray views per boundary, truncates coda tails by
setting their length, and avoids onset splices when nothing is dropped. Validation
still completes before mutation, including all phoneme IDs for single-syllable
words. Trace calls and surviving object identities are preserved.

Paired measurements use the same rebuilt Wasm in both adapters, English's
41-pair relation, the same input reset, Node 24.19.0, and CPU affinity 4. Nine
samples of 200,000 repairs follow 100,000 warmup calls per case/backend; order
alternates. These measure the complete adapter, not a numeric core substitute.

| Repair case | Before | After | Less time |
| --- | ---: | ---: | ---: |
| Cascading, trace off | 1,716 ns | 921 ns | 46.3% |
| Unchanged boundary, trace off | 1,225 ns | 618 ns | 49.6% |
| Single syllable, trace off | 545 ns | 451 ns | 17.2% |
| Cascading, trace on | 2,755 ns | 2,002 ns | 27.3% |
| Unchanged boundary, trace on | 2,283 ns | 1,379 ns | 39.6% |
| Single syllable, trace on | 667 ns | 571 ns | 14.3% |

Whole-generator measurements do **not** establish a consistent speedup. In the
first rotating-order run of nine 2,000-word samples, median times changed from
338.5 to 336.1 ms without trace and from 543.2 to 566.1 ms with trace. A longer
alternating-order repeat (15 samples of 4,000 words, 8,000 warmup words per backend,
explicit GC before each sample outside timing) changed from 733.4 to 749.5 ms
without trace and 1,488.7 to 1,452.6 ms with trace. Individual samples vary
substantially. Report the repair improvement separately from these mixed results;
the original decision to keep TypeScript as default remains supported.

A subsequent direct comparison against the shipping JavaScript repair uses the
same two-syllable cascade, English's 41 pairs, identical resets, alternating order,
and nine samples of 300,000 calls after 100,000 warmup calls per backend/case.
Without trace, JavaScript takes 380 ns and the optimized complete Wasm backend
838 ns (2.21× slower). With trace, JavaScript takes 1,069 ns and the Wasm backend
1,582 ns (1.48× slower). These are complete API comparisons, including conversion
for Wasm and reset for both; they are distinct from numeric native-core comparisons.
[optimized-vs-javascript.json](../evaluation/repair-pilot/optimized-vs-javascript.json)
records samples, configuration and source/asset hashes.

An exploratory native-only compiler comparison also found `opt-level=3` faster
than the production size-oriented `s` setting for the English numeric core with
allocated cuts (84.2 versus 45.7 ns), but slower for the one-pair case with a reused
output buffer (9.8 versus 14.0 ns). This is one run with nine samples per method;
it excludes Wasm transfers, asset size and startup. The production compiler
profile remains unchanged pending those measurements.

[optimization-results.json](../evaluation/repair-pilot/optimization-results.json)
records source/asset hashes, the saved baseline source, all candidate samples,
paired samples, the whole-generator repeat and the native compiler experiment.
After building, `npm run bench:repair-optimization` repeats the paired comparison
using that saved baseline and writes `optimization-results.local.json`. Pin the
process to the same available CPU core for comparisons with the recorded run.

## Verification and maintenance decision

Proof properties, limits and pinned tools are listed in the
[contract guide](rust-repair-pilot.md#proof-scope). Both shipping-core harnesses pass: `word_contract` verifies 471 checks in
7.00 s, and `boundary_contract` verifies 462 checks in 63.79 s (7 unreachable
checks each). Total local wall time is 76.10 s, within the 300 s budget.
[evaluation/repair-pilot/kani-results.txt](../evaluation/repair-pilot/kani-results.txt)
retains the verifier output. An initial owning-vector composition harness
exhausted the verifier's memory after roughly five minutes; it is **not** counted
as a successful proof. The shipping core now uses borrowed slices and a lazy cut
iterator, with no allocations inside the verified algorithm. The adapter owns the
validated packet and reads IDs from it directly. The retained composition harness
covers the empty/single/two-syllable wrapper cases, sides 0..1 (including
empty sides), and arbitrary two-symbol relations; the boundary harness covers lengths 0..4 and arbitrary three-symbol
relations. The representation change preserves executable parity and reduces adapter copying.
Larger word-level composition harnesses exceeded the initial proof budget; they
are not counted as successful proofs. Larger words remain integration-tested. This proof-cost experience is an additional
reason to pause expansion.

The GitHub Actions job archives verifier output,
cost and counterexample playback when available; actual hosted CI runtime has not
been measured from this workspace. A failing/timeout proof must fail CI, and must
never be counted as verification success.

The maintenance cost includes Rust/toolchain and Kani compiler pins, the Cargo
lockfile, generated bindings/types, configuration conversion, fixture provenance,
npm release requirements and browser asset placement. This is more machinery than
the original short repair function. Retaining it as an explicitly experimental
component makes that tradeoff reviewable without placing the dependency on ordinary
TypeScript development. Releases and Pages builds now need the pinned Rust/binding
tools; ordinary TypeScript generation needs neither async startup nor Wasm assets.

The evidence supports browser viability and bounded correctness of this narrow
component. It supports **no expansion at present**. Keep human studies frozen;
future backend comparisons need separately identified provenance. Measure hosted
CI cost and device/network startup before considering any stronger adoption claim.

## Further Rust optimizations

The Rust core now compares pairs as numeric 64-bit keys during lookup, preserving
both full-width u32 IDs and the tuple-based Rust input API. This avoids the two-field
tuple comparison in the hot scan. The Wasm bridge counts initially nonempty
boundaries and reserves exactly three result integers for each, avoiding vector
growth and the potential shrinking allocation when wasm-bindgen returns the vector.
JavaScript code, packet ABI, policies and production compiler settings are unchanged.

In the native numeric English cascade (41 banned pairs), median reused-buffer time
fell from 67.4 to 30.2 ns (2.23× faster), and allocated-cut time from 80.2 to
46.0 ns (1.74× faster). These are separate nine-sample runs, not interleaved trials.
The one-pair case regressed slightly: 9.0 to 9.8 ns reused, 28.8 to 29.6 ns
allocated. The mixed 488-fixture workload improved from 19.2 to 13.4 ns reused
and 30.0 to 27.9 ns allocated. Configuration preparation, phoneme objects and
JS/Wasm transfers are outside these native timings. The exposed key is calculated
once per repair step, outside the relation scan; leaving that calculation inside
the scan produced weaker native gains under the size-oriented compiler profile.

A separate rotating nine-sample comparison measures the final built Wasm binary:

| Cascade syllables | Raw Wasm before / after | Full adapter before / after |
| --- | --- | --- |
| 2 | 391 / 362 ns (7% faster) | 716 / 679 ns (5% faster) |
| 7 | 1,190 / 1,075 ns (10% faster) | 3,677 / 3,047 ns (17% faster) |
| 16 | 1,872 / 1,639 ns (12% faster) | 5,901 / 5,717 ns (3% faster) |

Each word uses English's 41 pairs, two-phoneme banned clusters, drop-coda, and no
trace. Each sample makes 100,000 calls after 50,000 warmup calls, pinned to CPU 4.
Raw Wasm includes packet/result transfers and Rust decoding; full adapter includes
encoding, validation, mutation and identical input reset. The timing-only run has
different JIT behavior from exploratory runs that execute parity first, so compare
variants within each run. No whole-generator speedup is claimed. The shipping Wasm
asset grows from 22,570 to 22,704 bytes (+134; gzip +78 bytes).

Precompiling the relation into u64 keys was rejected: despite native improvements,
it regressed raw Wasm in this comparison. An opt-level=3 Wasm build also gave mixed
timings, so the production size-oriented profile remains unchanged. The evidence
supports a faster native hot loop and modest bridge gains for longer words, with a
small native one-pair regression. Repeated exploratory runs showed smaller or
mixed full-adapter gains (including a small two-syllable regression); the 17%
seven-syllable result should not be treated as a stable expected improvement.

[rust-optimization-results.json](../evaluation/repair-pilot/rust-optimization-results.json)
retains all samples, baseline Rust sources, source/asset hashes and candidate runs.
To repeat the Wasm comparison after building the baseline and retained variants in separate binding
directories, run `node evaluation/repair-pilot/measure-rust-optimization.mjs BASE_DIR
RETAINED_DIR`. Optionally supply a third directory for the rejected precompiled-key
variant to reproduce the three-way trial order, pinned to the same CPU. This writes an ignored
local report. The saved baseline sources allow reconstructing the original Rust
variant with the same toolchain and compiler profile.

The final implementation passes native fixtures, full-width ID tests, formatting,
native/Wasm Clippy, Node parity (488 fixtures, 3,456 generated words, 11,166
assertions), both browser worker tests, asset consistency and packed npm-consumer
parity. Both Kani harnesses pass with their original bounds: word verification
takes 8.23 seconds (478 checks), boundary verification 59.27 seconds (469 checks),
zero failures and seven unreachable checks per harness. Hoisting the exposed key
also avoids the roughly 135-second boundary proof of the earlier inside-scan
candidate. [The final verifier output](../evaluation/repair-pilot/rust-optimization-kani-results.txt)
is retained separately from the historical proof report.
