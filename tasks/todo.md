- [x] Add top-down phoneme-length config fields and validation
- [x] Add CMU-derived phoneme-length and phoneme→syllable weights
- [x] Refactor generation to single top-down path
- [x] Add tests for required top-down config + behavior
- [x] Verify distribution (200k lexicon) against CMU targets
- [x] Run test suites (`npm test`, quality, n-gram)

## Review

- Implemented a single top-down pipeline (no resolver/fallback path).
- Added required `phonemeLengthWeights` + mode-specific `phonemeToSyllableWeights` config and validation.
- English config now includes:
  - CMU-derived lexicon phoneme-length targets and phoneme→syllable mapping
  - text-mode top-down targets/mapping derived from prior text-mode behavior
- 200k lexicon distribution check (generated vs CMU) now aligns tightly:
  - 4: 12.66 vs 12.55 (+0.11)
  - 5: 19.50 vs 19.56 (-0.06)
  - 6: 20.36 vs 20.39 (-0.03)
  - 7: 15.54 vs 15.58 (-0.04)
  - 8: 11.28 vs 11.17 (+0.10)
- Validation/testing completed:
  - `npm test` ✅
  - `npm run test:quality` ✅
