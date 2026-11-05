# Quality comparison: candidate-60fd66c87759

Original baseline: merge-base-30466c312dcb. Cohort: development.

| Role | Run | Generator commit | Generator state | Source digest |
|---|---|---|---|---|
| baseline | merge-base-30466c312dcb | 30466c312dcba618333f9f5a6f470baf2135516e | clean | cba3028cccc3d5d244ac13fc1076d4da82647d4a76cc5fbbc0d2af6dbb111d58 |
| candidate | candidate-60fd66c87759 | 60fd66c877597a76845df75a22d90311f62ad928 | clean | feebaf888afa93d4197debc3102f57891ea87be2b954f6501e610376d78712e2 |

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 1dfbe5d49efd9fe550910c417ff7b180220430c4b263ec2dee96e1f5896a65ef. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 49458.000 | 49468.000 | +10.000 |
| Mean letters | 9.230 | 9.217 | -0.013 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.004700 | 0.004650 | -0.000050 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.145872 | 0.146033 | 0.000160 |
| trigrams / missingReferenceMass | 0.029009 | 0.028838 | -0.000172 |
| trigrams / unseenGeneratedMass | 0.010438 | 0.010195 | -0.000242 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/47059 (0.000%) | 0/47056 (0.000%) | 0.000 | -3 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/47059 (0.000%) | 0/47056 (0.000%) | 0.000 | -3 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 3110/34973 (8.893%) | 3021/34994 (8.633%) | -0.260 | 21 | -0.817 to -0.003 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 34973/50000 (69.946%) | 34994/50000 (69.988%) | +0.042 | 0 | -0.430 to +0.420 |
| Words with adjacent identical coda segments / lower | 286/50000 (0.572%) | 273/50000 (0.546%) | -0.026 | 0 | -0.100 to +0.050 |
| Disyllables with adjacent primary and secondary stress / lower | 5410/13315 (40.631%) | 5464/13361 (40.895%) | +0.264 | 46 | -1.548 to +1.392 |
| Monosyllables with schwa as their sole nucleus / lower | 0/2941 (0.000%) | 0/2944 (0.000%) | 0.000 | 3 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 607/50000 (1.214%) | 574/50000 (1.148%) | -0.066 | 0 | -0.150 to +0.040 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 36/2941 (1.224%) | 31/2944 (1.053%) | -0.171 | 3 | -0.608 to +0.210 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 1913 | 1952 | 39 |
| bare/syllables:2 | 6954 | 6912 | -42 |
| bare/syllables:3 | 4160 | 4128 | -32 |
| bare/syllables:4 | 1493 | 1507 | 14 |
| bare/syllables:5 | 388 | 397 | 9 |
| bare/syllables:6 | 106 | 96 | -10 |
| bare/syllables:7 | 12 | 13 | 1 |
| bare/syllables:9 | 1 | 1 | 0 |
| both/syllables:10 | 0 | 1 | 1 |
| both/syllables:2 | 148 | 156 | 8 |
| both/syllables:3 | 884 | 854 | -30 |
| both/syllables:4 | 1373 | 1356 | -17 |
| both/syllables:5 | 965 | 976 | 11 |
| both/syllables:6 | 460 | 462 | 2 |
| both/syllables:7 | 162 | 138 | -24 |
| both/syllables:8 | 24 | 15 | -9 |
| both/syllables:9 | 8 | 6 | -2 |
| prefixed/syllables:2 | 843 | 881 | 38 |
| prefixed/syllables:3 | 3002 | 3133 | 131 |
| prefixed/syllables:4 | 2017 | 2025 | 8 |
| prefixed/syllables:5 | 770 | 780 | 10 |
| prefixed/syllables:6 | 219 | 243 | 24 |
| prefixed/syllables:7 | 58 | 67 | 9 |
| prefixed/syllables:8 | 17 | 11 | -6 |
| prefixed/syllables:9 | 2 | 2 | 0 |
| suffixed/syllables:1 | 1028 | 992 | -36 |
| suffixed/syllables:10 | 2 | 1 | -1 |
| suffixed/syllables:2 | 5370 | 5412 | 42 |
| suffixed/syllables:3 | 8497 | 8464 | -33 |
| suffixed/syllables:4 | 5777 | 5738 | -39 |
| suffixed/syllables:5 | 2373 | 2335 | -38 |
| suffixed/syllables:6 | 768 | 759 | -9 |
| suffixed/syllables:7 | 162 | 154 | -8 |
| suffixed/syllables:8 | 37 | 29 | -8 |
| suffixed/syllables:9 | 7 | 4 | -3 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 47522.000 | 47464.000 | -58.000 |
| Mean letters | 7.409 | 7.403 | -0.006 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000576 | 0.000578 | 0.000002 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.175882 | 0.175965 | 0.000084 |
| trigrams / missingReferenceMass | 0.048538 | 0.052372 | 0.003834 |
| trigrams / unseenGeneratedMass | 0.011300 | 0.011456 | 0.000157 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43654 (0.000%) | 0/43632 (0.000%) | 0.000 | -22 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43654 (0.000%) | 0/43632 (0.000%) | 0.000 | -22 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 281/50000 (0.562%) | 270/50000 (0.540%) | -0.022 | 0 | -0.070 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 9394/23060 (40.737%) | 9356/22978 (40.717%) | -0.020 | -82 | -0.165 to +0.424 |
| Monosyllables with schwa as their sole nucleus / lower | 0/6346 (0.000%) | 0/6368 (0.000%) | 0.000 | 22 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 1274/50000 (2.548%) | 1281/50000 (2.562%) | +0.014 | 0 | -0.080 to +0.100 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 85/6346 (1.339%) | 91/6368 (1.429%) | +0.090 | 22 | -0.017 to +0.315 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 6346 | 6368 | 22 |
| bare/syllables:2 | 23060 | 22978 | -82 |
| bare/syllables:3 | 13786 | 13849 | 63 |
| bare/syllables:4 | 5025 | 5053 | 28 |
| bare/syllables:5 | 1397 | 1384 | -13 |
| bare/syllables:6 | 336 | 318 | -18 |
| bare/syllables:7 | 45 | 43 | -2 |
| bare/syllables:8 | 5 | 6 | 1 |
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
| Unique spellings | 39348.000 | 39325.000 | -23.000 |
| Mean letters | 6.608 | 6.604 | -0.004 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006309 | 0.006264 | -0.000045 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.156459 | 0.155519 | -0.000940 |
| trigrams / missingReferenceMass | 0.039327 | 0.038700 | -0.000627 |
| trigrams / unseenGeneratedMass | 0.007257 | 0.007102 | -0.000155 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/28991 (0.000%) | 0/29009 (0.000%) | 0.000 | 18 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/28991 (0.000%) | 0/29009 (0.000%) | 0.000 | 18 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 1385/22350 (6.197%) | 1377/22294 (6.177%) | -0.020 | -56 | -0.315 to +0.177 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22350/50000 (44.700%) | 22294/50000 (44.588%) | -0.112 | 0 | -0.290 to +0.040 |
| Words with adjacent identical coda segments / lower | 235/50000 (0.470%) | 243/50000 (0.486%) | +0.016 | 0 | -0.060 to +0.070 |
| Disyllables with adjacent primary and secondary stress / lower | 6226/15323 (40.632%) | 6217/15326 (40.565%) | -0.067 | 3 | -0.601 to +0.249 |
| Monosyllables with schwa as their sole nucleus / lower | 0/21009 (0.000%) | 0/20991 (0.000%) | 0.000 | -18 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 884/50000 (1.768%) | 891/50000 (1.782%) | +0.014 | 0 | -0.080 to +0.070 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 258/21009 (1.228%) | 271/20991 (1.291%) | +0.063 | -18 | +0.025 to +0.120 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17908 | 17930 | 22 |
| bare/syllables:2 | 5548 | 5543 | -5 |
| bare/syllables:3 | 2825 | 2842 | 17 |
| bare/syllables:4 | 1109 | 1128 | 19 |
| bare/syllables:5 | 228 | 229 | 1 |
| bare/syllables:6 | 32 | 34 | 2 |
| both/syllables:2 | 471 | 471 | 0 |
| both/syllables:3 | 1000 | 972 | -28 |
| both/syllables:4 | 588 | 600 | 12 |
| both/syllables:5 | 263 | 267 | 4 |
| both/syllables:6 | 93 | 93 | 0 |
| both/syllables:7 | 33 | 32 | -1 |
| both/syllables:8 | 5 | 6 | 1 |
| both/syllables:9 | 2 | 1 | -1 |
| prefixed/syllables:2 | 3022 | 3025 | 3 |
| prefixed/syllables:3 | 1116 | 1148 | 32 |
| prefixed/syllables:4 | 554 | 551 | -3 |
| prefixed/syllables:5 | 222 | 204 | -18 |
| prefixed/syllables:6 | 68 | 64 | -4 |
| prefixed/syllables:7 | 9 | 11 | 2 |
| suffixed/syllables:1 | 3101 | 3061 | -40 |
| suffixed/syllables:2 | 6282 | 6287 | 5 |
| suffixed/syllables:3 | 3400 | 3387 | -13 |
| suffixed/syllables:4 | 1383 | 1377 | -6 |
| suffixed/syllables:5 | 569 | 572 | 3 |
| suffixed/syllables:6 | 146 | 144 | -2 |
| suffixed/syllables:7 | 23 | 21 | -2 |
