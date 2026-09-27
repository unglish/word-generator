# Exact-control legacy compatibility

The candidate `91fd20a93d8b91c1fd3f2477ea66d83d1f8f3a4c` with `realizations: undefined` matches exact #335 (`ce3800dd3454feb33cdb32f8be96cf2fc684c4eb`) over **20,768 coordinates / 83,072 successful public generation calls**. This demonstrates the explicit legacy opt-out, not unchanged English defaults or improved active-policy output.

The first 20,000 coordinates cover the registered four profiles and five development streams per profile, with 1,000 sequential draws per stream. An additional 768 coordinates cover three custom legacy configurations (identity-form override, custom repeats, disabled doubling), each with four fixed seeds and 64 sequential draws. Each coordinate runs control and candidate with tracing off and on, using separately instantiated public seeded RNGs. Every complete word/trace snapshot and cumulative RNG-call count matches its counterpart. All 128 next-value probes across 32 stream/configuration combinations match. Per-stream digests retain traced and untraced populations separately.

Control materialization verifies 92 files against their exact Git blobs. The authority records both source closures, registration/protocol hashes, executable path/version/hash and package-lock hashes; all are checked again after the run. This is local installed-environment evidence, not a hermetic build or proof of registry package authenticity. Full dependency/runtime closure is still required for the forthcoming formal corpus freeze.

Snapshots are taken immediately after each call. This comparison does not establish caller-mutation isolation or freedom from cross-call object aliases. It compares public configured `generateWord` calls; it does not claim separate batch-API coverage.

## Preserved failed preparation

Version 1 stopped after four calls on coordinate zero because its trace-on/off assertion added a `trace: undefined` property, while the public untraced object omits the property. The two control/candidate comparisons had passed. A separate two-call interface inspection confirmed the omitted/present property distinction and equality of the remaining complete values. Version 2 checks property presence explicitly, removes only trace for the within-generator comparison, and preserves full traced and untraced control/candidate comparisons. No generator, schedule, override, expected word, tolerance or quality gate changed. The failed runner, authority, log and failure record remain included.

## Reproduction

These are the exact executed sources, with their original paths retained. Materialize the pinned control revision into the fresh path named by the preparation script, provide the candidate checkout and installed dependencies, and use Node 24.11.1 with the explicit tsx loader path shown by the environment. The runner uses exclusive output creation; preserve existing results before assigning a new execution layout. Moving inputs or changing the runner requires a new authority record. Verify the manifest and reported authority SHA before relying on transported evidence.

The parity result does not replace the registered new-policy corpus comparison, independent linguistic recount, or paired performance measurement.
