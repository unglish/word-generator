# Pure root-stress sampler proof

This is an analytical API study. No generator path calls the new law, and these
tools do not measure word quality. The six cases, 600,000 primary draws, limits,
and witness rules are registered in `protocol.json`. Its original design-only
status text is retained; `registration.json` records approval. The original
design/protocol bytes and analytical oracle evidence stay immutable.

## Execution gates and evidence authority

1. Review all source and synthetic fixtures, then freeze the complete source
   closure. No registered-case numerical-tree execution or random tapes precede
   that review.
2. Capture the deterministic numerical trees and the 84 fixed/mutation calls.
   Replay every retained call through the public API on the **same Node binary**.
   Independently verify rational component, prefix and suffix masses, support,
   coordinates, complete tree coverage, and all numerical limits in Python.
3. Inspect the three artifacts and require the independent reference report's
   `passed: true`. Obtain approval before creating the actual random tape.
   Record its immutable bytes and manifest hashes before frequency capture.
4. Capture exactly the registered rows once. Independently verify every record
   and every block/aggregate mask. Retain all results, including failures.

`reference.py` derives probabilities from the frozen literal-history oracle;
it does not import production DP helpers. Prefix messages sum complete histories
across **all K**, divide out the positive component prior, and retain duplicate
histories. Its separate suffix check conditions on final K. Python does not
claim bit-exact reproduction of Node's `Math.log`/`Math.log1p` branch predicates.
The externally pinned same-Node replay report supplies that authority and is
bound to the compressed tree archive, protocol, source freeze, process versions,
platform/architecture, and executable SHA-256. A new binary needs new identified
evidence. The coherent wrong-branch fixture deliberately passes Python's rational
structure check and fails Node's numeric check.

The numeric tree enumerates binary histories, with integer binary search and
boundary-neighbor/endpoint/quartile probes. Its grid law is conditional on the
reviewed monotonic engine predicate; it is not exhaustive testing of all libm
inputs. Continuous, ideal-grid and numeric-grid probabilities remain separate.

The frequency verifier consumes the externally pinned accepted reference and
its exact tree archive. It rechecks the tree's independent rational proof and
exact grid distribution, then walks each actual tape row through that tree.
Every full leaf transcript must match, apart from uniform values which must
equal that row's cells exactly. This transfers the already checked mathematical
and same-engine leaf evidence to every captured draw without using Python libm
as a second numerical branch authority. It independently reconstructs counts,
first-in-schedule witness coordinates, consumed/unused cells, and each block's
full-transcript hash. All 1,440 bins are included, including structural zeros.

## Frozen source closure

`integrity.mjs` and `verify-reference.py` independently enumerate the exact paths
and bytes of every `src/**/*.ts` file; `package.json`, `package-lock.json`, and
`tsconfig.json`; and every regular file under this experiment's `protocol/`,
`law-evidence/`, and `sampler/` directories. Only Python bytecode cache directories
are excluded. Added source files in these roots, deleted files, symlinks, or
changed bytes fail the check. All tape, capture, replay, verification, and test
tools are in this closure **before** the first numerical-tree acceptance run.
Dependencies must be installed from the frozen lockfile; the closure does not
claim to independently audit every installed dependency's bytes.

Create the source-freeze JSON outside the checkout, and pin its SHA externally.
Every CLI checks source names/bytes and inputs before and after processing. All
outcome paths must be fresh, exclusive, and outside the source checkout, including
directory aliases. Interrupted/failed artifacts are retained, never replaced.
Future compact outcomes, source bundles and the freeze JSON may be packaged under
the separate `evaluation/experiments/conditional-root-stress/evidence/` directory,
which is not a source/input root and is not imported by these tools. Do not add
outcomes under the three frozen source directories. This permits publication in
a later evidence commit without changing the source set reproduced by the freeze.

## Reproduction commands

From the repository root, set `P=evaluation/experiments/conditional-root-stress/sampler`.
Every `*_SHA` below is an externally recorded SHA-256, not a digest inferred from
an untrusted artifact being validated. Output paths must be new on every attempt.
Use the same Node executable for tree capture, replay, tape creation and capture.

```sh
node "$P/freeze.mjs" --out "$FREEZE"

# After source review:
node --import tsx "$P/numeric-grid.mjs" \
  --freeze "$FREEZE" --freeze-sha "$FREEZE_SHA" --out "$TREE"
node --import tsx "$P/replay-numeric.mjs" \
  --freeze "$FREEZE" --freeze-sha "$FREEZE_SHA" \
  --input "$TREE" --input-sha "$TREE_SHA" --out "$NODE_REPLAY"
python3 -B "$P/verify-reference.py" \
  --freeze "$FREEZE" --freeze-sha "$FREEZE_SHA" \
  --input "$TREE" --input-sha "$TREE_SHA" \
  --node-replay "$NODE_REPLAY" --node-replay-sha "$NODE_REPLAY_SHA" --out "$REFERENCE"

# After prerequisite acceptance and explicit tape-stage approval:
node "$P/create-tape.mjs" --freeze "$FREEZE" --freeze-sha "$FREEZE_SHA" \
  --reference "$REFERENCE" --reference-sha "$REFERENCE_SHA" \
  --out "$TAPE" --manifest "$TAPE_MANIFEST"
# Record TAPE_MANIFEST_SHA and its raw tape SHA before the first frequency output.
node --import tsx "$P/capture-frequency.mjs" \
  --freeze "$FREEZE" --freeze-sha "$FREEZE_SHA" \
  --reference "$REFERENCE" --reference-sha "$REFERENCE_SHA" \
  --tape "$TAPE" --manifest "$TAPE_MANIFEST" --manifest-sha "$TAPE_MANIFEST_SHA" \
  --out "$FREQUENCY_ARCHIVE" --summary "$CAPTURE_SUMMARY"
python3 -B "$P/verify-frequency.py" --freeze "$FREEZE" --freeze-sha "$FREEZE_SHA" \
  --reference "$REFERENCE" --reference-sha "$REFERENCE_SHA" --numeric-archive "$TREE" \
  --tape "$TAPE" --manifest "$TAPE_MANIFEST" --manifest-sha "$TAPE_MANIFEST_SHA" \
  --capture "$CAPTURE_SUMMARY" --capture-sha "$CAPTURE_SUMMARY_SHA" \
  --archive "$FREQUENCY_ARCHIVE" --out "$FREQUENCY_VERIFICATION"
```

The reference's `passed` field and the frequency report's `passed` field are
acceptance results. **CLI exit 0 is not frequency acceptance**: a statistical
failure is written with `passed: false`, all bins and the original N retained.
Invalid structure/identity stops with an error; retain the log and any already
written raw evidence. Do not reroll inputs, substitute a reference, relax a limit,
merge bins, or add adaptive samples. Hashes establish identity; the external
reviewed pins supply authenticity.

## Accounting and synthetic checks

Only the 600,000 primary frequency calls enter N. The deterministic fixed rows
have 72 calls including detached-result replays, plus 12 input-mutation calls.
Every tree probe/leaf call and every separately executed Node replay is recorded
as supplementary. The frequency stage has no extra sampler calls. Each of its
rows owns 15 little-endian uint32 cells; unused cells remain pinned and are never
reassigned. The Python verifier makes no sampler calls. Witnesses identify the
first actual record for each observed component, first/second branch coordinate,
and pattern; unobserved positive patterns are reported honestly.

All tests below use hand-derived or synthetic non-candidate fixtures. They do
not create registered numerical trees, OS tapes, or frequency outcomes:

```sh
node --test "$P"/*.test.mjs
python3 -B "$P/reference-test.py"
python3 -B "$P/verify-reference-test.py"
python3 -B "$P/verify-frequency-test.py"
python3 -B evaluation/experiments/conditional-root-stress/law-evidence/q09-pattern-oracle-test-portable-v1.py
```

The fixtures cover strict integer/boolean distinctions, duplicate or missing
coordinates, wrong component/prefix/suffix masses, coherent numeric branch
transplants, detached input/result violations, whole-tape corruption including
unused suffix cells, changed summaries/witnesses, wrong source/engine/hash pins,
exclusive publication, and retention of a failed statistical result. Passing
frequencies would diagnose gross sampler errors under the independent-uniform
input assumption; it would not prove exactness or improve generated words by
itself.
