# Quality comparison: candidate-ce03627a94bc

Original baseline: merge-base-ce03627a94bc. Cohort: development.

| Role | Run | Generator commit | Generator state | Source digest |
|---|---|---|---|---|
| baseline | merge-base-ce03627a94bc | ce03627a94bc217e556267a939d2fa540ac7e0c9 | clean | d316c31b2441b8581590c022b01b41907e5c0e4e04d32a10802a3969c06f620a |
| candidate | candidate-ce03627a94bc | de167002d2fde795f4d78b844a5040341e9b3831 | clean | ab931e407fdb800d04fb040bfe45f9f2573fbb4e43e7771433d69de5cd23427e |

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 8cef16f3a58e420a409a05a292c861b01d7cc10af355cd30deb1be1b5a752f46. Evaluator: 1dfbe5d49efd9fe550910c417ff7b180220430c4b263ec2dee96e1f5896a65ef. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

10000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 9927.000 | 9907.000 | -20.000 |
| Mean letters | 7.859 | 7.804 | -0.054 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.004825 | 0.005035 | 0.000211 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.159691 | 0.159120 | -0.000571 |
| trigrams / missingReferenceMass | 0.073186 | 0.074772 | 0.001586 |
| trigrams / unseenGeneratedMass | 0.007561 | 0.007184 | -0.000377 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/8740 (0.000%) | 0/8697 (0.000%) | 0.000 | -43 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/8740 (0.000%) | 0/8697 (0.000%) | 0.000 | -43 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/10000 (0.000%) | 0/10000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/10000 (0.000%) | 0/10000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/5147 (0.000%) | 0/5172 (0.000%) | 0.000 | 25 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/10000 (0.000%) | 0/10000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/10000 (0.000%) | 0/10000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 5147/10000 (51.470%) | 5172/10000 (51.720%) | +0.250 | 0 | -2.900 to +2.100 |
| Words with adjacent identical coda segments / lower | 0/10000 (0.000%) | 0/10000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 1672/4607 (36.293%) | 1110/4661 (23.815%) | -12.478 | 54 | -14.104 to -8.388 |
| Monosyllables with schwa as their sole nucleus / lower | 0/1260 (0.000%) | 0/1303 (0.000%) | 0.000 | 43 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/10000 (0.000%) | 0/10000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 26/1260 (2.063%) | 24/1303 (1.842%) | -0.222 | 43 | -0.988 to +1.091 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 680 | 660 | -20 |
| bare/syllables:2 | 2547 | 2625 | 78 |
| bare/syllables:3 | 1056 | 966 | -90 |
| bare/syllables:4 | 395 | 415 | 20 |
| bare/syllables:5 | 146 | 129 | -17 |
| bare/syllables:6 | 28 | 26 | -2 |
| bare/syllables:7 | 1 | 6 | 5 |
| bare/syllables:8 | 0 | 1 | 1 |
| both/syllables:2 | 77 | 71 | -6 |
| both/syllables:3 | 170 | 157 | -13 |
| both/syllables:4 | 97 | 87 | -10 |
| both/syllables:5 | 25 | 27 | 2 |
| both/syllables:6 | 5 | 7 | 2 |
| prefixed/syllables:2 | 70 | 72 | 2 |
| prefixed/syllables:3 | 78 | 87 | 9 |
| prefixed/syllables:4 | 41 | 34 | -7 |
| prefixed/syllables:5 | 15 | 19 | 4 |
| prefixed/syllables:6 | 8 | 2 | -6 |
| prefixed/syllables:7 | 2 | 0 | -2 |
| suffixed/syllables:1 | 580 | 643 | 63 |
| suffixed/syllables:2 | 1913 | 1893 | -20 |
| suffixed/syllables:3 | 1455 | 1476 | 21 |
| suffixed/syllables:4 | 457 | 464 | 7 |
| suffixed/syllables:5 | 129 | 105 | -24 |
| suffixed/syllables:6 | 21 | 22 | 1 |
| suffixed/syllables:7 | 4 | 5 | 1 |
| suffixed/syllables:9 | 0 | 1 | 1 |

## lexicon-bare

10000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 9654.000 | 9627.000 | -27.000 |
| Mean letters | 6.785 | 6.722 | -0.063 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.004945 | 0.004913 | -0.000032 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.192258 | 0.191952 | -0.000306 |
| trigrams / missingReferenceMass | 0.096745 | 0.102419 | 0.005674 |
| trigrams / unseenGeneratedMass | 0.007147 | 0.008344 | 0.001197 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/7885 (0.000%) | 0/7772 (0.000%) | 0.000 | -113 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/7885 (0.000%) | 0/7772 (0.000%) | 0.000 | -113 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/10000 (0.000%) | 0/10000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/10000 (0.000%) | 0/10000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/10000 (0.000%) | 0/10000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/10000 (0.000%) | 0/10000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/10000 (0.000%) | 0/10000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 0/10000 (0.000%) | 0/10000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 2171/5394 (40.248%) | 1361/5253 (25.909%) | -14.339 | -141 | -16.502 to -11.282 |
| Monosyllables with schwa as their sole nucleus / lower | 0/2115 (0.000%) | 0/2228 (0.000%) | 0.000 | 113 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/10000 (0.000%) | 0/10000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 39/2115 (1.844%) | 28/2228 (1.257%) | -0.587 | 113 | -1.224 to +0.010 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 2115 | 2228 | 113 |
| bare/syllables:2 | 5394 | 5253 | -141 |
| bare/syllables:3 | 1673 | 1703 | 30 |
| bare/syllables:4 | 578 | 617 | 39 |
| bare/syllables:5 | 193 | 162 | -31 |
| bare/syllables:6 | 39 | 30 | -9 |
| bare/syllables:7 | 6 | 7 | 1 |
| bare/syllables:8 | 2 | 0 | -2 |

## monosyllables-bare

10000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 5911.000 | 5911.000 | 0.000 |
| Mean letters | 4.272 | 4.272 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.042820 | 0.042820 | 0.000000 |
| phonemes / missingReferenceMass | 0.000640 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.346347 | 0.346347 | 0.000000 |
| trigrams / missingReferenceMass | 0.355628 | 0.355628 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.002157 | 0.002157 | 0.000000 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Polysyllables with multiple primary stresses / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with primary-stressed schwa / lower | 0/10000 (0.000%) | 0/10000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/10000 (0.000%) | 0/10000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/10000 (0.000%) | 0/10000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/10000 (0.000%) | 0/10000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/10000 (0.000%) | 0/10000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 0/10000 (0.000%) | 0/10000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Monosyllables with schwa as their sole nucleus / lower | 0/10000 (0.000%) | 0/10000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/10000 (0.000%) | 0/10000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 182/10000 (1.820%) | 182/10000 (1.820%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 10000 | 10000 | 0 |

## text-default

10000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 9156.000 | 9109.000 | -47.000 |
| Mean letters | 6.700 | 6.658 | -0.042 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006925 | 0.006745 | -0.000180 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.178621 | 0.178752 | 0.000131 |
| trigrams / missingReferenceMass | 0.087836 | 0.083220 | -0.004617 |
| trigrams / unseenGeneratedMass | 0.004447 | 0.004916 | 0.000469 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/5813 (0.000%) | 0/5786 (0.000%) | 0.000 | -27 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/5813 (0.000%) | 0/5786 (0.000%) | 0.000 | -27 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/10000 (0.000%) | 0/10000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/10000 (0.000%) | 0/10000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/4513 (0.000%) | 0/4487 (0.000%) | 0.000 | -26 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/10000 (0.000%) | 0/10000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/10000 (0.000%) | 0/10000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 4513/10000 (45.130%) | 4487/10000 (44.870%) | -0.260 | 0 | -1.650 to +2.100 |
| Words with adjacent identical coda segments / lower | 0/10000 (0.000%) | 0/10000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 1282/3022 (42.422%) | 1058/3044 (34.757%) | -7.665 | 22 | -9.514 to -5.794 |
| Monosyllables with schwa as their sole nucleus / lower | 0/4187 (0.000%) | 0/4214 (0.000%) | 0.000 | 27 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/10000 (0.000%) | 0/10000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 80/4187 (1.911%) | 63/4214 (1.495%) | -0.416 | 27 | -1.057 to +0.123 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 3542 | 3554 | 12 |
| bare/syllables:2 | 1106 | 1099 | -7 |
| bare/syllables:3 | 558 | 566 | 8 |
| bare/syllables:4 | 227 | 243 | 16 |
| bare/syllables:5 | 44 | 46 | 2 |
| bare/syllables:6 | 10 | 5 | -5 |
| both/syllables:2 | 110 | 100 | -10 |
| both/syllables:3 | 186 | 198 | 12 |
| both/syllables:4 | 130 | 115 | -15 |
| both/syllables:5 | 56 | 56 | 0 |
| both/syllables:6 | 22 | 19 | -3 |
| both/syllables:7 | 4 | 8 | 4 |
| both/syllables:8 | 2 | 1 | -1 |
| prefixed/syllables:2 | 619 | 607 | -12 |
| prefixed/syllables:3 | 240 | 216 | -24 |
| prefixed/syllables:4 | 105 | 114 | 9 |
| prefixed/syllables:5 | 39 | 29 | -10 |
| prefixed/syllables:6 | 15 | 8 | -7 |
| prefixed/syllables:7 | 3 | 5 | 2 |
| suffixed/syllables:1 | 645 | 660 | 15 |
| suffixed/syllables:2 | 1187 | 1238 | 51 |
| suffixed/syllables:3 | 698 | 694 | -4 |
| suffixed/syllables:4 | 299 | 283 | -16 |
| suffixed/syllables:5 | 114 | 109 | -5 |
| suffixed/syllables:6 | 36 | 21 | -15 |
| suffixed/syllables:7 | 2 | 5 | 3 |
| suffixed/syllables:8 | 1 | 1 | 0 |
