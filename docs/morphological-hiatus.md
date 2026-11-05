# Preserve vowel adjacency at affix boundaries

The default English morphology policy keeps both vowels when an affix meets a
vowel-initial or vowel-final root. Previously it inserted /h/ into the phoneme
sequence. Affix letters are fixed and the root writer sees only the root's
phonemes, so that /h/ was pronounced but never spelled: `showing` came out as
/ˈʃəʊ.həŋ/. It is now /ˈʃəʊ.əŋ/, with the same spelling.

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

Decisions are recorded when the planned affixes are assembled onto each root
attempt, before final stress repair and pronunciation (see
[`lexical-realization.md`](./lexical-realization.md)). Recorded nuclei can still
change later through stressed-nucleus repair or vowel reduction. A preserved
boundary keeps an empty left coda and right onset, with both nuclei present.
Historical traces without decision events have unknown opportunity counts, even
when their existing events show that insertion occurred.

When a custom policy enables insertion, the bridge draw comes from the
per-attempt look-ahead stream, so it never shifts root selection directly.
Disabling it removes that draw, which reshuffles later look-ahead choices. This
is why seeded affixed outputs eventually diverge from earlier releases, not
only at the boundary.

## Measured comparison

Current evidence, measured against post-#309/#310 main:
[`evaluation/quality/experiments/morphological-hiatus-rebased`](../evaluation/quality/experiments/morphological-hiatus-rebased/README.md).

| Development cohort, 50,000 words per profile | Main | This policy |
| --- | ---: | ---: |
| Lexicon affixed words with a morphology bridge | 3,022/35,092 | 0/35,098 |
| Text affixed words with a morphology bridge | 1,369/22,287 | 0/22,266 |

A control build that kept the bridge's RNG draw but discarded the result matched
main exactly in every spelling across 20,000 lexicon words. The only
difference was the deleted /h/ onset in exactly the 1,198 words that had one. The
remaining small movements in other diagnostics come from look-ahead resampling.
Phoneme gates and the 10-seed calibration are unchanged; n-gram gates move
slightly and all pass.

The original pre-#309 measurement (preregistered
[probe](../evaluation/quality/probes/morphological-hiatus/README.md) and
[comparison](../evaluation/experiments/morphological-hiatus/comparison.md)) is
kept for history. Its numbers and its `ugh` gate failure predate the current
pipeline.

Improved human wordlikeness and reading agreement require separate blinded
evidence. Neither zero observed bridge insertions nor a lower corpus distance
establishes those outcomes.
