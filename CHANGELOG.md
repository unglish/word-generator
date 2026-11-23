# Changelog

## Unreleased

### Fixed

- English writes final `s` spelling /z/ as `zz` before a vowel suffix when
  the root ends in the stressed short-vowel pattern, as in `glazzed` and
  `lozzing` (#529). This changes seeded spellings.
- English vowel suffixes double final `s` only for /s/, keep final `h` single,
  and write `ck` where final hard `c` needs it, as in *picnicked* (#518).
  This changes seeded spellings.
- English generation blocks incompatible consonant joins inside roots, such as
  /k.v/ and /p.dʒ/, while retaining joins found in words such as *envy* and
  *silver* (#485). This changes seeded output in lexicon and text mode.
- English roots no longer put an onset ending in /r/ before /ɚ/ or before a
  coda /r/ (*drur* /drɚ/, *brerts* /brɛrts/), which appeared in about 3% of
  lexicon words against about 0.2% in CMU (#497). This changes seeded output in
  lexicon and text mode.

### Breaking Changes

- Removed `Grapheme.origin` and the `ORIGINS` export. The codes were unsourced,
  nothing in the generator read them, and a spelling's origin does not
  determine a word's etymology. Generated output is unchanged.

### Added

- `codaConstraints.bannedOnsetRimeCombinations`: nuclei and coda sounds banned
  after an onset ending in one of `onsetFinal` within a lexical-root syllable.
  Generation and nucleus repairs skip them; affix syllables are exempt (#497).
- `GraphemeTrace.respelled` (type `GraphemeRespelling`): set on a grapheme
  selection when a spelling-budget certificate replaced its whole unit, with the
  replacement form and certificate index. Previously only
  `trace.baseSpelling.certificates` showed the rewrite (#454). Generated output
  is unchanged.
- `VowelReductionRule.codaModifiers`: probability multipliers keyed on the first
  coda consonant, matched with the shared phoneme selector fields (`sounds`,
  `manner`, `place`, `voiced`). English blocks /ɪ/ → /ə/ before /ŋ k g ʃ tʃ dʒ
  v/, so `-ing` stays /ɪŋ/ (#475). Pronunciations change; spelling and random
  draws do not.
- `writtenFormConstraints.hardLetters` (type `HardLetterRespelling`): respell a
  hard consonant letter that its written neighbours would read soft. English
  respells `c` for /k/ before e, i or y, including a suffix's first letter, as
  `ck` after a short single vowel letter and `k` elsewhere (#460). A silent e
  that the suffix drops before a/o/u is not counted (`edical`), and a /k/ that
  `-ity` makes /s/ keeps its `c` (`chacity`). The respell is recorded in
  `repairs`, `baseSpelling.edits` and on the selection as
  `GraphemeTrace.letterRespelled`. Generated output changes.
- `HardLetterRespelling.rootFinal` and `onlyAfterShortVowel`: English also
  respells a root-final /k/ `c` (or `cs`) outside -ic/-ac as `k` after a
  consonant, vowel digraph or long vowel and `ck` after another short vowel,
  and a `ck` that does not follow a short single vowel letter as `k` (#469).
  -ic and -ac stay, including after a vowel of another syllable (*maniac*),
  and so does a bare root-final `c` before a suffix starting with t, a, o or u
  (*action*, *medical*); a root-final `cs` is still respelled there
  (`nadocksal`). `ks-to-x` now
  applies only after a vowel letter, a vowel + `c`, or `n`. Generated output
  changes.

## 0.6.0 - 2026-03-03

### Breaking Changes

- Removed `generationWeights.probability.boundaryDrop`.
- Added `generationWeights.boundaryPolicy.equalSonorityDrop`.
- Added `generationWeights.boundaryPolicy.risingCodaDrop`.
- Consolidated junction validation under `validateJunction` in
  `src/core/junction.ts` and removed legacy write-level junction helper API
  exports.

### Added

- New shared junction module (`src/core/junction.ts`) with SSP violation
  classification and full-coda Rule-1 rising scan.
- New structural trace event `risingCodaBoundaryDrop`.
- Enriched `sspBoundaryDrop` trace payload with `violation` and `preDropCoda`.
- `trace-audit` SSP reporting by violation and per-boundary rates.

