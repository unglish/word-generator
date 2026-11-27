# Surface positional UCI comparison

Paired lexicon-default / development with 10000 draws per seed.

| Capture | Generator revision and source | Config | Root engine | Capture environment |
| --- | --- | --- | --- | --- |
| Before `main-a` | `f70b0b388dde55c91f6558906b8efa70ae75e174` (clean) · source `7ae4bc445150f3593a4b2b971a0925ad09e6864e4cbcd04660c22e8824e08383` | `08a339efe599979cfed43275ef35f917d55a64b5253bc2e49acb599621f3fb1f` | `legacy-weighted` (declared) | v24.22.1 · darwin/arm64 · lock `1829034f50d0b2c86323d83dcb19ec162514b2d2e27693892235321d6a903b24` |
| After `main-b` | `f70b0b388dde55c91f6558906b8efa70ae75e174` (clean) · source `7ae4bc445150f3593a4b2b971a0925ad09e6864e4cbcd04660c22e8824e08383` | `08a339efe599979cfed43275ef35f917d55a64b5253bc2e49acb599621f3fb1f` | `legacy-weighted` (declared) | v24.22.1 · darwin/arm64 · lock `1829034f50d0b2c86323d83dcb19ec162514b2d2e27693892235321d6a903b24` |

Capture protocol `451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862`, reference `2c6d44fcb8e6aa3e31733bf10db2d60b2d80634f099c542f2fbdbc226f661597`, scorer `c9309bfedf47f8fcd9a76866e2395b274c2988495feba23d263ec67baa56bd40`.

U and B are unigram and bigram. The medians use matched percentiles. The tail counts percentiles strictly below 10 among draws with peers. Deltas are after minus before. Root strata use the realized lexical-root length in each arm.

## Changes across paired draws

Spelling and emitted IPA are compared on every draw. Projected-phone differences use pairs with complete projections in both arms. A draw can change several fields.

| Sample | Draws | Any field | Spelling | IPA | Projected phones / comparable | Projection eligibility | Root syllables | Winning attempt |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| All | 50000 | 0 | 0 | 0 | 0/50000 | 0 | 0 | 0 |
| Before root 1 | 10710 | 0 | 0 | 0 | 0/10710 | 0 | 0 | 0 |
| Before root 2 | 26554 | 0 | 0 | 0 | 0/26554 | 0 | 0 | 0 |
| Before root 3 | 8769 | 0 | 0 | 0 | 0/8769 | 0 | 0 | 0 |
| Before root 4 | 2969 | 0 | 0 | 0 | 0/2969 | 0 | 0 | 0 |
| Before root 5+ | 998 | 0 | 0 | 0 | 0/998 | 0 | 0 | 0 |
| Seed 69212153 | 10000 | 0 | 0 | 0 | 0/10000 | 0 | 0 | 0 |
| Seed 101601885 | 10000 | 0 | 0 | 0 | 0/10000 | 0 | 0 | 0 |
| Seed 3921817393 | 10000 | 0 | 0 | 0 | 0/10000 | 0 | 0 | 0 |
| Seed 3948943232 | 10000 | 0 | 0 | 0 | 0/10000 | 0 | 0 | 0 |
| Seed 2089697863 | 10000 | 0 | 0 | 0 | 0/10000 | 0 | 0 | 0 |

## Adjacent sound pairs in generated output

Across 50000 mutually projectable draws (0 excluded), before had 280578 adjacent tokens and after had 280578. Repeats count at every position within a word.

All pair counts match.

## Pooled

| Root syllables | Before N | Unmapped/empty | No peers | U median | B median | B < 10 | After N | Unmapped/empty | No peers | U median | B median | B < 10 | Δ U median | Δ B median | Δ B tail (pp) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| All | 50000 | 0 | 3 | 45.501 | 27.933 | 12193/49997 | 50000 | 0 | 3 | 45.501 | 27.933 | 12193/49997 | 0.000 | 0.000 | 0.000 |
| 1 | 10710 | 0 | 0 | 57.488 | 54.397 | 750/10710 | 10710 | 0 | 0 | 57.488 | 54.397 | 750/10710 | 0.000 | 0.000 | 0.000 |
| 2 | 26554 | 0 | 0 | 43.806 | 26.499 | 6180/26554 | 26554 | 0 | 0 | 43.806 | 26.499 | 6180/26554 | 0.000 | 0.000 | 0.000 |
| 3 | 8769 | 0 | 0 | 39.607 | 17.003 | 3173/8769 | 8769 | 0 | 0 | 39.607 | 17.003 | 3173/8769 | 0.000 | 0.000 | 0.000 |
| 4 | 2969 | 0 | 0 | 33.100 | 9.933 | 1490/2969 | 2969 | 0 | 0 | 33.100 | 9.933 | 1490/2969 | 0.000 | 0.000 | 0.000 |
| 5+ | 998 | 0 | 3 | 30.403 | 6.417 | 600/995 | 998 | 0 | 3 | 30.403 | 6.417 | 600/995 | 0.000 | 0.000 | 0.000 |

## Guide metrics

Context for UCI, not thresholds. A UCI gain that comes with more dictionary words, duplicates or rare pairs needs a look at the words. T is the held-out phone trigram percentile (guide-metrics-v1, additive smoothing 0.1 over 40 outcomes). A rare pair is an adjacent pair found in at most 4 reference spellings' pronunciations; 488/45904 reference words (1.06%) contain one once their own vote is removed. Rare-pair, trigram and dictionary-pronunciation rates use projectable draws. Spelling and duplicate rates use every draw. Duplicates repeat an earlier draw of the same seed.

| Sample | Arm | T median | T < 10 | Rare pair | Dictionary pronunciation | Dictionary spelling | Duplicate spelling | Duplicate IPA |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Pooled | before | 5.760 | 29684/49997 (59.37%) | 3491/50000 (6.98%) | 2603/50000 (5.21%) | 1719/50000 (3.44%) | 0.79% to 1.04% (mean 0.89%) per seed | 0.95% to 1.05% (mean 0.99%) per seed |
| Pooled | after | 5.760 | 29684/49997 (59.37%) | 3491/50000 (6.98%) | 2603/50000 (5.21%) | 1719/50000 (3.44%) | 0.79% to 1.04% (mean 0.89%) per seed | 0.95% to 1.05% (mean 0.99%) per seed |
| Seed 69212153 | before | 5.675 | 5957/9999 (59.58%) | 654/10000 (6.54%) | 507/10000 (5.07%) | 317/10000 (3.17%) | 79/10000 (0.79%) | 96/10000 (0.96%) |
| Seed 69212153 | after | 5.675 | 5957/9999 (59.58%) | 654/10000 (6.54%) | 507/10000 (5.07%) | 317/10000 (3.17%) | 79/10000 (0.79%) | 96/10000 (0.96%) |
| Seed 101601885 | before | 5.714 | 5939/10000 (59.39%) | 727/10000 (7.27%) | 544/10000 (5.44%) | 371/10000 (3.71%) | 92/10000 (0.92%) | 102/10000 (1.02%) |
| Seed 101601885 | after | 5.714 | 5939/10000 (59.39%) | 727/10000 (7.27%) | 544/10000 (5.44%) | 371/10000 (3.71%) | 92/10000 (0.92%) | 102/10000 (1.02%) |
| Seed 3921817393 | before | 5.714 | 5910/10000 (59.10%) | 697/10000 (6.97%) | 534/10000 (5.34%) | 341/10000 (3.41%) | 79/10000 (0.79%) | 95/10000 (0.95%) |
| Seed 3921817393 | after | 5.714 | 5910/10000 (59.10%) | 697/10000 (6.97%) | 534/10000 (5.34%) | 341/10000 (3.41%) | 79/10000 (0.79%) | 95/10000 (0.95%) |
| Seed 3948943232 | before | 5.846 | 5920/9999 (59.21%) | 709/10000 (7.09%) | 540/10000 (5.40%) | 365/10000 (3.65%) | 104/10000 (1.04%) | 105/10000 (1.05%) |
| Seed 3948943232 | after | 5.846 | 5920/9999 (59.21%) | 709/10000 (7.09%) | 540/10000 (5.40%) | 365/10000 (3.65%) | 104/10000 (1.04%) | 105/10000 (1.05%) |
| Seed 2089697863 | before | 5.812 | 5958/9999 (59.59%) | 704/10000 (7.04%) | 478/10000 (4.78%) | 325/10000 (3.25%) | 93/10000 (0.93%) | 98/10000 (0.98%) |
| Seed 2089697863 | after | 5.812 | 5958/9999 (59.59%) | 704/10000 (7.04%) | 478/10000 (4.78%) | 325/10000 (3.25%) | 93/10000 (0.93%) | 98/10000 (0.98%) |

Seed-to-seed spread of each arm and of the after − before change. Rates are in percent, changes in percentage points, trigram medians in percentile points.

| Metric | Before across seeds | After across seeds | Change across seeds | Pooled change |
| --- | --- | --- | --- | ---: |
| T median | 5.675 to 5.846 (mean 5.752) | 5.675 to 5.846 (mean 5.752) | 0.000 to 0.000 (mean 0.000) | 0.000 |
| T < 10 | 59.10% to 59.59% (mean 59.37%) | 59.10% to 59.59% (mean 59.37%) | 0.00 to 0.00 (mean 0.00) | 0.00 |
| Rare pair | 6.54% to 7.27% (mean 6.98%) | 6.54% to 7.27% (mean 6.98%) | 0.00 to 0.00 (mean 0.00) | 0.00 |
| Dictionary pronunciation | 4.78% to 5.44% (mean 5.21%) | 4.78% to 5.44% (mean 5.21%) | 0.00 to 0.00 (mean 0.00) | 0.00 |
| Dictionary spelling | 3.17% to 3.71% (mean 3.44%) | 3.17% to 3.71% (mean 3.44%) | 0.00 to 0.00 (mean 0.00) | 0.00 |
| Duplicate spelling | 0.79% to 1.04% (mean 0.89%) | 0.79% to 1.04% (mean 0.89%) | 0.00 to 0.00 (mean 0.00) | — |
| Duplicate IPA | 0.95% to 1.05% (mean 0.99%) | 0.95% to 1.05% (mean 0.99%) | 0.00 to 0.00 (mean 0.00) | — |

221 distinct rare pairs occur. The most frequent in each arm, by draws containing them:

| Arm | Sound pair | Reference spellings | Before draws | After draws |
| --- | --- | ---: | ---: | ---: |
| before | `UH N` | 4 | 248 | 248 |
| before | `IY NG` | 1 | 179 | 179 |
| before | `L L` | 3 | 114 | 114 |
| before | `OW NG` | 0 | 111 | 111 |
| before | `F K` | 4 | 100 | 100 |
| before | `Y EY` | 4 | 98 | 98 |
| before | `V UW` | 2 | 86 | 86 |
| before | `AW K` | 0 | 77 | 77 |
| before | `Y AY` | 1 | 75 | 75 |
| before | `AY NG` | 0 | 73 | 73 |
| after | `UH N` | 4 | 248 | 248 |
| after | `IY NG` | 1 | 179 | 179 |
| after | `L L` | 3 | 114 | 114 |
| after | `OW NG` | 0 | 111 | 111 |
| after | `F K` | 4 | 100 | 100 |
| after | `Y EY` | 4 | 98 | 98 |
| after | `V UW` | 2 | 86 | 86 |
| after | `AW K` | 0 | 77 | 77 |
| after | `Y AY` | 1 | 75 | 75 |
| after | `AY NG` | 0 | 73 | 73 |

## Paired seeds

| Seed | Median paired difference U | Matched U pairs | Median paired difference B | Matched B pairs |
| --- | ---: | ---: | ---: | ---: |
| 69212153 | 0.000 | 9999 | 0.000 | 9999 |
| 101601885 | 0.000 | 10000 | 0.000 | 10000 |
| 3921817393 | 0.000 | 10000 | 0.000 | 10000 |
| 3948943232 | 0.000 | 9999 | 0.000 | 9999 |
| 2089697863 | 0.000 | 9999 | 0.000 | 9999 |

| Root syllables | Range Δ U median | Range Δ B median | Range Δ B tail (pp) |
| --- | ---: | ---: | ---: |
| All | 0.000 to 0.000 (5 seeds) | 0.000 to 0.000 (5 seeds) | 0.000 to 0.000 (5 seeds) |
| 1 | 0.000 to 0.000 (5 seeds) | 0.000 to 0.000 (5 seeds) | 0.000 to 0.000 (5 seeds) |
| 2 | 0.000 to 0.000 (5 seeds) | 0.000 to 0.000 (5 seeds) | 0.000 to 0.000 (5 seeds) |
| 3 | 0.000 to 0.000 (5 seeds) | 0.000 to 0.000 (5 seeds) | 0.000 to 0.000 (5 seeds) |
| 4 | 0.000 to 0.000 (5 seeds) | 0.000 to 0.000 (5 seeds) | 0.000 to 0.000 (5 seeds) |
| 5+ | 0.000 to 0.000 (5 seeds) | 0.000 to 0.000 (5 seeds) | 0.000 to 0.000 (5 seeds) |

### Seed 69212153

| Root syllables | Before N | Unmapped/empty | No peers | U median | B median | B < 10 | After N | Unmapped/empty | No peers | U median | B median | B < 10 | Δ U median | Δ B median | Δ B tail (pp) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| All | 10000 | 0 | 1 | 45.782 | 28.150 | 2419/9999 | 10000 | 0 | 1 | 45.782 | 28.150 | 2419/9999 | 0.000 | 0.000 | 0.000 |
| 1 | 2120 | 0 | 0 | 57.546 | 55.084 | 136/2120 | 2120 | 0 | 0 | 57.546 | 55.084 | 136/2120 | 0.000 | 0.000 | 0.000 |
| 2 | 5337 | 0 | 0 | 43.587 | 27.189 | 1233/5337 | 5337 | 0 | 0 | 43.587 | 27.189 | 1233/5337 | 0.000 | 0.000 | 0.000 |
| 3 | 1729 | 0 | 0 | 40.836 | 17.483 | 624/1729 | 1729 | 0 | 0 | 40.836 | 17.483 | 624/1729 | 0.000 | 0.000 | 0.000 |
| 4 | 616 | 0 | 0 | 33.844 | 10.373 | 302/616 | 616 | 0 | 0 | 33.844 | 10.373 | 302/616 | 0.000 | 0.000 | 0.000 |
| 5+ | 198 | 0 | 1 | 31.016 | 4.778 | 124/197 | 198 | 0 | 1 | 31.016 | 4.778 | 124/197 | 0.000 | 0.000 | 0.000 |

### Seed 101601885

| Root syllables | Before N | Unmapped/empty | No peers | U median | B median | B < 10 | After N | Unmapped/empty | No peers | U median | B median | B < 10 | Δ U median | Δ B median | Δ B tail (pp) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| All | 10000 | 0 | 0 | 44.487 | 27.331 | 2458/10000 | 10000 | 0 | 0 | 44.487 | 27.331 | 2458/10000 | 0.000 | 0.000 | 0.000 |
| 1 | 2195 | 0 | 0 | 56.522 | 53.191 | 163/2195 | 2195 | 0 | 0 | 56.522 | 53.191 | 163/2195 | 0.000 | 0.000 | 0.000 |
| 2 | 5298 | 0 | 0 | 43.217 | 26.176 | 1263/5298 | 5298 | 0 | 0 | 43.217 | 26.176 | 1263/5298 | 0.000 | 0.000 | 0.000 |
| 3 | 1724 | 0 | 0 | 36.905 | 16.751 | 635/1724 | 1724 | 0 | 0 | 36.905 | 16.751 | 635/1724 | 0.000 | 0.000 | 0.000 |
| 4 | 578 | 0 | 0 | 30.325 | 10.619 | 280/578 | 578 | 0 | 0 | 30.325 | 10.619 | 280/578 | 0.000 | 0.000 | 0.000 |
| 5+ | 205 | 0 | 0 | 30.909 | 7.180 | 117/205 | 205 | 0 | 0 | 30.909 | 7.180 | 117/205 | 0.000 | 0.000 | 0.000 |

### Seed 3921817393

| Root syllables | Before N | Unmapped/empty | No peers | U median | B median | B < 10 | After N | Unmapped/empty | No peers | U median | B median | B < 10 | Δ U median | Δ B median | Δ B tail (pp) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| All | 10000 | 0 | 0 | 45.132 | 27.720 | 2472/10000 | 10000 | 0 | 0 | 45.132 | 27.720 | 2472/10000 | 0.000 | 0.000 | 0.000 |
| 1 | 2145 | 0 | 0 | 57.450 | 54.130 | 161/2145 | 2145 | 0 | 0 | 57.450 | 54.130 | 161/2145 | 0.000 | 0.000 | 0.000 |
| 2 | 5241 | 0 | 0 | 42.648 | 26.377 | 1211/5241 | 5241 | 0 | 0 | 42.648 | 26.377 | 1211/5241 | 0.000 | 0.000 | 0.000 |
| 3 | 1792 | 0 | 0 | 40.408 | 16.283 | 656/1792 | 1792 | 0 | 0 | 40.408 | 16.283 | 656/1792 | 0.000 | 0.000 | 0.000 |
| 4 | 613 | 0 | 0 | 34.880 | 8.886 | 324/613 | 613 | 0 | 0 | 34.880 | 8.886 | 324/613 | 0.000 | 0.000 | 0.000 |
| 5+ | 209 | 0 | 0 | 31.250 | 8.000 | 120/209 | 209 | 0 | 0 | 31.250 | 8.000 | 120/209 | 0.000 | 0.000 | 0.000 |

### Seed 3948943232

| Root syllables | Before N | Unmapped/empty | No peers | U median | B median | B < 10 | After N | Unmapped/empty | No peers | U median | B median | B < 10 | Δ U median | Δ B median | Δ B tail (pp) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| All | 10000 | 0 | 1 | 47.174 | 28.748 | 2368/9999 | 10000 | 0 | 1 | 47.174 | 28.748 | 2368/9999 | 0.000 | 0.000 | 0.000 |
| 1 | 2096 | 0 | 0 | 58.566 | 56.302 | 133/2096 | 2096 | 0 | 0 | 58.566 | 56.302 | 133/2096 | 0.000 | 0.000 | 0.000 |
| 2 | 5359 | 0 | 0 | 45.315 | 26.739 | 1212/5359 | 5359 | 0 | 0 | 45.315 | 26.739 | 1212/5359 | 0.000 | 0.000 | 0.000 |
| 3 | 1759 | 0 | 0 | 40.311 | 17.495 | 623/1759 | 1759 | 0 | 0 | 40.311 | 17.495 | 623/1759 | 0.000 | 0.000 | 0.000 |
| 4 | 568 | 0 | 0 | 34.326 | 11.880 | 270/568 | 568 | 0 | 0 | 34.326 | 11.880 | 270/568 | 0.000 | 0.000 | 0.000 |
| 5+ | 218 | 0 | 1 | 29.524 | 6.705 | 130/217 | 218 | 0 | 1 | 29.524 | 6.705 | 130/217 | 0.000 | 0.000 | 0.000 |

### Seed 2089697863

| Root syllables | Before N | Unmapped/empty | No peers | U median | B median | B < 10 | After N | Unmapped/empty | No peers | U median | B median | B < 10 | Δ U median | Δ B median | Δ B tail (pp) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| All | 10000 | 0 | 1 | 45.344 | 27.869 | 2476/9999 | 10000 | 0 | 1 | 45.344 | 27.869 | 2476/9999 | 0.000 | 0.000 | 0.000 |
| 1 | 2154 | 0 | 0 | 57.020 | 54.204 | 157/2154 | 2154 | 0 | 0 | 57.020 | 54.204 | 157/2154 | 0.000 | 0.000 | 0.000 |
| 2 | 5319 | 0 | 0 | 44.360 | 26.221 | 1261/5319 | 5319 | 0 | 0 | 44.360 | 26.221 | 1261/5319 | 0.000 | 0.000 | 0.000 |
| 3 | 1765 | 0 | 0 | 39.539 | 17.003 | 635/1765 | 1765 | 0 | 0 | 39.539 | 17.003 | 635/1765 | 0.000 | 0.000 | 0.000 |
| 4 | 594 | 0 | 0 | 31.836 | 8.261 | 314/594 | 594 | 0 | 0 | 31.836 | 8.261 | 314/594 | 0.000 | 0.000 | 0.000 |
| 5+ | 168 | 0 | 1 | 28.571 | 5.140 | 109/167 | 168 | 0 | 1 | 28.571 | 5.140 | 109/167 | 0.000 | 0.000 | 0.000 |

## First four paired draws per seed

Each pronunciation shows spelling, IPA, realized root syllables, projected phones, fold, peer count, each metric’s raw score / percentile (U, B and the trigram T), any rare pairs and any match with a dictionary pronunciation or spelling.

| Seed/draw | Before | After | Δ B percentile |
| --- | --- | --- | ---: |
| 69212153/0 | `sontoarm` /ˈsɔn.tʰəʊrm/ · root 2 · `S AO N T OW R M` · fold 3 / 1430 peers · U 1.387 / 53.706 · B 1.020 / 14.545 · T -3.810 / 0.559 | `sontoarm` /ˈsɔn.tʰəʊrm/ · root 2 · `S AO N T OW R M` · fold 3 / 1430 peers · U 1.387 / 53.706 · B 1.020 / 14.545 · T -3.810 / 0.559 | 0.000 |
| 69212153/1 | `icoaths` /ˈɪ.kəʊθs/ · root 2 · `IH K OW TH S` · fold 2 / 1396 peers · U 1.166 / 6.805 · B 1.007 / 7.020 · T -3.599 / 1.719 | `icoaths` /ˈɪ.kəʊθs/ · root 2 · `IH K OW TH S` · fold 2 / 1396 peers · U 1.166 / 6.805 · B 1.007 / 7.020 · T -3.599 / 1.719 | 0.000 |
| 69212153/2 | `vachowl` /ˈvætʃˌəʊl/ · root 2 · `V AE CH OW L` · fold 1 / 1389 peers · U 1.168 / 6.911 · B 1.005 / 4.104 · T -4.276 / 0.360 | `vachowl` /ˈvætʃˌəʊl/ · root 2 · `V AE CH OW L` · fold 1 / 1389 peers · U 1.168 / 6.911 · B 1.005 / 4.104 · T -4.276 / 0.360 | 0.000 |
| 69212153/3 | `huleying` /ˌhʌˈleɪ.ɪŋ/ · root 2 · `HH AH L EY IH NG` · fold 0 / 1543 peers · U 1.301 / 41.478 · B 1.046 / 75.049 · T -2.187 / 63.772 | `huleying` /ˌhʌˈleɪ.ɪŋ/ · root 2 · `HH AH L EY IH NG` · fold 0 / 1543 peers · U 1.301 / 41.478 · B 1.046 / 75.049 · T -2.187 / 63.772 | 0.000 |
| 101601885/0 | `insmilled` /ˌɪnˈsmɪld/ · root 1 · `IH N S M IH L D` · fold 3 / 1430 peers · U 1.419 / 69.441 · B 1.051 / 63.077 · T -2.250 / 51.189 | `insmilled` /ˌɪnˈsmɪld/ · root 1 · `IH N S M IH L D` · fold 3 / 1430 peers · U 1.419 / 69.441 · B 1.051 / 63.077 · T -2.250 / 51.189 | 0.000 |
| 101601885/1 | `cebues` /ˈsɜ.buz/ · root 2 · `S ER B UW Z` · fold 0 / 1430 peers · U 1.216 / 26.713 · B 1.007 / 8.392 · T -3.437 / 3.776 | `cebues` /ˈsɜ.buz/ · root 2 · `S ER B UW Z` · fold 0 / 1430 peers · U 1.216 / 26.713 · B 1.007 / 8.392 · T -3.437 / 3.776 | 0.000 |
| 101601885/2 | `ekerzigimarn` /ˈɛ.kɚ.zə.gəm.ɚn/ · root 5 · `EH K ER Z AH G AH M ER N` · fold 2 / 578 peers · U 1.478 / 12.284 · B 1.019 / 0.692 · T -4.064 / 0.000 | `ekerzigimarn` /ˈɛ.kɚ.zə.gəm.ɚn/ · root 5 · `EH K ER Z AH G AH M ER N` · fold 2 / 578 peers · U 1.478 / 12.284 · B 1.019 / 0.692 · T -4.064 / 0.000 | 0.000 |
| 101601885/3 | `mintroulched` /ˈmɪn.tʰrəʊltʃt/ · root 2 · `M IH N T R OW L CH T` · fold 3 / 889 peers · U 1.552 / 58.830 · B 1.046 / 19.010 · T -2.682 / 6.187 | `mintroulched` /ˈmɪn.tʰrəʊltʃt/ · root 2 · `M IH N T R OW L CH T` · fold 3 / 889 peers · U 1.552 / 58.830 · B 1.046 / 19.010 · T -2.682 / 6.187 | 0.000 |
| 3921817393/0 | `dear` /dɛr/ · root 1 · `D EH R` · fold 0 / 447 peers · U 1.207 / 92.506 · B 1.018 / 92.506 · T -2.603 / 64.541 · dictionary pronunciation · dictionary spelling | `dear` /dɛr/ · root 1 · `D EH R` · fold 0 / 447 peers · U 1.207 / 92.506 · B 1.018 / 92.506 · T -2.603 / 64.541 · dictionary pronunciation · dictionary spelling | 0.000 |
| 3921817393/1 | `precepernest` /ˌpʰri:ˈsɜ.pɚn.ɪst/ · root 2 · `P R IY S ER P ER N IH S T` · fold 2 / 347 peers · U 1.697 / 51.873 · B 1.066 / 9.510 · T -2.600 / 2.882 | `precepernest` /ˌpʰri:ˈsɜ.pɚn.ɪst/ · root 2 · `P R IY S ER P ER N IH S T` · fold 2 / 347 peers · U 1.697 / 51.873 · B 1.066 / 9.510 · T -2.600 / 2.882 | 0.000 |
| 3921817393/2 | `brack` /bræk/ · root 1 · `B R AE K` · fold 4 / 920 peers · U 1.224 / 69.022 · B 1.025 / 91.739 · T -2.299 / 69.674 | `brack` /bræk/ · root 1 · `B R AE K` · fold 4 / 920 peers · U 1.224 / 69.022 · B 1.025 / 91.739 · T -2.299 / 69.674 | 0.000 |
| 3921817393/3 | `voardaft` /ˈvəʊrˌdæft/ · root 2 · `V OW R D AE F T` · fold 3 / 1430 peers · U 1.290 / 14.476 · B 1.007 / 0.490 · T -4.017 / 0.280 | `voardaft` /ˈvəʊrˌdæft/ · root 2 · `V OW R D AE F T` · fold 3 / 1430 peers · U 1.290 / 14.476 · B 1.007 / 0.490 · T -4.017 / 0.280 | 0.000 |
| 3948943232/0 | `ceddetive` /ˌsɛdˈɛt.ɪv/ · root 2 · `S EH D EH T IH V` · fold 3 / 1430 peers · U 1.402 / 60.909 · B 1.036 / 42.448 · T -3.158 / 3.566 | `ceddetive` /ˌsɛdˈɛt.ɪv/ · root 2 · `S EH D EH T IH V` · fold 3 / 1430 peers · U 1.402 / 60.909 · B 1.036 / 42.448 · T -3.158 / 3.566 | 0.000 |
| 3948943232/1 | `shrack` /ʃræk/ · root 1 · `SH R AE K` · fold 2 / 976 peers · U 1.173 / 34.324 · B 1.016 / 74.898 · T -2.861 / 19.877 | `shrack` /ʃræk/ · root 1 · `SH R AE K` · fold 2 / 976 peers · U 1.173 / 34.324 · B 1.016 / 74.898 · T -2.861 / 19.877 | 0.000 |
| 3948943232/2 | `brepirin` /ˈbri:.pʰə.rən/ · root 3 · `B R IY P AH R AH N` · fold 4 / 1188 peers · U 1.551 / 88.973 · B 1.085 / 84.428 · T -2.574 / 15.825 | `brepirin` /ˈbri:.pʰə.rən/ · root 3 · `B R IY P AH R AH N` · fold 4 / 1188 peers · U 1.551 / 88.973 · B 1.085 / 84.428 · T -2.574 / 15.825 | 0.000 |
| 3948943232/3 | `nalelasaisowl` /næ.li:.ləˈʒeɪ.saʊl/ · root 5 · `N AE L IY L AH ZH EY S AW L` · fold 0 / 353 peers · U 1.563 / 14.164 · B 1.024 / 0.000 · T -4.655 / 0.000 · rare `AH ZH`, `ZH EY` | `nalelasaisowl` /næ.li:.ləˈʒeɪ.saʊl/ · root 5 · `N AE L IY L AH ZH EY S AW L` · fold 0 / 353 peers · U 1.563 / 14.164 · B 1.024 / 0.000 · T -4.655 / 0.000 · rare `AH ZH`, `ZH EY` | 0.000 |
| 2089697863/0 | `mened` /mi:nd/ · root 1 · `M IY N D` · fold 1 / 998 peers · U 1.235 / 78.657 · B 1.020 / 79.359 · T -2.598 / 42.385 | `mened` /mi:nd/ · root 1 · `M IY N D` · fold 1 / 998 peers · U 1.235 / 78.657 · B 1.020 / 79.359 · T -2.598 / 42.385 | 0.000 |
| 2089697863/1 | `soclidbeanting` /sɑˈkʰlɪd.bi:nt.ɪŋ/ · root 3 · `S AA K L IH D B IY N T IH NG` · fold 3 / 200 peers · U 1.764 / 51.000 · B 1.139 / 44.000 · T -3.508 / 0.000 | `soclidbeanting` /sɑˈkʰlɪd.bi:nt.ɪŋ/ · root 3 · `S AA K L IH D B IY N T IH NG` · fold 3 / 200 peers · U 1.764 / 51.000 · B 1.139 / 44.000 · T -3.508 / 0.000 | 0.000 |
| 2089697863/2 | `tensborsing` /ˈtʰɛns.bɚs.ɪŋ/ · root 2 · `T EH N S B ER S IH NG` · fold 4 / 906 peers · U 1.506 / 41.060 · B 1.087 / 66.115 · T -2.744 / 5.408 | `tensborsing` /ˈtʰɛns.bɚs.ɪŋ/ · root 2 · `T EH N S B ER S IH NG` · fold 4 / 906 peers · U 1.506 / 41.060 · B 1.087 / 66.115 · T -2.744 / 5.408 | 0.000 |
| 2089697863/3 | `humesher` /ˈhuˌmɛʃ.ɚ/ · root 2 · `HH UW M EH SH ER` · fold 2 / 1504 peers · U 1.182 / 2.726 · B 1.005 / 1.130 · T -3.080 / 5.785 | `humesher` /ˈhuˌmɛʃ.ɚ/ · root 2 · `HH UW M EH SH ER` · fold 2 / 1504 peers · U 1.182 / 2.726 · B 1.005 / 1.130 · T -3.080 / 5.785 | 0.000 |

## Biggest percentile changes

Ranked by the unrounded pair-percentile change within each before-root group. A change in phone count or fold can change the comparison group. The first changed pair shows counts at that absolute position in the same full dictionary for both words. JSON includes every changed position, the original held-out contributions and both selected attempts’ traces. Use a random-draw replay to establish what caused an event to change.

### Before root 1

#### Higher pair percentile

No movers in this direction.

#### Lower pair percentile

No movers in this direction.

### Before root 2

#### Higher pair percentile

No movers in this direction.

#### Lower pair percentile

No movers in this direction.

### Before root 3

#### Higher pair percentile

No movers in this direction.

#### Lower pair percentile

No movers in this direction.

### Before root 4

#### Higher pair percentile

No movers in this direction.

#### Lower pair percentile

No movers in this direction.

### Before root 5+

#### Higher pair percentile

No movers in this direction.

#### Lower pair percentile

No movers in this direction.
