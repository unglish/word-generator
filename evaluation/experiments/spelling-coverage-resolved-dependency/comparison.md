# Quality comparison: spelling-coverage-resolved-dependency

Original baseline: baseline-development-v1. Cohort: development. Previous step: spelling-coverage-dependency.

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 43501.000 | 43526.000 | +25.000 | 43527.000 | -1.000 |
| Mean letters | 7.462 | 7.456 | -0.006 | 7.456 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.007407 | 0.007699 | 0.000292 | 0.007699 | 0.000000 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.158592 | 0.154805 | -0.003788 | 0.155252 | -0.000448 |
| trigrams / missingReferenceMass | 0.034830 | 0.036510 | 0.001681 | 0.036510 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.010997 | 0.009564 | -0.001432 | 0.009564 | 0.000000 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 9342/45470 (20.545%) | 9477/45573 (20.795%) | +0.250 | 103 | -0.509 to +0.662 | 9477/45573 (20.795%) | 0.000 | 0 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/45470 (0.000%) | 0/45573 (0.000%) | 0.000 | 103 | 0.000 to 0.000 | 0/45573 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 1008/50000 (2.016%) | 972/50000 (1.944%) | -0.072 | 0 | -0.220 to +0.220 | 972/50000 (1.944%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 139/50000 (0.278%) | 131/50000 (0.262%) | -0.016 | 0 | -0.100 to +0.130 | 131/50000 (0.262%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 3862/34952 (11.049%) | 3885/35123 (11.061%) | +0.012 | 171 | -0.854 to +0.578 | 3885/35123 (11.061%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 1956/50000 (3.912%) | 0/50000 (0.000%) | -3.912 | 0 | -4.250 to -3.710 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 34952/50000 (69.904%) | 35123/50000 (70.246%) | +0.342 | 0 | -0.100 to +0.980 | 35123/50000 (70.246%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 180/50000 (0.360%) | 145/50000 (0.290%) | -0.070 | 0 | -0.170 to +0.040 | 145/50000 (0.290%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 4467/21065 (21.206%) | 4586/21133 (21.701%) | +0.495 | 68 | -0.104 to +1.822 | 4586/21133 (21.701%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables with schwa as their sole nucleus / lower | 899/4530 (19.845%) | 924/4427 (20.872%) | +1.026 | -103 | -2.174 to +5.486 | 924/4427 (20.872%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 746/50000 (1.492%) | 760/50000 (1.520%) | +0.028 | 0 | -0.110 to +0.200 | 760/50000 (1.520%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/4530 (0.000%) | 0/4427 (0.000%) | 0.000 | -103 | 0.000 to 0.000 | 0/4427 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 2013 | 1888 | -125 | 1888 | 0 |
| bare/syllables:2 | 6997 | 6934 | -63 | 6934 | 0 |
| bare/syllables:3 | 4100 | 4048 | -52 | 4048 | 0 |
| bare/syllables:4 | 1444 | 1558 | 114 | 1558 | 0 |
| bare/syllables:5 | 387 | 362 | -25 | 362 | 0 |
| bare/syllables:6 | 92 | 76 | -16 | 76 | 0 |
| bare/syllables:7 | 14 | 9 | -5 | 9 | 0 |
| bare/syllables:8 | 1 | 2 | 1 | 2 | 0 |
| both/syllables:2 | 1044 | 1038 | -6 | 1038 | 0 |
| both/syllables:3 | 1800 | 1842 | 42 | 1842 | 0 |
| both/syllables:4 | 929 | 918 | -11 | 918 | 0 |
| both/syllables:5 | 182 | 148 | -34 | 148 | 0 |
| both/syllables:6 | 20 | 40 | 20 | 40 | 0 |
| both/syllables:7 | 6 | 7 | 1 | 7 | 0 |
| prefixed/syllables:2 | 3302 | 3316 | 14 | 3316 | 0 |
| prefixed/syllables:3 | 2560 | 2578 | 18 | 2578 | 0 |
| prefixed/syllables:4 | 895 | 839 | -56 | 839 | 0 |
| prefixed/syllables:5 | 229 | 222 | -7 | 222 | 0 |
| prefixed/syllables:6 | 50 | 50 | 0 | 50 | 0 |
| prefixed/syllables:7 | 5 | 9 | 4 | 9 | 0 |
| prefixed/syllables:8 | 1 | 2 | 1 | 2 | 0 |
| suffixed/syllables:1 | 2517 | 2539 | 22 | 2539 | 0 |
| suffixed/syllables:2 | 9722 | 9845 | 123 | 9845 | 0 |
| suffixed/syllables:3 | 8058 | 8088 | 30 | 8088 | 0 |
| suffixed/syllables:4 | 2733 | 2739 | 6 | 2739 | 0 |
| suffixed/syllables:5 | 711 | 720 | 9 | 720 | 0 |
| suffixed/syllables:6 | 152 | 155 | 3 | 155 | 0 |
| suffixed/syllables:7 | 26 | 25 | -1 | 25 | 0 |
| suffixed/syllables:8 | 10 | 3 | -7 | 3 | 0 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 47126.000 | 47176.000 | +50.000 | 47176.000 | 0.000 |
| Mean letters | 7.418 | 7.391 | -0.027 | 7.391 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000168 | 0.000247 | 0.000079 | 0.000247 | 0.000000 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.183856 | 0.178488 | -0.005368 | 0.178488 | 0.000000 |
| trigrams / missingReferenceMass | 0.049072 | 0.054642 | 0.005570 | 0.054642 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.012432 | 0.011296 | -0.001135 | 0.011296 | 0.000000 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43577 (0.000%) | 0/43501 (0.000%) | 0.000 | -76 | 0.000 to 0.000 | 0/43501 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43577 (0.000%) | 0/43501 (0.000%) | 0.000 | -76 | 0.000 to 0.000 | 0/43501 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 3016/50000 (6.032%) | 0/50000 (0.000%) | -6.032 | 0 | -6.270 to -5.680 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 272/50000 (0.544%) | 243/50000 (0.486%) | -0.058 | 0 | -0.120 to +0.030 | 243/50000 (0.486%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 9320/22919 (40.665%) | 9575/23114 (41.425%) | +0.760 | 195 | -0.744 to +1.742 | 9575/23114 (41.425%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables with schwa as their sole nucleus / lower | 1322/6423 (20.582%) | 1268/6499 (19.511%) | -1.072 | 76 | -2.615 to +0.014 | 1268/6499 (19.511%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 1391/50000 (2.782%) | 1243/50000 (2.486%) | -0.296 | 0 | -0.500 to +0.120 | 1243/50000 (2.486%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/6423 (0.000%) | 0/6499 (0.000%) | 0.000 | 76 | 0.000 to 0.000 | 0/6499 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 6423 | 6499 | 76 | 6499 | 0 |
| bare/syllables:2 | 22919 | 23114 | 195 | 23114 | 0 |
| bare/syllables:3 | 13869 | 13703 | -166 | 13703 | 0 |
| bare/syllables:4 | 5007 | 4935 | -72 | 4935 | 0 |
| bare/syllables:5 | 1427 | 1411 | -16 | 1411 | 0 |
| bare/syllables:6 | 308 | 290 | -18 | 290 | 0 |
| bare/syllables:7 | 43 | 40 | -3 | 40 | 0 |
| bare/syllables:8 | 3 | 6 | 3 | 6 | 0 |
| bare/syllables:9 | 1 | 2 | 1 | 2 | 0 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 14397.000 | 15025.000 | +628.000 | 15025.000 | 0.000 |
| Mean letters | 5.417 | 5.414 | -0.004 | 5.414 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.092157 | 0.092927 | 0.000770 | 0.092927 | 0.000000 |
| phonemes / missingReferenceMass | 0.003390 | 0.003390 | 0.000000 | 0.003390 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.525918 | 0.517877 | -0.008041 | 0.517877 | 0.000000 |
| trigrams / missingReferenceMass | 0.374662 | 0.358098 | -0.016564 | 0.358098 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.002265 | 0.004382 | 0.002117 | 0.004382 | 0.000000 |

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
| Words with adjacent identical coda segments / lower | 5429/50000 (10.858%) | 5306/50000 (10.612%) | -0.246 | 0 | -0.650 to +0.260 | 5306/50000 (10.612%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Monosyllables with schwa as their sole nucleus / lower | 10762/50000 (21.524%) | 10720/50000 (21.440%) | -0.084 | 0 | -0.810 to +0.800 | 10720/50000 (21.440%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 218/50000 (0.436%) | 233/50000 (0.466%) | +0.030 | 0 | -0.060 to +0.150 | 233/50000 (0.466%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 28443.000 | 28615.000 | +172.000 | 28615.000 | 0.000 |
| Mean letters | 5.613 | 5.612 | -0.001 | 5.612 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.011102 | 0.010817 | -0.000286 | 0.010817 | 0.000000 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.184480 | 0.181784 | -0.002696 | 0.182046 | -0.000262 |
| trigrams / missingReferenceMass | 0.051142 | 0.047628 | -0.003514 | 0.048047 | -0.000419 |
| trigrams / unseenGeneratedMass | 0.009437 | 0.009557 | 0.000120 | 0.009557 | -0.000000 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 9947/27246 (36.508%) | 10037/27312 (36.749%) | +0.241 | 66 | -0.884 to +0.867 | 10037/27312 (36.749%) | 0.000 | 0 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/27246 (0.000%) | 0/27312 (0.000%) | 0.000 | 66 | 0.000 to 0.000 | 0/27312 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 593/50000 (1.186%) | 552/50000 (1.104%) | -0.082 | 0 | -0.320 to +0.200 | 552/50000 (1.104%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 25/50000 (0.050%) | 26/50000 (0.052%) | +0.002 | 0 | -0.030 to +0.050 | 26/50000 (0.052%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 4481/22557 (19.865%) | 4595/22328 (20.580%) | +0.714 | -229 | -0.453 to +1.720 | 4595/22328 (20.580%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 864/50000 (1.728%) | 0/50000 (0.000%) | -1.728 | 0 | -1.850 to -1.570 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22557/50000 (45.114%) | 22328/50000 (44.656%) | -0.458 | 0 | -0.980 to +0.110 | 22328/50000 (44.656%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 167/50000 (0.334%) | 166/50000 (0.332%) | -0.002 | 0 | -0.070 to +0.140 | 166/50000 (0.332%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 2453/17103 (14.343%) | 2485/17191 (14.455%) | +0.113 | 88 | -0.385 to +0.455 | 2485/17191 (14.455%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables with schwa as their sole nucleus / lower | 4476/22754 (19.671%) | 4468/22688 (19.693%) | +0.022 | -66 | -1.742 to +1.139 | 4468/22688 (19.693%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 966/50000 (1.932%) | 992/50000 (1.984%) | +0.052 | 0 | -0.150 to +0.220 | 992/50000 (1.984%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/22754 (0.000%) | 0/22688 (0.000%) | 0.000 | -66 | 0.000 to 0.000 | 0/22688 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 17931 | 18051 | 120 | 18051 | 0 |
| bare/syllables:2 | 5435 | 5498 | 63 | 5498 | 0 |
| bare/syllables:3 | 2713 | 2706 | -7 | 2706 | 0 |
| bare/syllables:4 | 1105 | 1156 | 51 | 1156 | 0 |
| bare/syllables:5 | 234 | 231 | -3 | 231 | 0 |
| bare/syllables:6 | 25 | 30 | 5 | 30 | 0 |
| both/syllables:2 | 912 | 936 | 24 | 936 | 0 |
| both/syllables:3 | 1110 | 1080 | -30 | 1080 | 0 |
| both/syllables:4 | 465 | 407 | -58 | 407 | 0 |
| both/syllables:5 | 47 | 56 | 9 | 56 | 0 |
| both/syllables:6 | 5 | 4 | -1 | 4 | 0 |
| both/syllables:7 | 2 | 0 | -2 | 0 | 0 |
| prefixed/syllables:2 | 4081 | 4102 | 21 | 4102 | 0 |
| prefixed/syllables:3 | 573 | 629 | 56 | 629 | 0 |
| prefixed/syllables:4 | 208 | 205 | -3 | 205 | 0 |
| prefixed/syllables:5 | 60 | 65 | 5 | 65 | 0 |
| prefixed/syllables:6 | 9 | 8 | -1 | 8 | 0 |
| prefixed/syllables:7 | 0 | 1 | 1 | 1 | 0 |
| suffixed/syllables:1 | 4823 | 4637 | -186 | 4637 | 0 |
| suffixed/syllables:2 | 6675 | 6655 | -20 | 6655 | 0 |
| suffixed/syllables:3 | 2861 | 2847 | -14 | 2847 | 0 |
| suffixed/syllables:4 | 507 | 488 | -19 | 488 | 0 |
| suffixed/syllables:5 | 186 | 178 | -8 | 178 | 0 |
| suffixed/syllables:6 | 29 | 27 | -2 | 27 | 0 |
| suffixed/syllables:7 | 4 | 2 | -2 | 2 | 0 |
| suffixed/syllables:8 | 0 | 1 | 1 | 1 | 0 |
