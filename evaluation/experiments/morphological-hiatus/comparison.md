# Quality comparison: morphological-hiatus

Original baseline: baseline-development-v1. Cohort: development.

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 43501.000 | 43850.000 | +349.000 |
| Mean letters | 7.462 | 7.488 | +0.027 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.007407 | 0.005993 | -0.001414 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.158592 | 0.160919 | 0.002327 |
| trigrams / missingReferenceMass | 0.034830 | 0.035480 | 0.000651 |
| trigrams / unseenGeneratedMass | 0.010997 | 0.011636 | 0.000639 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 9342/45470 (20.545%) | 9328/45626 (20.444%) | -0.101 | 156 | -0.522 to +0.356 |
| Polysyllables with multiple primary stresses / lower | 0/45470 (0.000%) | 0/45626 (0.000%) | 0.000 | 156 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 1008/50000 (2.016%) | 1023/50000 (2.046%) | +0.030 | 0 | -0.320 to +0.190 |
| Words with a primary-stressed reduced vowel / lower | 139/50000 (0.278%) | 136/50000 (0.272%) | -0.006 | 0 | -0.110 to +0.100 |
| Affixed words with a morphological hiatus fallback / lower | 3862/34952 (11.049%) | 0/34883 (0.000%) | -11.049 | -69 | -11.523 to -10.546 |
| Words with a zero-total-weight grapheme choice / lower | 1956/50000 (3.912%) | 1983/50000 (3.966%) | +0.054 | 0 | -0.200 to +0.220 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 34952/50000 (69.904%) | 34883/50000 (69.766%) | -0.138 | 0 | -0.820 to +0.390 |
| Words with adjacent identical coda segments / lower | 180/50000 (0.360%) | 160/50000 (0.320%) | -0.040 | 0 | -0.130 to +0.030 |
| Disyllables with adjacent primary and secondary stress / lower | 4467/21065 (21.206%) | 4648/20875 (22.266%) | +1.060 | -190 | +0.305 to +2.132 |
| Monosyllables with schwa as their sole nucleus / lower | 899/4530 (19.845%) | 913/4374 (20.873%) | +1.028 | -156 | -0.937 to +3.110 |
| Words ending in an open checked vowel / lower | 746/50000 (1.492%) | 717/50000 (1.434%) | -0.058 | 0 | -0.290 to +0.200 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/4530 (0.000%) | 0/4374 (0.000%) | 0.000 | -156 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 2013 | 1835 | -178 |
| bare/syllables:2 | 6997 | 6962 | -35 |
| bare/syllables:3 | 4100 | 4242 | 142 |
| bare/syllables:4 | 1444 | 1542 | 98 |
| bare/syllables:5 | 387 | 437 | 50 |
| bare/syllables:6 | 92 | 82 | -10 |
| bare/syllables:7 | 14 | 16 | 2 |
| bare/syllables:8 | 1 | 0 | -1 |
| bare/syllables:9 | 0 | 1 | 1 |
| both/syllables:2 | 1044 | 1066 | 22 |
| both/syllables:3 | 1800 | 1802 | 2 |
| both/syllables:4 | 929 | 943 | 14 |
| both/syllables:5 | 182 | 156 | -26 |
| both/syllables:6 | 20 | 38 | 18 |
| both/syllables:7 | 6 | 6 | 0 |
| both/syllables:8 | 0 | 3 | 3 |
| prefixed/syllables:2 | 3302 | 3314 | 12 |
| prefixed/syllables:3 | 2560 | 2534 | -26 |
| prefixed/syllables:4 | 895 | 868 | -27 |
| prefixed/syllables:5 | 229 | 210 | -19 |
| prefixed/syllables:6 | 50 | 63 | 13 |
| prefixed/syllables:7 | 5 | 8 | 3 |
| prefixed/syllables:8 | 1 | 2 | 1 |
| suffixed/syllables:1 | 2517 | 2539 | 22 |
| suffixed/syllables:2 | 9722 | 9533 | -189 |
| suffixed/syllables:3 | 8058 | 8088 | 30 |
| suffixed/syllables:4 | 2733 | 2806 | 73 |
| suffixed/syllables:5 | 711 | 732 | 21 |
| suffixed/syllables:6 | 152 | 140 | -12 |
| suffixed/syllables:7 | 26 | 28 | 2 |
| suffixed/syllables:8 | 10 | 4 | -6 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 47126.000 | 47126.000 | 0.000 |
| Mean letters | 7.418 | 7.418 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000168 | 0.000168 | 0.000000 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.183856 | 0.183856 | 0.000000 |
| trigrams / missingReferenceMass | 0.049072 | 0.049072 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.012432 | 0.012432 | 0.000000 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43577 (0.000%) | 0/43577 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43577 (0.000%) | 0/43577 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 3016/50000 (6.032%) | 3016/50000 (6.032%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 272/50000 (0.544%) | 272/50000 (0.544%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 9320/22919 (40.665%) | 9320/22919 (40.665%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables with schwa as their sole nucleus / lower | 1322/6423 (20.582%) | 1322/6423 (20.582%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 1391/50000 (2.782%) | 1391/50000 (2.782%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/6423 (0.000%) | 0/6423 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 6423 | 6423 | 0 |
| bare/syllables:2 | 22919 | 22919 | 0 |
| bare/syllables:3 | 13869 | 13869 | 0 |
| bare/syllables:4 | 5007 | 5007 | 0 |
| bare/syllables:5 | 1427 | 1427 | 0 |
| bare/syllables:6 | 308 | 308 | 0 |
| bare/syllables:7 | 43 | 43 | 0 |
| bare/syllables:8 | 3 | 3 | 0 |
| bare/syllables:9 | 1 | 1 | 0 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 14397.000 | 14397.000 | 0.000 |
| Mean letters | 5.417 | 5.417 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.092157 | 0.092157 | 0.000000 |
| phonemes / missingReferenceMass | 0.003390 | 0.003390 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.525918 | 0.525918 | 0.000000 |
| trigrams / missingReferenceMass | 0.374662 | 0.374662 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.002265 | 0.002265 | 0.000000 |

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
| Words with adjacent identical coda segments / lower | 5429/50000 (10.858%) | 5429/50000 (10.858%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Monosyllables with schwa as their sole nucleus / lower | 10762/50000 (21.524%) | 10762/50000 (21.524%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 218/50000 (0.436%) | 218/50000 (0.436%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 28443.000 | 28693.000 | +250.000 |
| Mean letters | 5.613 | 5.611 | -0.002 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.011102 | 0.007783 | -0.003320 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.184480 | 0.186554 | 0.002074 |
| trigrams / missingReferenceMass | 0.051142 | 0.048584 | -0.002558 |
| trigrams / unseenGeneratedMass | 0.009437 | 0.010412 | 0.000974 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 9947/27246 (36.508%) | 10035/27264 (36.807%) | +0.299 | 18 | +0.057 to +0.704 |
| Polysyllables with multiple primary stresses / lower | 0/27246 (0.000%) | 0/27264 (0.000%) | 0.000 | 18 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 593/50000 (1.186%) | 562/50000 (1.124%) | -0.062 | 0 | -0.370 to +0.120 |
| Words with a primary-stressed reduced vowel / lower | 25/50000 (0.050%) | 24/50000 (0.048%) | -0.002 | 0 | -0.030 to +0.030 |
| Affixed words with a morphological hiatus fallback / lower | 4481/22557 (19.865%) | 0/22373 (0.000%) | -19.865 | -184 | -20.471 to -19.308 |
| Words with a zero-total-weight grapheme choice / lower | 864/50000 (1.728%) | 842/50000 (1.684%) | -0.044 | 0 | -0.170 to +0.050 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22557/50000 (45.114%) | 22373/50000 (44.746%) | -0.368 | 0 | -0.880 to +0.160 |
| Words with adjacent identical coda segments / lower | 167/50000 (0.334%) | 148/50000 (0.296%) | -0.038 | 0 | -0.150 to +0.090 |
| Disyllables with adjacent primary and secondary stress / lower | 2453/17103 (14.343%) | 2514/17215 (14.604%) | +0.261 | 112 | -1.026 to +0.934 |
| Monosyllables with schwa as their sole nucleus / lower | 4476/22754 (19.671%) | 4489/22736 (19.744%) | +0.073 | -18 | -1.190 to +0.924 |
| Words ending in an open checked vowel / lower | 966/50000 (1.932%) | 913/50000 (1.826%) | -0.106 | 0 | -0.300 to +0.040 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/22754 (0.000%) | 0/22736 (0.000%) | 0.000 | -18 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17931 | 18075 | 144 |
| bare/syllables:2 | 5435 | 5513 | 78 |
| bare/syllables:3 | 2713 | 2666 | -47 |
| bare/syllables:4 | 1105 | 1109 | 4 |
| bare/syllables:5 | 234 | 242 | 8 |
| bare/syllables:6 | 25 | 22 | -3 |
| both/syllables:2 | 912 | 909 | -3 |
| both/syllables:3 | 1110 | 1085 | -25 |
| both/syllables:4 | 465 | 452 | -13 |
| both/syllables:5 | 47 | 59 | 12 |
| both/syllables:6 | 5 | 8 | 3 |
| both/syllables:7 | 2 | 1 | -1 |
| prefixed/syllables:2 | 4081 | 4132 | 51 |
| prefixed/syllables:3 | 573 | 598 | 25 |
| prefixed/syllables:4 | 208 | 207 | -1 |
| prefixed/syllables:5 | 60 | 61 | 1 |
| prefixed/syllables:6 | 9 | 8 | -1 |
| suffixed/syllables:1 | 4823 | 4661 | -162 |
| suffixed/syllables:2 | 6675 | 6661 | -14 |
| suffixed/syllables:3 | 2861 | 2821 | -40 |
| suffixed/syllables:4 | 507 | 509 | 2 |
| suffixed/syllables:5 | 186 | 171 | -15 |
| suffixed/syllables:6 | 29 | 27 | -2 |
| suffixed/syllables:7 | 4 | 3 | -1 |
