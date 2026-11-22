# Quality comparison: root-population-491

Original baseline: phase1-491. Cohort: development.

| Role | Run | Generator commit | Generator state | Source digest |
|---|---|---|---|---|
| baseline | phase1-491 | 0de88f5cd4ab51fe2485e38698ca8f528f804a34 | clean | ec8873df300360ed146f6853a3d271c3f2a6b1c52222331eb83c9587b1d8a3c1 |
| candidate | root-population-491 | a12624f3375d5b1c49507df084899b9f9df506a7 | clean | f0f496891598dc390d91c651f65715a3552a8b014dfbb9081d74edb5f832d527 |

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 1dfbe5d49efd9fe550910c417ff7b180220430c4b263ec2dee96e1f5896a65ef. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 49511.000 | 48239.000 | -1272.000 |
| Mean letters | 9.294 | 7.891 | -1.404 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.004303 | 0.005422 | 0.001119 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.145796 | 0.147394 | 0.001598 |
| trigrams / missingReferenceMass | 0.032711 | 0.038637 | 0.005926 |
| trigrams / unseenGeneratedMass | 0.008393 | 0.008495 | 0.000102 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/47059 (0.000%) | 0/43649 (0.000%) | 0.000 | -3410 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/47059 (0.000%) | 0/43649 (0.000%) | 0.000 | -3410 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/35119 (0.000%) | 0/26003 (0.000%) | 0.000 | -9116 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 35119/50000 (70.238%) | 26003/50000 (52.006%) | -18.232 | 0 | -18.480 to -17.750 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 5317/13325 (39.902%) | 8736/22895 (38.157%) | -1.746 | 9570 | -3.357 to -0.416 |
| Monosyllables with schwa as their sole nucleus / lower | 0/2941 (0.000%) | 0/6351 (0.000%) | 0.000 | 3410 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 45/2941 (1.530%) | 89/6351 (1.401%) | -0.129 | 3410 | -0.268 to +0.137 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 1908 | 3243 | 1335 |
| bare/syllables:2 | 6863 | 12913 | 6050 |
| bare/syllables:3 | 4086 | 5001 | 915 |
| bare/syllables:4 | 1510 | 2070 | 560 |
| bare/syllables:5 | 406 | 593 | 187 |
| bare/syllables:6 | 92 | 156 | 64 |
| bare/syllables:7 | 15 | 18 | 3 |
| bare/syllables:8 | 1 | 3 | 2 |
| both/syllables:2 | 166 | 412 | 246 |
| both/syllables:3 | 840 | 791 | -49 |
| both/syllables:4 | 1414 | 539 | -875 |
| both/syllables:5 | 1035 | 168 | -867 |
| both/syllables:6 | 423 | 23 | -400 |
| both/syllables:7 | 150 | 1 | -149 |
| both/syllables:8 | 39 | 0 | -39 |
| both/syllables:9 | 7 | 0 | -7 |
| prefixed/syllables:10 | 2 | 0 | -2 |
| prefixed/syllables:2 | 838 | 371 | -467 |
| prefixed/syllables:3 | 3093 | 386 | -2707 |
| prefixed/syllables:4 | 1990 | 206 | -1784 |
| prefixed/syllables:5 | 778 | 85 | -693 |
| prefixed/syllables:6 | 235 | 28 | -207 |
| prefixed/syllables:7 | 43 | 6 | -37 |
| prefixed/syllables:8 | 11 | 0 | -11 |
| suffixed/syllables:1 | 1033 | 3108 | 2075 |
| suffixed/syllables:10 | 1 | 0 | -1 |
| suffixed/syllables:2 | 5458 | 9199 | 3741 |
| suffixed/syllables:3 | 8450 | 7705 | -745 |
| suffixed/syllables:4 | 5757 | 2293 | -3464 |
| suffixed/syllables:5 | 2388 | 546 | -1842 |
| suffixed/syllables:6 | 763 | 119 | -644 |
| suffixed/syllables:7 | 174 | 14 | -160 |
| suffixed/syllables:8 | 26 | 3 | -23 |
| suffixed/syllables:9 | 5 | 0 | -5 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 47490.000 | 44679.000 | -2811.000 |
| Mean letters | 7.453 | 6.764 | -0.689 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000612 | 0.005249 | 0.004637 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.179647 | 0.181277 | 0.001631 |
| trigrams / missingReferenceMass | 0.054692 | 0.057945 | 0.003253 |
| trigrams / unseenGeneratedMass | 0.009716 | 0.009886 | 0.000170 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43414 (0.000%) | 0/39150 (0.000%) | 0.000 | -4264 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43414 (0.000%) | 0/39150 (0.000%) | 0.000 | -4264 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 9432/22933 (41.129%) | 10852/26708 (40.632%) | -0.496 | 3775 | -2.179 to +0.573 |
| Monosyllables with schwa as their sole nucleus / lower | 0/6586 (0.000%) | 0/10850 (0.000%) | 0.000 | 4264 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 107/6586 (1.625%) | 176/10850 (1.622%) | -0.003 | 4264 | -0.725 to +0.779 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 6586 | 10850 | 4264 |
| bare/syllables:2 | 22933 | 26708 | 3775 |
| bare/syllables:3 | 13722 | 8487 | -5235 |
| bare/syllables:4 | 4994 | 2987 | -2007 |
| bare/syllables:5 | 1416 | 776 | -640 |
| bare/syllables:6 | 291 | 167 | -124 |
| bare/syllables:7 | 48 | 22 | -26 |
| bare/syllables:8 | 9 | 3 | -6 |
| bare/syllables:9 | 1 | 0 | -1 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 16926.000 | 14942.000 | -1984.000 |
| Mean letters | 4.426 | 4.238 | -0.188 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.048436 | 0.044842 | -0.003593 |
| phonemes / missingReferenceMass | 0.000640 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.375804 | 0.347036 | -0.028769 |
| trigrams / missingReferenceMass | 0.312639 | 0.317180 | 0.004541 |
| trigrams / unseenGeneratedMass | 0.002077 | 0.002841 | 0.000764 |

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
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Monosyllables with schwa as their sole nucleus / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 813/50000 (1.626%) | 888/50000 (1.776%) | +0.150 | 0 | -0.150 to +0.340 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 39609.000 | 39609.000 | 0.000 |
| Mean letters | 6.688 | 6.688 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006365 | 0.006365 | 0.000000 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.157346 | 0.157346 | 0.000000 |
| trigrams / missingReferenceMass | 0.042831 | 0.042831 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.005918 | 0.005918 | 0.000000 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/28825 (0.000%) | 0/28825 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/28825 (0.000%) | 0/28825 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/22461 (0.000%) | 0/22461 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22461/50000 (44.922%) | 22461/50000 (44.922%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 6141/15178 (40.460%) | 6141/15178 (40.460%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables with schwa as their sole nucleus / lower | 0/21175 (0.000%) | 0/21175 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 326/21175 (1.540%) | 326/21175 (1.540%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17979 | 17979 | 0 |
| bare/syllables:2 | 5436 | 5436 | 0 |
| bare/syllables:3 | 2745 | 2745 | 0 |
| bare/syllables:4 | 1104 | 1104 | 0 |
| bare/syllables:5 | 251 | 251 | 0 |
| bare/syllables:6 | 24 | 24 | 0 |
| both/syllables:2 | 488 | 488 | 0 |
| both/syllables:3 | 1006 | 1006 | 0 |
| both/syllables:4 | 619 | 619 | 0 |
| both/syllables:5 | 270 | 270 | 0 |
| both/syllables:6 | 101 | 101 | 0 |
| both/syllables:7 | 25 | 25 | 0 |
| both/syllables:8 | 5 | 5 | 0 |
| both/syllables:9 | 1 | 1 | 0 |
| prefixed/syllables:2 | 3030 | 3030 | 0 |
| prefixed/syllables:3 | 1118 | 1118 | 0 |
| prefixed/syllables:4 | 569 | 569 | 0 |
| prefixed/syllables:5 | 191 | 191 | 0 |
| prefixed/syllables:6 | 57 | 57 | 0 |
| prefixed/syllables:7 | 10 | 10 | 0 |
| prefixed/syllables:8 | 1 | 1 | 0 |
| suffixed/syllables:1 | 3196 | 3196 | 0 |
| suffixed/syllables:2 | 6224 | 6224 | 0 |
| suffixed/syllables:3 | 3385 | 3385 | 0 |
| suffixed/syllables:4 | 1422 | 1422 | 0 |
| suffixed/syllables:5 | 560 | 560 | 0 |
| suffixed/syllables:6 | 151 | 151 | 0 |
| suffixed/syllables:7 | 29 | 29 | 0 |
| suffixed/syllables:8 | 3 | 3 | 0 |
