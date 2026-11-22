# Stage references, Phase 1

[Issue #490](https://github.com/unglish/word-generator/issues/490) starts with
`cmu-joint-ascii-first-v1` and measures morphology on a common-word subset.
The ledger covers every CMU spelling in that population. Each root gets one
vote and uses its own first selected CMU pronunciation. The template, affix,
and suffix-by-final-segment tables instead count surface types.

**Result.** 21,197 distinct roots from 43,026 representable surface types.
The mean is **2.590 syllables**, compared with **2.457** from today’s lexicon
tables. The common-word surfaces average **2.608** syllables before stripping.
The measured root mean points upward from the current target for #464.

## Population and exclusions

SCOWL 2020.12.07 supplies the lowercase ASCII entries in the ordinary
`english-words` and `american-words` lists through size 60, the upstream
spell-check cutoff. Intersecting with these lists gives explicit lexical
coverage and keeps uppercase-only spellings out. The joint policy lowercases CMU spellings, so
a spelling that is also an ordinary word can still carry a name pronunciation.
The separate SCOWL proper-name and uppercase lists at the same cutoff identify
some exclusions. The lists overlap on 1,188 CMU spellings (2.59% of the common
subset). For example, CMU's first pronunciation of `august` stresses the first
syllable, as in the month. The other exclusions include additional names,
technical terms and ordinary words absent from SCOWL at this cutoff.

Both the surface and each intermediate stem must be in the intersection.
Candidate joins use the affix inventory in `english.ts`, configured
allomorph conditions, spelling at the boundary, and aligned CMU phones.
The phone check ignores stress labels for identical segments and allows
specified reductions, some stress-related vowel alternations, and adjacent
identical consonants to share one phone. Suffix joins include doubling, y→i,
silent-e deletion, and plural spelling after sibilants. The analysis also
handles a few regular joins such as `potato → potatoes` and `crackle → crackling`.

WordNet 3.0 exception lemmas constrain analyses when available. A listed
exception with no supported route is residue, as are forms whose chain ends in
that residue. This identifies `went`, `children`, and some unstrippable
regular forms. Other missed analyses can remain in the bare category. A phonetic match can
also admit an unrelated base, such as `relief → lief` in the pilot review.
Where several joins qualify, prefer fewer phone changes, then the longer
affix spelling, a suffix, a direct join, and config order. Follow that
choice recursively to a terminal stem before checking the budget.
`planMorphology` has one prefix and one suffix slot.

| Outcome | Types | % of joint CMU | % of common subset |
|---|---:|---:|---:|
| Representable | 43,026 | 36.62% | 93.73% |
| Over budget | 2,123 | 1.81% | 4.62% |
| Identified irregular or unstrippable residue | 755 | 0.64% | 1.64% |
| SCOWL name or uppercase-only | 6,672 | 5.68% | — |
| Other outside common list | 64,909 | 55.25% | — |

The over-budget group contains 2,060 types with stacked suffixes and 63 with
stacked prefixes. `nationalities → nationality → national → nation` takes three
suffix removals. `nation` is present in the root population in its own right.

## Templates and affixes

Template shares use the representable surface types. The common-subset
column retains the two morphology exclusions in its denominator.

| Template | Types | Representable | Common subset | Current lexicon |
|---|---:|---:|---:|---:|
| Bare | 21,197 | 49.27% | 46.18% | 30% |
| Suffixed | 19,129 | 44.46% | 41.67% | 48% |
| Prefixed | 1,051 | 2.44% | 2.29% | 14% |
| Both | 1,649 | 3.83% | 3.59% | 8% |

One or more affixes were removed from **21,829** representable surfaces
(50.73%). Including excluded chains, **24,122** common surface types had at
least one removal (52.55%).

<details>
<summary>Per-affix counts and shares</summary>

The percentage is of all representable surfaces. The last column counts
recursive removals across all common surfaces, including excluded chains and
repeated removals of the same affix on one surface.

| Affix | Representable uses | % of representable types | All recursive removals |
|---|---:|---:|---:|
| `un-` | 521 | 1.21% | 591 |
| `re-` | 776 | 1.80% | 880 |
| `dis-` | 310 | 0.72% | 348 |
| `pre-` | 117 | 0.27% | 126 |
| `over-` | 235 | 0.55% | 249 |
| `out-` | 162 | 0.38% | 176 |
| `mis-` | 137 | 0.32% | 149 |
| `in-` | 442 | 1.03% | 511 |
| `-ing` | 3,690 | 8.58% | 4,097 |
| `-tion` | 14 | 0.03% | 51 |
| `-sion` | 5 | 0.01% | 8 |
| `-ly` | 773 | 1.80% | 1,101 |
| `-ed` | 4,005 | 9.31% | 4,251 |
| `-ness` | 254 | 0.59% | 320 |
| `-er` | 1,216 | 2.83% | 2,148 |
| `-est` | 205 | 0.48% | 221 |
| `-ment` | 170 | 0.40% | 266 |
| `-able` | 228 | 0.53% | 240 |
| `-ful` | 106 | 0.25% | 174 |
| `-less` | 120 | 0.28% | 155 |
| `-ous` | 64 | 0.15% | 88 |
| `-ive` | 133 | 0.31% | 215 |
| `-al` | 271 | 0.63% | 517 |
| `-ity` | 142 | 0.33% | 222 |
| `-s` | 9,059 | 21.05% | 10,383 |
| `-ist` | 89 | 0.21% | 183 |
| `-ize` | 82 | 0.19% | 321 |
| `-ism` | 78 | 0.18% | 95 |
| `-ary` | 42 | 0.10% | 62 |
| `-ory` | 21 | 0.05% | 24 |
| `-ery` | 3 | 0.01% | 3 |
| `-ian` | 4 | 0.01% | 6 |
| `-ial` | 4 | 0.01% | 5 |

</details>

## Root lengths

Current syllable proportions marginalize the per-phone-count conditional
weights over the lexicon phone-length weights. Each weight table is normalized
before multiplication. These are configured targets.

| Mean | Roots | Common surfaces | Current lexicon |
|---|---:|---:|---:|
| Syllables | 2.590 | 2.608 | 2.457 |
| Phonemes | 6.586 | 6.886 | 6.349 |

| Syllables | Roots | Root share | Current share |
|---:|---:|---:|---:|
| 1 | 3,611 | 17.04% | 13.00% |
| 2 | 7,706 | 36.35% | 46.04% |
| 3 | 5,436 | 25.65% | 27.52% |
| 4 | 3,003 | 14.17% | 9.94% |
| 5 | 1,136 | 5.36% | 2.80% |
| 6 | 261 | 1.23% | 0.59% |
| 7 | 40 | 0.19% | 0.09% |
| 8 | 4 | 0.02% | 0.01% |
| 9 | 0 | 0.00% | 0.00% |

<details>
<summary>Phoneme lengths and syllables within each phoneme length</summary>

Conditional entries show the syllable count followed by its percentage.
Unlisted bins have zero mass. A dash indicates there are no roots at that
phoneme length.

| Phonemes | Roots | Root share | Current share | Root syllables (conditional %) | Current syllables (conditional %) |
|---:|---:|---:|---:|---|---|
| 1 | 16 | 0.08% | 0.03% | 1 (100.00) | 1 (100.00) |
| 2 | 300 | 1.42% | 0.74% | 1 (98.67), 2 (1.33) | 1 (98.07), 2 (1.93) |
| 3 | 1,788 | 8.44% | 5.22% | 1 (92.90), 2 (7.05), 3 (0.06) | 1 (86.55), 2 (13.37), 3 (0.08) |
| 4 | 2,595 | 12.24% | 12.55% | 1 (51.29), 2 (47.67), 3 (1.04) | 1 (42.27), 2 (56.60), 3 (1.13) |
| 5 | 3,054 | 14.41% | 19.56% | 1 (9.40), 2 (82.55), 3 (8.02), 4 (0.03) | 1 (10.78), 2 (80.90), 3 (8.29), 4 (0.03) |
| 6 | 3,297 | 15.55% | 20.39% | 1 (0.58), 2 (70.34), 3 (28.48), 4 (0.61) | 1 (1.47), 2 (68.24), 3 (29.56), 4 (0.73) |
| 7 | 3,052 | 14.40% | 15.58% | 1 (0.03), 2 (36.07), 3 (56.49), 4 (7.40) | 1 (0.07), 2 (40.05), 3 (53.88), 4 (5.97), 5 (0.03) |
| 8 | 2,556 | 12.06% | 11.17% | 2 (13.15), 3 (59.15), 4 (27.00), 5 (0.70) | 1 (0.01), 2 (16.53), 3 (61.22), 4 (21.68), 5 (0.56) |
| 9 | 1,839 | 8.68% | 6.77% | 2 (3.15), 3 (39.59), 4 (51.93), 5 (5.33) | 2 (5.41), 3 (48.41), 4 (42.51), 5 (3.66), 6 (0.01) |
| 10 | 1,202 | 5.67% | 3.77% | 2 (0.33), 3 (17.47), 4 (58.74), 5 (22.88), 6 (0.58) | 2 (1.07), 3 (25.07), 4 (56.83), 5 (16.67), 6 (0.36) |
| 11 | 730 | 3.44% | 2.10% | 3 (6.16), 4 (39.45), 5 (49.86), 6 (4.52) | 2 (0.11), 3 (11.12), 4 (46.39), 5 (39.24), 6 (3.10), 7 (0.04) |
| 12 | 426 | 2.01% | 1.13% | 3 (1.17), 4 (23.24), 5 (59.15), 6 (15.96), 7 (0.47) | 3 (2.67), 4 (30.33), 5 (53.63), 6 (13.16), 7 (0.21) |
| 13 | 209 | 0.99% | 0.58% | 4 (6.70), 5 (48.33), 6 (41.63), 7 (3.35) | 3 (0.55), 4 (14.25), 5 (53.15), 6 (30.27), 7 (1.78) |
| 14 | 77 | 0.36% | 0.25% | 4 (5.19), 5 (33.77), 6 (49.35), 7 (11.69) | 4 (6.29), 5 (40.57), 6 (44.34), 7 (8.49), 8 (0.31) |
| 15 | 36 | 0.17% | 0.10% | 6 (58.33), 7 (36.11), 8 (5.56) | 4 (0.82), 5 (14.75), 6 (56.56), 7 (24.59), 8 (3.28) |
| 16 | 12 | 0.06% | 0.05% | 5 (16.67), 6 (50.00), 7 (33.33) | 5 (9.84), 6 (39.34), 7 (47.54), 8 (3.28) |
| 17 | 7 | 0.03% | 0.02% | 6 (14.29), 7 (71.43), 8 (14.29) | 5 (3.85), 6 (23.08), 7 (57.69), 8 (15.38) |
| 18 | 1 | 0.00% | 0.00% | 8 (100.00) | 7 (25.00), 8 (75.00) |
| 19 | 0 | 0.00% | 0.00% | — | 8 (50.00), 9 (50.00) |
| 20 | 0 | 0.00% | 0.00% | — | 9 (100.00) |

</details>

## Final codas

A coda is the complete consonant tail after the last CMU vowel, projected
to generator IPA using the Q15 mapping. The common-surface and root columns
control for the same eligibility filter. **Within the pairs flagged in #490**,
`d z`, `m z`, `ŋ z`, and `f s` fall below 0.10% of roots.
`t s` falls from 2.22% to 0.25%, with 54 roots including `blitz`.
`m s` has one attestation throughout (`synonyms`, CMU's first phone sequence
ends in /m s/), and `ŋ s` has zero throughout.
Other codas survive at appreciable rates, including `n t`, `s t`, `n s`,
`n d`, and `k s`. Some remaining examples are missed affixes, such as
`reliefs` under `f s`, where the stem and surface differ in their first CMU vowel.

| Whitelisted coda | Joint CMU types | Common surfaces | Roots | Common share | Root share |
|---|---:|---:|---:|---:|---:|
| `t s` | 1,610 | 1,020 | 54 | 2.22% | 0.25% |
| `d z` | 502 | 378 | 15 | 0.82% | 0.07% |
| `m z` | 468 | 301 | 15 | 0.66% | 0.07% |
| `ŋ z` | 336 | 240 | 9 | 0.52% | 0.04% |
| `f s` | 104 | 79 | 4 | 0.17% | 0.02% |
| `m s` | 1 | 1 | 1 | 0.00% | 0.00% |
| `ŋ s` | 0 | 0 | 0 | 0.00% | 0.00% |
| `n t` | 1,241 | 826 | 582 | 1.80% | 2.75% |
| `s t` | 1,332 | 904 | 370 | 1.97% | 1.75% |
| `n s` | 466 | 333 | 306 | 0.73% | 1.44% |
| `n d` | 1,192 | 576 | 219 | 1.25% | 1.03% |
| `k s` | 1,166 | 585 | 125 | 1.27% | 0.59% |

<details>
<summary>Remaining whitelisted codas</summary>

| Whitelisted coda | Joint CMU types | Common surfaces | Roots | Common share | Root share |
|---|---:|---:|---:|---:|---:|
| `l p` | 23 | 6 | 6 | 0.01% | 0.03% |
| `l b` | 16 | 2 | 2 | 0.00% | 0.01% |
| `l t` | 218 | 60 | 49 | 0.13% | 0.23% |
| `l d` | 1,009 | 530 | 86 | 1.15% | 0.41% |
| `l k` | 60 | 11 | 11 | 0.02% | 0.05% |
| `l f` | 92 | 17 | 17 | 0.04% | 0.08% |
| `l v` | 14 | 13 | 13 | 0.03% | 0.06% |
| `l s` | 15 | 8 | 6 | 0.02% | 0.03% |
| `l z` | 1,294 | 869 | 36 | 1.89% | 0.17% |
| `l θ` | 11 | 5 | 5 | 0.01% | 0.02% |
| `l ʃ` | 7 | 0 | 0 | 0.00% | 0.00% |
| `l tʃ` | 17 | 8 | 8 | 0.02% | 0.04% |
| `l dʒ` | 5 | 3 | 3 | 0.01% | 0.01% |
| `r p` | 59 | 6 | 6 | 0.01% | 0.03% |
| `r b` | 24 | 6 | 5 | 0.01% | 0.02% |
| `r t` | 363 | 67 | 59 | 0.15% | 0.28% |
| `r d` | 435 | 227 | 110 | 0.49% | 0.52% |
| `r k` | 142 | 42 | 39 | 0.09% | 0.18% |
| `r g` | 34 | 2 | 2 | 0.00% | 0.01% |
| `r f` | 69 | 4 | 4 | 0.01% | 0.02% |
| `r v` | 8 | 2 | 2 | 0.00% | 0.01% |
| `r s` | 63 | 28 | 24 | 0.06% | 0.11% |
| `r z` | 357 | 227 | 18 | 0.49% | 0.08% |
| `r θ` | 39 | 6 | 6 | 0.01% | 0.03% |
| `r ʃ` | 18 | 2 | 2 | 0.00% | 0.01% |
| `r tʃ` | 17 | 10 | 10 | 0.02% | 0.05% |
| `r dʒ` | 34 | 15 | 11 | 0.03% | 0.05% |
| `l m` | 40 | 8 | 8 | 0.02% | 0.04% |
| `r m` | 64 | 42 | 36 | 0.09% | 0.17% |
| `r n` | 154 | 43 | 35 | 0.09% | 0.17% |
| `r l` | 16 | 2 | 2 | 0.00% | 0.01% |
| `m p` | 131 | 52 | 51 | 0.11% | 0.24% |
| `m b` | 1 | 0 | 0 | 0.00% | 0.00% |
| `ŋ k` | 312 | 76 | 66 | 0.17% | 0.31% |
| `m θ` | 0 | 0 | 0 | 0.00% | 0.00% |
| `n z` | 2,307 | 1,276 | 61 | 2.78% | 0.29% |
| `n θ` | 33 | 21 | 21 | 0.05% | 0.10% |
| `ŋ θ` | 1 | 1 | 1 | 0.00% | 0.00% |
| `n tʃ` | 68 | 40 | 38 | 0.09% | 0.18% |
| `n dʒ` | 76 | 40 | 36 | 0.09% | 0.17% |
| `p s` | 355 | 262 | 20 | 0.57% | 0.09% |
| `b z` | 145 | 93 | 2 | 0.20% | 0.01% |
| `g z` | 144 | 90 | 5 | 0.20% | 0.02% |
| `v z` | 190 | 150 | 12 | 0.33% | 0.06% |
| `θ s` | 38 | 27 | 0 | 0.06% | 0.00% |
| `p t` | 171 | 157 | 32 | 0.34% | 0.15% |
| `k t` | 364 | 279 | 106 | 0.61% | 0.50% |
| `f t` | 169 | 94 | 52 | 0.20% | 0.25% |
| `s p` | 15 | 11 | 11 | 0.02% | 0.05% |
| `s k` | 103 | 33 | 32 | 0.07% | 0.15% |
| `p θ` | 1 | 1 | 1 | 0.00% | 0.00% |
| `f θ` | 1 | 1 | 1 | 0.00% | 0.00% |
| `l p s` | 7 | 4 | 1 | 0.01% | 0.00% |
| `l t s` | 116 | 34 | 2 | 0.07% | 0.01% |
| `l d s` | 0 | 0 | 0 | 0.00% | 0.00% |
| `l k s` | 18 | 5 | 0 | 0.01% | 0.00% |
| `l v z` | 20 | 19 | 2 | 0.04% | 0.01% |
| `l θ s` | 1 | 0 | 0 | 0.00% | 0.00% |
| `l p t` | 4 | 4 | 1 | 0.01% | 0.00% |
| `l f θ` | 1 | 1 | 1 | 0.00% | 0.00% |
| `r p s` | 8 | 5 | 1 | 0.01% | 0.00% |
| `r t s` | 91 | 53 | 2 | 0.12% | 0.01% |
| `r d s` | 0 | 0 | 0 | 0.00% | 0.00% |
| `r k s` | 49 | 30 | 1 | 0.07% | 0.00% |
| `r v z` | 5 | 3 | 0 | 0.01% | 0.00% |
| `r θ s` | 3 | 2 | 0 | 0.00% | 0.00% |
| `m p s` | 38 | 31 | 3 | 0.07% | 0.01% |
| `n t s` | 537 | 390 | 23 | 0.85% | 0.11% |
| `n d s` | 0 | 0 | 0 | 0.00% | 0.00% |
| `ŋ k s` | 89 | 56 | 8 | 0.12% | 0.04% |
| `ŋ k θ` | 2 | 2 | 2 | 0.00% | 0.01% |
| `k s t` | 49 | 35 | 9 | 0.08% | 0.04% |
| `k t s` | 100 | 91 | 4 | 0.20% | 0.02% |
| `f t s` | 33 | 28 | 0 | 0.06% | 0.00% |
| `s t s` | 370 | 319 | 8 | 0.69% | 0.04% |
| `s p s` | 5 | 5 | 0 | 0.01% | 0.00% |
| `s k s` | 21 | 18 | 0 | 0.04% | 0.00% |
| `n tʃ t` | 22 | 22 | 0 | 0.05% | 0.00% |
| `n dʒ d` | 25 | 25 | 0 | 0.05% | 0.00% |
| `l p t s` | 1 | 1 | 0 | 0.00% | 0.00% |
| `l f θ s` | 0 | 0 | 0 | 0.00% | 0.00% |
| `ŋ k θ s` | 2 | 2 | 0 | 0.00% | 0.00% |
| `k s t s` | 2 | 2 | 0 | 0.00% | 0.00% |

</details>

## Root-final segment × suffix (#462)

One count per representable suffixed or both-template surface type, using the
last phone in the terminal root, including vowel-final roots. The table
combines written allomorphs under their configured suffix. Omitted cells are
zero.

There are **20,778** observations.

<details>
<summary>Full joint counts by suffix</summary>

| Suffix | Types | Final root phone (count) |
|---|---:|---|
| `-ing` | 3,690 | `aɪ` (75), `aʊ` (8), `b` (35), `d` (269), `dʒ` (89), `eɪ` (40), `f` (35), `g` (51), `i:` (47), `k` (212), `l` (386), `m` (120), `n` (292), `p` (155), `r` (113), `s` (217), `t` (865), `tʃ` (80), `u` (23), `v` (79), `z` (156), `ð` (10), `ŋ` (21), `ɔ` (10), `ɔɪ` (9), `ə` (1), `əʊ` (47), `ɜ` (167), `ʃ` (71), `ʒ` (3), `θ` (4) |
| `-tion` | 14 | `i:` (1), `p` (1), `ə` (7), `əʊ` (5) |
| `-sion` | 5 | `n` (4), `r` (1) |
| `-ly` | 773 | `aɪ` (5), `b` (1), `d` (67), `dʒ` (4), `f` (6), `g` (3), `i:` (43), `k` (22), `l` (141), `m` (20), `n` (32), `p` (7), `r` (21), `s` (89), `t` (207), `tʃ` (3), `u` (1), `v` (36), `z` (2), `ð` (1), `ŋ` (5), `ɔ` (1), `ɔɪ` (2), `əʊ` (6), `ɜ` (31), `ʃ` (12), `θ` (5) |
| `-ed` | 4,005 | `aɪ` (101), `aʊ` (11), `b` (45), `d` (241), `dʒ` (114), `eɪ` (36), `f` (41), `g` (40), `i:` (67), `k` (190), `l` (414), `m` (135), `n` (332), `p` (146), `r` (104), `s` (262), `t` (995), `tʃ` (90), `u` (20), `v` (80), `z` (183), `ð` (8), `ŋ` (16), `ɔ` (9), `ɔɪ` (8), `ə` (1), `əʊ` (41), `ɜ` (179), `ʃ` (89), `ʒ` (4), `θ` (3) |
| `-ness` | 254 | `aɪ` (5), `d` (29), `dʒ` (2), `eɪ` (1), `f` (5), `g` (3), `i:` (55), `k` (13), `l` (13), `m` (7), `n` (14), `p` (5), `r` (5), `s` (16), `t` (42), `tʃ` (1), `u` (2), `v` (14), `ð` (1), `ŋ` (1), `ɑ` (1), `əʊ` (4), `ɜ` (4), `ʃ` (11) |
| `-er` | 1,216 | `aɪ` (24), `aʊ` (4), `b` (12), `d` (110), `dʒ` (27), `eɪ` (7), `f` (21), `g` (17), `i:` (91), `k` (104), `l` (119), `m` (61), `n` (104), `p` (85), `r` (24), `s` (55), `t` (190), `tʃ` (26), `u` (9), `v` (25), `z` (31), `ð` (4), `ŋ` (12), `ɔɪ` (3), `əʊ` (15), `ɜ` (11), `ʃ` (24), `ʒ` (1) |
| `-est` | 205 | `aɪ` (2), `d` (24), `dʒ` (3), `eɪ` (1), `f` (5), `g` (2), `i:` (63), `k` (10), `l` (13), `m` (7), `n` (13), `p` (6), `r` (13), `s` (5), `t` (24), `tʃ` (2), `u` (2), `v` (1), `z` (1), `ð` (1), `ɑ` (1), `əʊ` (4), `ʃ` (2) |
| `-ment` | 170 | `aʊ` (1), `d` (3), `dʒ` (11), `eɪ` (4), `g` (2), `i:` (2), `l` (16), `n` (23), `p` (7), `r` (4), `s` (23), `t` (31), `tʃ` (8), `v` (7), `z` (5), `ɔɪ` (4), `ɜ` (8), `ʃ` (11) |
| `-able` | 228 | `aɪ` (9), `aʊ` (2), `b` (2), `d` (15), `dʒ` (9), `eɪ` (2), `f` (1), `i:` (9), `k` (7), `l` (8), `m` (5), `n` (29), `p` (2), `r` (9), `s` (15), `t` (55), `tʃ` (9), `u` (1), `v` (15), `z` (6), `ɔɪ` (2), `ɜ` (11), `ʃ` (5) |
| `-ful` | 106 | `d` (3), `eɪ` (1), `i:` (9), `k` (1), `l` (5), `m` (2), `n` (8), `p` (4), `r` (5), `s` (14), `t` (34), `tʃ` (1), `u` (1), `ŋ` (1), `ɔ` (2), `ɔɪ` (1), `əʊ` (2), `ɜ` (3), `ʃ` (2), `θ` (7) |
| `-less` | 120 | `aɪ` (1), `b` (1), `d` (12), `dʒ` (1), `f` (3), `g` (1), `i:` (4), `k` (4), `l` (2), `m` (11), `n` (10), `p` (6), `r` (6), `s` (13), `t` (22), `tʃ` (1), `u` (2), `v` (2), `ɔ` (2), `əʊ` (1), `ɜ` (11), `ʃ` (1), `θ` (3) |
| `-ous` | 64 | `aɪ` (2), `b` (1), `d` (1), `dʒ` (3), `i:` (16), `l` (7), `m` (2), `n` (9), `p` (1), `r` (1), `t` (4), `v` (2), `ɔɪ` (1), `ɜ` (14) |
| `-ive` | 133 | `d` (1), `s` (31), `t` (101) |
| `-al` | 271 | `aɪ` (5), `b` (5), `d` (9), `eɪ` (2), `f` (1), `g` (1), `i:` (8), `k` (70), `m` (6), `n` (84), `p` (2), `r` (5), `s` (7), `t` (38), `u` (1), `v` (9), `z` (10), `ɔ` (1), `ɜ` (6), `ʃ` (1) |
| `-ity` | 142 | `b` (1), `d` (17), `k` (6), `l` (50), `m` (6), `n` (19), `r` (14), `s` (12), `t` (1), `v` (15), `ɑ` (1) |
| `-s` | 9,059 | `aɪ` (88), `aʊ` (16), `b` (95), `d` (589), `dʒ` (137), `eɪ` (89), `f` (81), `g` (87), `i:` (559), `j` (1), `k` (549), `l` (780), `m` (316), `n` (1,213), `p` (281), `r` (207), `s` (419), `t` (1,688), `tʃ` (99), `u` (76), `v` (119), `z` (135), `ð` (6), `ŋ` (73), `ɑ` (8), `ɔ` (17), `ɔɪ` (15), `ə` (117), `əʊ` (175), `ɜ` (891), `ɪ` (1), `ʃ` (79), `ʒ` (6), `θ` (47) |
| `-ist` | 89 | `d` (1), `eɪ` (1), `i:` (2), `k` (1), `l` (25), `m` (4), `n` (35), `p` (1), `r` (4), `s` (1), `t` (6), `u` (1), `əʊ` (1), `ɜ` (5), `ʃ` (1) |
| `-ize` | 82 | `d` (2), `l` (42), `m` (5), `n` (17), `t` (1), `əʊ` (1), `ɜ` (14) |
| `-ism` | 78 | `d` (1), `f` (1), `i:` (2), `l` (33), `n` (28), `r` (3), `s` (1), `t` (5), `əʊ` (1), `ɜ` (2), `ʃ` (1) |
| `-ary` | 42 | `d` (2), `i:` (1), `m` (2), `n` (25), `s` (1), `t` (9), `ɜ` (2) |
| `-ory` | 21 | `t` (21) |
| `-ery` | 3 | `dʒ` (1), `n` (2) |
| `-ian` | 4 | `d` (1), `m` (1), `n` (1), `r` (1) |
| `-ial` | 4 | `b` (2), `s` (1), `ɜ` (1) |

</details>

## Ledger spot-check

The 50 final rows are a deterministic random sample without replacement. Rank
all spellings by SHA-256 of `stage-references-phase1-490-v2:<spelling>`, then
take the first 50. The seed differs from the pilot used to refine the join
rules. Review counts are **43 correct, 3 wrong, 4 debatable**. The wrong
rows are missed joins with eligible stems, while debatable cases concern
the cutoff or name ambiguity. This sample includes many SCOWL exclusions and
has limited power to assess the accuracy of stripped rows specifically.

<details>
<summary>All 50 judgments</summary>

| Surface | Ledger result | Judgment |
|---|---|---|
| `hightower` | Outside list | Correct |
| `antonucci` | Outside list | Correct |
| `birks` | Outside list | Correct |
| `executone` | Outside list | Correct |
| `feign` | Bare | Correct |
| `annelids` | annelid | Correct |
| `mounties` | SCOWL name or uppercase | Correct |
| `gastonia` | SCOWL name or uppercase | Correct |
| `cranium` | Bare | Correct |
| `warehoused` | Bare | Wrong. `warehouse + ed` voices the /s/ in the verb. |
| `wilbert` | SCOWL name or uppercase | Correct |
| `summarily` | Bare | Wrong. `summary + ly` shifts stress and changes the rhotic sequence. |
| `olsen` | SCOWL name or uppercase | Correct |
| `unvarnished` | varnished → varnish | Correct |
| `borns` | Outside list | Correct |
| `observances` | observance | Correct |
| `stereotypical` | Bare | Correct |
| `clarksville` | SCOWL name or uppercase | Correct |
| `dechene` | Outside list | Correct |
| `ornate` | Bare | Correct |
| `harried` | harry | Correct |
| `strivings` | Outside list | Debatable. Regular form missing from the list. |
| `geerdes` | Outside list | Correct |
| `whitening` | whiten | Correct |
| `knuth` | SCOWL name or uppercase | Correct |
| `injudicious` | Bare | Wrong. `in + judicious` changes the first vowel of the stem. |
| `morro` | Outside list | Debatable. Place-name reading or rare geographical noun. |
| `valensuela` | Outside list | Correct |
| `cybulski` | Outside list | Correct |
| `barberio` | Outside list | Correct |
| `smokes` | smoke | Correct |
| `colestipol` | Outside list | Debatable. Generic drug name below the cutoff. |
| `unhook` | hook | Correct |
| `teleconference` | Bare | Correct |
| `osmun` | Outside list | Correct |
| `reoffend` | Outside list | Debatable. Transparent productive prefixation missing from the list. |
| `spurlock` | Outside list | Correct |
| `mckimmy` | Outside list | Correct |
| `stroope` | Outside list | Correct |
| `seiser` | Outside list | Correct |
| `audiotape` | Bare | Correct |
| `brainstorms` | brainstorm | Correct |
| `dopplerganger` | Outside list | Correct |
| `cowie` | Outside list | Correct |
| `mistral` | Bare | Correct |
| `selmer` | Outside list | Correct |
| `yasso` | Outside list | Correct |
| `waddill` | Outside list | Correct |
| `deffeyes` | Outside list | Correct |
| `aldwin` | Outside list | Correct |

</details>

The follow-up audit below estimates error within stripped rows. Name leakage
through homographs and missed stripping outside the sample remain limitations.

## Reproduce

Run these Phase 1 commands from commit `0de88f5c`. The ledger digest includes
the configuration snapshot and implementation at that revision. Download the
versioned inputs and check these raw SHA-256 values. The builder and verifier
enforce the same pins and the joint selected-entry digest.

| Input | SHA-256 |
|---|---|
| [CMUdict](https://raw.githubusercontent.com/cmusphinx/cmudict/74790861f652b15e4ac49015a90074ad62a27690/cmudict.dict) | `81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22` |
| [SCOWL 2020.12.07](https://deb.debian.org/debian/pool/main/s/scowl/scowl_2020.12.07.orig.tar.gz) | `5587667caa20c4891390c2d42dbb4d5c4c3f41bee77af1457ece3ba23fb859cc` |
| [WordNet 3.0](https://wordnetcode.princeton.edu/3.0/WordNet-3.0.tar.gz) | `640db279c949a88f61f851dd54ebbb22d003f8b90b85267042ef85a3781d3a52` |

```sh
node --import tsx evaluation/corpus/root-cli.ts \
  --source "$CMU_SOURCE" --scowl "$SCOWL_TAR" --wordnet "$WORDNET_TAR" --out "$ROOT_JSON"
python3 evaluation/corpus/verify-root.py \
  --source "$CMU_SOURCE" --scowl "$SCOWL_TAR" --wordnet "$WORDNET_TAR" --artifact "$ROOT_JSON"
python3 evaluation/corpus/verify-root-test.py \
  --source "$CMU_SOURCE" --scowl "$SCOWL_TAR" --wordnet "$WORDNET_TAR" --artifact "$ROOT_JSON"
```

Use a new path for `ROOT_JSON`. The output contains the ordered ledger,
distinct roots, config snapshot and the complete integer tables. The verifier
generates candidate stems by reversing each surface spelling, independently
of the TypeScript builder’s forward enumeration, and checks every row and bin.

The result digest is `2eacf788dd396e5207908c613d6689390e462d0488fa6e847606e08c124ce467`.


## Lexicon stage references (Phase 2)

[#491](https://github.com/unglish/word-generator/issues/491) uses one observation
per representable surface type from the Phase 1 ledger. If five included
spellings resolve to one root, that root contributes five observations. After
the coda audit there are **42,696** observations. The measured template counts
are grouped by terminal-root syllable count. Conditional on a template picking
an affix, the generator samples the measured prefix or suffix counts.
`-tion` and `-sion` use the observed counts of 14 and 5. These counts omit
joins the inventory cannot yet describe, including forms tracked in #462.

### Stripping audit

A single reviewer checked 200 representable rows with at least one removal.
Rank the 21,829 eligible spellings by SHA-256 of
`stage-references-phase2-491-stripped-v1:<spelling>` and take the first 200.
There were **190 correct, 7 wrong (3.5%) and 3 debatable (1.5%)**. Examples of
incorrect joins are `bully → bull`, `refunds → funds → fund` and
`remedial → medial`. The estimate concerns rows with an accepted strip.
It does not measure the rate of missed strips among rows marked bare.

The coda audit examined terminal stems ending in a consonant plus /s/ or /z/
and checked marginal inflection-shaped stop endings such as /zd/ and /vd/.
An ordinary plural, inflected verb, or transparent declined compound was
excluded when it had survived stripping. Lexical forms such as `suds` and
`qualms`, established units such as `megahertz`, and /ks/ stems with a lexical
`x` as in `box` were retained. The audit also excluded a few erroneous first
pronunciations such as `tern` with final /nz/. The common sources of missed
strips include an unavailable intermediate base, a mismatch in first
pronunciations, and lexical ambiguity. A spelling-only fallback would also
strip unrelated words such as `blitz`.

The [full exclusion list](../evaluation/corpus/root-coda-exclusions.json)
contains 321 terminal spellings, grouped by their first-pronunciation coda.
The builder drops every included row that resolves to one of those spellings
(330 rows). The Phase 1 ledger remains reproducible at its pinned revision.

| Coda | Retained terminal spellings after audit |
|---|---|
| /ts/ | blitz, congrats, ersatz, fritz, glitz, grassroots, kibbutz, klutz, megahertz, putz, rickets, thereabouts, whereabouts |
| /dz/ | backwoods, everglades, innards, suds |
| /mz/ | doldrums, oftentimes, qualms |
| /fs/ | fisticuffs |
| /vz/ | chives |
| /ŋz/ | chitterlings, hustings |
| /ms/, /ŋs/ | No retained attestations |

The runtime draws complete final codas in proportion to the audited counts
within the planned coda length. Existing segment and phonotactic constraints
still determine whether a coda is eligible. The complete-cluster draw prevents
a rare sole completion from inheriting the probability of a common first
consonant. The earlier whitelist and final multipliers still serve text,
medial root codas, and the separate affix-boundary rules.

### Fit and gates

The audited roots average **2.29 syllables per observation**. Lexicon root
lengths are fitted to **2.462** finished syllables in full CMU. The fit changes
the relative mass of root syllable buckets while preserving the measured phone
distribution within each root syllable count. It uses the observed transitions
from each root length to a finished syllable bucket (1–5 or 6+), with 30,000
draws each at forced lengths 1–5 and the full generator's measured morphology.
For the pooled 6+ bucket, roots of six or more syllables remain in that bucket
whatever affix is added. The fitted root mean is approximately **2.14**
syllables, about **0.15 fewer** than the audited population. Attachment adds
about **0.32** on average. The full list includes types outside the
representable common-word population, so those means describe different samples.

The bare-root phoneme gate uses the audited root counts. The finished-word gate
uses the 117,485 full-CMU types. The finished syllable gate allows up to one
percentage point of total variation and 0.03 syllables of mean error. The trace
invariant checks that the root length matches the plan and that the finished
length equals the root plus the realized prefix and suffix syllable counts.

To regenerate the fixed inputs, rebuild and verify the Phase 1 artifact above,
then run the Phase 2 builder in the current checkout with the archived measured
transition counts.

```sh
python3 evaluation/corpus/stage-reference.py \
  --root-reference "$ROOT_JSON" --source "$CMU_SOURCE" \
  --transitions "$TRANSITIONS_JSON" \
  --runtime-out /tmp/lexicon-reference.ts --reference-out /tmp/stage-references.json
```
