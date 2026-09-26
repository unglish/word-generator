# Building an explicit CMU length reference

The manual TypeScript builder creates exact length histograms in a fresh,
versioned artifact. Existing analyzers keep their historical input file.

```sh
node --import tsx scripts/build-cmu-baseline.ts \
  --source /absolute/path/to/cmudict.dict \
  --policy cmu-ascii-first-v1 \
  --units integer-selected-entry-counts \
  --out /absolute/path/to/cmu-length-reference-v1.json
```

Run `npm ci` first to install the existing development `tsx` dependency.
The local `node_modules/.bin/tsx scripts/build-cmu-baseline.ts` entrypoint accepts
the same arguments. From another working directory, use absolute paths to that
runner and script. Repository resources resolve relative to the script; relative
source/output paths resolve against your working directory. Quote paths containing
spaces. `--help` alone needs no dictionary.

All four arguments are required. The source must match CMU revision
`74790861f652b15e4ac49015a90074ad62a27690`, SHA-256
`81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22`.
The command validates exact UTF-8 bytes and reconstructs the complete shared
Q15b reference before extracting its length tables. Its named selection policy
uses one supported unlabelled pronunciation per ASCII spelling, excludes
vowelless entries, and preserves source-order selection. See the
[corpus contract](cmu-corpus-contract.md) for exact exclusions and ordering.

The `cmu-length-reference-artifact-v1` envelope contains the existing
`JointLengths` structure with explicit axes:

| Table or axis | Interpretation |
| --- | --- |
| `lengths.written` | One count per selected entry, grouped by ASCII letter count. |
| `lengths.phones` | One count per selected entry, grouped by validated CMU token count. Stress digits are part of vowel tokens, not additional segments. |
| `lengths.syllables` | One count per selected entry, grouped by explicitly stress-marked vowel-token count. This is the dictionary syllable-count proxy. |
| `lengths.bySyllables` | Written and phone length histograms within each syllable-count stratum, each with its own entry denominator. |

All three marginals contain 117,485 selected entries. Every occupied category is
retained, including 28-letter, 28-phone and 12-syllable tails. The conditional
tables do not encode written/phone length correlation within a syllable stratum;
they are not a complete three-dimensional joint distribution. There are no
rounded means, percentile conventions, probabilities, or derived runtime targets
in this format.

The artifact retains source/parser identities, the full population definition,
entry digest, published parent identities, and CMU license. It embeds the
retained TS entrypoint, new builder, six frozen Q15b dependency files, and lockfile.
The lockfile identifies dependency declarations; it does not attest installed
binaries. Absolute local paths and timestamps are excluded so unchanged source
and implementation produce identical bytes at different fresh destinations.

`validateLengthEnvelope(value, parent, expectedSources)` requires externally
trusted reviewed source snapshots and compares the complete schema and all bins.
An internally consistent digest does not establish authenticity: never use the
artifact's own untrusted sources as the expected implementation.
`readLengthInputs(trustedCheckout)` obtains those snapshots and verifies the
pinned parent bytes. The writer rechecks its implementation, raw input and parent
immediately before publication.

The output parent directory must already exist. Exclusive creation refuses
existing files and symlinks. Protected destinations include runtime source,
historical data/demo paths, implementation files and frozen Q15a/b/c1 evidence,
including directory aliases and missing files within those destinations.
There is no download, implicit input/output, overwrite flag or legacy-shape export.

The previous command already failed on missing source, but accepted an unpinned
readable file and overwrote `data/cmu/cmu-length-baseline.json`. It counted
pronunciation lines, including labelled variants and punctuation-bearing labels,
and used digit counts as a syllable proxy. Its 135,158-line population differs
from this named 117,485-entry population. Q15b reconstructs its committed values;
no digit/vowel-token discrepancy was observed in the pinned source, and that
reconstruction does not establish the historical build provenance.

The new schema is not a replacement input for `analyze-letter-length.ts`,
`analyze-syllable-distribution.ts`, or `length-semantics-check.ts`. Their old input
bytes and behavior remain intact. Consumer adoption needs a separate policy and
comparison review. This change proves reference construction and publication;
it does not demonstrate better generated words or change weights or gates.
