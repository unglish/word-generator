# Quality comparison: candidate-7addbd53d19e

Original baseline: merge-base-70d9674ca185. Cohort: development.

| Role | Run | Generator commit | Generator state | Source digest |
|---|---|---|---|---|
| baseline | merge-base-70d9674ca185 | 70d9674ca1853e30bad2dd4bb63f61ac21acfefc | clean | 07539b803858eeb1457a632f4728a52482cddc5b9c073984d1a5294251317fd5 |
| candidate | candidate-7addbd53d19e | 7addbd53d19ee937186fa6227da4c8123f562e96 | clean | 3311d1ef03e5dbdee71d68930a8e0d10b1750539a17f9c2ef8fac14035472b89 |

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: d51f4e648ee12a34b4d6e330bb91c280d7510ca49fa0790640698f4d3b34b8d0. Reference: 2669317aea2346f807b92e83d58eba05f41f132133623a177c34538ebd86a394.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 48262.000 | 48281.000 | +19.000 |
| Mean letters | 7.845 | 7.838 | -0.008 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.003944 | 0.003982 | 0.000038 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.161979 | 0.161426 | -0.000553 |
| trigrams / missingReferenceMass | 0.025800 | 0.026206 | 0.000406 |
| trigrams / unseenGeneratedMass | 0.034865 | 0.034686 | -0.000179 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43592 (0.000%) | 0/43659 (0.000%) | 0.000 | 67 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43592 (0.000%) | 0/43659 (0.000%) | 0.000 | 67 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/25778 (0.000%) | 0/25883 (0.000%) | 0.000 | 105 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 25778/50000 (51.556%) | 25883/50000 (51.766%) | +0.210 | 0 | -0.870 to +0.910 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 5925/23027 (25.731%) | 6108/23089 (26.454%) | +0.723 | 62 | -0.408 to +1.982 |
| Monosyllables with schwa as their sole nucleus / lower | 0/6408 (0.000%) | 0/6341 (0.000%) | 0.000 | -67 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 118/6408 (1.841%) | 128/6341 (2.019%) | +0.177 | -67 | -0.215 to +0.511 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 3340 | 3321 | -19 |
| bare/syllables:2 | 12825 | 12903 | 78 |
| bare/syllables:3 | 5198 | 5134 | -64 |
| bare/syllables:4 | 1989 | 1977 | -12 |
| bare/syllables:5 | 674 | 616 | -58 |
| bare/syllables:6 | 168 | 143 | -25 |
| bare/syllables:7 | 25 | 22 | -3 |
| bare/syllables:8 | 3 | 1 | -2 |
| both/syllables:2 | 427 | 395 | -32 |
| both/syllables:3 | 781 | 803 | 22 |
| both/syllables:4 | 516 | 483 | -33 |
| both/syllables:5 | 142 | 143 | 1 |
| both/syllables:6 | 28 | 31 | 3 |
| both/syllables:7 | 1 | 4 | 3 |
| both/syllables:8 | 1 | 0 | -1 |
| prefixed/syllables:2 | 343 | 360 | 17 |
| prefixed/syllables:3 | 403 | 428 | 25 |
| prefixed/syllables:4 | 213 | 228 | 15 |
| prefixed/syllables:5 | 83 | 87 | 4 |
| prefixed/syllables:6 | 23 | 23 | 0 |
| prefixed/syllables:7 | 6 | 4 | -2 |
| suffixed/syllables:1 | 3068 | 3020 | -48 |
| suffixed/syllables:2 | 9432 | 9431 | -1 |
| suffixed/syllables:3 | 7351 | 7528 | 177 |
| suffixed/syllables:4 | 2274 | 2270 | -4 |
| suffixed/syllables:5 | 548 | 528 | -20 |
| suffixed/syllables:6 | 113 | 96 | -17 |
| suffixed/syllables:7 | 23 | 19 | -4 |
| suffixed/syllables:8 | 2 | 2 | 0 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 44914.000 | 44982.000 | +68.000 |
| Mean letters | 6.738 | 6.753 | +0.015 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006286 | 0.005909 | -0.000377 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.213018 | 0.212755 | -0.000263 |
| trigrams / missingReferenceMass | 0.039040 | 0.048791 | 0.009751 |
| trigrams / unseenGeneratedMass | 0.040368 | 0.040854 | 0.000486 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/39299 (0.000%) | 0/39355 (0.000%) | 0.000 | 56 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/39299 (0.000%) | 0/39355 (0.000%) | 0.000 | 56 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 7415/26422 (28.064%) | 7462/26586 (28.067%) | +0.004 | 164 | -1.430 to +0.667 |
| Monosyllables with schwa as their sole nucleus / lower | 0/10701 (0.000%) | 0/10645 (0.000%) | 0.000 | -56 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 178/10701 (1.663%) | 185/10645 (1.738%) | +0.075 | -56 | -0.489 to +0.721 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 10701 | 10645 | -56 |
| bare/syllables:2 | 26422 | 26586 | 164 |
| bare/syllables:3 | 8852 | 8699 | -153 |
| bare/syllables:4 | 3031 | 2969 | -62 |
| bare/syllables:5 | 778 | 871 | 93 |
| bare/syllables:6 | 189 | 197 | 8 |
| bare/syllables:7 | 25 | 30 | 5 |
| bare/syllables:8 | 2 | 3 | 1 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 14905.000 | 14835.000 | -70.000 |
| Mean letters | 4.286 | 4.290 | +0.004 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.043483 | 0.043524 | 0.000040 |
| phonemes / missingReferenceMass | 0.000640 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.351053 | 0.351400 | 0.000348 |
| trigrams / missingReferenceMass | 0.296860 | 0.294796 | -0.002065 |
| trigrams / unseenGeneratedMass | 0.017806 | 0.018998 | 0.001192 |

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
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 954/50000 (1.908%) | 976/50000 (1.952%) | +0.044 | 0 | +0.020 to +0.100 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 39736.000 | 39580.000 | -156.000 |
| Mean letters | 6.712 | 6.703 | -0.010 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006797 | 0.006672 | -0.000125 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.177185 | 0.177204 | 0.000018 |
| trigrams / missingReferenceMass | 0.030242 | 0.029595 | -0.000647 |
| trigrams / unseenGeneratedMass | 0.030163 | 0.029974 | -0.000189 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/29029 (0.000%) | 0/28925 (0.000%) | 0.000 | -104 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/29029 (0.000%) | 0/28925 (0.000%) | 0.000 | -104 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/22521 (0.000%) | 0/22535 (0.000%) | 0.000 | 14 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22521/50000 (45.042%) | 22535/50000 (45.070%) | +0.028 | 0 | -0.300 to +0.710 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 5191/15337 (33.846%) | 5302/15301 (34.651%) | +0.805 | -36 | +0.214 to +1.547 |
| Monosyllables with schwa as their sole nucleus / lower | 0/20971 (0.000%) | 0/21075 (0.000%) | 0.000 | 104 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 325/20971 (1.550%) | 334/21075 (1.585%) | +0.035 | 104 | -0.478 to +0.633 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17703 | 17877 | 174 |
| bare/syllables:2 | 5484 | 5429 | -55 |
| bare/syllables:3 | 2849 | 2774 | -75 |
| bare/syllables:4 | 1150 | 1093 | -57 |
| bare/syllables:5 | 261 | 260 | -1 |
| bare/syllables:6 | 32 | 32 | 0 |
| both/syllables:2 | 564 | 503 | -61 |
| both/syllables:3 | 990 | 985 | -5 |
| both/syllables:4 | 569 | 579 | 10 |
| both/syllables:5 | 267 | 258 | -9 |
| both/syllables:6 | 107 | 110 | 3 |
| both/syllables:7 | 34 | 43 | 9 |
| both/syllables:8 | 6 | 5 | -1 |
| prefixed/syllables:2 | 2932 | 3132 | 200 |
| prefixed/syllables:3 | 1158 | 1060 | -98 |
| prefixed/syllables:4 | 537 | 524 | -13 |
| prefixed/syllables:5 | 226 | 245 | 19 |
| prefixed/syllables:6 | 45 | 48 | 3 |
| prefixed/syllables:7 | 11 | 10 | -1 |
| prefixed/syllables:8 | 1 | 1 | 0 |
| suffixed/syllables:1 | 3268 | 3198 | -70 |
| suffixed/syllables:2 | 6357 | 6237 | -120 |
| suffixed/syllables:3 | 3404 | 3473 | 69 |
| suffixed/syllables:4 | 1335 | 1370 | 35 |
| suffixed/syllables:5 | 562 | 570 | 8 |
| suffixed/syllables:6 | 128 | 150 | 22 |
| suffixed/syllables:7 | 17 | 30 | 13 |
| suffixed/syllables:8 | 3 | 4 | 1 |
