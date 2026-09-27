# Q13b exact-control legacy compatibility

The local scheduled-writer implementation with `sharedSpellings: undefined`
matches exact #338 (`b2373ca83cdbf5e8ad127b604e83397a8afe0d45`) over 20,768
coordinates and 83,072 public generation calls. This proves compatibility of the
explicit legacy path at the archived source hashes, not active-policy quality.

The registered four profiles times five development streams each execute 1,000
sequential coordinates (20,000). Three custom configurations add 768 coordinates:
alternating spelling-rule probabilities zero/100, reversed spelling-rule order,
and disabled doubling. Each custom configuration uses seeds 7, 1214, 6123 and
8675309 with 64 sequential coordinates each, lexicon mode and morphology off.

Every coordinate compares control/candidate, traced/untraced complete public
words. Traced control/candidate snapshots also match in full. RNG call counts
match throughout and all 128 next-value probes match. The 32 stream/configuration
results retain separate traced/untraced SHA-256 population digests. Snapshots are
taken immediately, so this is not evidence about cross-call object aliases or
batch API behavior.

Control materialization checks 94 files against exact Git blobs from #338.
The authority pins both complete src trees, package manifests/locks, tsconfig,
runner, protocol, registration and actual Node executable/version/hash; the
runner rechecks these sources after its run. The installed dependencies are
shared locally through a node_modules symlink. This is not a hermetic runtime or
complete installed-dependency closure; that remains part of the formal corpus
freeze. Engine was Node v24.11.1. No sealed stream was sampled.

Reproduction: materialize `src`, `package.json`, `package-lock.json`, and
`tsconfig.json` from the exact Git revision into a fresh control directory;
verify each byte against `git show REV:path`, and provide the recorded installed
dependencies. The archived runner retains its executed absolute paths and uses
exclusive output creation. It was run from the candidate checkout with
`node --import tsx /private/tmp/q13b-legacy-parity-v1.mjs`. Preserve old evidence
before choosing new output paths; any runner/path change needs a new authority.
The original materialization manifest preserves every file hash.

This comparison must be tied to the final experiment source when preparing the
measured PR. No shared-policy corpus, independent linguistic recount, paired
performance result or human preference claim is established here.
