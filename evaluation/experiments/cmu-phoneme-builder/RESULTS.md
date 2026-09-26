# Q15c1 acceptance evidence

The explicit builder passed the preregistered checks. This establishes reference
construction and publication behavior; it is not a generator quality claim.

| Check | Result |
| --- | --- |
| Selected population | 117,485 lexical entries; exact entry digest and exclusions |
| Native phone events | 742,333; all 69 stress-bearing/original token bins match the independent Python recount |
| Base phone events | 742,333; all 39 stress-merged ARPABET bins match |
| Comparison projection | Every mapped bin, mapping/loss field, and denominator matches; zero unmapped events |
| Parent reference | Entire joint/derived/legacy reference independently reconstructed and checked |
| CLI acceptance | All 12 cases passed: no arguments, help, direct/other cwd, npm alias, existing file, existing/dangling symlinks, wrong/missing/truncated/invalid-UTF-8 source, protected output |
| Repeatability | Direct and npm artifacts are byte-identical, including invocation from another working directory with spaced paths |
| Preserved files | 234 tracked files outside the two intentionally changed prior files checked before/after every CLI command |
| Automated checks | 95 tests passed: 44 new, 27 shared joint-reference, 24 shared parser; strict corpus/review TypeScript, touched lint and diff check passed |

The artifact SHA-256 is
`dd71b8a4ad896372a0d464d1206870e7a3bf5a28ce562018b4ed2261e52a4ad8`;
its envelope digest is
`6012a2e8c3e257f9108557295aadb25f2a87a716f022b0f555f89c539c61bcc1`.
Its ten embedded implementation files match the checkout, with digest
`b1926bd4fb7451f404f271e49d303a37544c9df086673035c41cc757c506101c`.
The preregistration remains byte-identical to its original SHA-256 recorded in
the independent proof. No thresholds, runtime weights, or old reference bytes
were changed. The unchanged npm alias invokes the new explicit launcher.

`artifact.json.gz` contains the new artifact, including source snapshots.
`verification.json.gz` records the final v3 independent recount and file hashes.
`command-results.json.gz` retains the 12 full commands, statuses and outputs.
`tests.log.gz` records the successful focused/shared test run. Gzip members use
zero modification time; `manifest.json` records compressed and expanded hashes.

`development-runs.json.gz` retains failed/corrected development evidence. The
first full acceptance runner reached matching builds/counts but its command log
name collided with a deliberate symlink fixture. Exclusive creation stopped the
runner; the builder did not change. The second acceptance completed, then the
verifier was clarified to handle newly committed paths on future reruns and to
recheck final output/preregistration bytes and CLI summary fields. The final run
used a fresh directory. All successful builds have the same artifact bytes.
Initial test-fixture errors and their corrections are retained separately from
the final test outcome. The original temporary run directories remain intact.

To reproduce, provide the pinned raw source and choose a directory that does
not yet exist:

```sh
python3 evaluation/experiments/cmu-phoneme-builder/verify.py \
  --root "$PWD" --source /absolute/path/to/cmudict.dict \
  --new-directory /absolute/path/to/fresh-acceptance-run
```

The verifier uses the separately implemented Q15a/Q15b Python parser/recount,
not the TypeScript builder for its expected tables. It runs the real launcher
and npm alias, verifies the exact new envelope and externally expected source
snapshots, checks protected paths, and writes its proof exclusively. It never
calls a generator API or changes a runtime/reference consumer.
