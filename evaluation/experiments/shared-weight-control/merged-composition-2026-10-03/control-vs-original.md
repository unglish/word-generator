# Quality comparison: q08a-current-candidate-v1

Original baseline: baseline-development-v1. Cohort: development.

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 43501.000 | 43499.000 | -2.000 |
| Mean letters | 7.462 | 7.462 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.007407 | 0.007407 | 0.000000 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.158592 | 0.158076 | -0.000516 |
| trigrams / missingReferenceMass | 0.034830 | 0.034830 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.010997 | 0.010997 | 0.000000 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 9342/45470 (20.545%) | 9342/45470 (20.545%) | 0.000 | 0 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/45470 (0.000%) | 0/45470 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 1008/50000 (2.016%) | 1008/50000 (2.016%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 139/50000 (0.278%) | 139/50000 (0.278%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 3862/34952 (11.049%) | 3862/34952 (11.049%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 1956/50000 (3.912%) | 1956/50000 (3.912%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 34952/50000 (69.904%) | 34952/50000 (69.904%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 180/50000 (0.360%) | 180/50000 (0.360%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 4467/21065 (21.206%) | 4467/21065 (21.206%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables with schwa as their sole nucleus / lower | 899/4530 (19.845%) | 899/4530 (19.845%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 746/50000 (1.492%) | 746/50000 (1.492%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/4530 (0.000%) | 0/4530 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 2013 | 2013 | 0 |
| bare/syllables:2 | 6997 | 6997 | 0 |
| bare/syllables:3 | 4100 | 4100 | 0 |
| bare/syllables:4 | 1444 | 1444 | 0 |
| bare/syllables:5 | 387 | 387 | 0 |
| bare/syllables:6 | 92 | 92 | 0 |
| bare/syllables:7 | 14 | 14 | 0 |
| bare/syllables:8 | 1 | 1 | 0 |
| both/syllables:2 | 1044 | 1044 | 0 |
| both/syllables:3 | 1800 | 1800 | 0 |
| both/syllables:4 | 929 | 929 | 0 |
| both/syllables:5 | 182 | 182 | 0 |
| both/syllables:6 | 20 | 20 | 0 |
| both/syllables:7 | 6 | 6 | 0 |
| prefixed/syllables:2 | 3302 | 3302 | 0 |
| prefixed/syllables:3 | 2560 | 2560 | 0 |
| prefixed/syllables:4 | 895 | 895 | 0 |
| prefixed/syllables:5 | 229 | 229 | 0 |
| prefixed/syllables:6 | 50 | 50 | 0 |
| prefixed/syllables:7 | 5 | 5 | 0 |
| prefixed/syllables:8 | 1 | 1 | 0 |
| suffixed/syllables:1 | 2517 | 2517 | 0 |
| suffixed/syllables:2 | 9722 | 9722 | 0 |
| suffixed/syllables:3 | 8058 | 8058 | 0 |
| suffixed/syllables:4 | 2733 | 2733 | 0 |
| suffixed/syllables:5 | 711 | 711 | 0 |
| suffixed/syllables:6 | 152 | 152 | 0 |
| suffixed/syllables:7 | 26 | 26 | 0 |
| suffixed/syllables:8 | 10 | 10 | 0 |

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
| Unique spellings | 28443.000 | 28443.000 | 0.000 |
| Mean letters | 5.613 | 5.613 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.011102 | 0.011102 | 0.000000 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.184480 | 0.184207 | -0.000273 |
| trigrams / missingReferenceMass | 0.051142 | 0.050764 | -0.000378 |
| trigrams / unseenGeneratedMass | 0.009437 | 0.009437 | 0.000000 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 9947/27246 (36.508%) | 9947/27246 (36.508%) | 0.000 | 0 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/27246 (0.000%) | 0/27246 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 593/50000 (1.186%) | 593/50000 (1.186%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 25/50000 (0.050%) | 25/50000 (0.050%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 4481/22557 (19.865%) | 4481/22557 (19.865%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 864/50000 (1.728%) | 864/50000 (1.728%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22557/50000 (45.114%) | 22557/50000 (45.114%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 167/50000 (0.334%) | 167/50000 (0.334%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 2453/17103 (14.343%) | 2453/17103 (14.343%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables with schwa as their sole nucleus / lower | 4476/22754 (19.671%) | 4476/22754 (19.671%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 966/50000 (1.932%) | 966/50000 (1.932%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 0/22754 (0.000%) | 0/22754 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17931 | 17931 | 0 |
| bare/syllables:2 | 5435 | 5435 | 0 |
| bare/syllables:3 | 2713 | 2713 | 0 |
| bare/syllables:4 | 1105 | 1105 | 0 |
| bare/syllables:5 | 234 | 234 | 0 |
| bare/syllables:6 | 25 | 25 | 0 |
| both/syllables:2 | 912 | 912 | 0 |
| both/syllables:3 | 1110 | 1110 | 0 |
| both/syllables:4 | 465 | 465 | 0 |
| both/syllables:5 | 47 | 47 | 0 |
| both/syllables:6 | 5 | 5 | 0 |
| both/syllables:7 | 2 | 2 | 0 |
| prefixed/syllables:2 | 4081 | 4081 | 0 |
| prefixed/syllables:3 | 573 | 573 | 0 |
| prefixed/syllables:4 | 208 | 208 | 0 |
| prefixed/syllables:5 | 60 | 60 | 0 |
| prefixed/syllables:6 | 9 | 9 | 0 |
| suffixed/syllables:1 | 4823 | 4823 | 0 |
| suffixed/syllables:2 | 6675 | 6675 | 0 |
| suffixed/syllables:3 | 2861 | 2861 | 0 |
| suffixed/syllables:4 | 507 | 507 | 0 |
| suffixed/syllables:5 | 186 | 186 | 0 |
| suffixed/syllables:6 | 29 | 29 | 0 |
| suffixed/syllables:7 | 4 | 4 | 0 |
