# Constructing a pinned English score reference

`scripts/generate-baseline.ts` creates a separately versioned lexical score
reference using the pinned historical ARPABET scorer and table. It requires all
five explicit arguments:

```sh
node --import tsx scripts/generate-baseline.ts \
  --source /absolute/path/to/pinned-cmudict.dict \
  --policy cmu-ascii-first-v1 \
  --projection cmu-arpabet-base-v1 \
  --scorer legacy-arpabet-add-one-log2-v1 \
  --out /absolute/path/to/new-english-score-reference.json
```

The output directory must already exist. Source paths and output paths are relative
to the caller's working directory; repository resources are relative to the
entrypoint. Help is available with `--help` alone. Missing, repeated, unsupported
or malformed options fail with nonzero status. A symlinked entrypoint executes the
same command. There is no implicit source, download, table selection or overwrite.

This replaces a broken manual workflow: its `.filter` call expected an array from
`scoreArpabetWords`, which returns `{words,total,perBigram}`. Its flat summary schema
also differed from the active gate's nested schema. Correcting construction does
not migrate the gate or reproduce the provenance of its old numbers.

## Source population and fixed model

The builder reuses the [shared CMU policy](cmu-corpus-contract.md) and the complete
verified joint reference. The pinned dictionary has SHA-256
`81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22`.
Its `cmu-ascii-first-v1` selection contains 117,485 spellings, each represented once
by its first valid unlabelled pronunciation in source order. Labelled alternatives,
unsupported spellings, unsupported pronunciations, vowelless records and duplicate
spellings follow the shared first-exclusion policy. Selected entry identities and
all parent reference values are reconstructed before scoring.

Parsed CMU phone bases go directly to the scorer. The named base projection merges
stress 0/1/2, including AH and ER variants, and records that loss. No IPA conversion,
phone deletion, dialect inference or additional population filter is applied.

The model remains `src/phonotactic/score.ts` (SHA-256
`c4d5ff5bd77a4a77e63a7ab3ef610f2bb31c1981e4c4666c803e210672ac551f`)
and `src/phonotactic/arpabet-bigrams.ts` (SHA-256
`741eee7a1d331432a50c136a4801251bc8c7e3a8a3567265011fd865f203b1a7`).
It uses add-one conditional probabilities, the historical 40-label vocabulary
including `#`, one start/end marker per word, and log base 2. The separately built
phone-transition artifact is never a scoring input.

The historical active score baseline declares 123,892 words; its source population
has not been reconstructed. The historical model has 132,603 events at each word
edge, which does not establish its source population or make it the score baseline's
population. Those bytes and their recorded generated gap remain unchanged.

## Rows, summary and availability

`cmu-legacy-score-reference-artifact-v1` contains source, parser, population,
projection, scorer, units, joint parent and implementation identities. Its
`scores.rows` preserve selected-entry order with ordinal, source line, spelling,
exact base ARPABET input, phone/transition counts and both scores. The native entry
digest remains available even though the scoring projection loses stress.

A word with n phones contributes n+1 transitions. `total` sums conditional log2
probabilities; `perTransition` divides that word's total by n+1. Summary means weight
each selected entry equally, rather than pooling all transitions across words.
Length normalization does not establish complete independence from word length.

The builder copies the legacy batch aggregate values exactly: values are sorted
before sequential binary64 addition, and an even-sized sample uses the upper middle
value as its median. `summary.total` and `summary.perTransition` add a separately
labelled maximum; `max` is not a field supplied by the legacy `ScoreStats` API.
Numbers retain full binary64 JSON precision.

Every selected entry must yield exactly one finite row. Missing, extra, mismatched
or nonfinite scorer output fails before publication; no invalid row is filtered
out. Empty selection also fails. Accounting declares selected/scored counts and
zero dropped/invalid rows. Source-policy exclusions remain separate. There is no
`generatedBaseline`, generated gap, seed, threshold or fabricated zero result.

## Provenance and validation boundary

`validateScoreEnvelope` requires a trusted, externally reconstructed parent, full
ordered score result and source snapshots. It compares the complete expected
artifact, not only totals, a digest or self-reported embedded source code. A
redigested swap of two rows' scores can preserve every summary and still fails.
Callers must establish the trust of expected inputs; passing the candidate's own
rows as expected rows does not authenticate it.

The builder checks pinned raw bytes, the complete published joint parent and the
historical scorer/table identities, then rechecks every input and source file
before exclusive creation. Output guards protect source/runtime/demo directories,
all existing experiment packages, source aliases, existing files, hardlinks and
dangling symlinks. The reused output guard's full transitive source closure is
included; that I/O dependency does not adopt its transition data. Artifact snapshots
are detached from input objects.

`evaluation/corpus/verify-score-reference.py` independently uses the frozen Python
source parser/joint proof, a restricted nonexecuting parser of the historical table,
and separate per-entry `math.log2` traversal. Every table bin, row total, vocabulary
label, selected entry, denominator, row score and summary is checked. Identity,
metadata and order comparisons are exact. The preregistered numeric allowance is
`abs(actual-reference) <= 1e-10 + 1e-12*abs(reference)`; observed errors and the worst absolute/relative coordinates with actual/reference
values are reported, not rounded away. The first coordinate wins an exact tie.
A relative error at a zero reference is undefined; that witness records null. The TypeScript expected-artifact comparison is exact.

The protocol, original builder/API failure and parent-file snapshot are in
`evaluation/experiments/cmu-score-reference/`. Synthetic envelope fixtures use
explicitly artificial parent-sized rows; they are not dictionary score results.
Two fresh full-corpus builds and the independent row verification passed; see
[the formal evidence](../evaluation/experiments/cmu-score-reference/README.md).

The result is a descriptive dictionary reference. Corpus/model overlap is unresolved;
this is not held-out validation or evidence of human naturalness. Any change to the
active scorer/table, reference consumer or gate requires its own frozen same-output
sensitivity study and explicit adoption. Prior references and scores stay available.
