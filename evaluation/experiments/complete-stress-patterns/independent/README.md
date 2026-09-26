# Independent Python recount and replay

These are the exact separately written source files, source freeze and results used by the parent reviewer. The main script does not call the TypeScript observer. It checks complete archive/source identities before and after reading, replays executed mark assignments and prior origins, binds snapshots to old stages/final words, and derives all descriptive counters directly from labels. It does not reconstruct the primary OT policy or infer acoustic prominence.

The freeze predates the formal recounts. Six adversarial development-test groups use the preserved 400 public-API scratch words. Both complete 200,000-word archives passed; the comparison checks every integer count across totals, four profiles, 20 streams and 290 stream-level morphology × length strata in each mode. Control event/draw counts with zero observed records remain explicitly unavailable; they are not measured absence of historical assignments or draws.

The production recount CLI is portable and requires explicit paths/identities:

```sh
python3 q09-independent-patterns.py --run RUN_DIR --manifest-sha EXPECTED_MANIFEST_SHA --generator-digest EXPECTED_SOURCE_DIGEST --mode candidate --out NEW_REPORT.json
```

Use `--mode control` for the pinned control. The two expected identities are in the parent experiment README and freeze input records. Output paths must be new.

The frozen development test retains its historical scratch path `/private/tmp/q09-independent-fixtures-v1.jsonl`; decompress the accompanying `.jsonl.gz` at that exact path to replay it unchanged. Its Python module is loaded from beside the test file. The frozen comparison script also names the original `/private/tmp/q09-*` formal report/freeze/source paths; restore the preserved report JSONs at those exact names if replaying that script. `q09-observer-formal.json` is the decompressed parent `formal-observation.json.gz`. These path conventions are recorded rather than silently rewriting executed source after measurement.
