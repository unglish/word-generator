# Quality comparison: candidate-2889826f5ec8

Original baseline: merge-base-e65d87e730fd. Cohort: development.

| Role | Run | Generator commit | Generator state | Source digest |
|---|---|---|---|---|
| baseline | merge-base-e65d87e730fd | e65d87e730fd4aa38277bd278c711aea7c7483e5 | clean | 2d3f795cbf3f19f5e1401dd4e4676f5246a0c93956b83ca1788dbb57840b4634 |
| candidate | candidate-2889826f5ec8 | 2889826f5ec8d04f55d0ba489bfa0b70e4588dc7 | clean | 15934de7327c171784da170a2ecb035604b441dae12b5a43fe059577de576560 |

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 1dfbe5d49efd9fe550910c417ff7b180220430c4b263ec2dee96e1f5896a65ef. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 49496.000 | 49492.000 | -4.000 |
| Mean letters | 9.225 | 9.220 | -0.005 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.004738 | 0.004413 | -0.000325 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.145941 | 0.146331 | 0.000390 |
| trigrams / missingReferenceMass | 0.029936 | 0.029822 | -0.000113 |
| trigrams / unseenGeneratedMass | 0.010173 | 0.010177 | 0.000004 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/47119 (0.000%) | 0/47089 (0.000%) | 0.000 | -30 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/47119 (0.000%) | 0/47089 (0.000%) | 0.000 | -30 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 3022/35092 (8.612%) | 0/35098 (0.000%) | -8.612 | 6 | -9.333 to -7.979 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 35092/50000 (70.184%) | 35098/50000 (70.196%) | +0.012 | 0 | -0.190 to +0.320 |
| Words with adjacent identical coda segments / lower | 274/50000 (0.548%) | 278/50000 (0.556%) | +0.008 | 0 | -0.050 to +0.040 |
| Disyllables with adjacent primary and secondary stress / lower | 5373/13316 (40.350%) | 5374/13331 (40.312%) | -0.038 | 15 | -0.621 to +0.893 |
| Monosyllables with schwa as their sole nucleus / lower | 0/2881 (0.000%) | 0/2911 (0.000%) | 0.000 | 30 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 582/50000 (1.164%) | 560/50000 (1.120%) | -0.044 | 0 | -0.130 to +0.010 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 31/2881 (1.076%) | 31/2911 (1.065%) | -0.011 | 30 | -0.504 to +0.884 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 1883 | 1903 | 20 |
| bare/syllables:2 | 6936 | 6962 | 26 |
| bare/syllables:3 | 4074 | 4033 | -41 |
| bare/syllables:4 | 1471 | 1484 | 13 |
| bare/syllables:5 | 440 | 421 | -19 |
| bare/syllables:6 | 91 | 88 | -3 |
| bare/syllables:7 | 13 | 11 | -2 |
| both/syllables:10 | 0 | 1 | 1 |
| both/syllables:2 | 150 | 150 | 0 |
| both/syllables:3 | 861 | 881 | 20 |
| both/syllables:4 | 1393 | 1385 | -8 |
| both/syllables:5 | 1002 | 977 | -25 |
| both/syllables:6 | 464 | 458 | -6 |
| both/syllables:7 | 145 | 164 | 19 |
| both/syllables:8 | 18 | 25 | 7 |
| both/syllables:9 | 5 | 7 | 2 |
| prefixed/syllables:2 | 872 | 882 | 10 |
| prefixed/syllables:3 | 3067 | 3059 | -8 |
| prefixed/syllables:4 | 2075 | 2062 | -13 |
| prefixed/syllables:5 | 753 | 772 | 19 |
| prefixed/syllables:6 | 223 | 218 | -5 |
| prefixed/syllables:7 | 62 | 58 | -4 |
| prefixed/syllables:8 | 7 | 10 | 3 |
| prefixed/syllables:9 | 2 | 1 | -1 |
| suffixed/syllables:1 | 998 | 1008 | 10 |
| suffixed/syllables:10 | 0 | 1 | 1 |
| suffixed/syllables:2 | 5358 | 5337 | -21 |
| suffixed/syllables:3 | 8596 | 8589 | -7 |
| suffixed/syllables:4 | 5801 | 5808 | 7 |
| suffixed/syllables:5 | 2306 | 2320 | 14 |
| suffixed/syllables:6 | 751 | 738 | -13 |
| suffixed/syllables:7 | 156 | 158 | 2 |
| suffixed/syllables:8 | 21 | 22 | 1 |
| suffixed/syllables:9 | 6 | 7 | 1 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 47525.000 | 47525.000 | 0.000 |
| Mean letters | 7.392 | 7.392 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000564 | 0.000564 | 0.000000 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.175950 | 0.175950 | 0.000000 |
| trigrams / missingReferenceMass | 0.048325 | 0.048325 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.011495 | 0.011495 | 0.000000 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43565 (0.000%) | 0/43565 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43565 (0.000%) | 0/43565 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 280/50000 (0.560%) | 280/50000 (0.560%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 9440/23165 (40.751%) | 9440/23165 (40.751%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables with schwa as their sole nucleus / lower | 0/6435 (0.000%) | 0/6435 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 1285/50000 (2.570%) | 1285/50000 (2.570%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 86/6435 (1.336%) | 86/6435 (1.336%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 6435 | 6435 | 0 |
| bare/syllables:2 | 23165 | 23165 | 0 |
| bare/syllables:3 | 13652 | 13652 | 0 |
| bare/syllables:4 | 5052 | 5052 | 0 |
| bare/syllables:5 | 1322 | 1322 | 0 |
| bare/syllables:6 | 327 | 327 | 0 |
| bare/syllables:7 | 42 | 42 | 0 |
| bare/syllables:8 | 4 | 4 | 0 |
| bare/syllables:9 | 1 | 1 | 0 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 16828.000 | 16828.000 | 0.000 |
| Mean letters | 5.450 | 5.450 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.095363 | 0.095363 | 0.000000 |
| phonemes / missingReferenceMass | 0.000640 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.497135 | 0.497135 | 0.000000 |
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
| Words with adjacent identical coda segments / lower | 5343/50000 (10.686%) | 5343/50000 (10.686%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Monosyllables with schwa as their sole nucleus / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 286/50000 (0.572%) | 286/50000 (0.572%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 851/50000 (1.702%) | 851/50000 (1.702%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 39314.000 | 39286.000 | -28.000 |
| Mean letters | 6.603 | 6.599 | -0.005 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006264 | 0.006207 | -0.000058 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.155761 | 0.155798 | 0.000038 |
| trigrams / missingReferenceMass | 0.038761 | 0.038356 | -0.000405 |
| trigrams / unseenGeneratedMass | 0.007251 | 0.007281 | 0.000029 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/28953 (0.000%) | 0/28919 (0.000%) | 0.000 | -34 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/28953 (0.000%) | 0/28919 (0.000%) | 0.000 | -34 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 1369/22287 (6.143%) | 0/22266 (0.000%) | -6.143 | -21 | -6.483 to -5.506 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22287/50000 (44.574%) | 22266/50000 (44.532%) | -0.042 | 0 | -0.090 to +0.010 |
| Words with adjacent identical coda segments / lower | 241/50000 (0.482%) | 243/50000 (0.486%) | +0.004 | 0 | -0.020 to +0.020 |
| Disyllables with adjacent primary and secondary stress / lower | 6173/15259 (40.455%) | 6197/15277 (40.564%) | +0.109 | 18 | -0.143 to +0.289 |
| Monosyllables with schwa as their sole nucleus / lower | 0/21047 (0.000%) | 0/21081 (0.000%) | 0.000 | 34 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 893/50000 (1.786%) | 895/50000 (1.790%) | +0.004 | 0 | 0.000 to +0.010 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 277/21047 (1.316%) | 280/21081 (1.328%) | +0.012 | 34 | -0.026 to +0.071 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17975 | 17998 | 23 |
| bare/syllables:2 | 5504 | 5505 | 1 |
| bare/syllables:3 | 2848 | 2855 | 7 |
| bare/syllables:4 | 1115 | 1108 | -7 |
| bare/syllables:5 | 233 | 230 | -3 |
| bare/syllables:6 | 38 | 38 | 0 |
| both/syllables:2 | 466 | 473 | 7 |
| both/syllables:3 | 994 | 990 | -4 |
| both/syllables:4 | 586 | 579 | -7 |
| both/syllables:5 | 260 | 256 | -4 |
| both/syllables:6 | 98 | 96 | -2 |
| both/syllables:7 | 29 | 26 | -3 |
| both/syllables:8 | 6 | 6 | 0 |
| both/syllables:9 | 1 | 1 | 0 |
| prefixed/syllables:2 | 3015 | 3028 | 13 |
| prefixed/syllables:3 | 1132 | 1135 | 3 |
| prefixed/syllables:4 | 554 | 564 | 10 |
| prefixed/syllables:5 | 204 | 202 | -2 |
| prefixed/syllables:6 | 64 | 63 | -1 |
| prefixed/syllables:7 | 7 | 7 | 0 |
| suffixed/syllables:1 | 3072 | 3083 | 11 |
| suffixed/syllables:2 | 6274 | 6271 | -3 |
| suffixed/syllables:3 | 3377 | 3353 | -24 |
| suffixed/syllables:4 | 1386 | 1380 | -6 |
| suffixed/syllables:5 | 595 | 589 | -6 |
| suffixed/syllables:6 | 146 | 142 | -4 |
| suffixed/syllables:7 | 21 | 22 | 1 |
