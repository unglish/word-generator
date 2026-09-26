# Quality comparison: spelling-coverage-dependency

Original baseline: baseline-development-v1. Cohort: development. Previous step: base-spelling-control.

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 43501.000 | 43527.000 | +26.000 | 43501.000 | +26.000 |
| Mean letters | 7.462 | 7.456 | -0.006 | 7.462 | -0.006 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.007407 | 0.007699 | 0.000292 | 0.007407 | 0.000292 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.158592 | 0.155252 | -0.003340 | 0.158592 | -0.003340 |
| trigrams / missingReferenceMass | 0.034830 | 0.036510 | 0.001681 | 0.034830 | 0.001681 |
| trigrams / unseenGeneratedMass | 0.010997 | 0.009564 | -0.001432 | 0.010997 | -0.001432 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 9342/45470 (20.545%) | 9477/45573 (20.795%) | +0.250 | 103 | -0.509 to +0.662 | 9342/45470 (20.545%) | +0.250 | 103 | -0.509 to +0.662 |
| Polysyllables with multiple primary stresses / lower | 0/45470 (0.000%) | 0/45573 (0.000%) | 0.000 | 103 | 0.000 to 0.000 | 0/45470 (0.000%) | 0.000 | 103 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 1008/50000 (2.016%) | 972/50000 (1.944%) | -0.072 | 0 | -0.220 to +0.220 | 1008/50000 (2.016%) | -0.072 | 0 | -0.220 to +0.220 |
| Words with a primary-stressed reduced vowel / lower | 139/50000 (0.278%) | 131/50000 (0.262%) | -0.016 | 0 | -0.100 to +0.130 | 139/50000 (0.278%) | -0.016 | 0 | -0.100 to +0.130 |
| Affixed words with a morphological hiatus fallback / lower | 3862/34952 (11.049%) | 3885/35123 (11.061%) | +0.012 | 171 | -0.854 to +0.578 | 3862/34952 (11.049%) | +0.012 | 171 | -0.854 to +0.578 |
| Words with a zero-total-weight grapheme choice / lower | 1956/50000 (3.912%) | 0/50000 (0.000%) | -3.912 | 0 | -4.250 to -3.710 | 1956/50000 (3.912%) | -3.912 | 0 | -4.250 to -3.710 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 34952/50000 (69.904%) | 35123/50000 (70.246%) | +0.342 | 0 | -0.100 to +0.980 | 34952/50000 (69.904%) | +0.342 | 0 | -0.100 to +0.980 |
| Words with adjacent identical coda segments / lower | 180/50000 (0.360%) | 145/50000 (0.290%) | -0.070 | 0 | -0.170 to +0.040 | 180/50000 (0.360%) | -0.070 | 0 | -0.170 to +0.040 |
| Disyllables with adjacent primary and secondary stress / lower | 4467/21065 (21.206%) | 4586/21133 (21.701%) | +0.495 | 68 | -0.104 to +1.822 | 4467/21065 (21.206%) | +0.495 | 68 | -0.104 to +1.822 |
| Monosyllables with schwa as their sole nucleus / lower | 899/4530 (19.845%) | 924/4427 (20.872%) | +1.026 | -103 | -2.174 to +5.486 | 899/4530 (19.845%) | +1.026 | -103 | -2.174 to +5.486 |
| Words ending in an open checked vowel / lower | 746/50000 (1.492%) | 760/50000 (1.520%) | +0.028 | 0 | -0.110 to +0.200 | 746/50000 (1.492%) | +0.028 | 0 | -0.110 to +0.200 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/4530 (0.000%) | 0/4427 (0.000%) | 0.000 | -103 | 0.000 to 0.000 | 0/4530 (0.000%) | 0.000 | -103 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 2013 | 1888 | -125 | 2013 | -125 |
| bare/syllables:2 | 6997 | 6934 | -63 | 6997 | -63 |
| bare/syllables:3 | 4100 | 4048 | -52 | 4100 | -52 |
| bare/syllables:4 | 1444 | 1558 | 114 | 1444 | 114 |
| bare/syllables:5 | 387 | 362 | -25 | 387 | -25 |
| bare/syllables:6 | 92 | 76 | -16 | 92 | -16 |
| bare/syllables:7 | 14 | 9 | -5 | 14 | -5 |
| bare/syllables:8 | 1 | 2 | 1 | 1 | 1 |
| both/syllables:2 | 1044 | 1038 | -6 | 1044 | -6 |
| both/syllables:3 | 1800 | 1842 | 42 | 1800 | 42 |
| both/syllables:4 | 929 | 918 | -11 | 929 | -11 |
| both/syllables:5 | 182 | 148 | -34 | 182 | -34 |
| both/syllables:6 | 20 | 40 | 20 | 20 | 20 |
| both/syllables:7 | 6 | 7 | 1 | 6 | 1 |
| prefixed/syllables:2 | 3302 | 3316 | 14 | 3302 | 14 |
| prefixed/syllables:3 | 2560 | 2578 | 18 | 2560 | 18 |
| prefixed/syllables:4 | 895 | 839 | -56 | 895 | -56 |
| prefixed/syllables:5 | 229 | 222 | -7 | 229 | -7 |
| prefixed/syllables:6 | 50 | 50 | 0 | 50 | 0 |
| prefixed/syllables:7 | 5 | 9 | 4 | 5 | 4 |
| prefixed/syllables:8 | 1 | 2 | 1 | 1 | 1 |
| suffixed/syllables:1 | 2517 | 2539 | 22 | 2517 | 22 |
| suffixed/syllables:2 | 9722 | 9845 | 123 | 9722 | 123 |
| suffixed/syllables:3 | 8058 | 8088 | 30 | 8058 | 30 |
| suffixed/syllables:4 | 2733 | 2739 | 6 | 2733 | 6 |
| suffixed/syllables:5 | 711 | 720 | 9 | 711 | 9 |
| suffixed/syllables:6 | 152 | 155 | 3 | 152 | 3 |
| suffixed/syllables:7 | 26 | 25 | -1 | 26 | -1 |
| suffixed/syllables:8 | 10 | 3 | -7 | 10 | -7 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 47126.000 | 47176.000 | +50.000 | 47126.000 | +50.000 |
| Mean letters | 7.418 | 7.391 | -0.027 | 7.418 | -0.027 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000168 | 0.000247 | 0.000079 | 0.000168 | 0.000079 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.183856 | 0.178488 | -0.005368 | 0.183856 | -0.005368 |
| trigrams / missingReferenceMass | 0.049072 | 0.054642 | 0.005570 | 0.049072 | 0.005570 |
| trigrams / unseenGeneratedMass | 0.012432 | 0.011296 | -0.001135 | 0.012432 | -0.001135 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43577 (0.000%) | 0/43501 (0.000%) | 0.000 | -76 | 0.000 to 0.000 | 0/43577 (0.000%) | 0.000 | -76 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43577 (0.000%) | 0/43501 (0.000%) | 0.000 | -76 | 0.000 to 0.000 | 0/43577 (0.000%) | 0.000 | -76 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 3016/50000 (6.032%) | 0/50000 (0.000%) | -6.032 | 0 | -6.270 to -5.680 | 3016/50000 (6.032%) | -6.032 | 0 | -6.270 to -5.680 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 272/50000 (0.544%) | 243/50000 (0.486%) | -0.058 | 0 | -0.120 to +0.030 | 272/50000 (0.544%) | -0.058 | 0 | -0.120 to +0.030 |
| Disyllables with adjacent primary and secondary stress / lower | 9320/22919 (40.665%) | 9575/23114 (41.425%) | +0.760 | 195 | -0.744 to +1.742 | 9320/22919 (40.665%) | +0.760 | 195 | -0.744 to +1.742 |
| Monosyllables with schwa as their sole nucleus / lower | 1322/6423 (20.582%) | 1268/6499 (19.511%) | -1.072 | 76 | -2.615 to +0.014 | 1322/6423 (20.582%) | -1.072 | 76 | -2.615 to +0.014 |
| Words ending in an open checked vowel / lower | 1391/50000 (2.782%) | 1243/50000 (2.486%) | -0.296 | 0 | -0.500 to +0.120 | 1391/50000 (2.782%) | -0.296 | 0 | -0.500 to +0.120 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/6423 (0.000%) | 0/6499 (0.000%) | 0.000 | 76 | 0.000 to 0.000 | 0/6423 (0.000%) | 0.000 | 76 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 6423 | 6499 | 76 | 6423 | 76 |
| bare/syllables:2 | 22919 | 23114 | 195 | 22919 | 195 |
| bare/syllables:3 | 13869 | 13703 | -166 | 13869 | -166 |
| bare/syllables:4 | 5007 | 4935 | -72 | 5007 | -72 |
| bare/syllables:5 | 1427 | 1411 | -16 | 1427 | -16 |
| bare/syllables:6 | 308 | 290 | -18 | 308 | -18 |
| bare/syllables:7 | 43 | 40 | -3 | 43 | -3 |
| bare/syllables:8 | 3 | 6 | 3 | 3 | 3 |
| bare/syllables:9 | 1 | 2 | 1 | 1 | 1 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 14397.000 | 15025.000 | +628.000 | 14397.000 | +628.000 |
| Mean letters | 5.417 | 5.414 | -0.004 | 5.417 | -0.004 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.092157 | 0.092927 | 0.000770 | 0.092157 | 0.000770 |
| phonemes / missingReferenceMass | 0.003390 | 0.003390 | 0.000000 | 0.003390 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.525918 | 0.517877 | -0.008041 | 0.525918 | -0.008041 |
| trigrams / missingReferenceMass | 0.374662 | 0.358098 | -0.016564 | 0.374662 | -0.016564 |
| trigrams / unseenGeneratedMass | 0.002265 | 0.004382 | 0.002117 | 0.002265 | 0.002117 |

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
| Words with adjacent identical coda segments / lower | 5429/50000 (10.858%) | 5306/50000 (10.612%) | -0.246 | 0 | -0.650 to +0.260 | 5429/50000 (10.858%) | -0.246 | 0 | -0.650 to +0.260 |
| Disyllables with adjacent primary and secondary stress / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Monosyllables with schwa as their sole nucleus / lower | 10762/50000 (21.524%) | 10720/50000 (21.440%) | -0.084 | 0 | -0.810 to +0.800 | 10762/50000 (21.524%) | -0.084 | 0 | -0.810 to +0.800 |
| Words ending in an open checked vowel / lower | 218/50000 (0.436%) | 233/50000 (0.466%) | +0.030 | 0 | -0.060 to +0.150 | 218/50000 (0.436%) | +0.030 | 0 | -0.060 to +0.150 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 28443.000 | 28615.000 | +172.000 | 28443.000 | +172.000 |
| Mean letters | 5.613 | 5.612 | -0.001 | 5.613 | -0.001 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.011102 | 0.010817 | -0.000286 | 0.011102 | -0.000286 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.184480 | 0.182046 | -0.002434 | 0.184480 | -0.002434 |
| trigrams / missingReferenceMass | 0.051142 | 0.048047 | -0.003095 | 0.051142 | -0.003095 |
| trigrams / unseenGeneratedMass | 0.009437 | 0.009557 | 0.000120 | 0.009437 | 0.000120 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 9947/27246 (36.508%) | 10037/27312 (36.749%) | +0.241 | 66 | -0.884 to +0.867 | 9947/27246 (36.508%) | +0.241 | 66 | -0.884 to +0.867 |
| Polysyllables with multiple primary stresses / lower | 0/27246 (0.000%) | 0/27312 (0.000%) | 0.000 | 66 | 0.000 to 0.000 | 0/27246 (0.000%) | 0.000 | 66 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 593/50000 (1.186%) | 552/50000 (1.104%) | -0.082 | 0 | -0.320 to +0.200 | 593/50000 (1.186%) | -0.082 | 0 | -0.320 to +0.200 |
| Words with a primary-stressed reduced vowel / lower | 25/50000 (0.050%) | 26/50000 (0.052%) | +0.002 | 0 | -0.030 to +0.050 | 25/50000 (0.050%) | +0.002 | 0 | -0.030 to +0.050 |
| Affixed words with a morphological hiatus fallback / lower | 4481/22557 (19.865%) | 4595/22328 (20.580%) | +0.714 | -229 | -0.453 to +1.720 | 4481/22557 (19.865%) | +0.714 | -229 | -0.453 to +1.720 |
| Words with a zero-total-weight grapheme choice / lower | 864/50000 (1.728%) | 0/50000 (0.000%) | -1.728 | 0 | -1.850 to -1.570 | 864/50000 (1.728%) | -1.728 | 0 | -1.850 to -1.570 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22557/50000 (45.114%) | 22328/50000 (44.656%) | -0.458 | 0 | -0.980 to +0.110 | 22557/50000 (45.114%) | -0.458 | 0 | -0.980 to +0.110 |
| Words with adjacent identical coda segments / lower | 167/50000 (0.334%) | 166/50000 (0.332%) | -0.002 | 0 | -0.070 to +0.140 | 167/50000 (0.334%) | -0.002 | 0 | -0.070 to +0.140 |
| Disyllables with adjacent primary and secondary stress / lower | 2453/17103 (14.343%) | 2485/17191 (14.455%) | +0.113 | 88 | -0.385 to +0.455 | 2453/17103 (14.343%) | +0.113 | 88 | -0.385 to +0.455 |
| Monosyllables with schwa as their sole nucleus / lower | 4476/22754 (19.671%) | 4468/22688 (19.693%) | +0.022 | -66 | -1.742 to +1.139 | 4476/22754 (19.671%) | +0.022 | -66 | -1.742 to +1.139 |
| Words ending in an open checked vowel / lower | 966/50000 (1.932%) | 992/50000 (1.984%) | +0.052 | 0 | -0.150 to +0.220 | 966/50000 (1.932%) | +0.052 | 0 | -0.150 to +0.220 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/22754 (0.000%) | 0/22688 (0.000%) | 0.000 | -66 | 0.000 to 0.000 | 0/22754 (0.000%) | 0.000 | -66 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 17931 | 18051 | 120 | 17931 | 120 |
| bare/syllables:2 | 5435 | 5498 | 63 | 5435 | 63 |
| bare/syllables:3 | 2713 | 2706 | -7 | 2713 | -7 |
| bare/syllables:4 | 1105 | 1156 | 51 | 1105 | 51 |
| bare/syllables:5 | 234 | 231 | -3 | 234 | -3 |
| bare/syllables:6 | 25 | 30 | 5 | 25 | 5 |
| both/syllables:2 | 912 | 936 | 24 | 912 | 24 |
| both/syllables:3 | 1110 | 1080 | -30 | 1110 | -30 |
| both/syllables:4 | 465 | 407 | -58 | 465 | -58 |
| both/syllables:5 | 47 | 56 | 9 | 47 | 9 |
| both/syllables:6 | 5 | 4 | -1 | 5 | -1 |
| both/syllables:7 | 2 | 0 | -2 | 2 | -2 |
| prefixed/syllables:2 | 4081 | 4102 | 21 | 4081 | 21 |
| prefixed/syllables:3 | 573 | 629 | 56 | 573 | 56 |
| prefixed/syllables:4 | 208 | 205 | -3 | 208 | -3 |
| prefixed/syllables:5 | 60 | 65 | 5 | 60 | 5 |
| prefixed/syllables:6 | 9 | 8 | -1 | 9 | -1 |
| prefixed/syllables:7 | 0 | 1 | 1 | 0 | 1 |
| suffixed/syllables:1 | 4823 | 4637 | -186 | 4823 | -186 |
| suffixed/syllables:2 | 6675 | 6655 | -20 | 6675 | -20 |
| suffixed/syllables:3 | 2861 | 2847 | -14 | 2861 | -14 |
| suffixed/syllables:4 | 507 | 488 | -19 | 507 | -19 |
| suffixed/syllables:5 | 186 | 178 | -8 | 186 | -8 |
| suffixed/syllables:6 | 29 | 27 | -2 | 29 | -2 |
| suffixed/syllables:7 | 4 | 2 | -2 | 4 | -2 |
| suffixed/syllables:8 | 0 | 1 | 1 | 0 | 1 |
