# Pure spelling resolver extraction

This prerequisite extracts selection eligibility and doubling transitions for reuse
by the coverage planner. The policy remains inactive at this checkpoint.

Against the immutable 43-file dependency runtime at `6b0b8f2`:

- 20,000 scheduled development draws match complete traces, words and RNG boundaries;
  trace on/off variants also match at every draw (80,000 public API calls).
- 1,600 further draws match under eight custom doubling configurations, including
  disabled, zero-probability, forced 100%, quota and gemination cases.
- 800 draws verify factory-reference semantics when maps/doubling objects are replaced
  or enabled is toggled after generator construction.
- The full probe makes 84,800 public API calls. Every source file is hashed before
  and after execution, and the probe definition is pinned in the report.

Independent review caught and corrected factory-capture drift before this final
run. The original writer's map/config references and initial enabled state are
preserved. Frequency arithmetic, filter/fallback/quota order and singleton draws
are unchanged; a forced 100% doubling branch still consumes its historical draw.

The doubling descriptor uses fixed/probabilistic variants so its sampler cannot
claim a probabilistic result without a defined doubled form. The code-simplifier
pass focused on that contract and separating pure eligibility from the RNG wrapper;
it left the original linguistic predicates and arithmetic intact.

Focused integration tests: 22/22. Runtime types and touched-file/probe lint pass.
The full dependency suite and known ex-gate failure are in the preceding control
package; no new full/performance claim is made for this extraction checkpoint.

`parity.json.gz` includes both source hash maps and every stream digest.
`candidate-sources.json.gz` freezes the 45-file extracted runtime. Its baseline
source bundle is `../spelling-coverage-dependency/control-sources.json.gz`.

```sh
node --import tsx evaluation/quality/probes/spelling-coverage/refactor-parity.ts FROZEN_DEPENDENCY_RUNTIME CURRENT_CHECKOUT report.json
```

The frozen dependency runtime may be materialized from the preceding source bundle
in a temporary directory with `package.json` declaring type module and access to
the pinned installed dependencies. The probe is read-only except for its report.
