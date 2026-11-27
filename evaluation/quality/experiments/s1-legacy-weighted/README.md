# Extracting the legacy-weighted segment engine

The baseline is `822a9e94caf4ff86560c7e24109364c0fa71ab21`. The extraction is `c5003eb5261217aa86a7633892f43274c0ac85ad`. The audit uses the extraction's evaluator for both generators. It accounts for the recorded medial-onset doubling between root selection and final spelling. The word `raglittat` on the baseline has a scored root of eight letters and a doubled final spelling of nine.

The published extraction is `037a298d5a73e774a12de1f1a6714da55e8cb191`. The sole tree difference from the measured revision is an end-of-file blank line in `segment-boundaries.ts`. `verify-emission.mjs` checks the exact difference and identical emitted JavaScript. This archive's parent retains the measured revision.

| Check | Evidence |
| --- | --- |
| Existing golden | All 160 spellings, hyphenations and pronunciations, and all saved stage totals reproduce the existing fixture byte for byte. |
| Rejection audit | `base-rejections.json.gz` and `a-rejections.json.gz` contain the same output and selected-index digests, caller draw counts and next RNG values on every stream. There are 1,000 words for each of five development seeds in each of four profiles. |
| Full word and trace comparison | `parity.log` records 2,304 words from 1,600 public calls. The probe compares the full return value and every per-attempt draw count. It exercises both modes, morphology and tracing on and off, requested root counts 0–7, bulk generation, custom inventories and policies, and an empty nucleus inventory that must throw the original error. |
| Performance | `a-perf.log` records ten alternating base/head pairs. The median elapsed-time ratio was 0.991 against a 1.05 limit. Individual pairs ranged from 0.554 to 1.180 on a shared host. |

## Reproduction

Use clean checkouts of the two revisions with the locked dependencies available to both. Set `BASE_CHECKOUT`, `EXTRACTION_CHECKOUT`, `PACKET_DIR` and `RESULTS_DIR` to absolute paths. Run the following from the extraction checkout on Node 24.

```sh
npm run check
npm run test:diagnostics
node "$PACKET_DIR/verify-emission.mjs" c5003eb5261217aa86a7633892f43274c0ac85ad 037a298d5a73e774a12de1f1a6714da55e8cb191
node --import tsx "$PACKET_DIR/parity.mts" "$BASE_CHECKOUT" "$EXTRACTION_CHECKOUT"
npm run audit:rejections -- --generator-root "$BASE_CHECKOUT" --out "$RESULTS_DIR/base-rejections.json"
npm run audit:rejections -- --generator-root "$EXTRACTION_CHECKOUT" --out "$RESULTS_DIR/a-rejections.json" --compare "$RESULTS_DIR/base-rejections.json"
npm run perf:compare -- --base "$BASE_CHECKOUT" --head "$EXTRACTION_CHECKOUT"
```
