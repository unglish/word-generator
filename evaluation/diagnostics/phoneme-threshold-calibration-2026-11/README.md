# Phoneme gate recalibration (2026-11): total variation replaces Pearson r

`calibration.json` and `holdout.json` are unedited `npm run calibrate:phonemes`
output, measured on main `30466c312dcba618333f9f5a6f470baf2135516e` (after #309
and #310). Each run is 200,000 words per seed, lexicon mode, morphology off. The
generator is unchanged; only the gate's measures and limits change.

```sh
npm run calibrate:phonemes -- --count 30 --output calibration.json
npm run calibrate:phonemes -- --seeds 3305470270,1663455158,21440046,2674392230,1032377118,3685329302,2043314190,401299078,3054251262,1412236150 --output holdout.json
```

The holdout seeds are the ones used by the [2026-09 record](../phoneme-threshold-calibration/README.md).

## What changed

- **New gate: `maxTotalVariationPct` = 1.78.** Total variation is
  ½ Σ |generated − CMU| over every phoneme, in percentage points: the share of
  phoneme mass that is in the wrong place. The limit is the worst of 30 seeds
  plus 3 SD, rounded up (TUNING.md's existing rule).
- **Shared Pearson r is report-only.** `minSharedPearsonR` (0.9983) is removed.
  The test and calibration script still print r.
- **Other limits are unchanged.** Every calibration and holdout seed passes them,
  so TUNING.md gives no reason to loosen any of them.

## Why Pearson r stopped being useful

| | 2026-09 (main `0abaff3`) | Now (30 seeds) | Now (holdout, 10) |
|---|---|---|---|
| Pearson r (min–max, mean) | 0.99852–0.99878, 0.99866 | 0.99820–0.99851, 0.99836 | 0.99823–0.99849, 0.99833 |
| Seeds below 0.9983 | 0 / 30 | 5 / 30 | 4 / 10 |

- **The floor now fails unchanged main.** The 0.9983 floor was set at
  0.99866 − 3 SD. Since then #309 (fewer schwa monosyllables) and #310 (legal
  grapheme selection) have moved mean r down by about 5 SD. Both changes were
  reviewed with their phoneme shifts documented, so the old floor now fails main
  on 9 of 40 seeds. Any change to RNG consumption re-draws the gate's sample, so
  whether a PR passed depended on the seed, not on the change itself (see #385).
- **r adds nothing the per-phoneme limits don't already cover.** `worst-case.ts`
  searched 300,000 random distributions; 193,680 passed every current per-phoneme
  limit, applied as the gate applies them (ratio and gap limits only for phonemes
  ≥ 0.5% of CMU; the other 6 phonemes just have to stay present). The lowest r
  among them was **0.9907**, so a usable backstop floor (≈ 0.99) could never fire
  on its own. A search shows these values can be reached; it does not prove they
  are the worst possible.
- **What the per-phoneme limits miss is diffuse drift.** The same search reached a
  total variation of **4.69%**, three times main's 1.57% mean, without breaking a
  single per-phoneme limit. That is what the new gate catches.

## Total variation on main

| Sample | Min | Max | Mean | SD |
|---|---:|---:|---:|---:|
| Calibration (30) | 1.4965 | 1.6531 | 1.5722 | 0.0415 |
| Holdout (10) | 1.5395 | 1.6455 | 1.5989 | 0.0340 |

- The coefficient of variation is 2.6%, so seed noise is small next to the
  quantity measured; r's noise and real changes sat in the same fourth decimal place.
- The limit is 3.1 SD above the worst calibration seed and 5.0 SD above the mean.
- Seed 42, the gate's sample, measures 1.609%.
- All 10 holdout seeds pass every limit.
- Across the 40 seeds, total variation and r correlate at −0.81: the two measure
  the same thing, but total variation has a usable scale.

## Remeasured per-phoneme limits (left unchanged)

| Limit | Current | 2026-09 worst seed | Now: worst seed (30) | Now: worst holdout | Proposed by calibration |
|---|---:|---:|---:|---:|---:|
| Max over-representation | 1.066 | 1.05607 | 1.06275 | 1.06073 | 1.074 |
| Min representation | 0.918 | 0.93549 | 0.92879 | 0.93248 | 0.914 |
| Max absolute gap (pp) | 0.39 | 0.34599 | 0.37294 | 0.36166 | 0.435 |

Over-representation has the least room. Its mean rose from 1.0493 to 1.0546,
and the phoneme that tops it changed from mostly /k/ (21 of 30 seeds) to /z/ or
/k/ (14 and 16). #310 documented that cause: written length affects which roots
are accepted. No seed fails, so it stays at 1.066. Revisit it if a reviewed
change pushes /z/ or /k/ further.

## Not done

- Rare phonemes (below 0.5% of CMU) still have no ratio limit. Total variation
  covers them only in aggregate.
- No comparison yet of CMU against another English source, which would show how
  much total variation is natural between real English lexicons.
