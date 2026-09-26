# Q15c1 explicit phoneme-reference builder

Preregistered 2026-09-26, before implementation and before any successful run.
Dependency: Q15b commit `7ce4bd370bf3f260d477887e7ed7f1095c0b788a`.
This is an offline reference-construction change, not a generator improvement.

The retained `build:cmu-phonemes` command and direct Node launcher will require
`--source`, `--policy cmu-ascii-first-v1`, `--units integer-phone-occurrences`,
and `--out`. No source or demo fallback, implicit output, force option, or old
baseline replacement is permitted. Publication creates a fresh file exclusively.

Acceptance is fixed before running the candidate:

1. The pinned UTF-8 source (SHA-256
   `81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22`)
   must reconstruct all Q15b reference bins, including all native/base phone
   bins: 117,485 lexical entries, 742,333 phone events, entry digest
   `d6a702f18c1bc17f7d7b41206d37498ecab0a7712c862f0398c9a8fde7a13d29`.
   The complete parent reference digest is
   `3a0e0c9c3eb0ba4990f6607e22946dd2971474d405c10b1246779ee13be534f6`.
2. Emit native stress tokens, the explicitly stress-merged base projection,
   and the named legacy-label comparison projection, with integer event units,
   population/selection policy, mapping/losses, license, and parent identities.
   Native AH0/AH1/AH2 and ER0/ER1/ER2 remain separate. Comparison labels make no
   dialect or phonemic-equivalence claim.
3. Absent/wrong/truncated/invalid UTF-8 input, unsupported or ambiguous CLI
   arguments, damaged parent evidence, stale implementation, or changed mapping
   or license must fail before output creation. A readable demo cannot substitute
   for missing source. Existing/dangling symlinks and existing destinations must
   remain untouched; protected legacy/Q15b destinations remain forbidden even
   if absent. Output parents must already exist.
4. Exact schema validation must reject altered bins even when totals and envelope
   digests are recomputed, percentages masquerading as counts, lost stress,
   wrong identities/units/projections, and extra/missing fields. Authentication
   requires an externally expected implementation, separately from a file's
   internal digest consistency. Source identity includes launcher, CLI, builder,
   frozen dependencies, and the package lockfile.
5. Direct Node and npm alias builds at fresh paths must be byte-identical, also
   from another working directory and with spaces in user paths. Help must not
   require raw data. Success names the new artifact; it does not claim adoption.
6. All frozen Q15b sources/evidence, old baseline/normalization/demo bytes,
   consumers, package scripts, runtime, weights, and gate thresholds must remain
   unchanged. No generator capture or weight tuning belongs to this change.

Tests will exercise pure validation with committed parent evidence; the full
pinned raw-source success run will be performed explicitly and recorded instead
of hiding it behind an optional skipped ordinary test. Independent Q15b Python
reconstruction already establishes every parent bin. Final artifact checks will
also compare its phone tables directly with those independently verified tables.
