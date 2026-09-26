# Quality comparison: english-partial-quantity

Original baseline: baseline-development-v1. Cohort: development. Previous step: shared-weight-control.

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 43501.000 | 43602.000 | +101.000 | 43501.000 | +101.000 |
| Mean letters | 7.462 | 7.454 | -0.008 | 7.462 | -0.008 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.007407 | 0.007335 | -0.000072 | 0.007407 | -0.000072 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.158592 | 0.157834 | -0.000758 | 0.158592 | -0.000758 |
| trigrams / missingReferenceMass | 0.034830 | 0.034856 | 0.000027 | 0.034830 | 0.000027 |
| trigrams / unseenGeneratedMass | 0.010997 | 0.010664 | -0.000333 | 0.010997 | -0.000333 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 9342/45470 (20.545%) | 9480/45575 (20.801%) | +0.255 | 105 | -0.900 to +0.845 | 9342/45470 (20.545%) | +0.255 | 105 | -0.900 to +0.845 |
| Polysyllables with multiple primary stresses / lower | 0/45470 (0.000%) | 0/45575 (0.000%) | 0.000 | 105 | 0.000 to 0.000 | 0/45470 (0.000%) | 0.000 | 105 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 1008/50000 (2.016%) | 973/50000 (1.946%) | -0.070 | 0 | -0.190 to +0.100 | 1008/50000 (2.016%) | -0.070 | 0 | -0.190 to +0.100 |
| Words with a primary-stressed reduced vowel / lower | 139/50000 (0.278%) | 143/50000 (0.286%) | +0.008 | 0 | -0.070 to +0.100 | 139/50000 (0.278%) | +0.008 | 0 | -0.070 to +0.100 |
| Affixed words with a morphological hiatus fallback / lower | 3862/34952 (11.049%) | 3765/35079 (10.733%) | -0.317 | 127 | -0.955 to +0.268 | 3862/34952 (11.049%) | -0.317 | 127 | -0.955 to +0.268 |
| Words with a zero-total-weight grapheme choice / lower | 1956/50000 (3.912%) | 1862/50000 (3.724%) | -0.188 | 0 | -0.520 to -0.060 | 1956/50000 (3.912%) | -0.188 | 0 | -0.520 to -0.060 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 34952/50000 (69.904%) | 35079/50000 (70.158%) | +0.254 | 0 | -0.230 to +0.920 | 34952/50000 (69.904%) | +0.254 | 0 | -0.230 to +0.920 |
| Words with adjacent identical coda segments / lower | 180/50000 (0.360%) | 173/50000 (0.346%) | -0.014 | 0 | -0.070 to +0.050 | 180/50000 (0.360%) | -0.014 | 0 | -0.070 to +0.050 |
| Disyllables with adjacent primary and secondary stress / lower | 4467/21065 (21.206%) | 4453/21086 (21.118%) | -0.088 | 21 | -0.727 to +0.609 | 4467/21065 (21.206%) | -0.088 | 21 | -0.727 to +0.609 |
| Monosyllables with schwa as their sole nucleus / lower | 899/4530 (19.845%) | 923/4425 (20.859%) | +1.013 | -105 | +0.437 to +1.506 | 899/4530 (19.845%) | +1.013 | -105 | +0.437 to +1.506 |
| Words ending in an open checked vowel / lower | 746/50000 (1.492%) | 758/50000 (1.516%) | +0.024 | 0 | -0.110 to +0.130 | 746/50000 (1.492%) | +0.024 | 0 | -0.110 to +0.130 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/4530 (0.000%) | 0/4425 (0.000%) | 0.000 | -105 | 0.000 to 0.000 | 0/4530 (0.000%) | 0.000 | -105 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 2013 | 2012 | -1 | 2013 | -1 |
| bare/syllables:2 | 6997 | 6843 | -154 | 6997 | -154 |
| bare/syllables:3 | 4100 | 4088 | -12 | 4100 | -12 |
| bare/syllables:4 | 1444 | 1485 | 41 | 1444 | 41 |
| bare/syllables:5 | 387 | 388 | 1 | 387 | 1 |
| bare/syllables:6 | 92 | 89 | -3 | 92 | -3 |
| bare/syllables:7 | 14 | 15 | 1 | 14 | 1 |
| bare/syllables:8 | 1 | 1 | 0 | 1 | 0 |
| both/syllables:2 | 1044 | 1076 | 32 | 1044 | 32 |
| both/syllables:3 | 1800 | 1864 | 64 | 1800 | 64 |
| both/syllables:4 | 929 | 924 | -5 | 929 | -5 |
| both/syllables:5 | 182 | 168 | -14 | 182 | -14 |
| both/syllables:6 | 20 | 31 | 11 | 20 | 11 |
| both/syllables:7 | 6 | 7 | 1 | 6 | 1 |
| both/syllables:8 | 0 | 1 | 1 | 0 | 1 |
| prefixed/syllables:2 | 3302 | 3278 | -24 | 3302 | -24 |
| prefixed/syllables:3 | 2560 | 2654 | 94 | 2560 | 94 |
| prefixed/syllables:4 | 895 | 873 | -22 | 895 | -22 |
| prefixed/syllables:5 | 229 | 201 | -28 | 229 | -28 |
| prefixed/syllables:6 | 50 | 47 | -3 | 50 | -3 |
| prefixed/syllables:7 | 5 | 5 | 0 | 5 | 0 |
| prefixed/syllables:8 | 1 | 0 | -1 | 1 | -1 |
| suffixed/syllables:1 | 2517 | 2413 | -104 | 2517 | -104 |
| suffixed/syllables:2 | 9722 | 9889 | 167 | 9722 | 167 |
| suffixed/syllables:3 | 8058 | 8056 | -2 | 8058 | -2 |
| suffixed/syllables:4 | 2733 | 2658 | -75 | 2733 | -75 |
| suffixed/syllables:5 | 711 | 737 | 26 | 711 | 26 |
| suffixed/syllables:6 | 152 | 164 | 12 | 152 | 12 |
| suffixed/syllables:7 | 26 | 28 | 2 | 26 | 2 |
| suffixed/syllables:8 | 10 | 5 | -5 | 10 | -5 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 47126.000 | 47071.000 | -55.000 | 47126.000 | -55.000 |
| Mean letters | 7.418 | 7.408 | -0.010 | 7.418 | -0.010 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000168 | 0.000183 | 0.000015 | 0.000168 | 0.000015 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.183856 | 0.183861 | 0.000005 | 0.183856 | 0.000005 |
| trigrams / missingReferenceMass | 0.049072 | 0.049149 | 0.000077 | 0.049072 | 0.000077 |
| trigrams / unseenGeneratedMass | 0.012432 | 0.012465 | 0.000034 | 0.012432 | 0.000034 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43577 (0.000%) | 0/43464 (0.000%) | 0.000 | -113 | 0.000 to 0.000 | 0/43577 (0.000%) | 0.000 | -113 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43577 (0.000%) | 0/43464 (0.000%) | 0.000 | -113 | 0.000 to 0.000 | 0/43577 (0.000%) | 0.000 | -113 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 3016/50000 (6.032%) | 3026/50000 (6.052%) | +0.020 | 0 | -0.350 to +0.570 | 3016/50000 (6.032%) | +0.020 | 0 | -0.350 to +0.570 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 272/50000 (0.544%) | 244/50000 (0.488%) | -0.056 | 0 | -0.110 to -0.010 | 272/50000 (0.544%) | -0.056 | 0 | -0.110 to -0.010 |
| Disyllables with adjacent primary and secondary stress / lower | 9320/22919 (40.665%) | 9252/22848 (40.494%) | -0.171 | -71 | -1.387 to +0.410 | 9320/22919 (40.665%) | -0.171 | -71 | -1.387 to +0.410 |
| Monosyllables with schwa as their sole nucleus / lower | 1322/6423 (20.582%) | 1322/6536 (20.226%) | -0.356 | 113 | -1.417 to +1.146 | 1322/6423 (20.582%) | -0.356 | 113 | -1.417 to +1.146 |
| Words ending in an open checked vowel / lower | 1391/50000 (2.782%) | 1320/50000 (2.640%) | -0.142 | 0 | -0.310 to +0.010 | 1391/50000 (2.782%) | -0.142 | 0 | -0.310 to +0.010 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/6423 (0.000%) | 0/6536 (0.000%) | 0.000 | 113 | 0.000 to 0.000 | 0/6423 (0.000%) | 0.000 | 113 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 6423 | 6536 | 113 | 6423 | 113 |
| bare/syllables:2 | 22919 | 22848 | -71 | 22919 | -71 |
| bare/syllables:3 | 13869 | 13918 | 49 | 13869 | 49 |
| bare/syllables:4 | 5007 | 4984 | -23 | 5007 | -23 |
| bare/syllables:5 | 1427 | 1366 | -61 | 1427 | -61 |
| bare/syllables:6 | 308 | 305 | -3 | 308 | -3 |
| bare/syllables:7 | 43 | 34 | -9 | 43 | -9 |
| bare/syllables:8 | 3 | 9 | 6 | 3 | 6 |
| bare/syllables:9 | 1 | 0 | -1 | 1 | -1 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 14397.000 | 14397.000 | 0.000 | 14397.000 | 0.000 |
| Mean letters | 5.417 | 5.417 | 0.000 | 5.417 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.092157 | 0.092157 | 0.000000 | 0.092157 | 0.000000 |
| phonemes / missingReferenceMass | 0.003390 | 0.003390 | 0.000000 | 0.003390 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.525918 | 0.525918 | 0.000000 | 0.525918 | 0.000000 |
| trigrams / missingReferenceMass | 0.374662 | 0.374662 | 0.000000 | 0.374662 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.002265 | 0.002265 | 0.000000 | 0.002265 | 0.000000 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Polysyllables with multiple primary stresses / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 5429/50000 (10.858%) | 5429/50000 (10.858%) | 0.000 | 0 | 0.000 to 0.000 | 5429/50000 (10.858%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Monosyllables with schwa as their sole nucleus / lower | 10762/50000 (21.524%) | 10762/50000 (21.524%) | 0.000 | 0 | 0.000 to 0.000 | 10762/50000 (21.524%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 218/50000 (0.436%) | 218/50000 (0.436%) | 0.000 | 0 | 0.000 to 0.000 | 218/50000 (0.436%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 28443.000 | 28427.000 | -16.000 | 28443.000 | -16.000 |
| Mean letters | 5.613 | 5.609 | -0.004 | 5.613 | -0.004 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.011102 | 0.011112 | 0.000010 | 0.011102 | 0.000010 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.184480 | 0.184483 | 0.000003 | 0.184480 | 0.000003 |
| trigrams / missingReferenceMass | 0.051142 | 0.050641 | -0.000501 | 0.051142 | -0.000501 |
| trigrams / unseenGeneratedMass | 0.009437 | 0.009354 | -0.000083 | 0.009437 | -0.000083 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 9947/27246 (36.508%) | 9992/27303 (36.597%) | +0.089 | 57 | -0.285 to +0.361 | 9947/27246 (36.508%) | +0.089 | 57 | -0.285 to +0.361 |
| Polysyllables with multiple primary stresses / lower | 0/27246 (0.000%) | 0/27303 (0.000%) | 0.000 | 57 | 0.000 to 0.000 | 0/27246 (0.000%) | 0.000 | 57 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 593/50000 (1.186%) | 590/50000 (1.180%) | -0.006 | 0 | -0.100 to +0.100 | 593/50000 (1.186%) | -0.006 | 0 | -0.100 to +0.100 |
| Words with a primary-stressed reduced vowel / lower | 25/50000 (0.050%) | 24/50000 (0.048%) | -0.002 | 0 | -0.020 to +0.010 | 25/50000 (0.050%) | -0.002 | 0 | -0.020 to +0.010 |
| Affixed words with a morphological hiatus fallback / lower | 4481/22557 (19.865%) | 4506/22575 (19.960%) | +0.095 | 18 | -0.611 to +0.688 | 4481/22557 (19.865%) | +0.095 | 18 | -0.611 to +0.688 |
| Words with a zero-total-weight grapheme choice / lower | 864/50000 (1.728%) | 856/50000 (1.712%) | -0.016 | 0 | -0.070 to +0.070 | 864/50000 (1.728%) | -0.016 | 0 | -0.070 to +0.070 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22557/50000 (45.114%) | 22575/50000 (45.150%) | +0.036 | 0 | -0.260 to +0.200 | 22557/50000 (45.114%) | +0.036 | 0 | -0.260 to +0.200 |
| Words with adjacent identical coda segments / lower | 167/50000 (0.334%) | 149/50000 (0.298%) | -0.036 | 0 | -0.100 to +0.010 | 167/50000 (0.334%) | -0.036 | 0 | -0.100 to +0.010 |
| Disyllables with adjacent primary and secondary stress / lower | 2453/17103 (14.343%) | 2464/17181 (14.341%) | -0.001 | 78 | -0.276 to +0.271 | 2453/17103 (14.343%) | -0.001 | 78 | -0.276 to +0.271 |
| Monosyllables with schwa as their sole nucleus / lower | 4476/22754 (19.671%) | 4445/22697 (19.584%) | -0.087 | -57 | -0.902 to +0.815 | 4476/22754 (19.671%) | -0.087 | -57 | -0.902 to +0.815 |
| Words ending in an open checked vowel / lower | 966/50000 (1.932%) | 1015/50000 (2.030%) | +0.098 | 0 | -0.070 to +0.250 | 966/50000 (1.932%) | +0.098 | 0 | -0.070 to +0.250 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/22754 (0.000%) | 0/22697 (0.000%) | 0.000 | -57 | 0.000 to 0.000 | 0/22754 (0.000%) | 0.000 | -57 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 17931 | 17901 | -30 | 17931 | -30 |
| bare/syllables:2 | 5435 | 5433 | -2 | 5435 | -2 |
| bare/syllables:3 | 2713 | 2733 | 20 | 2713 | 20 |
| bare/syllables:4 | 1105 | 1097 | -8 | 1105 | -8 |
| bare/syllables:5 | 234 | 234 | 0 | 234 | 0 |
| bare/syllables:6 | 25 | 27 | 2 | 25 | 2 |
| both/syllables:2 | 912 | 903 | -9 | 912 | -9 |
| both/syllables:3 | 1110 | 1120 | 10 | 1110 | 10 |
| both/syllables:4 | 465 | 445 | -20 | 465 | -20 |
| both/syllables:5 | 47 | 52 | 5 | 47 | 5 |
| both/syllables:6 | 5 | 5 | 0 | 5 | 0 |
| both/syllables:7 | 2 | 2 | 0 | 2 | 0 |
| prefixed/syllables:2 | 4081 | 4126 | 45 | 4081 | 45 |
| prefixed/syllables:3 | 573 | 574 | 1 | 573 | 1 |
| prefixed/syllables:4 | 208 | 192 | -16 | 208 | -16 |
| prefixed/syllables:5 | 60 | 60 | 0 | 60 | 0 |
| prefixed/syllables:6 | 9 | 12 | 3 | 9 | 3 |
| suffixed/syllables:1 | 4823 | 4796 | -27 | 4823 | -27 |
| suffixed/syllables:2 | 6675 | 6719 | 44 | 6675 | 44 |
| suffixed/syllables:3 | 2861 | 2848 | -13 | 2861 | -13 |
| suffixed/syllables:4 | 507 | 500 | -7 | 507 | -7 |
| suffixed/syllables:5 | 186 | 188 | 2 | 186 | 2 |
| suffixed/syllables:6 | 29 | 29 | 0 | 29 | 0 |
| suffixed/syllables:7 | 4 | 4 | 0 | 4 | 0 |
