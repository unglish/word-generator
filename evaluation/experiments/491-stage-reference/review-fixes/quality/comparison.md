# Quality comparison: stage-reference-review-502-final

Original baseline: phase1-491. Cohort: development.

| Role | Run | Generator commit | Generator state | Source digest |
|---|---|---|---|---|
| baseline | phase1-491 | 0de88f5cd4ab51fe2485e38698ca8f528f804a34 | clean | ec8873df300360ed146f6853a3d271c3f2a6b1c52222331eb83c9587b1d8a3c1 |
| candidate | stage-reference-review-502-final | b91ae3c470cf8676d12a6510e51efd97a2944eb3 | clean | dc3d5dd284bebfe9be60fe818c175eee4824de418e809c13db8cebd5a8b8fb30 |

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 1dfbe5d49efd9fe550910c417ff7b180220430c4b263ec2dee96e1f5896a65ef. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 49511.000 | 48331.000 | -1180.000 |
| Mean letters | 9.294 | 7.911 | -1.383 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.004303 | 0.005209 | 0.000906 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.145796 | 0.146519 | 0.000723 |
| trigrams / missingReferenceMass | 0.032711 | 0.039393 | 0.006682 |
| trigrams / unseenGeneratedMass | 0.008393 | 0.008780 | 0.000387 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/47059 (0.000%) | 0/43699 (0.000%) | 0.000 | -3360 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/47059 (0.000%) | 0/43699 (0.000%) | 0.000 | -3360 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/35119 (0.000%) | 0/26181 (0.000%) | 0.000 | -8938 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 35119/50000 (70.238%) | 26181/50000 (52.362%) | -17.876 | 0 | -18.490 to -17.220 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 5317/13325 (39.902%) | 8592/23073 (37.238%) | -2.664 | 9748 | -4.429 to -0.390 |
| Monosyllables with schwa as their sole nucleus / lower | 0/2941 (0.000%) | 0/6301 (0.000%) | 0.000 | 3360 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 45/2941 (1.530%) | 114/6301 (1.809%) | +0.279 | 3360 | -0.065 to +0.651 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 1908 | 3243 | 1335 |
| bare/syllables:2 | 6863 | 12672 | 5809 |
| bare/syllables:3 | 4086 | 5111 | 1025 |
| bare/syllables:4 | 1510 | 1958 | 448 |
| bare/syllables:5 | 406 | 657 | 251 |
| bare/syllables:6 | 92 | 151 | 59 |
| bare/syllables:7 | 15 | 26 | 11 |
| bare/syllables:8 | 1 | 1 | 0 |
| both/syllables:2 | 166 | 401 | 235 |
| both/syllables:3 | 840 | 817 | -23 |
| both/syllables:4 | 1414 | 558 | -856 |
| both/syllables:5 | 1035 | 142 | -893 |
| both/syllables:6 | 423 | 24 | -399 |
| both/syllables:7 | 150 | 3 | -147 |
| both/syllables:8 | 39 | 0 | -39 |
| both/syllables:9 | 7 | 0 | -7 |
| prefixed/syllables:10 | 2 | 0 | -2 |
| prefixed/syllables:2 | 838 | 349 | -489 |
| prefixed/syllables:3 | 3093 | 442 | -2651 |
| prefixed/syllables:4 | 1990 | 209 | -1781 |
| prefixed/syllables:5 | 778 | 97 | -681 |
| prefixed/syllables:6 | 235 | 30 | -205 |
| prefixed/syllables:7 | 43 | 6 | -37 |
| prefixed/syllables:8 | 11 | 1 | -10 |
| suffixed/syllables:1 | 1033 | 3058 | 2025 |
| suffixed/syllables:10 | 1 | 0 | -1 |
| suffixed/syllables:2 | 5458 | 9651 | 4193 |
| suffixed/syllables:3 | 8450 | 7472 | -978 |
| suffixed/syllables:4 | 5757 | 2257 | -3500 |
| suffixed/syllables:5 | 2388 | 551 | -1837 |
| suffixed/syllables:6 | 763 | 92 | -671 |
| suffixed/syllables:7 | 174 | 16 | -158 |
| suffixed/syllables:8 | 26 | 5 | -21 |
| suffixed/syllables:9 | 5 | 0 | -5 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 47490.000 | 45080.000 | -2410.000 |
| Mean letters | 7.453 | 6.798 | -0.655 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000612 | 0.005191 | 0.004578 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.179647 | 0.177938 | -0.001709 |
| trigrams / missingReferenceMass | 0.054692 | 0.057501 | 0.002808 |
| trigrams / unseenGeneratedMass | 0.009716 | 0.010779 | 0.001063 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43414 (0.000%) | 0/39237 (0.000%) | 0.000 | -4177 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43414 (0.000%) | 0/39237 (0.000%) | 0.000 | -4177 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 9432/22933 (41.129%) | 10905/26503 (41.146%) | +0.018 | 3570 | -0.703 to +1.359 |
| Monosyllables with schwa as their sole nucleus / lower | 0/6586 (0.000%) | 0/10763 (0.000%) | 0.000 | 4177 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 107/6586 (1.625%) | 192/10763 (1.784%) | +0.159 | 4177 | -0.132 to +0.317 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 6586 | 10763 | 4177 |
| bare/syllables:2 | 22933 | 26503 | 3570 |
| bare/syllables:3 | 13722 | 8593 | -5129 |
| bare/syllables:4 | 4994 | 3062 | -1932 |
| bare/syllables:5 | 1416 | 887 | -529 |
| bare/syllables:6 | 291 | 170 | -121 |
| bare/syllables:7 | 48 | 20 | -28 |
| bare/syllables:8 | 9 | 2 | -7 |
| bare/syllables:9 | 1 | 0 | -1 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 16926.000 | 15040.000 | -1886.000 |
| Mean letters | 4.426 | 4.281 | -0.145 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.048436 | 0.043490 | -0.004945 |
| phonemes / missingReferenceMass | 0.000640 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.375804 | 0.330885 | -0.044919 |
| trigrams / missingReferenceMass | 0.312639 | 0.318002 | 0.005363 |
| trigrams / unseenGeneratedMass | 0.002077 | 0.002507 | 0.000430 |

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
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 813/50000 (1.626%) | 961/50000 (1.922%) | +0.296 | 0 | +0.100 to +0.550 |

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
