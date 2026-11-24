# #517 post-selection doubling evidence

This comparison uses the locked linguistic-quality-v1 development cohort, 50,000 words per profile. The baseline is `c151c4c9`. The candidate snapshot matches the whole `src` tree at `29124755` and includes the final affix, quota, and tense-vowel guards. The rule adds an onset letter after root selection and preserves the spelling length penalty for the selected attempt.

The detailed paired audit checks every draw's lexical root and assembled lexical form, realized syllables, pronunciation, and original selection trace. A new double must have one exact rewrite with a single selected letter as input, two cells with its one grapheme unit as source, a matching grapheme-selection repair, and a corresponding one-letter change in the final spelling. The added doubles are recoverable from the rewrite records even though the original `afterDoubling` field remains a singleton. [Paired audit script](paired-profiles.mjs), [position scanner](screen.mjs).

## Default lexicon results

| Qualifying positions | Before | After |
| --- | ---: | ---: |
| Two-syllable roots | 42 / 1,860 | 270 / 1,860 |
| Three-syllable roots | 97 / 1,151 | 231 / 1,151 |
| Longer roots | 52 / 964 | 52 / 964 |
| All | 191 / 3,975 | 553 / 3,975 |

All 362 changes were one-letter doubles. All 50,000 lexical forms, realized syllable structures, pronunciations, and selection traces matched their baseline draw. Unedited draws were byte-identical. All new doubles followed the intended stressed short vowel and kept that vowel and preceding stress in the final pronunciation. No new doubles preceded a tense vowel.

The two CMU alignment methods put reference rates at 69–73% for two syllables and 35–39% for three. Their input uses a separate pinned lexicon with inferred alignment. [Reference and method](../cmu.md)

Lexicon-default trigram Jensen–Shannon distance fell by 0.0003416842 bits, from 0.1365836922 to 0.1362420080. `tte` increased from 224 to 248 and `ann` from 193 to 206, closer to their CMU rates. Counts for `err`, `arr`, `ott`, `rre`, and `rri` were unchanged. This advances #517 and leaves the issue's 0.0011-bit target unreached.

## Full four-profile check

| Profile | Changed words | Baseline trigram distance, bits | Candidate trigram distance, bits |
| --- | ---: | ---: | ---: |
| Lexicon, with morphology | 362 | 0.13658369 | 0.13624201 |
| Bare lexicon | 394 | 0.16837049 | 0.16786194 |
| Bare monosyllables | 0 | 0.33292861 | 0.33292861 |
| Text, with morphology | 194 | 0.15816698 | 0.15770270 |

All 200,000 paired draws preserved their lexical forms, realized syllables, pronunciation, and original selection trace. The 950 edited words each gained one verified consonant letter. All unedited raw payloads matched exactly, including all five complete bare-monosyllable archives. No new double violated the preceding-vowel, preceding-stress, or adjacent tense-vowel guards. Phoneme distributions match exactly in all four profiles. [Official comparison](comparison.md), [lexicon pairing](lexicon-default-paired.json), [bare lexicon pairing](lexicon-bare-paired.json), [text pairing](text-default-paired.json).

## Samples and replay

[pairs-50.json](../published-pairs.json) contains 25 verified pairs for each of the two enabled root lengths. Each pair differs by the one selected consonant letter and retains pronunciation and syllable structure. The earlier blinded prototype packet tested the same kind of spelling cue, with different random assignment of doubles. The new examples are verified output pairs rather than fresh blinded judgments.

From the candidate checkout, capture the same protocol and compare each raw profile:

```sh
npm run quality:pr -- --base c151c4c9 --out /tmp/quality-517
node --import tsx path/to/paired-profiles.mjs /tmp/quality-517 candidate lexicon-default
node --import tsx path/to/paired-profiles.mjs /tmp/quality-517 candidate lexicon-bare
node --import tsx path/to/paired-profiles.mjs /tmp/quality-517 candidate text-default
node path/to/acceptance.mjs /tmp/quality-517
```

The archived packet stores summaries and provenance. Raw trace files can be regenerated using the locked protocol.
