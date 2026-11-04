# Quality comparison: pr309-rebased

Original baseline: pr309-current-main. Cohort: development.

| Role | Run | Generator commit | Generator state | Source digest |
|---|---|---|---|---|
| baseline | pr309-current-main | 93e934cf0c01ba2e9fa2bc13157d7fe68c21776e | clean | a86e7e5ce99fb50b6d96b5982975faf8d5ea53bf2c078448194a496343f91649 |
| candidate | pr309-rebased | 713b36a9aef686bc0f57860f0af553cecce43a1a | dirty (uncommitted generator changes) | f525481b1d3a526824f3ce92e547cb28a7232c8f221cdd8cc9d8f98399a2247f |

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 1dfbe5d49efd9fe550910c417ff7b180220430c4b263ec2dee96e1f5896a65ef. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 49370.000 | 49491.000 | +121.000 |
| Mean letters | 9.220 | 9.253 | +0.033 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.005368 | 0.004646 | -0.000722 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.150448 | 0.150385 | -0.000064 |
| trigrams / missingReferenceMass | 0.030047 | 0.031246 | 0.001199 |
| trigrams / unseenGeneratedMass | 0.010969 | 0.011193 | 0.000224 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 2529/47078 (5.372%) | 0/47116 (0.000%) | -5.372 | 38 | -5.694 to -5.121 |
| Polysyllables with multiple primary stresses / lower | 0/47078 (0.000%) | 0/47116 (0.000%) | 0.000 | 38 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 812/50000 (1.624%) | 0/50000 (0.000%) | -1.624 | 0 | -1.820 to -1.480 |
| Words with a primary-stressed reduced vowel / lower | 322/50000 (0.644%) | 0/50000 (0.000%) | -0.644 | 0 | -0.690 to -0.550 |
| Affixed words with a morphological hiatus fallback / lower | 3094/34946 (8.854%) | 3160/34956 (9.040%) | +0.186 | 10 | -0.253 to +0.719 |
| Words with a zero-total-weight grapheme choice / lower | 3123/50000 (6.246%) | 3119/50000 (6.238%) | -0.008 | 0 | -0.630 to +0.220 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 34946/50000 (69.892%) | 34956/50000 (69.912%) | +0.020 | 0 | -0.800 to +1.690 |
| Words with adjacent identical coda segments / lower | 247/50000 (0.494%) | 281/50000 (0.562%) | +0.068 | 0 | -0.060 to +0.270 |
| Disyllables with adjacent primary and secondary stress / lower | 4263/13414 (31.780%) | 5331/13422 (39.718%) | +7.938 | 8 | +6.936 to +9.263 |
| Monosyllables with schwa as their sole nucleus / lower | 562/2922 (19.233%) | 0/2884 (0.000%) | -19.233 | -38 | -21.631 to -17.745 |
| Words ending in an open checked vowel / lower | 549/50000 (1.098%) | 606/50000 (1.212%) | +0.114 | 0 | -0.060 to +0.250 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 21/2922 (0.719%) | 38/2884 (1.318%) | +0.599 | -38 | +0.334 to +1.009 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 1961 | 1949 | -12 |
| bare/syllables:2 | 6946 | 7040 | 94 |
| bare/syllables:3 | 4147 | 4077 | -70 |
| bare/syllables:4 | 1491 | 1445 | -46 |
| bare/syllables:5 | 404 | 430 | 26 |
| bare/syllables:6 | 88 | 91 | 3 |
| bare/syllables:7 | 16 | 12 | -4 |
| bare/syllables:8 | 1 | 0 | -1 |
| both/syllables:11 | 1 | 0 | -1 |
| both/syllables:2 | 168 | 160 | -8 |
| both/syllables:3 | 886 | 881 | -5 |
| both/syllables:4 | 1409 | 1392 | -17 |
| both/syllables:5 | 974 | 1018 | 44 |
| both/syllables:6 | 433 | 409 | -24 |
| both/syllables:7 | 133 | 123 | -10 |
| both/syllables:8 | 32 | 35 | 3 |
| both/syllables:9 | 7 | 4 | -3 |
| prefixed/syllables:2 | 874 | 845 | -29 |
| prefixed/syllables:3 | 3045 | 3016 | -29 |
| prefixed/syllables:4 | 1928 | 2041 | 113 |
| prefixed/syllables:5 | 761 | 791 | 30 |
| prefixed/syllables:6 | 230 | 232 | 2 |
| prefixed/syllables:7 | 43 | 48 | 5 |
| prefixed/syllables:8 | 6 | 12 | 6 |
| prefixed/syllables:9 | 2 | 2 | 0 |
| suffixed/syllables:1 | 961 | 935 | -26 |
| suffixed/syllables:10 | 1 | 0 | -1 |
| suffixed/syllables:2 | 5426 | 5377 | -49 |
| suffixed/syllables:3 | 8660 | 8556 | -104 |
| suffixed/syllables:4 | 5748 | 5796 | 48 |
| suffixed/syllables:5 | 2337 | 2346 | 9 |
| suffixed/syllables:6 | 677 | 728 | 51 |
| suffixed/syllables:7 | 174 | 175 | 1 |
| suffixed/syllables:8 | 25 | 31 | 6 |
| suffixed/syllables:9 | 5 | 3 | -2 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 47184.000 | 47478.000 | +294.000 |
| Mean letters | 7.415 | 7.395 | -0.020 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000573 | 0.000584 | 0.000011 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.184595 | 0.184414 | -0.000182 |
| trigrams / missingReferenceMass | 0.055132 | 0.051795 | -0.003336 |
| trigrams / unseenGeneratedMass | 0.012632 | 0.012830 | 0.000199 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43561 (0.000%) | 0/43543 (0.000%) | 0.000 | -18 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43561 (0.000%) | 0/43543 (0.000%) | 0.000 | -18 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 3072/50000 (6.144%) | 3181/50000 (6.362%) | +0.218 | 0 | -0.200 to +0.760 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 273/50000 (0.546%) | 293/50000 (0.586%) | +0.040 | 0 | -0.050 to +0.110 |
| Disyllables with adjacent primary and secondary stress / lower | 9390/23049 (40.739%) | 9453/23256 (40.648%) | -0.092 | 207 | -1.029 to +0.865 |
| Monosyllables with schwa as their sole nucleus / lower | 1252/6439 (19.444%) | 0/6457 (0.000%) | -19.444 | 18 | -21.290 to -18.147 |
| Words ending in an open checked vowel / lower | 1243/50000 (2.486%) | 1292/50000 (2.584%) | +0.098 | 0 | -0.390 to +0.380 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 56/6439 (0.870%) | 88/6457 (1.363%) | +0.493 | 18 | +0.221 to +0.769 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 6439 | 6457 | 18 |
| bare/syllables:2 | 23049 | 23256 | 207 |
| bare/syllables:3 | 13794 | 13764 | -30 |
| bare/syllables:4 | 4987 | 4848 | -139 |
| bare/syllables:5 | 1353 | 1323 | -30 |
| bare/syllables:6 | 322 | 310 | -12 |
| bare/syllables:7 | 47 | 41 | -6 |
| bare/syllables:8 | 9 | 1 | -8 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 14617.000 | 16216.000 | +1599.000 |
| Mean letters | 5.413 | 5.453 | +0.040 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.091783 | 0.095221 | 0.003438 |
| phonemes / missingReferenceMass | 0.000640 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.524648 | 0.507251 | -0.017398 |
| trigrams / missingReferenceMass | 0.370579 | 0.369848 | -0.000731 |
| trigrams / unseenGeneratedMass | 0.002560 | 0.003266 | 0.000706 |

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
| Words with adjacent identical coda segments / lower | 5448/50000 (10.896%) | 5503/50000 (11.006%) | +0.110 | 0 | -0.420 to +0.570 |
| Disyllables with adjacent primary and secondary stress / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Monosyllables with schwa as their sole nucleus / lower | 10615/50000 (21.230%) | 0/50000 (0.000%) | -21.230 | 0 | -22.180 to -20.380 |
| Words ending in an open checked vowel / lower | 234/50000 (0.468%) | 292/50000 (0.584%) | +0.116 | 0 | +0.050 to +0.190 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 542/50000 (1.084%) | 896/50000 (1.792%) | +0.708 | 0 | +0.370 to +0.940 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 37790.000 | 39095.000 | +1305.000 |
| Mean letters | 6.586 | 6.612 | +0.026 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.007660 | 0.006181 | -0.001479 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.159970 | 0.158802 | -0.001167 |
| trigrams / missingReferenceMass | 0.039798 | 0.042111 | 0.002314 |
| trigrams / unseenGeneratedMass | 0.008064 | 0.008521 | 0.000457 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 7898/28918 (27.312%) | 0/28978 (0.000%) | -27.312 | 60 | -27.850 to -27.004 |
| Polysyllables with multiple primary stresses / lower | 0/28918 (0.000%) | 0/28978 (0.000%) | 0.000 | 60 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 702/50000 (1.404%) | 0/50000 (0.000%) | -1.404 | 0 | -1.490 to -1.280 |
| Words with a primary-stressed reduced vowel / lower | 73/50000 (0.146%) | 0/50000 (0.000%) | -0.146 | 0 | -0.180 to -0.090 |
| Affixed words with a morphological hiatus fallback / lower | 1443/22530 (6.405%) | 1346/22454 (5.994%) | -0.410 | -76 | -1.015 to +0.393 |
| Words with a zero-total-weight grapheme choice / lower | 1198/50000 (2.396%) | 1296/50000 (2.592%) | +0.196 | 0 | -0.030 to +0.350 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22530/50000 (45.060%) | 22454/50000 (44.908%) | -0.152 | 0 | -1.230 to +0.510 |
| Words with adjacent identical coda segments / lower | 223/50000 (0.446%) | 238/50000 (0.476%) | +0.030 | 0 | -0.060 to +0.080 |
| Disyllables with adjacent primary and secondary stress / lower | 2644/15070 (17.545%) | 6240/15212 (41.020%) | +23.475 | 142 | +22.950 to +23.997 |
| Monosyllables with schwa as their sole nucleus / lower | 4246/21082 (20.140%) | 0/21022 (0.000%) | -20.140 | -60 | -20.937 to -19.400 |
| Words ending in an open checked vowel / lower | 871/50000 (1.742%) | 905/50000 (1.810%) | +0.068 | 0 | -0.310 to +0.490 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 170/21082 (0.806%) | 236/21022 (1.123%) | +0.316 | -60 | +0.188 to +0.521 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17939 | 17930 | -9 |
| bare/syllables:2 | 5406 | 5383 | -23 |
| bare/syllables:3 | 2765 | 2869 | 104 |
| bare/syllables:4 | 1106 | 1079 | -27 |
| bare/syllables:5 | 229 | 262 | 33 |
| bare/syllables:6 | 25 | 23 | -2 |
| both/syllables:2 | 472 | 490 | 18 |
| both/syllables:3 | 1028 | 985 | -43 |
| both/syllables:4 | 609 | 586 | -23 |
| both/syllables:5 | 271 | 265 | -6 |
| both/syllables:6 | 99 | 110 | 11 |
| both/syllables:7 | 33 | 26 | -7 |
| both/syllables:8 | 10 | 6 | -4 |
| both/syllables:9 | 1 | 1 | 0 |
| prefixed/syllables:2 | 2990 | 3112 | 122 |
| prefixed/syllables:3 | 1196 | 1189 | -7 |
| prefixed/syllables:4 | 503 | 501 | -2 |
| prefixed/syllables:5 | 220 | 242 | 22 |
| prefixed/syllables:6 | 47 | 40 | -7 |
| prefixed/syllables:7 | 12 | 9 | -3 |
| prefixed/syllables:8 | 0 | 1 | 1 |
| suffixed/syllables:1 | 3143 | 3092 | -51 |
| suffixed/syllables:2 | 6202 | 6227 | 25 |
| suffixed/syllables:3 | 3477 | 3408 | -69 |
| suffixed/syllables:4 | 1448 | 1390 | -58 |
| suffixed/syllables:5 | 580 | 575 | -5 |
| suffixed/syllables:6 | 154 | 169 | 15 |
| suffixed/syllables:7 | 30 | 29 | -1 |
| suffixed/syllables:8 | 5 | 1 | -4 |
