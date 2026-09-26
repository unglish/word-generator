# Preserve vowel adjacency at affix boundaries

The default English morphology policy now keeps the two nuclei when an affix
meets a vowel-initial or vowel-final root. Previously it inserted /h/ into the
phoneme sequence after assembling the spelling, creating an unspelled consonant.
Under the legacy policy, seed 3 produces `broing` with /h/ before `-ing`.
Removing that phone affects length-based rejection, so the same seed can return
a different root; it is not a matched before/after lexical example.

This change concerns phonemic representation at prefix/root and root/suffix
boundaries. The within-root hiatus policy is unchanged. Davidson & Erker's
[2014 acoustic study](https://blogs.bu.edu/danerker/files/2020/10/Davidson-Erker-2014_Case-against-hiatus-resolution_Language.pdf)
distinguishes within-word vowel sequences from lexical glides and word-boundary
realizations. That evidence supports avoiding universal consonant insertion;
it does not establish an optimal hiatus frequency for generated words. Phonetic
transitions, glottalization, and dialect-specific linking need their own explicit
realization policies rather than a universal lexical /h/.

## Configuration and trace

`englishConfig.morphology.boundaryPolicy` sets both
`enablePrefixRootFallback` and `enableRootSuffixFallback` to `false`.
Custom configurations can still explicitly enable either fallback and configure
its weighted consonants. Omitting these optional flags retains the legacy `true`
behavior. Enabled fallback insertion still affects phones only; it does not add
a written grapheme. Affixes' lexical consonants remain intact.

The additive `morphHiatusDecision` structural event records each eligible vowel
boundary's type, assembled syllable coordinates, boundary-time nuclei, effective
fallback flag, and outcome: `preserved`, `inserted`, or `no-bridge-candidate`.
Existing `morphPrefixHiatusFallback` and `morphSuffixHiatusFallback` events retain
their insertion-only meaning. Tracing consumes no random numbers.

The base pipeline currently applies pronunciation before morphology. Recorded
nuclei may already be reduced; these are observations before the final morphology
pronunciation pass, not recovered lexical vowels. The lexical-stress PR #309
changes that lifecycle separately. Final structure checks allow vowel reduction
while requiring preserved boundaries to retain both nuclei and empty intervening
onset/coda. Historical traces without decision emission have unknown opportunity
counts, even when their existing events establish that insertion occurred.

## Measured comparison

The [preregistered probe](../evaluation/quality/probes/morphological-hiatus/README.md)
uses the immutable original development archive and the matching 200,000-word
candidate. All morphology-disabled raw shards are byte-identical: 100,000 words
across the bare-lexicon and forced-monosyllable profiles. Source checks confirm
the complete captured generator matches the reviewed implementation.

| Frozen diagnostic | Original | Candidate |
| --- | ---: | ---: |
| Lexicon affixed words with a morphology bridge | 3,862/34,952 | 0/34,883 |
| Text affixed words with a morphology bridge | 4,481/22,557 | 0/22,373 |
| Unique lexicon spellings | 43,501 | 43,850 |
| Unique text spellings | 28,443 | 28,693 |

The original traces contain 8,959 morphology bridge events in 8,343 words:
2,643 prefix/root events and 6,316 root/suffix events, all inserting /h/.
Historical full opportunity counts remain unknown. Candidate traces record
12,563 preserved vowel boundaries: 3,786 prefix/root and 8,777 root/suffix.
Every recorded boundary retains both nuclei with empty intervening onset/coda
in the final syllable representation, with zero structure or insertion-event
correspondence mismatches. Both affixed profiles show preserved boundaries in
all five streams. These totals differ because phone counts and rejection
sampling change; they are not paired boundary counts.

The target defect disappears in the sample, but broader diagnostics are mixed.
Lexicon phoneme divergence decreases from 0.007407 to 0.005993 bits, while trigram
divergence increases from 0.158592 to 0.160919 bits. Text phoneme divergence
decreases from 0.011102 to 0.007783 bits, while trigram divergence increases from
0.184480 to 0.186554 bits. Lexicon disyllabic stress clashes increase from
4,467/21,065 to 4,648/20,875. Composition and rejection sampling change when the
inserted phone is removed; these are distribution comparisons, not paired words.
The full report retains every metric and stratum.

The existing unit suite passes 410 tests and skips one, but the rare `ugh` gate
fails at 0.0061432337 times its reference frequency, below the unchanged 0.0062
floor. The separate 12-test quality suite passes. Fourteen public-API fixtures
cover preserved and consonant-separated boundaries, both affixes, custom h/j/w
insertion, absent candidates, legacy config defaults and output/RNG parity.
Strict TypeScript and newly introduced-code lint pass; three pre-existing lint
errors remain in the touched writer file. This candidate remains a draft.
Fourteen supplementary fixtures verify interpretation, one-to-one event pairing,
source capability, complete schedules, source/shard hashes, summary counts,
and rejection of corrupt, duplicate, truncated or extra archive data. The same
probe digest, `55e3bb92df1bc21dc65d5afff6b8dabac8fbd166e67074b21ed67a0e15971368`,
was applied to both full archives. The isolated performance suite passes at
8,336 words/second (4,500 floor), with median batch variance 1.40× (3× ceiling).

The [full comparison](../evaluation/experiments/morphological-hiatus/comparison.md)
and compressed original/candidate boundary reports retain counts, all seed
replicates, actual morphology/length strata, and complete bounded trace witnesses.

Improved human wordlikeness and reading agreement require separate blinded
evidence. Neither zero observed bridge insertions nor a lower corpus distance
establishes those outcomes.
