# Quality comparison: spelling-coverage-candidate

Original baseline: baseline-development-v1. Cohort: development. Previous step: spelling-coverage-resolved-dependency.

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 43501.000 | 43549.000 | +48.000 | 43526.000 | +23.000 |
| Mean letters | 7.462 | 7.453 | -0.009 | 7.456 | -0.003 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.007407 | 0.007718 | 0.000311 | 0.007699 | 0.000019 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.158592 | 0.155606 | -0.002986 | 0.154805 | 0.000801 |
| trigrams / missingReferenceMass | 0.034830 | 0.036795 | 0.001966 | 0.036510 | 0.000285 |
| trigrams / unseenGeneratedMass | 0.010997 | 0.009423 | -0.001574 | 0.009564 | -0.000142 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 9342/45470 (20.545%) | 9392/45556 (20.616%) | +0.071 | 86 | -0.196 to +0.595 | 9477/45573 (20.795%) | -0.179 | -17 | -0.658 to +0.341 |
| Polysyllables with multiple primary stresses / lower | 0/45470 (0.000%) | 0/45556 (0.000%) | 0.000 | 86 | 0.000 to 0.000 | 0/45573 (0.000%) | 0.000 | -17 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 1008/50000 (2.016%) | 971/50000 (1.942%) | -0.074 | 0 | -0.240 to +0.290 | 972/50000 (1.944%) | -0.002 | 0 | -0.090 to +0.080 |
| Words with a primary-stressed reduced vowel / lower | 139/50000 (0.278%) | 134/50000 (0.268%) | -0.010 | 0 | -0.100 to +0.150 | 131/50000 (0.262%) | +0.006 | 0 | -0.030 to +0.060 |
| Affixed words with a morphological hiatus fallback / lower | 3862/34952 (11.049%) | 3889/34984 (11.117%) | +0.067 | 32 | -0.487 to +0.928 | 3885/35123 (11.061%) | +0.055 | -139 | -0.722 to +0.367 |
| Words with a zero-total-weight grapheme choice / lower | 1956/50000 (3.912%) | 0/50000 (0.000%) | -3.912 | 0 | -4.250 to -3.710 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 34952/50000 (69.904%) | 34984/50000 (69.968%) | +0.064 | 0 | -0.550 to +0.440 | 35123/50000 (70.246%) | -0.278 | 0 | -0.840 to +0.120 |
| Words with adjacent identical coda segments / lower | 180/50000 (0.360%) | 152/50000 (0.304%) | -0.056 | 0 | -0.150 to +0.040 | 145/50000 (0.290%) | +0.014 | 0 | -0.040 to +0.070 |
| Disyllables with adjacent primary and secondary stress / lower | 4467/21065 (21.206%) | 4610/21227 (21.718%) | +0.512 | 162 | +0.028 to +1.204 | 4586/21133 (21.701%) | +0.017 | 94 | -0.618 to +0.383 |
| Monosyllables with schwa as their sole nucleus / lower | 899/4530 (19.845%) | 886/4444 (19.937%) | +0.092 | -86 | -2.547 to +2.780 | 924/4427 (20.872%) | -0.935 | 17 | -2.706 to +0.204 |
| Words ending in an open checked vowel / lower | 746/50000 (1.492%) | 807/50000 (1.614%) | +0.122 | 0 | +0.070 to +0.210 | 760/50000 (1.520%) | +0.094 | 0 | -0.010 to +0.180 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/4530 (0.000%) | 0/4444 (0.000%) | 0.000 | -86 | 0.000 to 0.000 | 0/4427 (0.000%) | 0.000 | 17 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 2013 | 1881 | -132 | 1888 | -7 |
| bare/syllables:2 | 6997 | 7034 | 37 | 6934 | 100 |
| bare/syllables:3 | 4100 | 4122 | 22 | 4048 | 74 |
| bare/syllables:4 | 1444 | 1522 | 78 | 1558 | -36 |
| bare/syllables:5 | 387 | 371 | -16 | 362 | 9 |
| bare/syllables:6 | 92 | 77 | -15 | 76 | 1 |
| bare/syllables:7 | 14 | 8 | -6 | 9 | -1 |
| bare/syllables:8 | 1 | 1 | 0 | 2 | -1 |
| both/syllables:2 | 1044 | 1056 | 12 | 1038 | 18 |
| both/syllables:3 | 1800 | 1822 | 22 | 1842 | -20 |
| both/syllables:4 | 929 | 940 | 11 | 918 | 22 |
| both/syllables:5 | 182 | 159 | -23 | 148 | 11 |
| both/syllables:6 | 20 | 32 | 12 | 40 | -8 |
| both/syllables:7 | 6 | 6 | 0 | 7 | -1 |
| both/syllables:8 | 0 | 1 | 1 | 0 | 1 |
| prefixed/syllables:2 | 3302 | 3209 | -93 | 3316 | -107 |
| prefixed/syllables:3 | 2560 | 2551 | -9 | 2578 | -27 |
| prefixed/syllables:4 | 895 | 837 | -58 | 839 | -2 |
| prefixed/syllables:5 | 229 | 229 | 0 | 222 | 7 |
| prefixed/syllables:6 | 50 | 46 | -4 | 50 | -4 |
| prefixed/syllables:7 | 5 | 6 | 1 | 9 | -3 |
| prefixed/syllables:8 | 1 | 0 | -1 | 2 | -2 |
| suffixed/syllables:1 | 2517 | 2563 | 46 | 2539 | 24 |
| suffixed/syllables:2 | 9722 | 9928 | 206 | 9845 | 83 |
| suffixed/syllables:3 | 8058 | 8017 | -41 | 8088 | -71 |
| suffixed/syllables:4 | 2733 | 2647 | -86 | 2739 | -92 |
| suffixed/syllables:5 | 711 | 741 | 30 | 720 | 21 |
| suffixed/syllables:6 | 152 | 159 | 7 | 155 | 4 |
| suffixed/syllables:7 | 26 | 31 | 5 | 25 | 6 |
| suffixed/syllables:8 | 10 | 4 | -6 | 3 | 1 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 47126.000 | 47136.000 | +10.000 | 47176.000 | -40.000 |
| Mean letters | 7.418 | 7.395 | -0.024 | 7.391 | +0.004 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000168 | 0.000232 | 0.000064 | 0.000247 | -0.000015 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.183856 | 0.178643 | -0.005213 | 0.178488 | 0.000155 |
| trigrams / missingReferenceMass | 0.049072 | 0.050205 | 0.001133 | 0.054642 | -0.004437 |
| trigrams / unseenGeneratedMass | 0.012432 | 0.011074 | -0.001358 | 0.011296 | -0.000223 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43577 (0.000%) | 0/43530 (0.000%) | 0.000 | -47 | 0.000 to 0.000 | 0/43501 (0.000%) | 0.000 | 29 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43577 (0.000%) | 0/43530 (0.000%) | 0.000 | -47 | 0.000 to 0.000 | 0/43501 (0.000%) | 0.000 | 29 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 3016/50000 (6.032%) | 0/50000 (0.000%) | -6.032 | 0 | -6.270 to -5.680 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 272/50000 (0.544%) | 260/50000 (0.520%) | -0.024 | 0 | -0.070 to +0.030 | 243/50000 (0.486%) | +0.034 | 0 | 0.000 to +0.060 |
| Disyllables with adjacent primary and secondary stress / lower | 9320/22919 (40.665%) | 9524/23152 (41.137%) | +0.472 | 233 | -1.411 to +1.910 | 9575/23114 (41.425%) | -0.288 | 38 | -0.667 to +0.383 |
| Monosyllables with schwa as their sole nucleus / lower | 1322/6423 (20.582%) | 1293/6470 (19.985%) | -0.598 | 47 | -2.200 to +0.240 | 1268/6499 (19.511%) | +0.474 | -29 | -0.122 to +1.308 |
| Words ending in an open checked vowel / lower | 1391/50000 (2.782%) | 1275/50000 (2.550%) | -0.232 | 0 | -0.460 to +0.110 | 1243/50000 (2.486%) | +0.064 | 0 | -0.010 to +0.160 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/6423 (0.000%) | 0/6470 (0.000%) | 0.000 | 47 | 0.000 to 0.000 | 0/6499 (0.000%) | 0.000 | -29 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 6423 | 6470 | 47 | 6499 | -29 |
| bare/syllables:2 | 22919 | 23152 | 233 | 23114 | 38 |
| bare/syllables:3 | 13869 | 13621 | -248 | 13703 | -82 |
| bare/syllables:4 | 5007 | 5002 | -5 | 4935 | 67 |
| bare/syllables:5 | 1427 | 1400 | -27 | 1411 | -11 |
| bare/syllables:6 | 308 | 301 | -7 | 290 | 11 |
| bare/syllables:7 | 43 | 45 | 2 | 40 | 5 |
| bare/syllables:8 | 3 | 8 | 5 | 6 | 2 |
| bare/syllables:9 | 1 | 1 | 0 | 2 | -1 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 14397.000 | 14793.000 | +396.000 | 15025.000 | -232.000 |
| Mean letters | 5.417 | 5.430 | +0.013 | 5.414 | +0.016 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.092157 | 0.093945 | 0.001788 | 0.092927 | 0.001018 |
| phonemes / missingReferenceMass | 0.003390 | 0.003390 | 0.000000 | 0.003390 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.525918 | 0.523903 | -0.002016 | 0.517877 | 0.006026 |
| trigrams / missingReferenceMass | 0.374662 | 0.364149 | -0.010513 | 0.358098 | 0.006052 |
| trigrams / unseenGeneratedMass | 0.002265 | 0.002081 | -0.000183 | 0.004382 | -0.002301 |

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
| Words with adjacent identical coda segments / lower | 5429/50000 (10.858%) | 5382/50000 (10.764%) | -0.094 | 0 | -0.540 to +0.360 | 5306/50000 (10.612%) | +0.152 | 0 | -0.170 to +0.380 |
| Disyllables with adjacent primary and secondary stress / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Monosyllables with schwa as their sole nucleus / lower | 10762/50000 (21.524%) | 10772/50000 (21.544%) | +0.020 | 0 | -0.950 to +0.700 | 10720/50000 (21.440%) | +0.104 | 0 | -0.150 to +0.420 |
| Words ending in an open checked vowel / lower | 218/50000 (0.436%) | 253/50000 (0.506%) | +0.070 | 0 | +0.030 to +0.150 | 233/50000 (0.466%) | +0.040 | 0 | -0.030 to +0.150 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 28443.000 | 28467.000 | +24.000 | 28615.000 | -148.000 |
| Mean letters | 5.613 | 5.615 | +0.002 | 5.612 | +0.003 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.011102 | 0.010881 | -0.000221 | 0.010817 | 0.000065 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.184480 | 0.183027 | -0.001452 | 0.181784 | 0.001243 |
| trigrams / missingReferenceMass | 0.051142 | 0.048168 | -0.002974 | 0.047628 | 0.000540 |
| trigrams / unseenGeneratedMass | 0.009437 | 0.009355 | -0.000083 | 0.009557 | -0.000202 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 9947/27246 (36.508%) | 10011/27336 (36.622%) | +0.114 | 90 | -0.753 to +1.191 | 10037/27312 (36.749%) | -0.127 | 24 | -0.611 to +0.324 |
| Polysyllables with multiple primary stresses / lower | 0/27246 (0.000%) | 0/27336 (0.000%) | 0.000 | 90 | 0.000 to 0.000 | 0/27312 (0.000%) | 0.000 | 24 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 593/50000 (1.186%) | 555/50000 (1.110%) | -0.076 | 0 | -0.210 to +0.040 | 552/50000 (1.104%) | +0.006 | 0 | -0.160 to +0.110 |
| Words with a primary-stressed reduced vowel / lower | 25/50000 (0.050%) | 23/50000 (0.046%) | -0.004 | 0 | -0.040 to +0.050 | 26/50000 (0.052%) | -0.006 | 0 | -0.020 to +0.010 |
| Affixed words with a morphological hiatus fallback / lower | 4481/22557 (19.865%) | 4560/22270 (20.476%) | +0.611 | -287 | -0.013 to +1.373 | 4595/22328 (20.580%) | -0.104 | -58 | -0.797 to +0.440 |
| Words with a zero-total-weight grapheme choice / lower | 864/50000 (1.728%) | 0/50000 (0.000%) | -1.728 | 0 | -1.850 to -1.570 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22557/50000 (45.114%) | 22270/50000 (44.540%) | -0.574 | 0 | -1.300 to -0.010 | 22328/50000 (44.656%) | -0.116 | 0 | -0.570 to +0.280 |
| Words with adjacent identical coda segments / lower | 167/50000 (0.334%) | 146/50000 (0.292%) | -0.042 | 0 | -0.100 to +0.030 | 166/50000 (0.332%) | -0.040 | 0 | -0.110 to -0.010 |
| Disyllables with adjacent primary and secondary stress / lower | 2453/17103 (14.343%) | 2510/17217 (14.579%) | +0.236 | 114 | -0.775 to +1.392 | 2485/17191 (14.455%) | +0.123 | 26 | -0.613 to +0.937 |
| Monosyllables with schwa as their sole nucleus / lower | 4476/22754 (19.671%) | 4511/22664 (19.904%) | +0.233 | -90 | -1.713 to +1.178 | 4468/22688 (19.693%) | +0.211 | -24 | +0.029 to +0.469 |
| Words ending in an open checked vowel / lower | 966/50000 (1.932%) | 1085/50000 (2.170%) | +0.238 | 0 | -0.010 to +0.350 | 992/50000 (1.984%) | +0.186 | 0 | +0.070 to +0.280 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/22754 (0.000%) | 0/22664 (0.000%) | 0.000 | -90 | 0.000 to 0.000 | 0/22688 (0.000%) | 0.000 | -24 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 17931 | 18080 | 149 | 18051 | 29 |
| bare/syllables:2 | 5435 | 5515 | 80 | 5498 | 17 |
| bare/syllables:3 | 2713 | 2726 | 13 | 2706 | 20 |
| bare/syllables:4 | 1105 | 1158 | 53 | 1156 | 2 |
| bare/syllables:5 | 234 | 218 | -16 | 231 | -13 |
| bare/syllables:6 | 25 | 33 | 8 | 30 | 3 |
| both/syllables:2 | 912 | 910 | -2 | 936 | -26 |
| both/syllables:3 | 1110 | 1064 | -46 | 1080 | -16 |
| both/syllables:4 | 465 | 424 | -41 | 407 | 17 |
| both/syllables:5 | 47 | 50 | 3 | 56 | -6 |
| both/syllables:6 | 5 | 3 | -2 | 4 | -1 |
| both/syllables:7 | 2 | 1 | -1 | 0 | 1 |
| prefixed/syllables:2 | 4081 | 4101 | 20 | 4102 | -1 |
| prefixed/syllables:3 | 573 | 632 | 59 | 629 | 3 |
| prefixed/syllables:4 | 208 | 197 | -11 | 205 | -8 |
| prefixed/syllables:5 | 60 | 65 | 5 | 65 | 0 |
| prefixed/syllables:6 | 9 | 12 | 3 | 8 | 4 |
| prefixed/syllables:7 | 0 | 1 | 1 | 1 | 0 |
| suffixed/syllables:1 | 4823 | 4584 | -239 | 4637 | -53 |
| suffixed/syllables:2 | 6675 | 6691 | 16 | 6655 | 36 |
| suffixed/syllables:3 | 2861 | 2833 | -28 | 2847 | -14 |
| suffixed/syllables:4 | 507 | 481 | -26 | 488 | -7 |
| suffixed/syllables:5 | 186 | 189 | 3 | 178 | 11 |
| suffixed/syllables:6 | 29 | 26 | -3 | 27 | -1 |
| suffixed/syllables:7 | 4 | 5 | 1 | 2 | 3 |
| suffixed/syllables:8 | 0 | 1 | 1 | 1 | 0 |
