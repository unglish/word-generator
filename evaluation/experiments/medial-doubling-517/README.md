# Selective doubling after root selection

The release compares main at `c151c4c9` against `29124755`. It adds chances
for a singleton onset to double after a stressed short vowel when the writer
would otherwise veto doubling because of the final-syllable whitelist or
the stress of the following syllable. The rule applies selectively in roots
with two or three syllables.

The root is selected before the edit. The candidate carries the existing
root-length draw into a separate spelling stream. The shared RNG and the
recorded proposal and selection lengths stay the same. The edit keeps the
letter-length score and checks the surviving written context, spelling budget,
doubling quota, and effects of the planned affixes.

The prior multi-syllable prototypes used the shared RNG during spelling and
moved phonological samples across existing gates. The files prefixed
`retries-` apply to those prototypes. The release leaves the existing
phonology gates and their seed streams intact.

## Before and after

`published-pairs.json` contains 50 release pairs. Each uses the same seed
and preserves the full lexical root, root selection trace, and IPA.
Rows 1–25 have two syllables. Rows 26–50 have three syllables.

With the repo's locked dependencies installed, replay the sample build from
the archive with the before and after `src/index.ts` paths:

```sh
node --import tsx release-pairs.mjs "$BASE" "$RELEASE"
```

Two masked model judges read complementary lists. Each saw one spelling
per pair. The quota check replaced one pair after the lists were frozen.
Across the other 49, models recovered the intended first vowel on 37
original spellings and 48 doubled spellings. Both judges read all 16
real-word controls correctly. This is a diagnostic for the spelling cue on
selected examples.

An independent review replayed 4,400 paired words, checking lexical forms,
root-selection traces, IPA, and the next shared RNG value. All 25 late edits,
including 15 affixed words, retained exact base-spelling provenance and linked
both repeated letters to the initial grapheme choice in the orthography trace.

## Locked development cohort

Across 200,000 paired draws per build, every lexical form, realized syllable,
IPA string, and original selection trace matched. Exactly 950 written words
changed through a single verified duplication. Of these, 362 appeared in
the default lexicon, 394 in bare lexicon, and 194 in default text. The 50,000
monosyllable archives matched byte for byte.

Trigram divergence to CMU fell by 0.000342 bits in default lexicon, 0.000509
bits in bare lexicon, and 0.000464 bits in default text. The default lexicon
gain falls short of #517's 0.0011-bit target. Phoneme distributions match
exactly in all profiles. See `development/comparison.md` and the paired
counts in the same directory.

## Runtime and tests

`npm run check` passed 1,635 tests on the final source. Two local series
used seven alternating pairs each, with 5,000 compiled Node words per
run, zero errors, and a stable checksum per side. The first series ran
while tests completed. It showed a median elapsed ratio of 0.994 with a
0.620–1.098 range. The follow-up after tests showed a median ratio of
1.022 with a 0.943–1.074 range. The medians sit within the observed
run-to-run spread. A separate CPU profile attributed the largest share
of execution to root generation. The raw per-run data is included.
