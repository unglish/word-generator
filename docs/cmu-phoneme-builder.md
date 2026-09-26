# Building an explicit CMU phoneme reference

The manual builder creates a new versioned reference from the pinned dictionary.
It does not replace the historical analyzer, test, or demo baseline.

```sh
npm run build:cmu-phonemes -- \
  --source /absolute/path/to/cmudict.dict \
  --policy cmu-ascii-first-v1 \
  --units integer-phone-occurrences \
  --out /absolute/path/to/cmu-phoneme-reference-v1.json
```

Direct invocation with `node scripts/build-cmu-phoneme-baseline.mjs` accepts the
same arguments. It uses the existing development `tsx` dependency; run `npm ci`
first. Repository resources resolve relative to the launcher, while relative
input/output paths resolve against your working directory. Paths containing
spaces remain single arguments when quoted. `--help` needs no dictionary.

All four arguments are required. There is no download, default input/output,
demo fallback, normalization fallback, overwrite flag, or legacy-map export.
The output parent directory must already exist. Existing files and symlinks
are refused by exclusive creation. The historical `data/cmu` directory, demo
targets, implementation files, and frozen Q15b package are protected destinations,
including directory aliases and missing files within those destinations.

The source must be the CMU revision
`74790861f652b15e4ac49015a90074ad62a27690`, SHA-256
`81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22`.
The tool checks exact UTF-8 bytes, recomputes the shared Q15b reference, and
compares every table with its independently verified published parent. Selection
uses `cmu-ascii-first-v1`: one first supported pronunciation per ASCII spelling,
excluding alternatives, unsupported pronunciations, and vowelless entries. See
[the shared corpus contract](cmu-corpus-contract.md) for the exact policy.

The new `cmu-phoneme-reference-artifact-v1` envelope names 117,485 selected lexical
entries and 742,333 phone occurrences. Entries and phone events are different
denominators. Its `phones` member contains three explicit views:

| View | Counts and interpretation |
| --- | --- |
| `native` | Original validated CMU tokens, including separate AH0/AH1/AH2 and ER0/ER1/ER2. |
| `base` | ARPABET tokens after the declared merge of vowel stress. |
| `comparison` | The parent's named legacy-IPA mapping, with mapping, loss statement, and mapped/unmapped histograms. These labels do not establish dialect or phonemic equivalence. |

Every count is an integer corpus occurrence. The artifact retains source and
parser identities, full population policy and entry digest, parent artifact
identities, normalization contents, and CMU license. It embeds implementation
source snapshots, including the direct launcher, typed CLI, builder, frozen
dependencies, and lockfile. The lockfile identifies the dependency declaration;
it does not by itself attest the local installed runtime. No absolute input/output
paths or timestamps enter the artifact, so unchanged inputs and implementation
produce identical bytes at fresh output paths.

`validatePhonemeEnvelope(value, parent, expectedSources)` requires externally
trusted reviewed source snapshots. It checks exact schema, all bins, and the
published parent identity. A re-digested embedded source tree alone is not proof
of authenticity; do not pass untrusted embedded sources back as the expected
implementation. `readPhonemeInputs(checkout)` obtains expected snapshots from a
trusted checkout and verifies the pinned parent bytes. Source, raw input, and
parent bytes are checked again before the writer exclusively creates its output.

This schema is intentionally incompatible with the historical bare percentage
map. Existing analyzers, quality gates, demo synchronization, and their input
files retain their prior behavior. Consumer migration needs its own review and
baseline comparison. Reference construction is not evidence of better generated
words, and no runtime weights or thresholds change here.

The previous no-argument builder could overwrite the same baseline path either
with counts or with demo percentages. Its uppercase-only label filter selected
zero entries from the pinned lowercase source. The new command deliberately
removes that implicit rewriting behavior; it never treats a missing dictionary
as authorization to publish another population or unit.
