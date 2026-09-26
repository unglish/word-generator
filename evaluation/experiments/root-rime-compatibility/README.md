# Q10b1: root nucleus/coda compatibility

This experiment changes neither the configured excluded pairs nor their weights. It makes the existing stress and edge nucleus replacement paths preserve the retained coda's pair constraints and checks every root pair before spelling. Read [the contract and limits](../../../docs/root-rime-compatibility.md) before interpreting the counts.

The incremental control is dependency-only commit `13c2524dccabd58d37f5a8ec675eeffe1181df95`, combining Q07 (#314) and Q11 (#313). Q10a (#320) is excluded. Each archive uses the same frozen four-profile/five-stream development schedule, 200,000 selected returned words. Raw shards remain under `memory/quality-runs/root-rime-{control,candidate}/words`; every hash is pinned in the compact manifests. The original reference is Q00's `2026-09-26-development-standalone` archive from #307.

| Profile (50,000 words each) | Original prepared-root violations | Control | Candidate | Candidate pair slots | Stress repairs excluding positive candidates |
|---|---:|---:|---:|---:|---:|
| Lexicon default | 4 | 5 | 0 | 67,379 | 51 |
| Lexicon bare | 12 | 10 | 0 | 91,244 | 79 |
| Monosyllables bare | 0 | 0 | 0 | 112,033 | 0 |
| Text default | 2 | 7 | 0 | 56,301 | 34 |

The primary result is 22/327,029 → 0/326,957 excluded nucleus×coda segment pairs. All 19,300 candidate changed stress nuclei have detailed repair records reconciled bijectively with stage differences. 164 repairs exclude 328 positive candidate entries. There are no observed edge repairs in either run; helper/public fixtures establish that path's applicable contracts. All five monosyllable shards match the control byte for byte. Other diagnostics move in both directions, as the [complete comparison](comparison.md) shows. Neither this contract nor these sample counts establish human wordlikeness.

The earlier Q11 dependency remains a draft with an `ugh` gate failure in its recorded history. This run passes the unchanged gate (`ugh` ratio 0.0110 against floor 0.0062), but Q10b1 does not claim to repair that gate. The separate unchanged-generator study (#321) observed `ugh` failures in 12 of 20 predefined streams; no gate threshold is changed here.

## Contents

- `control/` and `candidate/`: exact compact capture files; their manifests still pin all raw shards. These compact copies alone are not complete raw archives and cannot pass full-archive verification without the listed shards.
- `{original,control,candidate}-observation.json.gz`: complete frozen-observer reports, including every context histogram, replicate, morphology stratum, source snapshot, and witness. Decompression reproduces the report SHA in its independent verification file.
- `{original,control,candidate}-independent.json`: the independent Python counter's source digest, report hash, totals/denominators, repair counts, and verified witness count.
- `comparison.json.gz` and `comparison.md`: all unchanged evaluator measures against both the original baseline and the dependency control.
- `observer-freeze.json.gz`, `runtime-freeze.json.gz`, source-verification files: preregistered observer and pre-capture runtime bytes, plus exact source-set/commit checks.
- `conditional-parity.json`: full-output digest, RNG call count, and next RNG value for each of 20 control/candidate streams with pair exclusions identically cleared (20,000 draws). This is conditional parity, not unchanged-default-output evidence.
- `checks.json` and logs: full unit, quality, observer and performance results. The performance run was isolated and measures the existing gates, not a controlled speed improvement.
- `files.json`: SHA-256 and byte length of the complete compact package; it excludes itself.

## Reproduce the additional checks

The frozen Q00 top-level evaluator/protocol from #307 is required, fingerprint `ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007`. The probe is intentionally independent of later evaluator revisions. The authoritative observer fingerprint is `a236febc098e021cea0a29209b0fce379cc3dc5091a618007ed1622f1bcb3a21`; `verify.py` independently counts the raw stream rather than importing the observer.

```sh
node --import tsx evaluation/quality/probes/root-rime-compatibility/analyze.ts candidate memory/quality-runs/root-rime-candidate /tmp/rime-observation.json
python3 evaluation/quality/probes/root-rime-compatibility/verify.py memory/quality-runs/root-rime-candidate /tmp/rime-observation.json /tmp/rime-independent.json
node --import tsx evaluation/quality/probes/root-rime-compatibility/parity.mjs /path/to/control-checkout /path/to/candidate-checkout memory/quality-runs/root-rime-control /tmp/rime-parity.json
```

Use a clean checkout of the exact control commit for the parity replay. The tool checks every archived control source file before and after running public APIs. Preserve source, environment and dependency-lock equality as required by Q00. All output paths must be new; archived results must not be overwritten.
