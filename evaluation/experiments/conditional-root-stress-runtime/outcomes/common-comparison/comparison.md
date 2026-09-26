# Quality comparison: q09-runtime-active-scored-v1

Original baseline: baseline-development-v1. Cohort: development. Previous step: q09-runtime-control-scored-v1.

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 43501.000 | 44243.000 | +742.000 | 44246.000 | -3.000 |
| Mean letters | 7.462 | 7.484 | +0.023 | 7.492 | -0.008 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.007407 | 0.006133 | -0.001274 | 0.006288 | -0.000155 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.158592 | 0.159061 | 0.000469 | 0.157836 | 0.001226 |
| trigrams / missingReferenceMass | 0.034830 | 0.037659 | 0.002829 | 0.033752 | 0.003906 |
| trigrams / unseenGeneratedMass | 0.010997 | 0.010889 | -0.000108 | 0.010550 | 0.000339 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 9342/45470 (20.545%) | 0/45462 (0.000%) | -20.545 | -8 | -20.824 to -20.262 | 0/45550 (0.000%) | 0.000 | -88 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/45470 (0.000%) | 0/45462 (0.000%) | 0.000 | -8 | 0.000 to 0.000 | 0/45550 (0.000%) | 0.000 | -88 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 1008/50000 (2.016%) | 0/50000 (0.000%) | -2.016 | 0 | -2.190 to -1.840 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 139/50000 (0.278%) | 0/50000 (0.000%) | -0.278 | 0 | -0.370 to -0.170 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 3862/34952 (11.049%) | 3813/34806 (10.955%) | -0.094 | -146 | -1.130 to +0.510 | 3914/34898 (11.216%) | -0.261 | -92 | -1.388 to +0.732 |
| Words with a zero-total-weight grapheme choice / lower | 1956/50000 (3.912%) | 2010/50000 (4.020%) | +0.108 | 0 | -0.170 to +0.560 | 1918/50000 (3.836%) | +0.184 | 0 | -0.240 to +0.640 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 34952/50000 (69.904%) | 34806/50000 (69.612%) | -0.292 | 0 | -1.570 to +0.780 | 34898/50000 (69.796%) | -0.184 | 0 | -1.190 to +0.160 |
| Words with adjacent identical coda segments / lower | 180/50000 (0.360%) | 166/50000 (0.332%) | -0.028 | 0 | -0.070 to +0.040 | 193/50000 (0.386%) | -0.054 | 0 | -0.120 to +0.020 |
| Disyllables with adjacent primary and secondary stress / lower | 4467/21065 (21.206%) | 8764/20887 (41.959%) | +20.753 | -178 | +19.487 to +22.218 | 8757/20829 (42.042%) | -0.083 | 58 | -1.521 to +1.604 |
| Monosyllables with schwa as their sole nucleus / lower | 899/4530 (19.845%) | 0/4538 (0.000%) | -19.845 | 8 | -22.172 to -17.492 | 0/4450 (0.000%) | 0.000 | 88 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 746/50000 (1.492%) | 890/50000 (1.780%) | +0.288 | 0 | +0.130 to +0.400 | 888/50000 (1.776%) | +0.004 | 0 | -0.080 to +0.110 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/4530 (0.000%) | 19/4538 (0.419%) | +0.419 | 8 | +0.114 to +0.887 | 26/4450 (0.584%) | -0.166 | 88 | -0.684 to +0.098 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 2013 | 1992 | -21 | 1948 | 44 |
| bare/syllables:2 | 6997 | 7064 | 67 | 6939 | 125 |
| bare/syllables:3 | 4100 | 4132 | 32 | 4172 | -40 |
| bare/syllables:4 | 1444 | 1478 | 34 | 1455 | 23 |
| bare/syllables:5 | 387 | 428 | 41 | 477 | -49 |
| bare/syllables:6 | 92 | 84 | -8 | 92 | -8 |
| bare/syllables:7 | 14 | 16 | 2 | 19 | -3 |
| bare/syllables:8 | 1 | 0 | -1 | 0 | 0 |
| both/syllables:2 | 1044 | 978 | -66 | 1004 | -26 |
| both/syllables:3 | 1800 | 1772 | -28 | 1846 | -74 |
| both/syllables:4 | 929 | 980 | 51 | 971 | 9 |
| both/syllables:5 | 182 | 193 | 11 | 168 | 25 |
| both/syllables:6 | 20 | 28 | 8 | 30 | -2 |
| both/syllables:7 | 6 | 5 | -1 | 8 | -3 |
| prefixed/syllables:2 | 3302 | 3225 | -77 | 3270 | -45 |
| prefixed/syllables:3 | 2560 | 2595 | 35 | 2603 | -8 |
| prefixed/syllables:4 | 895 | 864 | -31 | 832 | 32 |
| prefixed/syllables:5 | 229 | 232 | 3 | 234 | -2 |
| prefixed/syllables:6 | 50 | 57 | 7 | 48 | 9 |
| prefixed/syllables:7 | 5 | 15 | 10 | 11 | 4 |
| prefixed/syllables:8 | 1 | 1 | 0 | 2 | -1 |
| suffixed/syllables:1 | 2517 | 2546 | 29 | 2502 | 44 |
| suffixed/syllables:2 | 9722 | 9620 | -102 | 9616 | 4 |
| suffixed/syllables:3 | 8058 | 8088 | 30 | 8158 | -70 |
| suffixed/syllables:4 | 2733 | 2712 | -21 | 2732 | -20 |
| suffixed/syllables:5 | 711 | 696 | -15 | 685 | 11 |
| suffixed/syllables:6 | 152 | 161 | 9 | 147 | 14 |
| suffixed/syllables:7 | 26 | 37 | 11 | 26 | 11 |
| suffixed/syllables:8 | 10 | 1 | -9 | 5 | -4 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 47126.000 | 47461.000 | +335.000 | 47410.000 | +51.000 |
| Mean letters | 7.418 | 7.412 | -0.006 | 7.401 | +0.011 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000168 | 0.000244 | 0.000076 | 0.000276 | -0.000032 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.183856 | 0.185176 | 0.001320 | 0.183541 | 0.001635 |
| trigrams / missingReferenceMass | 0.049072 | 0.050991 | 0.001919 | 0.048157 | 0.002834 |
| trigrams / unseenGeneratedMass | 0.012432 | 0.012741 | 0.000309 | 0.012653 | 0.000088 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43577 (0.000%) | 0/43498 (0.000%) | 0.000 | -79 | 0.000 to 0.000 | 0/43443 (0.000%) | 0.000 | 55 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43577 (0.000%) | 0/43498 (0.000%) | 0.000 | -79 | 0.000 to 0.000 | 0/43443 (0.000%) | 0.000 | 55 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 3016/50000 (6.032%) | 3084/50000 (6.168%) | +0.136 | 0 | -0.110 to +0.680 | 3031/50000 (6.062%) | +0.106 | 0 | -0.180 to +0.290 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 272/50000 (0.544%) | 253/50000 (0.506%) | -0.038 | 0 | -0.120 to +0.060 | 280/50000 (0.560%) | -0.054 | 0 | -0.110 to +0.030 |
| Disyllables with adjacent primary and secondary stress / lower | 9320/22919 (40.665%) | 9422/22951 (41.053%) | +0.388 | 32 | -1.355 to +1.991 | 9357/22960 (40.753%) | +0.299 | -9 | -1.217 to +1.863 |
| Monosyllables with schwa as their sole nucleus / lower | 1322/6423 (20.582%) | 0/6502 (0.000%) | -20.582 | 79 | -21.626 to -19.505 | 0/6557 (0.000%) | 0.000 | -55 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 1391/50000 (2.782%) | 1390/50000 (2.780%) | -0.002 | 0 | -0.370 to +0.260 | 1398/50000 (2.796%) | -0.016 | 0 | -0.210 to +0.120 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/6423 (0.000%) | 36/6502 (0.554%) | +0.554 | 79 | +0.388 to +0.613 | 34/6557 (0.519%) | +0.035 | -55 | -0.159 to +0.295 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 6423 | 6502 | 79 | 6557 | -55 |
| bare/syllables:2 | 22919 | 22951 | 32 | 22960 | -9 |
| bare/syllables:3 | 13869 | 13735 | -134 | 13844 | -109 |
| bare/syllables:4 | 5007 | 5091 | 84 | 4943 | 148 |
| bare/syllables:5 | 1427 | 1401 | -26 | 1374 | 27 |
| bare/syllables:6 | 308 | 262 | -46 | 274 | -12 |
| bare/syllables:7 | 43 | 49 | 6 | 41 | 8 |
| bare/syllables:8 | 3 | 9 | 6 | 7 | 2 |
| bare/syllables:9 | 1 | 0 | -1 | 0 | 0 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 14397.000 | 16004.000 | +1607.000 | 16004.000 | 0.000 |
| Mean letters | 5.417 | 5.454 | +0.036 | 5.454 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.092157 | 0.095402 | 0.003245 | 0.095402 | 0.000000 |
| phonemes / missingReferenceMass | 0.003390 | 0.000640 | -0.002750 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.525918 | 0.506436 | -0.019483 | 0.506436 | 0.000000 |
| trigrams / missingReferenceMass | 0.374662 | 0.368631 | -0.006031 | 0.368631 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.002265 | 0.003237 | 0.000972 | 0.003237 | 0.000000 |

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
| Words with adjacent identical coda segments / lower | 5429/50000 (10.858%) | 5451/50000 (10.902%) | +0.044 | 0 | -0.710 to +0.630 | 5451/50000 (10.902%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Monosyllables with schwa as their sole nucleus / lower | 10762/50000 (21.524%) | 0/50000 (0.000%) | -21.524 | 0 | -22.090 to -20.730 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 218/50000 (0.436%) | 262/50000 (0.524%) | +0.088 | 0 | +0.020 to +0.180 | 262/50000 (0.524%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/50000 (0.000%) | 295/50000 (0.590%) | +0.590 | 0 | +0.510 to +0.640 | 295/50000 (0.590%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| Unique spellings | 28443.000 | 29880.000 | +1437.000 | 29862.000 | +18.000 |
| Mean letters | 5.613 | 5.672 | +0.058 | 5.670 | +0.002 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change | Previous step | Change vs previous |
|---|---:|---:|---:|---:|---:|
| phonemes / jensenShannonBits | 0.011102 | 0.009710 | -0.001392 | 0.009525 | 0.000185 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.184480 | 0.181547 | -0.002933 | 0.178858 | 0.002689 |
| trigrams / missingReferenceMass | 0.051142 | 0.051356 | 0.000214 | 0.051167 | 0.000189 |
| trigrams / unseenGeneratedMass | 0.009437 | 0.010181 | 0.000744 | 0.010022 | 0.000159 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range | Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 9947/27246 (36.508%) | 0/27398 (0.000%) | -36.508 | 152 | -36.917 to -36.068 | 0/27254 (0.000%) | 0.000 | 144 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/27246 (0.000%) | 0/27398 (0.000%) | 0.000 | 152 | 0.000 to 0.000 | 0/27254 (0.000%) | 0.000 | 144 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 593/50000 (1.186%) | 0/50000 (0.000%) | -1.186 | 0 | -1.250 to -1.100 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 25/50000 (0.050%) | 0/50000 (0.000%) | -0.050 | 0 | -0.070 to -0.020 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 4481/22557 (19.865%) | 4428/22567 (19.622%) | -0.244 | 10 | -0.557 to +0.341 | 4371/22476 (19.447%) | +0.174 | 91 | -0.362 to +0.583 |
| Words with a zero-total-weight grapheme choice / lower | 864/50000 (1.728%) | 873/50000 (1.746%) | +0.018 | 0 | -0.180 to +0.190 | 854/50000 (1.708%) | +0.038 | 0 | -0.130 to +0.130 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22557/50000 (45.114%) | 22567/50000 (45.134%) | +0.020 | 0 | -1.000 to +0.970 | 22476/50000 (44.952%) | +0.182 | 0 | -0.060 to +0.720 |
| Words with adjacent identical coda segments / lower | 167/50000 (0.334%) | 155/50000 (0.310%) | -0.024 | 0 | -0.060 to +0.050 | 138/50000 (0.276%) | +0.034 | 0 | -0.010 to +0.080 |
| Disyllables with adjacent primary and secondary stress / lower | 2453/17103 (14.343%) | 7679/17266 (44.475%) | +30.132 | 163 | +28.614 to +31.379 | 7532/17038 (44.207%) | +0.268 | 228 | -2.455 to +1.412 |
| Monosyllables with schwa as their sole nucleus / lower | 4476/22754 (19.671%) | 0/22602 (0.000%) | -19.671 | -152 | -20.545 to -18.573 | 0/22746 (0.000%) | 0.000 | -144 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 966/50000 (1.932%) | 1081/50000 (2.162%) | +0.230 | 0 | -0.030 to +0.460 | 1149/50000 (2.298%) | -0.136 | 0 | -0.480 to +0.110 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/22754 (0.000%) | 121/22602 (0.535%) | +0.535 | -152 | +0.331 to +0.695 | 120/22746 (0.528%) | +0.008 | -144 | -0.139 to +0.230 |

| Stratum | Original draws | Candidate draws | Change | Previous draws | Change vs previous |
|---|---:|---:|---:|---:|---:|
| bare/syllables:1 | 17931 | 17762 | -169 | 17902 | -140 |
| bare/syllables:2 | 5435 | 5492 | 57 | 5459 | 33 |
| bare/syllables:3 | 2713 | 2813 | 100 | 2728 | 85 |
| bare/syllables:4 | 1105 | 1090 | -15 | 1182 | -92 |
| bare/syllables:5 | 234 | 254 | 20 | 225 | 29 |
| bare/syllables:6 | 25 | 22 | -3 | 28 | -6 |
| both/syllables:2 | 912 | 951 | 39 | 925 | 26 |
| both/syllables:3 | 1110 | 1071 | -39 | 1063 | 8 |
| both/syllables:4 | 465 | 449 | -16 | 459 | -10 |
| both/syllables:5 | 47 | 43 | -4 | 47 | -4 |
| both/syllables:6 | 5 | 5 | 0 | 5 | 0 |
| both/syllables:7 | 2 | 2 | 0 | 0 | 2 |
| prefixed/syllables:2 | 4081 | 4242 | 161 | 4109 | 133 |
| prefixed/syllables:3 | 573 | 603 | 30 | 625 | -22 |
| prefixed/syllables:4 | 208 | 193 | -15 | 182 | 11 |
| prefixed/syllables:5 | 60 | 65 | 5 | 68 | -3 |
| prefixed/syllables:6 | 9 | 11 | 2 | 10 | 1 |
| prefixed/syllables:7 | 0 | 0 | 0 | 3 | -3 |
| suffixed/syllables:1 | 4823 | 4840 | 17 | 4844 | -4 |
| suffixed/syllables:2 | 6675 | 6581 | -94 | 6545 | 36 |
| suffixed/syllables:3 | 2861 | 2776 | -85 | 2827 | -51 |
| suffixed/syllables:4 | 507 | 518 | 11 | 548 | -30 |
| suffixed/syllables:5 | 186 | 189 | 3 | 192 | -3 |
| suffixed/syllables:6 | 29 | 27 | -2 | 23 | 4 |
| suffixed/syllables:7 | 4 | 1 | -3 | 1 | 0 |
