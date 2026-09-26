# Q13c compatibility harness before formal execution

The original protocol is unchanged. `parity-current.mjs` requires an externally
reviewed analyzer/source freeze and an exact #331 materialization. All production
source/package/compiler files in that control must match commit
`569adf516a7fa03a77124d3515c9e1a17a8f71ac`; package inputs also match the candidate.
The current analyzer freeze covers this tool and its tests. Source and tool
bytes are checked before and after even when generation/comparison fails.

The formal development schedule is 20 streams × 1,000 coordinates. Four omitted
policy paths (control/candidate × trace off/on) account for 80,000 public calls.
Two candidate preserve-phones paths account for 40,000 public calls. No active
candidate/control word or RNG equality is claimed. Every counter advances before
the attempted public call; incomplete results are failures, never partial passes.

At each word boundary, comparisons include live recursive own keys/descriptors,
serialized words/full old traces, cumulative logical RNG counts, all consumed
binary64 RNG bytes and the next value. Only trace-on/off comparison removes the
trace property. A buffered one-value lookahead exposes next values without
changing the sequence supplied to generation: buffered values are consumed by
the next generator call. Source RNG reads include the final buffered value;
logical generation draws and their byte hashes exclude it. Both counts are
reported. Synthetic sequence tests verify this distinction.

Eight supplemental public mutation calls are recorded separately from the
120,000-call schedule. They compare return-value mutation and configuration
changes between calls, using fresh generators for the latter so an earlier
mutation failure cannot mask it. Actual words or errors are retained.
Compatibility and isolation are separate fields. An initial candidate smoke
exposed an aliasing defect; a diagnostic against the exact control reproduced
the same error after mutating a returned nucleus. That defect is not reclassified
as successful isolation or fixed incidentally in this spelling PR. Its full
initial trace and subsequent outcomes are retained. The original failed smoke
log remains available. No formal parity run had occurred at that point.

Fresh report/input paths are exclusive and outside protected source trees. Full
per-stream output/RNG hashes and frozen source identities are retained. Failures
retain the actual coordinate, call counts and source-integrity status. This
harness does not replace the independent structural recount, 200,000-word active
comparison, existing quality gates, timing study, or human evaluation.
