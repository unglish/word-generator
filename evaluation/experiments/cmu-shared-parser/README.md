# Shared CMU parser: preserved population and scores

This evaluation-only followup depends on PR #304 at
`820f80dd72edac7d69ffc7c4e03212f2e2399a2f`. One reusable lossless record parser and
an explicit compatibility selector replace the parser previously embedded in
`buildReference`. Generator source, generation weights, old reference artifacts,
scoring semantics and acceptance thresholds are unchanged.

The pinned CMU source has 135,166 entry records. The compatibility policy retains
117,485 first valid unlabelled ASCII spellings and excludes 9,114 numbered
alternatives, 8,559 unsupported spellings and eight vowel-less entries. An
independent Python counter agrees with every accepted entry (including its source
line, label and original stressed tokens), all exclusions and their line-level
witnesses. The selected-entry SHA-256 is
`d6a702f18c1bc17f7d7b41206d37498ecab0a7712c862f0398c9a8fde7a13d29`.

Every rebuilt model field is identical to #304, including the initial-onset
inventory, all constituent/context counts and all character counts. Every score
component, diagnostic, sample identity and study field agrees across both frozen
200-row rubric snapshots. These are 400 score rows for the same 200 spellings,
not 400 independent words or human judgments. No generator call is used for
this comparison.

The linguistic model remains `wordlikeness-v1`, with unchanged model digest
`98d71552d9419d465977520c1101480a1f1ebfa968fb7e3b89eefea30e031878`.
The implementation digest changes from
`e143e94ef9463771a806c69e4201e5bcfda7932dac1747907cc021a2f4950904` to
`efc86ae1614d1a92df831aa1b96b16afba26be80e6b3c12cc4456cfd18643730`.
The extracted parser is included in the new digest. Historical files remain
unchanged; current code rejects their old implementation fingerprint. The new
files below carry the new provenance instead of relabelling historical output.

## Evidence

- `source-audit.json.gz`: source/policy/parser/license identities, complete source
  accounting and every exclusion. It embeds exact parser/audit/model source.
- `reference-parser-v1.json.gz`: semantically identical model with new provenance.
- `frozen-scores-parser-v1.json.gz`: all 400 semantically identical score rows.
- `verification.json`: independent population recount, complete model/score
  comparison, file hashes and verifier fingerprint. Score checksum validation
  uses the scorer's JavaScript numeric canonicalizer; counting and comparisons
  use independent Python logic.
- `sources.json.gz`: complete implementation, test and verification sources with
  individual hashes. `artifacts.json` hashes this compact package.

Validation: all 52 review tests pass, including 24 new source/provenance fixtures;
strict review TypeScript and touched-file ESLint pass. The independent verifier
passes the real pinned inputs and rejects seven deliberate source/artifact
corruptions. No generator performance claim or new corpus-quality score is made.

## Reproduce

Follow [the current build commands](../../../docs/wordlikeness-evaluation.md#reproduce-construction-and-frozen-scoring)
to retrieve the exact pinned source, audit it, rebuild a fresh model and rescore
the existing snapshots. Fresh outputs refuse overwrites. To examine this compact
package, decompress its JSON files to fresh temporary paths; CLI model/score
inputs are plain JSON. Run `evaluation/corpus/verify-parser.py` with explicit
`--source`, `--audit`, `--reference`, `--scores` and `--out` paths.
`verify-parser-test.py` accepts the same four input flags and exercises rejection
paths in temporary copies. Historical artifact bytes reproduce at the dependency
commit, not under a falsely preserved implementation hash.

The dictionary is not bundled here; its pinned URL/checksum and existing CMU
license are retained in #304 and the audit. This establishes the compatibility
foundation for Q15b's matched-population statistics. It does not adopt a new
population for legacy consumers, recover unknown historical denominators, infer
stem/familiarity labels or establish improved generated output.
