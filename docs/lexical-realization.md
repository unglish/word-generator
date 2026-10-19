# Lexical structure and surface pronunciation

Generated words retain their lexical structure in `word.lexical`. The existing
`word.syllables` and `word.pronunciation` describe the surface realization.

```ts
const word = generateWord({ seed: 855, morphology: true, trace: true });
word.lexical?.root;       // Base-root vowels and lexical root stress.
word.lexical?.syllables;  // Affixed word and final stress, before reduction.
word.syllables;           // Surface vowels and aspiration.
```

The root, assembled lexical word, and surface word have independent syllable,
segment-array, and phoneme objects. The root's syllables occupy the range starting
at `word.lexical.rootSyllableStart` in both assembled and surface forms. This is
syllable alignment; it does not claim complete grapheme or morpheme ownership.
`lexical` is optional in the `Word` type for compatibility with callers that
construct their own words, and is populated by the generation APIs.

The generation order is:

1. Generate and repair the lexical root, then assign root stress.
2. Resolve allomorphs and root sound alternations, assemble affix syllables, and
   apply the affixes' stress effects.
3. Enforce the configured primary-stress nucleus restrictions. If final stress
   promotes an underlying forbidden vowel, update that lexical choice before
   selecting its spelling.
4. Spell the base root, then apply the written halves of the resolved
   morphophonemic rules and boundary transforms. A sound alternation such as
   `-ity` shortening does not erase the base vowel used for spelling.
5. Clone the assembled lexical form and apply aspiration and vowel reduction
   once in the final word context. Exact bare-word spelling overrides retain
   their existing surface-phone matching behavior.

Every standalone lexical monosyllable has internal primary stress. Its IPA
omits the redundant stress mark; affixation preserves the lexical prominence
unless an affix explicitly moves primary stress. The default English inventory
therefore excludes standalone primary-stressed schwa while preserving schwa in
unstressed root syllables and affixes. Weak function-word forms would require
their own configured lexical category.

With tracing enabled, `applyStress` exposes root stress, `assembleMorphology`
exposes affix stress changes, and `repairFinalStressedNuclei` exposes any final
lexical nucleus correction. The single `generatePronunciation` stage records
the full lexical form before realization and the surface form afterward.
Snapshots include stress, reduced nucleus indices, and aspiration coordinates.
The orthographic trace identifies its `source` as the lexical root and records
the root's offset in the assembled word. Grapheme-unit indices remain relative
to that root; unspelled morphological bridge phones do not acquire ownership of
unrelated root graphemes with a coincidentally matching index and sound.

The deterministic sequence changes because surface decisions are made once,
after morphology. Old and new outputs at the same random-stream position are
not generally matched words. Compare distributions using the fixed evaluation
protocol and use constrained configurations to test individual derivations.

This change does not retune syllable weight, secondary-stress rhythm, reduction
probabilities, morphological hiatus, or spelling repairs. In particular, the
existing post-morphology reconstruction and orthographic ownership limitations
remain separate work; lexical-to-surface consistency is not proof of complete
spelling-to-pronunciation agreement.

## Measured candidate and remaining gates

The [full development comparison](../evaluation/experiments/final-lexical-stress/comparison.md)
contains 200,000 traced outputs under the frozen protocol from
[PR #307](https://github.com/unglish/word-generator/pull/307). Compact manifests,
source snapshots, summaries, unfiltered review samples and defect witnesses sit
alongside it. Full raw archives remain in the local capture directory identified
by the run ID; the manifests retain their hashes.

For default lexicon outputs, missing primary stress falls from 20.545% of
polysyllables to zero; primary-stressed schwa falls from 2.016% of words to zero.
The four profiles all show zero observed primary-stressed reduced vowels and
standalone schwa. This is a consistency result, not a reader-preference claim.

The candidate remains a draft. Default-lexicon disyllabic stress clashes increase
from 21.206% to 41.906% as restored primary stress coexists with unchanged
secondary-stress rules. Final open checked vowels increase from 1.492% to 1.838%;
the current stressed-nucleus replacement does not validate the resulting rime.
These require the separate rhythm and rime improvements.

The existing single-stream n-gram test also fails its `ugh` floor: 0.006123× CMU
against 0.0062×. The [traced diagnostic](../evaluation/experiments/final-lexical-stress/ugh-audit.json)
finds one `ugh` in each 50,000-word default-lexicon cohort, both from separate
`u` + `g` + `h` units, while the bare cohort changes from zero to one genuine
`ough` selection. Thresholds remain unchanged; sparse-count gate calibration is
unresolved rather than bypassed.
