# Q13b fixed paired performance study

Use exact #338 (b2373ca83cdbf5e8ad127b604e83397a8afe0d45) as A and the
frozen aligned shared-spelling candidate as B. Run six fresh-process pairs in the fixed
order AB, BA, AB, BA, AB, BA. Each process runs the existing `npm run test:perf`
with CI unset; no floor, variance, timeout, seed, warmup or workload changes.
The actual suite tests defaults, so this measures the active default spelling
policy against its exact predecessor. The unchanged shared dependencies and
complete candidate source closure are checked before and after the series;
source pins and harness bytes are checked before each process.

Reserve a quiet window with no controlled corpus scans or other benchmark jobs.
External host activity is not assumed absent. Retain every log, exit status,
failed gate and missing measurement. Do not select the fastest pair or rerun a
slow result. Report all six paired throughput ratios, median/range, floor and
variance pass counts. The unchanged harness rounds its printed throughput and
variance; compute ratio rounding bounds and label them descriptive local
measurements. Ratios require both rates; missing rates remain unavailable.
No general speed or human quality conclusion follows from one local series.

The runner checks its external SHA and pins the control manifest, candidate
freeze, harness bytes, Node, plan and dependencies. Fresh output is exclusively
created outside all source and archive trees. It writes each completed slot
before proceeding, retains exceptions, and never overwrites an earlier series.

## Version 2: pre-execution binding and retention amendment

This version preserves the v1 runner, plan and tests verbatim. No real timing
was performed before these fixes. The six pairs, their order, the suite, CI
policy, thresholds, seeds, warmups and workload are unchanged.

Run npm through the exact frozen Node binary and the npm CLI resolved from
that Node installation. Hash both the Node executable and npm CLI, prepend
the frozen Node bin directory to PATH, and reject an npm-added `.bin/node`
that could shadow it. Both checkouts must resolve node_modules to the same
physical dependency directory. Before and after the series, hash the installed
transitive dependency/optional/installed-peer closure reachable from Vitest,
vite-node and tsx, plus the npm package including its bundled dependencies.
This is an installed-byte stability record, not a claim that a lockfile
independently authenticates registry provenance. Do not hash unrelated installs.
Only named generated cache directories `.cache`, `.vite`, `.vite-temp` and
`.vitest` are excluded; directory symlinks and additional installed package
resolutions are recorded and checked. Package source files, native binaries,
package metadata and the actual Vitest executable link remain covered.

Unset CI only. Reject active NODE_OPTIONS, NODE_PATH, ESBUILD_BINARY_PATH and
npm_config_node_options/npm_config_script_shell overrides (including uppercase
NPM_CONFIG aliases) rather than silently
run unpinned preloaders, binaries or shells. Record relevant nonsecret runtime
environment flags and the effective PATH; inherit all other environment values
without claiming a hermetic host. Before every slot and at the series boundaries,
use that exact Node/npm CLI to inspect effective node-options and script-shell
for both checkouts. Require default null, including inherited .npmrc settings,
and retain the commands, outputs and statuses in separate preflight records.
These checks are outside the measured suite. Retain host activity as a limitation.

Check exact control src file paths as well as their pinned bytes; reject extra
tests and source aliases. Keep the complete candidate closure check before and
after, with listed source/harness/engine/link pins before every process. Reject
optimized Python, so integrity checks cannot disappear under `-O`. The plan
hash is an externally fixed constant in the reviewed runner. Protect the
original repository/archive, candidate checkout/archive, control and resolved
dependency/npm trees from fresh output, with exclusive publication.

Write an immutable `started` slot record before launching each child. Run it
in a separate process group; on interruption terminate/wait for that group,
then retain a terminal slot record (SIGINT and SIGTERM are handled; an
unrecoverable kill can only leave the already-persisted started record), exit status if available, error, partial-log
hash, and unavailable measurements as appropriate. A process with a failed
performance gate still has its complete measurements and exit code retained;
it is not rerun. Capture closure-check stdout/stderr in their own retained logs.
The summary validates the exact scheduled prefix, rejects duplicates and
reordered slots, and distinguishes not-run slots from launched slots with
unavailable measurements. Parser ambiguity is retained as a slot error.

Before parent approval, run only synthetic parser/summary, installed-dependency
fixture, path/environment and interrupted dummy-process tests. Do not execute
this runner against the actual benchmark or reserve timing independently.

## Q13b reuse

This uses the previously tested Q13c runner without changing workload, parsing,
slot order, gate policy or dependency verification. Only experiment paths,
external authority hashes and labels change. The candidate source freeze is
new, but the generator bytes match the completed Q13b corpus capture. These
performance inputs are fixed before any Q13b timing is executed.

## Q13b execution prerequisite

This is preparation only. The full candidate capture must finish and every
captured generator byte must match this performance freeze before timing starts.
Run no controlled corpus scan concurrently with timing. The active user goal
authorizes the registered comparisons; historical parent-approval wording above
describes the reused runner history and does not start any benchmark.
