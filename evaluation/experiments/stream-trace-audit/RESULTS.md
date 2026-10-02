# Bounded trace-audit retention

The previous CLI accumulated 50,000 complete WordTrace records before consuming any metrics. On the measured Q02 candidate this exhausted the default Node heap (exit -6). The CLI now consumes each generated word immediately using one shared seeded RNG.

Both candidate and control now complete the unchanged default workload: 50,000 words, seed 42, lexicon mode, morphology and trace enabled, default heap. All report fields match between these runs, and the control matches the original bulk control report exactly. All 10,000 full word/trace comparisons across 20 streams pass, including next RNG draws. Existing six metric/threshold tests pass; TypeScript compilation passes.

Runtime: Node v24.11.1. Candidate source: Q02 publication 76b102eaa7f70131bcbd0a924c6cc6ea9c6e214b plus this CLI patch; control generator source: 905ba3e92d396db358504fec1826c1c83f680ff3. No generator source, sample size, quality threshold, timeout or heap allowance changed. This fixes CLI retention; the public batch API still retains its requested array. It does not resolve inherited quality or performance gate failures.

Reproduce after TypeScript compilation with `node evaluation/experiments/stream-trace-audit/verify-parity.mjs` and `node scripts/trace-audit.mjs --out /tmp/trace-audit.json --quiet`. Compare reports as parsed JSON.
