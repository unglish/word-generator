# Building an explicit CMU phone-transition reference

The manual builder creates a new versioned reference of adjacent phones. It does
not replace the historical scorer table, score baseline, generator targets or gates.

```sh
node --import tsx scripts/generate-bigram-table.ts \
  --source /absolute/path/to/cmudict.dict \
  --policy cmu-ascii-first-v1 \
  --units integer-phone-transition-occurrences \
  --out /absolute/path/to/new-transition-reference.json
```

Run `npm ci` first. The existing development `tsx` dependency supports this
entrypoint and `node_modules/.bin/tsx scripts/generate-bigram-table.ts`.
Repository resources resolve against the script location; relative source/output
paths resolve against the working directory. Quote paths with spaces. `--help`
alone works without a dictionary. All four construction arguments are required;
unknown, repeated and incomplete arguments fail.

The source must match revision `74790861f652b15e4ac49015a90074ad62a27690`,
SHA-256 `81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22`.
Selection reuses [the shared parser contract](cmu-corpus-contract.md): 117,485
supported first unlabelled ASCII spellings. The complete source-derived joint
reference must match [the published parent](cmu-matched-reference.md), including
its selected-entry identity, all tables and license.

`cmu-phone-transition-reference-artifact-v1` records integer adjacent-transition
occurrences in two explicit views:

| View | Interpretation |
| --- | --- |
| `transitions.native` | Original validated source phones, preserving vowel stress 0, 1 and 2. |
| `transitions.base` | Endpoint projection to ARPABET bases, explicitly merging vowel stress. |

Each table has `counts[first][second]`, `rowTotals`, `total` and the sorted observed
`vocabulary`. `#` is a boundary symbol, never a phone. An entry with *n* phones
contributes *n + 1* transitions: one start event, *n − 1* internal events and one
end event. There are no cross-entry transitions or `#` to `#` pairs. Both views
have 859,818 total events, including 117,485 start and 117,485 end events, from
742,333 source phones. Longer entries contribute more events. These are neither
pronunciation frequencies nor probabilities; no smoothing is applied.

The source population includes names, inflections and loans. Its pairs do not
establish phonotactic legality, phonemic identity, dialect equivalence or
wordlikeness. The builder makes no IPA conversion, syllabification or quantity
inference. The stressless view is a declared projection, not an assertion that
stress distinctions are linguistically irrelevant.

`countPhoneTransitions` consumes typed shared-parser selected entries.
`reconstructTransitions` verifies pinned raw UTF-8 bytes and the complete parent
before returning trusted tables. `validateTransitionEnvelope(value, expected)`
requires the caller's externally trusted reconstructed tables, parent and reviewed
implementation snapshots. It compares every field and bin. Never derive
`expected.transitions` or `expected.sources` from the untrusted candidate itself.
Checks of row/column totals are additional invariants: they cannot detect every
adjacency forgery on their own.

Artifact metadata includes parent/raw/parser/selection/projection/units identities,
license and implementation source snapshots. The lockfile records dependency
declarations, not an attestation of installed binaries. Local paths and timestamps
are omitted from the artifact. Unchanged source and implementation produce the
same bytes at fresh destinations.

There is no download, implicit local source, fallback, overwrite flag, or export
into the runtime TypeScript table. The output parent directory must exist. The
writer protects runtime, script, corpus, review, demo and experiment directories
(including all prior Q15 packages), implementation files and the source input,
including resolved directory aliases. Existing files, hardlinks and symlinks are
refused. Inputs and implementation are checked again before exclusive creation.

The historical active table remains separate: it contains 976,831 transitions and
132,603 start events plus 132,603 end events. Those counts do not establish its
historical source population. The old manual script's uppercase-only filter
accepted no entries from this pinned lowercase source, and its download/output
contract could overwrite the active scorer inputs. This command deliberately
replaces that manual workflow. Scorer/reference adoption needs a separate
same-output study. `generate-baseline.ts` remains an unmigrated legacy workflow.

The frozen pre-implementation plan/protocol is in
`evaluation/experiments/cmu-transition-builder/`. The [completed construction results](../evaluation/experiments/cmu-transition-builder/README.md)
record two byte-identical builds and an independent full-bin recount after source
review. The independent Python checker reuses the frozen Python source parser and joint-parent verifier,
then traverses phone pairs separately; it never executes the TypeScript counter.
Its CLI takes `--root`, `--source`, `--artifact`, and a fresh `--out` report path.
Use canonical regular-file input paths for that checker; symlinks are rejected.
