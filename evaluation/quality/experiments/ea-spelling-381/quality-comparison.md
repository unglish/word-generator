# Quality comparison: candidate-f9bd4b9174e3

Original baseline: merge-base-30466c312dcb. Cohort: development.

| Role | Run | Generator commit | Generator state | Source digest |
|---|---|---|---|---|
| baseline | merge-base-30466c312dcb | 30466c312dcba618333f9f5a6f470baf2135516e | clean | cba3028cccc3d5d244ac13fc1076d4da82647d4a76cc5fbbc0d2af6dbb111d58 |
| candidate | candidate-f9bd4b9174e3 | f9bd4b9174e3ad5e88174f6b3fbb38a1515334be | dirty (uncommitted generator changes) | 51966db1ac087b332727b4e1ca26634e6717aff7066a99387317e8cb52fd2ce1 |

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 1dfbe5d49efd9fe550910c417ff7b180220430c4b263ec2dee96e1f5896a65ef. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 49458.000 | 49496.000 | +38.000 |
| Mean letters | 9.230 | 9.225 | -0.005 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.004700 | 0.004738 | 0.000038 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.145872 | 0.145941 | 0.000069 |
| trigrams / missingReferenceMass | 0.029009 | 0.029936 | 0.000926 |
| trigrams / unseenGeneratedMass | 0.010438 | 0.010173 | -0.000264 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/47059 (0.000%) | 0/47119 (0.000%) | 0.000 | 60 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/47059 (0.000%) | 0/47119 (0.000%) | 0.000 | 60 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 3110/34973 (8.893%) | 3022/35092 (8.612%) | -0.281 | 119 | -0.625 to +0.293 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 34973/50000 (69.946%) | 35092/50000 (70.184%) | +0.238 | 0 | -0.670 to +1.130 |
| Words with adjacent identical coda segments / lower | 286/50000 (0.572%) | 274/50000 (0.548%) | -0.024 | 0 | -0.100 to +0.030 |
| Disyllables with adjacent primary and secondary stress / lower | 5410/13315 (40.631%) | 5373/13316 (40.350%) | -0.281 | 1 | -3.401 to +1.083 |
| Monosyllables with schwa as their sole nucleus / lower | 0/2941 (0.000%) | 0/2881 (0.000%) | 0.000 | -60 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 607/50000 (1.214%) | 582/50000 (1.164%) | -0.050 | 0 | -0.220 to +0.090 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 36/2941 (1.224%) | 31/2881 (1.076%) | -0.148 | -60 | -1.075 to +0.510 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 1913 | 1883 | -30 |
| bare/syllables:2 | 6954 | 6936 | -18 |
| bare/syllables:3 | 4160 | 4074 | -86 |
| bare/syllables:4 | 1493 | 1471 | -22 |
| bare/syllables:5 | 388 | 440 | 52 |
| bare/syllables:6 | 106 | 91 | -15 |
| bare/syllables:7 | 12 | 13 | 1 |
| bare/syllables:9 | 1 | 0 | -1 |
| both/syllables:2 | 148 | 150 | 2 |
| both/syllables:3 | 884 | 861 | -23 |
| both/syllables:4 | 1373 | 1393 | 20 |
| both/syllables:5 | 965 | 1002 | 37 |
| both/syllables:6 | 460 | 464 | 4 |
| both/syllables:7 | 162 | 145 | -17 |
| both/syllables:8 | 24 | 18 | -6 |
| both/syllables:9 | 8 | 5 | -3 |
| prefixed/syllables:2 | 843 | 872 | 29 |
| prefixed/syllables:3 | 3002 | 3067 | 65 |
| prefixed/syllables:4 | 2017 | 2075 | 58 |
| prefixed/syllables:5 | 770 | 753 | -17 |
| prefixed/syllables:6 | 219 | 223 | 4 |
| prefixed/syllables:7 | 58 | 62 | 4 |
| prefixed/syllables:8 | 17 | 7 | -10 |
| prefixed/syllables:9 | 2 | 2 | 0 |
| suffixed/syllables:1 | 1028 | 998 | -30 |
| suffixed/syllables:10 | 2 | 0 | -2 |
| suffixed/syllables:2 | 5370 | 5358 | -12 |
| suffixed/syllables:3 | 8497 | 8596 | 99 |
| suffixed/syllables:4 | 5777 | 5801 | 24 |
| suffixed/syllables:5 | 2373 | 2306 | -67 |
| suffixed/syllables:6 | 768 | 751 | -17 |
| suffixed/syllables:7 | 162 | 156 | -6 |
| suffixed/syllables:8 | 37 | 21 | -16 |
| suffixed/syllables:9 | 7 | 6 | -1 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 47522.000 | 47525.000 | +3.000 |
| Mean letters | 7.409 | 7.392 | -0.017 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000576 | 0.000564 | -0.000013 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.175882 | 0.175950 | 0.000069 |
| trigrams / missingReferenceMass | 0.048538 | 0.048325 | -0.000213 |
| trigrams / unseenGeneratedMass | 0.011300 | 0.011495 | 0.000195 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43654 (0.000%) | 0/43565 (0.000%) | 0.000 | -89 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43654 (0.000%) | 0/43565 (0.000%) | 0.000 | -89 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 281/50000 (0.562%) | 280/50000 (0.560%) | -0.002 | 0 | -0.050 to +0.090 |
| Disyllables with adjacent primary and secondary stress / lower | 9394/23060 (40.737%) | 9440/23165 (40.751%) | +0.014 | 105 | -0.707 to +0.512 |
| Monosyllables with schwa as their sole nucleus / lower | 0/6346 (0.000%) | 0/6435 (0.000%) | 0.000 | 89 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 1274/50000 (2.548%) | 1285/50000 (2.570%) | +0.022 | 0 | -0.130 to +0.230 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 85/6346 (1.339%) | 86/6435 (1.336%) | -0.003 | 89 | -0.194 to +0.294 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 6346 | 6435 | 89 |
| bare/syllables:2 | 23060 | 23165 | 105 |
| bare/syllables:3 | 13786 | 13652 | -134 |
| bare/syllables:4 | 5025 | 5052 | 27 |
| bare/syllables:5 | 1397 | 1322 | -75 |
| bare/syllables:6 | 336 | 327 | -9 |
| bare/syllables:7 | 45 | 42 | -3 |
| bare/syllables:8 | 5 | 4 | -1 |
| bare/syllables:9 | 0 | 1 | 1 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 16828.000 | 16828.000 | 0.000 |
| Mean letters | 5.450 | 5.450 | -0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.095373 | 0.095363 | -0.000010 |
| phonemes / missingReferenceMass | 0.000640 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.497153 | 0.497135 | -0.000018 |
| trigrams / missingReferenceMass | 0.345903 | 0.345903 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.004470 | 0.004470 | 0.000000 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Polysyllables with multiple primary stresses / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 5340/50000 (10.680%) | 5343/50000 (10.686%) | +0.006 | 0 | 0.000 to +0.030 |
| Disyllables with adjacent primary and secondary stress / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Monosyllables with schwa as their sole nucleus / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 288/50000 (0.576%) | 286/50000 (0.572%) | -0.004 | 0 | -0.010 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 851/50000 (1.702%) | 851/50000 (1.702%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 39348.000 | 39314.000 | -34.000 |
| Mean letters | 6.608 | 6.603 | -0.004 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006309 | 0.006264 | -0.000045 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.156459 | 0.155761 | -0.000698 |
| trigrams / missingReferenceMass | 0.039327 | 0.038761 | -0.000565 |
| trigrams / unseenGeneratedMass | 0.007257 | 0.007251 | -0.000006 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/28991 (0.000%) | 0/28953 (0.000%) | 0.000 | -38 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/28991 (0.000%) | 0/28953 (0.000%) | 0.000 | -38 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 1385/22350 (6.197%) | 1369/22287 (6.143%) | -0.054 | -63 | -0.331 to +0.127 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22350/50000 (44.700%) | 22287/50000 (44.574%) | -0.126 | 0 | -0.330 to +0.190 |
| Words with adjacent identical coda segments / lower | 235/50000 (0.470%) | 241/50000 (0.482%) | +0.012 | 0 | -0.070 to +0.060 |
| Disyllables with adjacent primary and secondary stress / lower | 6226/15323 (40.632%) | 6173/15259 (40.455%) | -0.177 | -64 | -1.445 to +0.720 |
| Monosyllables with schwa as their sole nucleus / lower | 0/21009 (0.000%) | 0/21047 (0.000%) | 0.000 | 38 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 884/50000 (1.768%) | 893/50000 (1.786%) | +0.018 | 0 | -0.100 to +0.190 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 258/21009 (1.228%) | 277/21047 (1.316%) | +0.088 | 38 | -0.004 to +0.130 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17908 | 17975 | 67 |
| bare/syllables:2 | 5548 | 5504 | -44 |
| bare/syllables:3 | 2825 | 2848 | 23 |
| bare/syllables:4 | 1109 | 1115 | 6 |
| bare/syllables:5 | 228 | 233 | 5 |
| bare/syllables:6 | 32 | 38 | 6 |
| both/syllables:2 | 471 | 466 | -5 |
| both/syllables:3 | 1000 | 994 | -6 |
| both/syllables:4 | 588 | 586 | -2 |
| both/syllables:5 | 263 | 260 | -3 |
| both/syllables:6 | 93 | 98 | 5 |
| both/syllables:7 | 33 | 29 | -4 |
| both/syllables:8 | 5 | 6 | 1 |
| both/syllables:9 | 2 | 1 | -1 |
| prefixed/syllables:2 | 3022 | 3015 | -7 |
| prefixed/syllables:3 | 1116 | 1132 | 16 |
| prefixed/syllables:4 | 554 | 554 | 0 |
| prefixed/syllables:5 | 222 | 204 | -18 |
| prefixed/syllables:6 | 68 | 64 | -4 |
| prefixed/syllables:7 | 9 | 7 | -2 |
| suffixed/syllables:1 | 3101 | 3072 | -29 |
| suffixed/syllables:2 | 6282 | 6274 | -8 |
| suffixed/syllables:3 | 3400 | 3377 | -23 |
| suffixed/syllables:4 | 1383 | 1386 | 3 |
| suffixed/syllables:5 | 569 | 595 | 26 |
| suffixed/syllables:6 | 146 | 146 | 0 |
| suffixed/syllables:7 | 23 | 21 | -2 |
