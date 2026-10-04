# Quality comparison: q13c-unit-normalization-candidate-v1

Original baseline: baseline-development-v1. Cohort: development. Previous step: spelling-coverage-candidate.

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 43501.000 | 43624.000 | +123.000 | 43549.000 | +75.000 |
| Mean letters | 7.462 | 7.469 | +0.008 | 7.453 | +0.016 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.007407 | 0.007675 | 0.000268 | 0.007718 | -0.000043 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.158592 | 0.155237 | -0.003355 | 0.155606 | -0.000369 |
| trigrams / missingReferenceMass | 0.034830 | 0.036403 | 0.001574 | 0.036795 | -0.000392 |
| trigrams / unseenGeneratedMass | 0.010997 | 0.009606 | -0.001390 | 0.009423 | 0.000184 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 9342/45470 (20.545%) | 9288/45541 (20.395%) | -0.151 | 71 | -0.780 to +0.264 | 9392/45556 (20.616%) | -0.222 | -15 | -0.872 to +0.355 |
| Polysyllables with multiple primary stresses / lower | 0/45470 (0.000%) | 0/45541 (0.000%) | 0.000 | 71 | 0.000 to 0.000 | 0/45556 (0.000%) | 0.000 | -15 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 1008/50000 (2.016%) | 961/50000 (1.922%) | -0.094 | 0 | -0.280 to +0.130 | 971/50000 (1.942%) | -0.020 | 0 | -0.160 to +0.090 |
| Words with a primary-stressed reduced vowel / lower | 139/50000 (0.278%) | 126/50000 (0.252%) | -0.026 | 0 | -0.100 to +0.120 | 134/50000 (0.268%) | -0.016 | 0 | -0.070 to +0.050 |
| Affixed words with a morphological hiatus fallback / lower | 3862/34952 (11.049%) | 3865/34939 (11.062%) | +0.013 | -13 | -0.546 to +0.824 | 3889/34984 (11.117%) | -0.054 | -45 | -0.202 to +0.108 |
| Words with a zero-total-weight grapheme choice / lower | 1956/50000 (3.912%) | 0/50000 (0.000%) | -3.912 | 0 | -4.250 to -3.710 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 34952/50000 (69.904%) | 34939/50000 (69.878%) | -0.026 | 0 | -0.180 to +0.110 | 34984/50000 (69.968%) | -0.090 | 0 | -0.600 to +0.660 |
| Words with adjacent identical coda segments / lower | 180/50000 (0.360%) | 121/50000 (0.242%) | -0.118 | 0 | -0.220 to -0.010 | 152/50000 (0.304%) | -0.062 | 0 | -0.130 to -0.020 |
| Disyllables with adjacent primary and secondary stress / lower | 4467/21065 (21.206%) | 4621/21082 (21.919%) | +0.713 | 17 | -0.001 to +1.944 | 4610/21227 (21.718%) | +0.202 | -145 | -0.283 to +0.990 |
| Monosyllables with schwa as their sole nucleus / lower | 899/4530 (19.845%) | 916/4459 (20.543%) | +0.697 | -71 | -2.140 to +4.935 | 886/4444 (19.937%) | +0.606 | 15 | -1.404 to +2.155 |
| Words ending in an open checked vowel / lower | 746/50000 (1.492%) | 796/50000 (1.592%) | +0.100 | 0 | -0.110 to +0.170 | 807/50000 (1.614%) | -0.022 | 0 | -0.180 to +0.100 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/4530 (0.000%) | 0/4459 (0.000%) | 0.000 | -71 | 0.000 to 0.000 | 0/4444 (0.000%) | 0.000 | 15 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 2013 | 1898 | -115 | 1881 | 17 |
| bare/syllables:2 | 6997 | 6996 | -1 | 7034 | -38 |
| bare/syllables:3 | 4100 | 4169 | 69 | 4122 | 47 |
| bare/syllables:4 | 1444 | 1541 | 97 | 1522 | 19 |
| bare/syllables:5 | 387 | 369 | -18 | 371 | -2 |
| bare/syllables:6 | 92 | 77 | -15 | 77 | 0 |
| bare/syllables:7 | 14 | 9 | -5 | 8 | 1 |
| bare/syllables:8 | 1 | 2 | 1 | 1 | 1 |
| both/syllables:2 | 1044 | 1061 | 17 | 1056 | 5 |
| both/syllables:3 | 1800 | 1835 | 35 | 1822 | 13 |
| both/syllables:4 | 929 | 959 | 30 | 940 | 19 |
| both/syllables:5 | 182 | 153 | -29 | 159 | -6 |
| both/syllables:6 | 20 | 34 | 14 | 32 | 2 |
| both/syllables:7 | 6 | 5 | -1 | 6 | -1 |
| both/syllables:8 | 0 | 0 | 0 | 1 | -1 |
| prefixed/syllables:2 | 3302 | 3223 | -79 | 3209 | 14 |
| prefixed/syllables:3 | 2560 | 2543 | -17 | 2551 | -8 |
| prefixed/syllables:4 | 895 | 866 | -29 | 837 | 29 |
| prefixed/syllables:5 | 229 | 224 | -5 | 229 | -5 |
| prefixed/syllables:6 | 50 | 52 | 2 | 46 | 6 |
| prefixed/syllables:7 | 5 | 11 | 6 | 6 | 5 |
| prefixed/syllables:8 | 1 | 1 | 0 | 0 | 1 |
| suffixed/syllables:1 | 2517 | 2561 | 44 | 2563 | -2 |
| suffixed/syllables:2 | 9722 | 9802 | 80 | 9928 | -126 |
| suffixed/syllables:3 | 8058 | 8051 | -7 | 8017 | 34 |
| suffixed/syllables:4 | 2733 | 2664 | -69 | 2647 | 17 |
| suffixed/syllables:5 | 711 | 700 | -11 | 741 | -41 |
| suffixed/syllables:6 | 152 | 165 | 13 | 159 | 6 |
| suffixed/syllables:7 | 26 | 28 | 2 | 31 | -3 |
| suffixed/syllables:8 | 10 | 1 | -9 | 4 | -3 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 47126.000 | 47135.000 | +9.000 | 47136.000 | -1.000 |
| Mean letters | 7.418 | 7.410 | -0.008 | 7.395 | +0.016 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000168 | 0.000245 | 0.000077 | 0.000232 | 0.000013 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.183856 | 0.177966 | -0.005890 | 0.178643 | -0.000677 |
| trigrams / missingReferenceMass | 0.049072 | 0.046676 | -0.002396 | 0.050205 | -0.003528 |
| trigrams / unseenGeneratedMass | 0.012432 | 0.012077 | -0.000355 | 0.011074 | 0.001003 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43577 (0.000%) | 0/43508 (0.000%) | 0.000 | -69 | 0.000 to 0.000 | 0/43530 (0.000%) | 0.000 | -22 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43577 (0.000%) | 0/43508 (0.000%) | 0.000 | -69 | 0.000 to 0.000 | 0/43530 (0.000%) | 0.000 | -22 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 3016/50000 (6.032%) | 0/50000 (0.000%) | -6.032 | 0 | -6.270 to -5.680 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 272/50000 (0.544%) | 217/50000 (0.434%) | -0.110 | 0 | -0.200 to -0.040 | 260/50000 (0.520%) | -0.086 | 0 | -0.130 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 9320/22919 (40.665%) | 9575/23176 (41.314%) | +0.649 | 257 | -0.445 to +1.954 | 9524/23152 (41.137%) | +0.177 | 24 | -0.587 to +0.966 |
| Monosyllables with schwa as their sole nucleus / lower | 1322/6423 (20.582%) | 1254/6492 (19.316%) | -1.266 | 69 | -4.062 to +1.558 | 1293/6470 (19.985%) | -0.668 | 22 | -1.862 to +1.433 |
| Words ending in an open checked vowel / lower | 1391/50000 (2.782%) | 1273/50000 (2.546%) | -0.236 | 0 | -0.520 to +0.040 | 1275/50000 (2.550%) | -0.004 | 0 | -0.100 to +0.130 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/6423 (0.000%) | 0/6492 (0.000%) | 0.000 | 69 | 0.000 to 0.000 | 0/6470 (0.000%) | 0.000 | 22 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 6423 | 6492 | 69 | 6470 | 22 |
| bare/syllables:2 | 22919 | 23176 | 257 | 23152 | 24 |
| bare/syllables:3 | 13869 | 13584 | -285 | 13621 | -37 |
| bare/syllables:4 | 5007 | 5022 | 15 | 5002 | 20 |
| bare/syllables:5 | 1427 | 1363 | -64 | 1400 | -37 |
| bare/syllables:6 | 308 | 306 | -2 | 301 | 5 |
| bare/syllables:7 | 43 | 48 | 5 | 45 | 3 |
| bare/syllables:8 | 3 | 9 | 6 | 8 | 1 |
| bare/syllables:9 | 1 | 0 | -1 | 1 | -1 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 14397.000 | 16086.000 | +1689.000 | 14793.000 | +1293.000 |
| Mean letters | 5.417 | 5.532 | +0.115 | 5.430 | +0.102 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.092157 | 0.094132 | 0.001975 | 0.093945 | 0.000186 |
| phonemes / missingReferenceMass | 0.003390 | 0.003390 | 0.000000 | 0.003390 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.525918 | 0.530575 | 0.004657 | 0.523903 | 0.006672 |
| trigrams / missingReferenceMass | 0.374662 | 0.360957 | -0.013705 | 0.364149 | -0.003193 |
| trigrams / unseenGeneratedMass | 0.002265 | 0.014710 | 0.012445 | 0.002081 | 0.012628 |

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
| Words with adjacent identical coda segments / lower | 5429/50000 (10.858%) | 5066/50000 (10.132%) | -0.726 | 0 | -1.240 to -0.330 | 5382/50000 (10.764%) | -0.632 | 0 | -0.950 to -0.410 |
| Disyllables with adjacent primary and secondary stress / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Monosyllables with schwa as their sole nucleus / lower | 10762/50000 (21.524%) | 10702/50000 (21.404%) | -0.120 | 0 | -1.020 to +0.620 | 10772/50000 (21.544%) | -0.140 | 0 | -0.330 to +0.020 |
| Words ending in an open checked vowel / lower | 218/50000 (0.436%) | 250/50000 (0.500%) | +0.064 | 0 | +0.030 to +0.140 | 253/50000 (0.506%) | -0.006 | 0 | -0.060 to +0.030 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 28443.000 | 28606.000 | +163.000 | 28467.000 | +139.000 |
| Mean letters | 5.613 | 5.631 | +0.017 | 5.615 | +0.015 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.011102 | 0.010868 | -0.000234 | 0.010881 | -0.000013 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.184480 | 0.182908 | -0.001572 | 0.183027 | -0.000120 |
| trigrams / missingReferenceMass | 0.051142 | 0.046809 | -0.004333 | 0.048168 | -0.001359 |
| trigrams / unseenGeneratedMass | 0.009437 | 0.009701 | 0.000263 | 0.009355 | 0.000346 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 9947/27246 (36.508%) | 10070/27468 (36.661%) | +0.153 | 222 | -0.444 to +1.171 | 10011/27336 (36.622%) | +0.039 | 132 | -0.686 to +0.638 |
| Polysyllables with multiple primary stresses / lower | 0/27246 (0.000%) | 0/27468 (0.000%) | 0.000 | 222 | 0.000 to 0.000 | 0/27336 (0.000%) | 0.000 | 132 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 593/50000 (1.186%) | 554/50000 (1.108%) | -0.078 | 0 | -0.240 to +0.060 | 555/50000 (1.110%) | -0.002 | 0 | -0.070 to +0.090 |
| Words with a primary-stressed reduced vowel / lower | 25/50000 (0.050%) | 22/50000 (0.044%) | -0.006 | 0 | -0.050 to +0.060 | 23/50000 (0.046%) | -0.002 | 0 | -0.010 to +0.010 |
| Affixed words with a morphological hiatus fallback / lower | 4481/22557 (19.865%) | 4594/22309 (20.593%) | +0.727 | -248 | -0.107 to +1.996 | 4560/22270 (20.476%) | +0.117 | 39 | -0.194 to +0.623 |
| Words with a zero-total-weight grapheme choice / lower | 864/50000 (1.728%) | 0/50000 (0.000%) | -1.728 | 0 | -1.850 to -1.570 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22557/50000 (45.114%) | 22309/50000 (44.618%) | -0.496 | 0 | -1.020 to -0.070 | 22270/50000 (44.540%) | +0.078 | 0 | -0.140 to +0.280 |
| Words with adjacent identical coda segments / lower | 167/50000 (0.334%) | 186/50000 (0.372%) | +0.038 | 0 | -0.020 to +0.140 | 146/50000 (0.292%) | +0.080 | 0 | +0.050 to +0.140 |
| Disyllables with adjacent primary and secondary stress / lower | 2453/17103 (14.343%) | 2540/17267 (14.710%) | +0.368 | 164 | -0.779 to +2.003 | 2510/17217 (14.579%) | +0.132 | 50 | -0.292 to +0.611 |
| Monosyllables with schwa as their sole nucleus / lower | 4476/22754 (19.671%) | 4516/22532 (20.043%) | +0.371 | -222 | -1.133 to +1.651 | 4511/22664 (19.904%) | +0.139 | -132 | -0.199 to +0.580 |
| Words ending in an open checked vowel / lower | 966/50000 (1.932%) | 1092/50000 (2.184%) | +0.252 | 0 | +0.040 to +0.410 | 1085/50000 (2.170%) | +0.014 | 0 | -0.170 to +0.080 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/22754 (0.000%) | 0/22532 (0.000%) | 0.000 | -222 | 0.000 to 0.000 | 0/22664 (0.000%) | 0.000 | -132 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 17931 | 17973 | 42 | 18080 | -107 |
| bare/syllables:2 | 5435 | 5516 | 81 | 5515 | 1 |
| bare/syllables:3 | 2713 | 2758 | 45 | 2726 | 32 |
| bare/syllables:4 | 1105 | 1169 | 64 | 1158 | 11 |
| bare/syllables:5 | 234 | 240 | 6 | 218 | 22 |
| bare/syllables:6 | 25 | 35 | 10 | 33 | 2 |
| both/syllables:2 | 912 | 949 | 37 | 910 | 39 |
| both/syllables:3 | 1110 | 1092 | -18 | 1064 | 28 |
| both/syllables:4 | 465 | 407 | -58 | 424 | -17 |
| both/syllables:5 | 47 | 42 | -5 | 50 | -8 |
| both/syllables:6 | 5 | 4 | -1 | 3 | 1 |
| both/syllables:7 | 2 | 1 | -1 | 1 | 0 |
| prefixed/syllables:2 | 4081 | 4152 | 71 | 4101 | 51 |
| prefixed/syllables:3 | 573 | 633 | 60 | 632 | 1 |
| prefixed/syllables:4 | 208 | 198 | -10 | 197 | 1 |
| prefixed/syllables:5 | 60 | 60 | 0 | 65 | -5 |
| prefixed/syllables:6 | 9 | 11 | 2 | 12 | -1 |
| prefixed/syllables:7 | 0 | 1 | 1 | 1 | 0 |
| suffixed/syllables:1 | 4823 | 4559 | -264 | 4584 | -25 |
| suffixed/syllables:2 | 6675 | 6650 | -25 | 6691 | -41 |
| suffixed/syllables:3 | 2861 | 2855 | -6 | 2833 | 22 |
| suffixed/syllables:4 | 507 | 474 | -33 | 481 | -7 |
| suffixed/syllables:5 | 186 | 182 | -4 | 189 | -7 |
| suffixed/syllables:6 | 29 | 33 | 4 | 26 | 7 |
| suffixed/syllables:7 | 4 | 5 | 1 | 5 | 0 |
| suffixed/syllables:8 | 0 | 1 | 1 | 1 | 0 |
