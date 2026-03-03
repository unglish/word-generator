# Changelog

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

