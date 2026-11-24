# Quality comparison: issue-496-z-only

Original baseline: issue-496-base. Cohort: development.

| Role | Run | Generator commit | Generator state | Source digest |
|---|---|---|---|---|
| baseline | issue-496-base | 7ae327884083cff177bff73a1f56cc54bada0ca6 | clean | a2b91592220b019ca566c3403ec97fdec9c1c750a7ffdd43b5f2dd0d152ac9b1 |
| candidate | issue-496-z-only | 7ae327884083cff177bff73a1f56cc54bada0ca6 | dirty (uncommitted generator changes) | 98933c02bf9c72548ab55d706aa786d1156b7efb870131d3faef077a4103ac5a |

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 1dfbe5d49efd9fe550910c417ff7b180220430c4b263ec2dee96e1f5896a65ef. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 48306.000 | 48290.000 | -16.000 |
| Mean letters | 7.790 | 7.782 | -0.008 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.005007 | 0.003748 | -0.001258 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.138463 | 0.138936 | 0.000473 |
| trigrams / missingReferenceMass | 0.040747 | 0.041163 | 0.000416 |
| trigrams / unseenGeneratedMass | 0.006746 | 0.007250 | 0.000504 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43573 (0.000%) | 0/43645 (0.000%) | 0.000 | 72 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43573 (0.000%) | 0/43645 (0.000%) | 0.000 | 72 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/25890 (0.000%) | 0/26032 (0.000%) | 0.000 | 142 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 25890/50000 (51.780%) | 26032/50000 (52.064%) | +0.284 | 0 | -0.740 to +1.760 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 5994/22985 (26.078%) | 5965/23218 (25.691%) | -0.387 | 233 | -1.506 to +0.137 |
| Monosyllables with schwa as their sole nucleus / lower | 0/6427 (0.000%) | 0/6355 (0.000%) | 0.000 | -72 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 117/6427 (1.820%) | 108/6355 (1.699%) | -0.121 | -72 | -0.777 to +0.953 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 3370 | 3300 | -70 |
| bare/syllables:2 | 12751 | 12875 | 124 |
| bare/syllables:3 | 5153 | 5065 | -88 |
| bare/syllables:4 | 2023 | 1941 | -82 |
| bare/syllables:5 | 627 | 577 | -50 |
| bare/syllables:6 | 159 | 185 | 26 |
| bare/syllables:7 | 27 | 24 | -3 |
| bare/syllables:8 | 0 | 1 | 1 |
| both/syllables:2 | 347 | 401 | 54 |
| both/syllables:3 | 754 | 795 | 41 |
| both/syllables:4 | 501 | 522 | 21 |
| both/syllables:5 | 122 | 148 | 26 |
| both/syllables:6 | 20 | 23 | 3 |
| both/syllables:7 | 2 | 0 | -2 |
| prefixed/syllables:2 | 377 | 331 | -46 |
| prefixed/syllables:3 | 432 | 436 | 4 |
| prefixed/syllables:4 | 242 | 242 | 0 |
| prefixed/syllables:5 | 76 | 86 | 10 |
| prefixed/syllables:6 | 25 | 30 | 5 |
| prefixed/syllables:7 | 3 | 2 | -1 |
| prefixed/syllables:8 | 0 | 1 | 1 |
| suffixed/syllables:1 | 3057 | 3055 | -2 |
| suffixed/syllables:2 | 9510 | 9611 | 101 |
| suffixed/syllables:3 | 7416 | 7428 | 12 |
| suffixed/syllables:4 | 2304 | 2213 | -91 |
| suffixed/syllables:5 | 589 | 593 | 4 |
| suffixed/syllables:6 | 99 | 101 | 2 |
| suffixed/syllables:7 | 11 | 11 | 0 |
| suffixed/syllables:8 | 3 | 2 | -1 |
| suffixed/syllables:9 | 0 | 1 | 1 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 44953.000 | 44915.000 | -38.000 |
| Mean letters | 6.694 | 6.692 | -0.002 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.004416 | 0.006835 | 0.002419 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.168506 | 0.172497 | 0.003991 |
| trigrams / missingReferenceMass | 0.055609 | 0.056129 | 0.000520 |
| trigrams / unseenGeneratedMass | 0.007994 | 0.008296 | 0.000302 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/39250 (0.000%) | 0/39258 (0.000%) | 0.000 | 8 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/39250 (0.000%) | 0/39258 (0.000%) | 0.000 | 8 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 7247/26470 (27.378%) | 7400/26522 (27.901%) | +0.523 | 52 | -0.419 to +1.860 |
| Monosyllables with schwa as their sole nucleus / lower | 0/10750 (0.000%) | 0/10742 (0.000%) | 0.000 | -8 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 214/10750 (1.991%) | 196/10742 (1.825%) | -0.166 | -8 | -0.886 to +0.436 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 10750 | 10742 | -8 |
| bare/syllables:2 | 26470 | 26522 | 52 |
| bare/syllables:3 | 8670 | 8731 | 61 |
| bare/syllables:4 | 3091 | 2973 | -118 |
| bare/syllables:5 | 802 | 821 | 19 |
| bare/syllables:6 | 184 | 190 | 6 |
| bare/syllables:7 | 31 | 19 | -12 |
| bare/syllables:8 | 2 | 2 | 0 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 14589.000 | 14589.000 | 0.000 |
| Mean letters | 4.278 | 4.278 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.043352 | 0.043352 | 0.000000 |
| phonemes / missingReferenceMass | 0.000640 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.330261 | 0.330261 | 0.000000 |
| trigrams / missingReferenceMass | 0.318374 | 0.318374 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.002441 | 0.002441 | 0.000000 |

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
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 961/50000 (1.922%) | 961/50000 (1.922%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 39507.000 | 39465.000 | -42.000 |
| Mean letters | 6.663 | 6.673 | +0.010 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006595 | 0.006736 | 0.000141 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.157675 | 0.157611 | -0.000064 |
| trigrams / missingReferenceMass | 0.043598 | 0.044273 | 0.000674 |
| trigrams / unseenGeneratedMass | 0.004920 | 0.004858 | -0.000062 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/28863 (0.000%) | 0/28877 (0.000%) | 0.000 | 14 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/28863 (0.000%) | 0/28877 (0.000%) | 0.000 | 14 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/22436 (0.000%) | 0/22516 (0.000%) | 0.000 | 80 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22436/50000 (44.872%) | 22516/50000 (45.032%) | +0.160 | 0 | -0.570 to +0.640 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 5251/15295 (34.331%) | 5214/15306 (34.065%) | -0.266 | 11 | -1.085 to +1.099 |
| Monosyllables with schwa as their sole nucleus / lower | 0/21137 (0.000%) | 0/21123 (0.000%) | 0.000 | -14 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 354/21137 (1.675%) | 356/21123 (1.685%) | +0.011 | -14 | -0.441 to +0.323 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17958 | 17914 | -44 |
| bare/syllables:2 | 5482 | 5470 | -12 |
| bare/syllables:3 | 2734 | 2700 | -34 |
| bare/syllables:4 | 1118 | 1152 | 34 |
| bare/syllables:5 | 256 | 224 | -32 |
| bare/syllables:6 | 16 | 24 | 8 |
| both/syllables:2 | 517 | 513 | -4 |
| both/syllables:3 | 999 | 1011 | 12 |
| both/syllables:4 | 604 | 558 | -46 |
| both/syllables:5 | 253 | 280 | 27 |
| both/syllables:6 | 102 | 92 | -10 |
| both/syllables:7 | 38 | 28 | -10 |
| both/syllables:8 | 3 | 4 | 1 |
| both/syllables:9 | 1 | 1 | 0 |
| prefixed/syllables:2 | 3057 | 2985 | -72 |
| prefixed/syllables:3 | 1141 | 1131 | -10 |
| prefixed/syllables:4 | 502 | 552 | 50 |
| prefixed/syllables:5 | 238 | 238 | 0 |
| prefixed/syllables:6 | 54 | 50 | -4 |
| prefixed/syllables:7 | 12 | 10 | -2 |
| suffixed/syllables:1 | 3179 | 3209 | 30 |
| suffixed/syllables:2 | 6239 | 6338 | 99 |
| suffixed/syllables:3 | 3364 | 3402 | 38 |
| suffixed/syllables:4 | 1369 | 1344 | -25 |
| suffixed/syllables:5 | 573 | 570 | -3 |
| suffixed/syllables:6 | 163 | 170 | 7 |
| suffixed/syllables:7 | 28 | 29 | 1 |
| suffixed/syllables:8 | 0 | 1 | 1 |
