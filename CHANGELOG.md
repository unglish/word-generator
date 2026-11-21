# Changelog

## Unreleased

### Breaking Changes

- Removed `Grapheme.origin` and the `ORIGINS` export. The codes were unsourced,
  nothing in the generator read them, and a spelling's origin does not
  determine a word's etymology. Generated output is unchanged.

### Added

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

