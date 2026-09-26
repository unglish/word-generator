# Quality comparison: complete-stress-patterns

Original baseline: lexical-metadata-detachment. Cohort: development.

These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007. Reference: 38cf9d0bab164881ce06756118070d1d96db1056b8f51698ef85ef6294c5b858.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 44246.000 | 44246.000 | 0.000 |
| Mean letters | 7.492 | 7.492 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006288 | 0.006288 | 0.000000 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.157836 | 0.157836 | 0.000000 |
| trigrams / missingReferenceMass | 0.033752 | 0.033752 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.010550 | 0.010550 | 0.000000 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/45550 (0.000%) | 0/45550 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/45550 (0.000%) | 0/45550 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 3914/34898 (11.216%) | 3914/34898 (11.216%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 1918/50000 (3.836%) | 1918/50000 (3.836%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 34898/50000 (69.796%) | 34898/50000 (69.796%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 193/50000 (0.386%) | 193/50000 (0.386%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 8757/20829 (42.042%) | 8757/20829 (42.042%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables with schwa as their sole nucleus / lower | 0/4450 (0.000%) | 0/4450 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 888/50000 (1.776%) | 888/50000 (1.776%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 26/4450 (0.584%) | 26/4450 (0.584%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 1948 | 1948 | 0 |
| bare/syllables:2 | 6939 | 6939 | 0 |
| bare/syllables:3 | 4172 | 4172 | 0 |
| bare/syllables:4 | 1455 | 1455 | 0 |
| bare/syllables:5 | 477 | 477 | 0 |
| bare/syllables:6 | 92 | 92 | 0 |
| bare/syllables:7 | 19 | 19 | 0 |
| both/syllables:2 | 1004 | 1004 | 0 |
| both/syllables:3 | 1846 | 1846 | 0 |
| both/syllables:4 | 971 | 971 | 0 |
| both/syllables:5 | 168 | 168 | 0 |
| both/syllables:6 | 30 | 30 | 0 |
| both/syllables:7 | 8 | 8 | 0 |
| prefixed/syllables:2 | 3270 | 3270 | 0 |
| prefixed/syllables:3 | 2603 | 2603 | 0 |
| prefixed/syllables:4 | 832 | 832 | 0 |
| prefixed/syllables:5 | 234 | 234 | 0 |
| prefixed/syllables:6 | 48 | 48 | 0 |
| prefixed/syllables:7 | 11 | 11 | 0 |
| prefixed/syllables:8 | 2 | 2 | 0 |
| suffixed/syllables:1 | 2502 | 2502 | 0 |
| suffixed/syllables:2 | 9616 | 9616 | 0 |
| suffixed/syllables:3 | 8158 | 8158 | 0 |
| suffixed/syllables:4 | 2732 | 2732 | 0 |
| suffixed/syllables:5 | 685 | 685 | 0 |
| suffixed/syllables:6 | 147 | 147 | 0 |
| suffixed/syllables:7 | 26 | 26 | 0 |
| suffixed/syllables:8 | 5 | 5 | 0 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 47410.000 | 47410.000 | 0.000 |
| Mean letters | 7.401 | 7.401 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.000276 | 0.000276 | 0.000000 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.183541 | 0.183541 | 0.000000 |
| trigrams / missingReferenceMass | 0.048157 | 0.048157 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.012653 | 0.012653 | 0.000000 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43443 (0.000%) | 0/43443 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43443 (0.000%) | 0/43443 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 3031/50000 (6.062%) | 3031/50000 (6.062%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 280/50000 (0.560%) | 280/50000 (0.560%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 9357/22960 (40.753%) | 9357/22960 (40.753%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables with schwa as their sole nucleus / lower | 0/6557 (0.000%) | 0/6557 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 1398/50000 (2.796%) | 1398/50000 (2.796%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 34/6557 (0.519%) | 34/6557 (0.519%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 6557 | 6557 | 0 |
| bare/syllables:2 | 22960 | 22960 | 0 |
| bare/syllables:3 | 13844 | 13844 | 0 |
| bare/syllables:4 | 4943 | 4943 | 0 |
| bare/syllables:5 | 1374 | 1374 | 0 |
| bare/syllables:6 | 274 | 274 | 0 |
| bare/syllables:7 | 41 | 41 | 0 |
| bare/syllables:8 | 7 | 7 | 0 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 16004.000 | 16004.000 | 0.000 |
| Mean letters | 5.454 | 5.454 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.095402 | 0.095402 | 0.000000 |
| phonemes / missingReferenceMass | 0.000640 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.506436 | 0.506436 | 0.000000 |
| trigrams / missingReferenceMass | 0.368631 | 0.368631 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.003237 | 0.003237 | 0.000000 |

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
| Words with adjacent identical coda segments / lower | 5451/50000 (10.902%) | 5451/50000 (10.902%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Monosyllables with schwa as their sole nucleus / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 262/50000 (0.524%) | 262/50000 (0.524%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 295/50000 (0.590%) | 295/50000 (0.590%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 29862.000 | 29862.000 | 0.000 |
| Mean letters | 5.670 | 5.670 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.009525 | 0.009525 | 0.000000 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.178858 | 0.178858 | 0.000000 |
| trigrams / missingReferenceMass | 0.051167 | 0.051167 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.010022 | 0.010022 | 0.000000 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/27254 (0.000%) | 0/27254 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/27254 (0.000%) | 0/27254 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 4371/22476 (19.447%) | 4371/22476 (19.447%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 854/50000 (1.708%) | 854/50000 (1.708%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22476/50000 (44.952%) | 22476/50000 (44.952%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 138/50000 (0.276%) | 138/50000 (0.276%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 7532/17038 (44.207%) | 7532/17038 (44.207%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables with schwa as their sole nucleus / lower | 0/22746 (0.000%) | 0/22746 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 1149/50000 (2.298%) | 1149/50000 (2.298%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 120/22746 (0.528%) | 120/22746 (0.528%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17902 | 17902 | 0 |
| bare/syllables:2 | 5459 | 5459 | 0 |
| bare/syllables:3 | 2728 | 2728 | 0 |
| bare/syllables:4 | 1182 | 1182 | 0 |
| bare/syllables:5 | 225 | 225 | 0 |
| bare/syllables:6 | 28 | 28 | 0 |
| both/syllables:2 | 925 | 925 | 0 |
| both/syllables:3 | 1063 | 1063 | 0 |
| both/syllables:4 | 459 | 459 | 0 |
| both/syllables:5 | 47 | 47 | 0 |
| both/syllables:6 | 5 | 5 | 0 |
| prefixed/syllables:2 | 4109 | 4109 | 0 |
| prefixed/syllables:3 | 625 | 625 | 0 |
| prefixed/syllables:4 | 182 | 182 | 0 |
| prefixed/syllables:5 | 68 | 68 | 0 |
| prefixed/syllables:6 | 10 | 10 | 0 |
| prefixed/syllables:7 | 3 | 3 | 0 |
| suffixed/syllables:1 | 4844 | 4844 | 0 |
| suffixed/syllables:2 | 6545 | 6545 | 0 |
| suffixed/syllables:3 | 2827 | 2827 | 0 |
| suffixed/syllables:4 | 548 | 548 | 0 |
| suffixed/syllables:5 | 192 | 192 | 0 |
| suffixed/syllables:6 | 23 | 23 | 0 |
| suffixed/syllables:7 | 1 | 1 | 0 |
