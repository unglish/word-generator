# Quality comparison: candidate-9127edf11a4d

Original baseline: merge-base-5e69f89db101. Cohort: development.

| Role | Run | Generator commit | Generator state | Source digest |
|---|---|---|---|---|
| baseline | merge-base-5e69f89db101 | 5e69f89db1013e455a19166f43eee5bbffdb3bbc | clean | f525481b1d3a526824f3ce92e547cb28a7232c8f221cdd8cc9d8f98399a2247f |
| candidate | candidate-9127edf11a4d | 9127edf11a4de1325550a1ec10ab5fc5b0310368 | clean | cba3028cccc3d5d244ac13fc1076d4da82647d4a76cc5fbbc0d2af6dbb111d58 |

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 1dfbe5d49efd9fe550910c417ff7b180220430c4b263ec2dee96e1f5896a65ef. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 49491.000 | 49458.000 | -33.000 |
| Mean letters | 9.253 | 9.230 | -0.023 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.004646 | 0.004700 | 0.000054 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.150385 | 0.145872 | -0.004512 |
| trigrams / missingReferenceMass | 0.031246 | 0.029009 | -0.002237 |
| trigrams / unseenGeneratedMass | 0.011193 | 0.010438 | -0.000755 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/47116 (0.000%) | 0/47059 (0.000%) | 0.000 | -57 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/47116 (0.000%) | 0/47059 (0.000%) | 0.000 | -57 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 3160/34956 (9.040%) | 3110/34973 (8.893%) | -0.147 | 17 | -0.576 to +0.140 |
| Words with a zero-total-weight grapheme choice / lower | 3119/50000 (6.238%) | 0/50000 (0.000%) | -6.238 | 0 | -6.510 to -5.790 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 34956/50000 (69.912%) | 34973/50000 (69.946%) | +0.034 | 0 | -0.510 to +1.190 |
| Words with adjacent identical coda segments / lower | 281/50000 (0.562%) | 286/50000 (0.572%) | +0.010 | 0 | -0.170 to +0.240 |
| Disyllables with adjacent primary and secondary stress / lower | 5331/13422 (39.718%) | 5410/13315 (40.631%) | +0.912 | -107 | +0.261 to +2.143 |
| Monosyllables with schwa as their sole nucleus / lower | 0/2884 (0.000%) | 0/2941 (0.000%) | 0.000 | 57 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 606/50000 (1.212%) | 607/50000 (1.214%) | +0.002 | 0 | -0.280 to +0.210 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 38/2884 (1.318%) | 36/2941 (1.224%) | -0.094 | 57 | -0.602 to +0.492 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 1949 | 1913 | -36 |
| bare/syllables:2 | 7040 | 6954 | -86 |
| bare/syllables:3 | 4077 | 4160 | 83 |
| bare/syllables:4 | 1445 | 1493 | 48 |
| bare/syllables:5 | 430 | 388 | -42 |
| bare/syllables:6 | 91 | 106 | 15 |
| bare/syllables:7 | 12 | 12 | 0 |
| bare/syllables:9 | 0 | 1 | 1 |
| both/syllables:2 | 160 | 148 | -12 |
| both/syllables:3 | 881 | 884 | 3 |
| both/syllables:4 | 1392 | 1373 | -19 |
| both/syllables:5 | 1018 | 965 | -53 |
| both/syllables:6 | 409 | 460 | 51 |
| both/syllables:7 | 123 | 162 | 39 |
| both/syllables:8 | 35 | 24 | -11 |
| both/syllables:9 | 4 | 8 | 4 |
| prefixed/syllables:2 | 845 | 843 | -2 |
| prefixed/syllables:3 | 3016 | 3002 | -14 |
| prefixed/syllables:4 | 2041 | 2017 | -24 |
| prefixed/syllables:5 | 791 | 770 | -21 |
| prefixed/syllables:6 | 232 | 219 | -13 |
| prefixed/syllables:7 | 48 | 58 | 10 |
| prefixed/syllables:8 | 12 | 17 | 5 |
| prefixed/syllables:9 | 2 | 2 | 0 |
| suffixed/syllables:1 | 935 | 1028 | 93 |
| suffixed/syllables:10 | 0 | 2 | 2 |
| suffixed/syllables:2 | 5377 | 5370 | -7 |
| suffixed/syllables:3 | 8556 | 8497 | -59 |
| suffixed/syllables:4 | 5796 | 5777 | -19 |
| suffixed/syllables:5 | 2346 | 2373 | 27 |
| suffixed/syllables:6 | 728 | 768 | 40 |
| suffixed/syllables:7 | 175 | 162 | -13 |
| suffixed/syllables:8 | 31 | 37 | 6 |
| suffixed/syllables:9 | 3 | 7 | 4 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 47478.000 | 47522.000 | +44.000 |
| Mean letters | 7.395 | 7.409 | +0.014 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000584 | 0.000576 | -0.000008 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.184414 | 0.175882 | -0.008532 |
| trigrams / missingReferenceMass | 0.051795 | 0.048538 | -0.003257 |
| trigrams / unseenGeneratedMass | 0.012830 | 0.011300 | -0.001531 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43543 (0.000%) | 0/43654 (0.000%) | 0.000 | 111 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43543 (0.000%) | 0/43654 (0.000%) | 0.000 | 111 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 3181/50000 (6.362%) | 0/50000 (0.000%) | -6.362 | 0 | -6.680 to -6.140 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 293/50000 (0.586%) | 281/50000 (0.562%) | -0.024 | 0 | -0.110 to +0.090 |
| Disyllables with adjacent primary and secondary stress / lower | 9453/23256 (40.648%) | 9394/23060 (40.737%) | +0.090 | -196 | -0.920 to +1.404 |
| Monosyllables with schwa as their sole nucleus / lower | 0/6457 (0.000%) | 0/6346 (0.000%) | 0.000 | -111 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 1292/50000 (2.584%) | 1274/50000 (2.548%) | -0.036 | 0 | -0.150 to +0.070 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 88/6457 (1.363%) | 85/6346 (1.339%) | -0.023 | -111 | -0.652 to +0.470 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 6457 | 6346 | -111 |
| bare/syllables:2 | 23256 | 23060 | -196 |
| bare/syllables:3 | 13764 | 13786 | 22 |
| bare/syllables:4 | 4848 | 5025 | 177 |
| bare/syllables:5 | 1323 | 1397 | 74 |
| bare/syllables:6 | 310 | 336 | 26 |
| bare/syllables:7 | 41 | 45 | 4 |
| bare/syllables:8 | 1 | 5 | 4 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 16216.000 | 16828.000 | +612.000 |
| Mean letters | 5.453 | 5.450 | -0.003 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.095221 | 0.095373 | 0.000152 |
| phonemes / missingReferenceMass | 0.000640 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.507251 | 0.497153 | -0.010098 |
| trigrams / missingReferenceMass | 0.369848 | 0.345903 | -0.023945 |
| trigrams / unseenGeneratedMass | 0.003266 | 0.004470 | 0.001203 |

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
| Words with adjacent identical coda segments / lower | 5503/50000 (11.006%) | 5340/50000 (10.680%) | -0.326 | 0 | -1.190 to +0.630 |
| Disyllables with adjacent primary and secondary stress / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Monosyllables with schwa as their sole nucleus / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 292/50000 (0.584%) | 288/50000 (0.576%) | -0.008 | 0 | -0.110 to +0.200 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 896/50000 (1.792%) | 851/50000 (1.702%) | -0.090 | 0 | -0.300 to +0.070 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 39095.000 | 39348.000 | +253.000 |
| Mean letters | 6.612 | 6.608 | -0.004 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006181 | 0.006309 | 0.000128 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.158802 | 0.156459 | -0.002344 |
| trigrams / missingReferenceMass | 0.042111 | 0.039327 | -0.002785 |
| trigrams / unseenGeneratedMass | 0.008521 | 0.007257 | -0.001264 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/28978 (0.000%) | 0/28991 (0.000%) | 0.000 | 13 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/28978 (0.000%) | 0/28991 (0.000%) | 0.000 | 13 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 1346/22454 (5.994%) | 1385/22350 (6.197%) | +0.202 | -104 | -0.869 to +0.728 |
| Words with a zero-total-weight grapheme choice / lower | 1296/50000 (2.592%) | 0/50000 (0.000%) | -2.592 | 0 | -2.800 to -2.420 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22454/50000 (44.908%) | 22350/50000 (44.700%) | -0.208 | 0 | -1.590 to +1.070 |
| Words with adjacent identical coda segments / lower | 238/50000 (0.476%) | 235/50000 (0.470%) | -0.006 | 0 | -0.110 to +0.100 |
| Disyllables with adjacent primary and secondary stress / lower | 6240/15212 (41.020%) | 6226/15323 (40.632%) | -0.389 | 111 | -1.684 to +1.476 |
| Monosyllables with schwa as their sole nucleus / lower | 0/21022 (0.000%) | 0/21009 (0.000%) | 0.000 | -13 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 905/50000 (1.810%) | 884/50000 (1.768%) | -0.042 | 0 | -0.250 to +0.080 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 236/21022 (1.123%) | 258/21009 (1.228%) | +0.105 | -13 | -0.156 to +0.312 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17930 | 17908 | -22 |
| bare/syllables:2 | 5383 | 5548 | 165 |
| bare/syllables:3 | 2869 | 2825 | -44 |
| bare/syllables:4 | 1079 | 1109 | 30 |
| bare/syllables:5 | 262 | 228 | -34 |
| bare/syllables:6 | 23 | 32 | 9 |
| both/syllables:2 | 490 | 471 | -19 |
| both/syllables:3 | 985 | 1000 | 15 |
| both/syllables:4 | 586 | 588 | 2 |
| both/syllables:5 | 265 | 263 | -2 |
| both/syllables:6 | 110 | 93 | -17 |
| both/syllables:7 | 26 | 33 | 7 |
| both/syllables:8 | 6 | 5 | -1 |
| both/syllables:9 | 1 | 2 | 1 |
| prefixed/syllables:2 | 3112 | 3022 | -90 |
| prefixed/syllables:3 | 1189 | 1116 | -73 |
| prefixed/syllables:4 | 501 | 554 | 53 |
| prefixed/syllables:5 | 242 | 222 | -20 |
| prefixed/syllables:6 | 40 | 68 | 28 |
| prefixed/syllables:7 | 9 | 9 | 0 |
| prefixed/syllables:8 | 1 | 0 | -1 |
| suffixed/syllables:1 | 3092 | 3101 | 9 |
| suffixed/syllables:2 | 6227 | 6282 | 55 |
| suffixed/syllables:3 | 3408 | 3400 | -8 |
| suffixed/syllables:4 | 1390 | 1383 | -7 |
| suffixed/syllables:5 | 575 | 569 | -6 |
| suffixed/syllables:6 | 169 | 146 | -23 |
| suffixed/syllables:7 | 29 | 23 | -6 |
| suffixed/syllables:8 | 1 | 0 | -1 |
