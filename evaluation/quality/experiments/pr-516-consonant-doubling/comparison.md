# Quality comparison: candidate-19714cdf5f41

Original baseline: merge-base-07845fcec02a. Cohort: development.

| Role | Run | Generator commit | Generator state | Source digest |
|---|---|---|---|---|
| baseline | merge-base-07845fcec02a | 07845fcec02a29e8d3113e64f3db9f4385a20173 | clean | c149cf9e87b3d1713ab15e71a0c942f4e0ef18bc9aa174c804fb20cf17cc8f85 |
| candidate | candidate-19714cdf5f41 | 19714cdf5f4190a283e8beabf6a55f924de9bbf1 | clean | d316c31b2441b8581590c022b01b41907e5c0e4e04d32a10802a3969c06f620a |

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 1dfbe5d49efd9fe550910c417ff7b180220430c4b263ec2dee96e1f5896a65ef. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 48354.000 | 48361.000 | +7.000 |
| Mean letters | 7.878 | 7.845 | -0.033 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.005007 | 0.005007 | 0.000000 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.143977 | 0.145070 | 0.001093 |
| trigrams / missingReferenceMass | 0.040738 | 0.041176 | 0.000438 |
| trigrams / unseenGeneratedMass | 0.006910 | 0.006950 | 0.000039 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43641 (0.000%) | 0/43641 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43641 (0.000%) | 0/43641 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/25985 (0.000%) | 0/25985 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 25985/50000 (51.970%) | 25985/50000 (51.970%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 8519/23032 (36.988%) | 8519/23032 (36.988%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables with schwa as their sole nucleus / lower | 0/6359 (0.000%) | 0/6359 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 132/6359 (2.076%) | 132/6359 (2.076%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 3373 | 3373 | 0 |
| bare/syllables:2 | 12780 | 12780 | 0 |
| bare/syllables:3 | 5092 | 5092 | 0 |
| bare/syllables:4 | 1931 | 1931 | 0 |
| bare/syllables:5 | 682 | 682 | 0 |
| bare/syllables:6 | 133 | 133 | 0 |
| bare/syllables:7 | 24 | 24 | 0 |
| both/syllables:2 | 366 | 366 | 0 |
| both/syllables:3 | 862 | 862 | 0 |
| both/syllables:4 | 508 | 508 | 0 |
| both/syllables:5 | 147 | 147 | 0 |
| both/syllables:6 | 25 | 25 | 0 |
| both/syllables:7 | 1 | 1 | 0 |
| prefixed/syllables:2 | 347 | 347 | 0 |
| prefixed/syllables:3 | 438 | 438 | 0 |
| prefixed/syllables:4 | 230 | 230 | 0 |
| prefixed/syllables:5 | 73 | 73 | 0 |
| prefixed/syllables:6 | 30 | 30 | 0 |
| prefixed/syllables:7 | 2 | 2 | 0 |
| suffixed/syllables:1 | 2986 | 2986 | 0 |
| suffixed/syllables:2 | 9539 | 9539 | 0 |
| suffixed/syllables:3 | 7452 | 7452 | 0 |
| suffixed/syllables:4 | 2278 | 2278 | 0 |
| suffixed/syllables:5 | 581 | 581 | 0 |
| suffixed/syllables:6 | 102 | 102 | 0 |
| suffixed/syllables:7 | 17 | 17 | 0 |
| suffixed/syllables:8 | 1 | 1 | 0 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 44964.000 | 44964.000 | 0.000 |
| Mean letters | 6.772 | 6.772 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.005121 | 0.005121 | 0.000000 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.176203 | 0.176203 | 0.000000 |
| trigrams / missingReferenceMass | 0.057342 | 0.057342 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.007813 | 0.007813 | 0.000000 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/39328 (0.000%) | 0/39328 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/39328 (0.000%) | 0/39328 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 10888/26807 (40.616%) | 10888/26807 (40.616%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables with schwa as their sole nucleus / lower | 0/10672 (0.000%) | 0/10672 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 195/10672 (1.827%) | 195/10672 (1.827%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 10672 | 10672 | 0 |
| bare/syllables:2 | 26807 | 26807 | 0 |
| bare/syllables:3 | 8559 | 8559 | 0 |
| bare/syllables:4 | 2889 | 2889 | 0 |
| bare/syllables:5 | 887 | 887 | 0 |
| bare/syllables:6 | 156 | 156 | 0 |
| bare/syllables:7 | 26 | 26 | 0 |
| bare/syllables:8 | 4 | 4 | 0 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 14771.000 | 14771.000 | 0.000 |
| Mean letters | 4.279 | 4.279 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.043541 | 0.043541 | 0.000000 |
| phonemes / missingReferenceMass | 0.000640 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.331300 | 0.331300 | 0.000000 |
| trigrams / missingReferenceMass | 0.316761 | 0.316761 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.002475 | 0.002475 | 0.000000 |

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
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 992/50000 (1.984%) | 992/50000 (1.984%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 39492.000 | 39493.000 | +1.000 |
| Mean letters | 6.689 | 6.681 | -0.008 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006550 | 0.006550 | 0.000000 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.157649 | 0.158252 | 0.000603 |
| trigrams / missingReferenceMass | 0.044739 | 0.044962 | 0.000224 |
| trigrams / unseenGeneratedMass | 0.004798 | 0.004807 | 0.000008 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/29092 (0.000%) | 0/29092 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/29092 (0.000%) | 0/29092 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/22564 (0.000%) | 0/22564 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22564/50000 (45.128%) | 22564/50000 (45.128%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 6309/15397 (40.976%) | 6309/15397 (40.976%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables with schwa as their sole nucleus / lower | 0/20908 (0.000%) | 0/20908 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 338/20908 (1.617%) | 338/20908 (1.617%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17782 | 17782 | 0 |
| bare/syllables:2 | 5492 | 5492 | 0 |
| bare/syllables:3 | 2768 | 2768 | 0 |
| bare/syllables:4 | 1105 | 1105 | 0 |
| bare/syllables:5 | 255 | 255 | 0 |
| bare/syllables:6 | 34 | 34 | 0 |
| both/syllables:2 | 530 | 530 | 0 |
| both/syllables:3 | 977 | 977 | 0 |
| both/syllables:4 | 600 | 600 | 0 |
| both/syllables:5 | 267 | 267 | 0 |
| both/syllables:6 | 108 | 108 | 0 |
| both/syllables:7 | 28 | 28 | 0 |
| both/syllables:8 | 5 | 5 | 0 |
| both/syllables:9 | 2 | 2 | 0 |
| prefixed/syllables:2 | 3127 | 3127 | 0 |
| prefixed/syllables:3 | 1143 | 1143 | 0 |
| prefixed/syllables:4 | 511 | 511 | 0 |
| prefixed/syllables:5 | 225 | 225 | 0 |
| prefixed/syllables:6 | 46 | 46 | 0 |
| prefixed/syllables:7 | 9 | 9 | 0 |
| suffixed/syllables:1 | 3126 | 3126 | 0 |
| suffixed/syllables:2 | 6248 | 6248 | 0 |
| suffixed/syllables:3 | 3413 | 3413 | 0 |
| suffixed/syllables:4 | 1432 | 1432 | 0 |
| suffixed/syllables:5 | 579 | 579 | 0 |
| suffixed/syllables:6 | 162 | 162 | 0 |
| suffixed/syllables:7 | 25 | 25 | 0 |
| suffixed/syllables:8 | 1 | 1 | 0 |
