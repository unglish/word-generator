# Quality comparison: issue-499-final

Original baseline: issue-499-base. Cohort: development.

| Role | Run | Generator commit | Generator state | Source digest |
|---|---|---|---|---|
| baseline | issue-499-base | c83e5e57e6ab0b3d9b91eec75b2f73780951c777 | clean | 6ca2afb45cb5af2b2e0d40affc5a018aa66f5f9e106899c8d4dca88e7256449e |
| candidate | issue-499-final | c83e5e57e6ab0b3d9b91eec75b2f73780951c777 | dirty (uncommitted generator changes) | 9c52e172f97465a4f9602cf213a1d137587c81f17a490e251205c9efdea628c6 |

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 1dfbe5d49efd9fe550910c417ff7b180220430c4b263ec2dee96e1f5896a65ef. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 48290.000 | 48326.000 | +36.000 |
| Mean letters | 7.782 | 7.787 | +0.005 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.003748 | 0.003986 | 0.000238 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.138936 | 0.138099 | -0.000837 |
| trigrams / missingReferenceMass | 0.041163 | 0.040522 | -0.000641 |
| trigrams / unseenGeneratedMass | 0.007250 | 0.006539 | -0.000711 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43645 (0.000%) | 0/43648 (0.000%) | 0.000 | 3 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43645 (0.000%) | 0/43648 (0.000%) | 0.000 | 3 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/26032 (0.000%) | 0/25956 (0.000%) | 0.000 | -76 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 26032/50000 (52.064%) | 25956/50000 (51.912%) | -0.152 | 0 | -0.660 to +0.120 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 5965/23218 (25.691%) | 5983/23311 (25.666%) | -0.025 | 93 | -0.993 to +0.689 |
| Monosyllables with schwa as their sole nucleus / lower | 0/6355 (0.000%) | 0/6352 (0.000%) | 0.000 | -3 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 108/6355 (1.699%) | 122/6352 (1.921%) | +0.221 | -3 | -0.247 to +0.785 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 3300 | 3313 | 13 |
| bare/syllables:2 | 12875 | 12905 | 30 |
| bare/syllables:3 | 5065 | 5033 | -32 |
| bare/syllables:4 | 1941 | 1955 | 14 |
| bare/syllables:5 | 577 | 649 | 72 |
| bare/syllables:6 | 185 | 155 | -30 |
| bare/syllables:7 | 24 | 32 | 8 |
| bare/syllables:8 | 1 | 2 | 1 |
| both/syllables:2 | 401 | 427 | 26 |
| both/syllables:3 | 795 | 809 | 14 |
| both/syllables:4 | 522 | 501 | -21 |
| both/syllables:5 | 148 | 121 | -27 |
| both/syllables:6 | 23 | 26 | 3 |
| both/syllables:7 | 0 | 2 | 2 |
| both/syllables:8 | 0 | 1 | 1 |
| prefixed/syllables:2 | 331 | 359 | 28 |
| prefixed/syllables:3 | 436 | 394 | -42 |
| prefixed/syllables:4 | 242 | 215 | -27 |
| prefixed/syllables:5 | 86 | 79 | -7 |
| prefixed/syllables:6 | 30 | 27 | -3 |
| prefixed/syllables:7 | 2 | 2 | 0 |
| prefixed/syllables:8 | 1 | 1 | 0 |
| suffixed/syllables:1 | 3055 | 3039 | -16 |
| suffixed/syllables:2 | 9611 | 9620 | 9 |
| suffixed/syllables:3 | 7428 | 7390 | -38 |
| suffixed/syllables:4 | 2213 | 2236 | 23 |
| suffixed/syllables:5 | 593 | 586 | -7 |
| suffixed/syllables:6 | 101 | 103 | 2 |
| suffixed/syllables:7 | 11 | 14 | 3 |
| suffixed/syllables:8 | 2 | 4 | 2 |
| suffixed/syllables:9 | 1 | 0 | -1 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 44915.000 | 44892.000 | -23.000 |
| Mean letters | 6.692 | 6.701 | +0.009 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006835 | 0.006171 | -0.000664 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.172497 | 0.169288 | -0.003210 |
| trigrams / missingReferenceMass | 0.056129 | 0.058893 | 0.002764 |
| trigrams / unseenGeneratedMass | 0.008296 | 0.007726 | -0.000569 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/39258 (0.000%) | 0/39236 (0.000%) | 0.000 | -22 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/39258 (0.000%) | 0/39236 (0.000%) | 0.000 | -22 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 7400/26522 (27.901%) | 7419/26463 (28.035%) | +0.134 | -59 | -1.095 to +0.675 |
| Monosyllables with schwa as their sole nucleus / lower | 0/10742 (0.000%) | 0/10764 (0.000%) | 0.000 | 22 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 196/10742 (1.825%) | 242/10764 (2.248%) | +0.424 | 22 | -0.011 to +1.138 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 10742 | 10764 | 22 |
| bare/syllables:2 | 26522 | 26463 | -59 |
| bare/syllables:3 | 8731 | 8689 | -42 |
| bare/syllables:4 | 2973 | 3043 | 70 |
| bare/syllables:5 | 821 | 852 | 31 |
| bare/syllables:6 | 190 | 164 | -26 |
| bare/syllables:7 | 19 | 24 | 5 |
| bare/syllables:8 | 2 | 1 | -1 |

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
| Unique spellings | 39465.000 | 39535.000 | +70.000 |
| Mean letters | 6.673 | 6.674 | +0.002 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006736 | 0.006791 | 0.000056 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.157611 | 0.157157 | -0.000454 |
| trigrams / missingReferenceMass | 0.044273 | 0.046377 | 0.002104 |
| trigrams / unseenGeneratedMass | 0.004858 | 0.004780 | -0.000079 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/28877 (0.000%) | 0/28924 (0.000%) | 0.000 | 47 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/28877 (0.000%) | 0/28924 (0.000%) | 0.000 | 47 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/22516 (0.000%) | 0/22611 (0.000%) | 0.000 | 95 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22516/50000 (45.032%) | 22611/50000 (45.222%) | +0.190 | 0 | -0.580 to +0.940 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 5214/15306 (34.065%) | 5261/15115 (34.806%) | +0.741 | -191 | +0.408 to +1.671 |
| Monosyllables with schwa as their sole nucleus / lower | 0/21123 (0.000%) | 0/21076 (0.000%) | 0.000 | -47 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 356/21123 (1.685%) | 354/21076 (1.680%) | -0.006 | -47 | -0.206 to +0.158 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17914 | 17874 | -40 |
| bare/syllables:2 | 5470 | 5360 | -110 |
| bare/syllables:3 | 2700 | 2759 | 59 |
| bare/syllables:4 | 1152 | 1131 | -21 |
| bare/syllables:5 | 224 | 232 | 8 |
| bare/syllables:6 | 24 | 33 | 9 |
| both/syllables:2 | 513 | 524 | 11 |
| both/syllables:3 | 1011 | 1013 | 2 |
| both/syllables:4 | 558 | 589 | 31 |
| both/syllables:5 | 280 | 279 | -1 |
| both/syllables:6 | 92 | 94 | 2 |
| both/syllables:7 | 28 | 28 | 0 |
| both/syllables:8 | 4 | 6 | 2 |
| both/syllables:9 | 1 | 1 | 0 |
| prefixed/syllables:2 | 2985 | 3035 | 50 |
| prefixed/syllables:3 | 1131 | 1154 | 23 |
| prefixed/syllables:4 | 552 | 578 | 26 |
| prefixed/syllables:5 | 238 | 216 | -22 |
| prefixed/syllables:6 | 50 | 52 | 2 |
| prefixed/syllables:7 | 10 | 4 | -6 |
| suffixed/syllables:1 | 3209 | 3202 | -7 |
| suffixed/syllables:2 | 6338 | 6196 | -142 |
| suffixed/syllables:3 | 3402 | 3562 | 160 |
| suffixed/syllables:4 | 1344 | 1324 | -20 |
| suffixed/syllables:5 | 570 | 582 | 12 |
| suffixed/syllables:6 | 170 | 149 | -21 |
| suffixed/syllables:7 | 29 | 22 | -7 |
| suffixed/syllables:8 | 1 | 1 | 0 |
