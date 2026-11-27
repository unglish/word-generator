# Quality comparison: candidate-04ff89463fdc

Original baseline: merge-base-c5003eb52612. Cohort: development.

| Role | Run | Generator commit | Generator state | Source digest |
|---|---|---|---|---|
| baseline | merge-base-c5003eb52612 | c5003eb5261217aa86a7633892f43274c0ac85ad | clean | 42522e840b9e6999d058e32e4b3ffb58f60707673c111adab877d5610ba32d26 |
| candidate | candidate-04ff89463fdc | 69dee9b803a6038c6dd5fdda22dd0a489b2ae6b4 | clean | 0c310040c62da5a606809ea6744967d42782aec26fe3c8e917d33bd02d2e0897 |

These are sample observations, not paired words or human-quality proof. A change to how a stage draws can change that stage's later choices in the word. With per-stage random streams (#556) on both sides, under the same stream scheme, the other stages' draws stay the same while the same root attempt is selected; when either run predates them, it can change every later word in the stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.

Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.

Protocol: 451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862. Evaluator: 87ab55aca1c756e2deac57f9ac3778d9682127d28147b1d926fc75981b4ac36f. Reference: 2669317aea2346f807b92e83d58eba05f41f132133623a177c34538ebd86a394.

## lexicon-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 48287.000 | 48287.000 | 0.000 |
| Mean letters | 7.836 | 7.836 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.003973 | 0.003974 | 0.000000 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.161448 | 0.161455 | 0.000007 |
| trigrams / missingReferenceMass | 0.026199 | 0.026250 | 0.000050 |
| trigrams / unseenGeneratedMass | 0.034690 | 0.034684 | -0.000007 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/43659 (0.000%) | 0/43659 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/43659 (0.000%) | 0/43659 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/25883 (0.000%) | 0/25883 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 25883/50000 (51.766%) | 25883/50000 (51.766%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 6108/23089 (26.454%) | 6108/23089 (26.454%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables with schwa as their sole nucleus / lower | 0/6341 (0.000%) | 0/6341 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 129/6341 (2.034%) | 129/6341 (2.034%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 3321 | 3321 | 0 |
| bare/syllables:2 | 12903 | 12903 | 0 |
| bare/syllables:3 | 5134 | 5134 | 0 |
| bare/syllables:4 | 1977 | 1977 | 0 |
| bare/syllables:5 | 616 | 616 | 0 |
| bare/syllables:6 | 143 | 143 | 0 |
| bare/syllables:7 | 22 | 22 | 0 |
| bare/syllables:8 | 1 | 1 | 0 |
| both/syllables:2 | 395 | 395 | 0 |
| both/syllables:3 | 803 | 803 | 0 |
| both/syllables:4 | 483 | 483 | 0 |
| both/syllables:5 | 143 | 143 | 0 |
| both/syllables:6 | 31 | 31 | 0 |
| both/syllables:7 | 4 | 4 | 0 |
| prefixed/syllables:2 | 360 | 360 | 0 |
| prefixed/syllables:3 | 428 | 428 | 0 |
| prefixed/syllables:4 | 228 | 228 | 0 |
| prefixed/syllables:5 | 87 | 87 | 0 |
| prefixed/syllables:6 | 23 | 23 | 0 |
| prefixed/syllables:7 | 4 | 4 | 0 |
| suffixed/syllables:1 | 3020 | 3020 | 0 |
| suffixed/syllables:2 | 9431 | 9431 | 0 |
| suffixed/syllables:3 | 7528 | 7527 | -1 |
| suffixed/syllables:4 | 2270 | 2271 | 1 |
| suffixed/syllables:5 | 528 | 528 | 0 |
| suffixed/syllables:6 | 96 | 96 | 0 |
| suffixed/syllables:7 | 19 | 19 | 0 |
| suffixed/syllables:8 | 2 | 2 | 0 |

## lexicon-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 45006.000 | 45006.000 | 0.000 |
| Mean letters | 6.750 | 6.750 | +0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.005909 | 0.005909 | 0.000001 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.212765 | 0.212773 | 0.000008 |
| trigrams / missingReferenceMass | 0.048838 | 0.048838 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.040847 | 0.040843 | -0.000004 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/39355 (0.000%) | 0/39355 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/39355 (0.000%) | 0/39355 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/0 (n/a) | 0/0 (n/a) | n/a | 0 | n/a to n/a |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 7462/26586 (28.067%) | 7462/26586 (28.067%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables with schwa as their sole nucleus / lower | 0/10645 (0.000%) | 0/10645 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 184/10645 (1.729%) | 184/10645 (1.729%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 10645 | 10645 | 0 |
| bare/syllables:2 | 26586 | 26586 | 0 |
| bare/syllables:3 | 8699 | 8699 | 0 |
| bare/syllables:4 | 2969 | 2969 | 0 |
| bare/syllables:5 | 871 | 871 | 0 |
| bare/syllables:6 | 197 | 197 | 0 |
| bare/syllables:7 | 30 | 30 | 0 |
| bare/syllables:8 | 3 | 3 | 0 |

## monosyllables-bare

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 14916.000 | 14916.000 | 0.000 |
| Mean letters | 4.279 | 4.279 | 0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.043612 | 0.043612 | 0.000000 |
| phonemes / missingReferenceMass | 0.000640 | 0.000640 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.351395 | 0.351395 | 0.000000 |
| trigrams / missingReferenceMass | 0.294821 | 0.294821 | 0.000000 |
| trigrams / unseenGeneratedMass | 0.018922 | 0.018922 | 0.000000 |

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
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 971/50000 (1.942%) | 971/50000 (1.942%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 50000 | 50000 | 0 |

## text-default

50000 draws per run.

| Measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| Unique spellings | 39637.000 | 39637.000 | 0.000 |
| Mean letters | 6.696 | 6.696 | -0.000 |

Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.

| Distribution / measure | Original baseline | Candidate | Change |
|---|---:|---:|---:|
| phonemes / jensenShannonBits | 0.006646 | 0.006647 | 0.000001 |
| phonemes / missingReferenceMass | 0.000000 | 0.000000 | 0.000000 |
| phonemes / unseenGeneratedMass | 0.000000 | 0.000000 | 0.000000 |
| trigrams / jensenShannonBits | 0.177181 | 0.177203 | 0.000022 |
| trigrams / missingReferenceMass | 0.029810 | 0.029800 | -0.000011 |
| trigrams / unseenGeneratedMass | 0.030010 | 0.030019 | 0.000009 |

| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |
|---|---:|---:|---:|---:|---:|
| Polysyllables without primary stress / lower | 0/28926 (0.000%) | 0/28926 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Polysyllables with multiple primary stresses / lower | 0/28926 (0.000%) | 0/28926 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with primary-stressed schwa / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a primary-stressed reduced vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Affixed words with a morphological hiatus fallback / lower | 0/22535 (0.000%) | 0/22535 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with a zero-total-weight grapheme choice / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words missing an orthographic trace / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words whose orthographic trace differs from the final spelling / lower | 22535/50000 (45.070%) | 22535/50000 (45.070%) | 0.000 | 0 | 0.000 to 0.000 |
| Words with adjacent identical coda segments / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Disyllables with adjacent primary and secondary stress / lower | 5302/15302 (34.649%) | 5302/15302 (34.649%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables with schwa as their sole nucleus / lower | 0/21074 (0.000%) | 0/21074 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Words ending in an open checked vowel / lower | 0/50000 (0.000%) | 0/50000 (0.000%) | 0.000 | 0 | 0.000 to 0.000 |
| Monosyllables containing the FOOT vowel /ʊ/ / higher | 333/21074 (1.580%) | 333/21074 (1.580%) | 0.000 | 0 | 0.000 to 0.000 |

| Stratum | Original draws | Candidate draws | Change |
|---|---:|---:|---:|
| bare/syllables:1 | 17877 | 17877 | 0 |
| bare/syllables:2 | 5429 | 5429 | 0 |
| bare/syllables:3 | 2774 | 2774 | 0 |
| bare/syllables:4 | 1093 | 1093 | 0 |
| bare/syllables:5 | 260 | 260 | 0 |
| bare/syllables:6 | 32 | 32 | 0 |
| both/syllables:2 | 503 | 503 | 0 |
| both/syllables:3 | 985 | 985 | 0 |
| both/syllables:4 | 579 | 579 | 0 |
| both/syllables:5 | 258 | 258 | 0 |
| both/syllables:6 | 110 | 110 | 0 |
| both/syllables:7 | 43 | 43 | 0 |
| both/syllables:8 | 5 | 5 | 0 |
| prefixed/syllables:2 | 3132 | 3132 | 0 |
| prefixed/syllables:3 | 1060 | 1060 | 0 |
| prefixed/syllables:4 | 524 | 524 | 0 |
| prefixed/syllables:5 | 245 | 245 | 0 |
| prefixed/syllables:6 | 48 | 48 | 0 |
| prefixed/syllables:7 | 10 | 10 | 0 |
| prefixed/syllables:8 | 1 | 1 | 0 |
| suffixed/syllables:1 | 3197 | 3197 | 0 |
| suffixed/syllables:2 | 6238 | 6238 | 0 |
| suffixed/syllables:3 | 3473 | 3470 | -3 |
| suffixed/syllables:4 | 1370 | 1373 | 3 |
| suffixed/syllables:5 | 570 | 568 | -2 |
| suffixed/syllables:6 | 150 | 152 | 2 |
| suffixed/syllables:7 | 30 | 30 | 0 |
| suffixed/syllables:8 | 4 | 4 | 0 |
