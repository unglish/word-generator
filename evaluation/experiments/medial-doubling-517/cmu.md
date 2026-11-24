# CMU reference for #517

This probe measures literal doubled letters between adjacent vowel nuclei in
the pinned common root population from `docs/cmu-root-reference.md`. The
pronunciation has a stressed AE, EH, IH, or AH followed by one consonant and
the next nucleus. The spelling has the corresponding literal a, e, i, or u,
then a singleton or doubled version of the same consonant, then a vowel
letter. Consonants are b, d, f, g, l, m, n, p, s, and t. A preceding vowel
letter would make the left vowel a multi-letter spelling, so the probe
excludes that pattern. Counts are positions across lexical types.

Two methods check the phone-to-spelling link. The unique method pairs a
single literal spelling match with a single matching vowel-consonant phone
sequence within a word. The ordinal method requires the number of written
vowel groups and pronounced vowels to agree, then checks the group indices of
both anchors. Agreement probes sensitivity to the inference. CMU records
neither exact syllable boundaries nor phone-to-letter alignment here.

| Root context | Unique | Ordinal |
| --- | ---: | ---: |
| All 2+ syllables | 864 / 2,606 (33.2%) | 741 / 1,997 (37.1%) |
| 2 syllables | 390 / 564 (69.1%) | 366 / 505 (72.5%) |
| 3 syllables | 284 / 814 (34.9%) | 228 / 582 (39.2%) |
| 4+ syllables | 190 / 1,228 (15.5%) | 147 / 910 (16.2%) |
| Last syllable onset | 533 / 925 (57.6%) | 494 / 822 (60.1%) |
| Earlier onset | 331 / 1,681 (19.7%) | 247 / 1,175 (21.0%) |
| 2 syllables with unstressed last | 365 / 513 (71.2%) | 344 / 461 (74.6%) |

The terminal-root stripping policy sometimes removes familiar examples. It
treats `letter` as `let` plus `-er`. Among representable common surface types,
the two-syllable rates are 78.8% and 81.8%. Among all ASCII CMU types, they are
67.6% and 69.0%. Suffix-derived spellings and names affect those comparisons.
Treat the ratios as empirical reference points for matching contexts.
Eligible pronunciations can have valid spellings with a single consonant, as
in `habit`, `lemon`, and `summit`.

Reproduce with the pinned CMU common root reference artifact and its raw CMU
source.

```sh
python3 reference.py /path/to/roots.json --full /path/to/cmudict.dict > results.json
```
