# Grapheme legality and position

The current pipeline writes the generated base before affix attachment.
Word-edge positions here therefore describe that base; final affixed-word
alignment is handled by a separate follow-up.

The writer filters by hard context, constituent, cluster, and positional
constraints before sampling positive finite weights. An empty set is no longer
replaced with the original candidates. Invalid custom configurations throw a
`No legal grapheme` error identifying the sound, segment, syllable, and failed
stage. Negative and nonfinite inventory weights fail during construction.

`Grapheme.positionScope` says whether `startWord`, `midWord`, and `endWord` refer
to a literal segment or to its containing syllable. A zero weight excludes that
candidate in the selected scope; positive values are relative preferences.
The English consonant inventories use segment scope except `ck`: its large
final weight is a final-rime preference (including /ks/, as in necks). It is
licensed in first-syllable codas as well, with a separate literal-start ban.
The vowel and rhotic inventories retain their existing syllable scope: a final-syllable `igh` in
`night` is not the final segment. They declare `isolatedSyllableWeight`
explicitly. Where an inventory already
contained spellings allowed at both edges, those remain the ordinary isolated
pool. Where no spelling had that intersection (/eɪ/), explicit isolated weights
use the previous maximum-weight formula. This retains established vowel pools
without reviving failed context conditions.
Custom inventories without explicit scope retain syllable scope, but must satisfy both edge bans
unless they declare a separate isolated-syllable weight.

`GraphemeCondition.segmentPosition` enforces literal word edges. The existing
`wordPosition` field retains its historical syllable-level meaning for custom
configurations. English `kn`, `wr`, `wh`, final `mb`, final `k`, final vowel `y`,
and final rhotic `eir` now state literal segment restrictions explicitly.

Fallback-only graphemes have their own full conditions and weights and can be
selected only when no ordinary candidate survives. English declares two narrow
fallbacks: initial or isolated /ɛ/ before /t/ can use `ea`, and initial or isolated /ʊ/
after /g/ can use `oo`. These preserve the existing contextual bans; the separate
ordinary `e`-before-/t/ improvement remains outside this change.
The inventory also permits `n`/`ng` in legal /ŋ/ clusters (think, length) and
final /dʒ/→`ge` after tense vowels (age), removing contradictory exclusions that
previously depended on implicit restoration.

Trace `selection` records actual segment and syllable positions, stage counts,
the fallback reason, and any relaxation of the soft consonant-doubling quota.
All traced weights, including singleton pools, are actual configured weights.
Tracing consumes no random draws. A missing `selection` record in an old trace
means the new diagnostics are unobserved, not zero.

The preregistered supplement is in
[`evaluation/quality/probes/grapheme-selection`](../evaluation/quality/probes/grapheme-selection/README.md).
Run it against complete archives with:

```sh
node --import tsx evaluation/quality/probes/grapheme-selection/analyze.ts RUN_DIRECTORY
```

This enforces selection legality. Later string repairs and spelling/pronunciation
alignment remain separate quality questions.

## Original frozen development measurement (before #309)

The [complete comparison](../evaluation/experiments/legal-grapheme-selection/comparison.md)
uses the 200,000-word protocol from [PR #307](https://github.com/unglish/word-generator/pull/307).
All 20 raw trace archives passed integrity verification. The original supplement
found 5,910 zero-total-weight decisions affecting 5,836 words; the candidate has
zero across 1,009,637 grapheme decisions. Its new selection records show zero
invalid selected weights and zero observed constraint restorations. There are
2,127 declared fallbacks: 2,112 /ɛ/→ea and 15 /ʊ/→oo.

Legacy singleton traces did not expose their configured weights; the 502,357
baseline singleton decisions remain unobserved for that diagnostic, not clean.
The compact capture, original/candidate supplements, and all distribution and
diversity deltas are retained beside the comparison. Raw archives remain local;
their manifest hashes and source snapshots are included for reproducibility.

## Rebased measurement and the /gz/ route

[Rebased evidence](../evaluation/quality/experiments/legal-grapheme-selection-rebased/README.md)
measures this change against main after #309. Zero-total-weight choices fall
from 2.6–6.4% of words to zero in every profile, and trigram distance to CMU
falls in all four.

The original candidate failed the common-bigram gate: `ex` fell under the
unchanged 0.0215× minimum. On main, /gz/ before a vowel reached the `gz-to-x`
rule only through an illegal zero-weight `ze` (`mexeocowt`, with a stray `e`).
Legal selection writes that medial /z/ as `s`, which the rule does not match.
Medial coda /z/ after /g/ is therefore written `z` (`fricatives.ts`), so
`gz-to-x` writes `x` as in *exact* and *exist*. Widening the rule to `gs` was
rejected because letters cannot separate /gz/ from /gs/. A cluster-level
/gz/→`x` spelling with segment ownership remains possible future work.

Final-rime /k/→`ck` keeps its syllable-scoped preference (`itipacrex`). But /k/
before a word-final /s/ is now a medial segment, so `c` competes at its mid-word
weight and fewer `k`/`ck` spellings reach `ks-to-x`: word-final /ks/ written `x`
roughly halves (see the rebased evidence). That side effect is not yet tuned.

The common-word rewrite fixtures now start from legal ordinary spellings.
They previously forced an `mc`-conditioned `c` into *could*, excluded first-syllable
`ee` into *people*, and excluded isolated `ee`/`ou` spellings into other examples;
the old empty-set restoration masked those invalid setups. Their final lexical
rewrite expectations are unchanged. Tests that expected hard-ban restoration
and treated a monosyllable's coda as word-initial have been replaced with
trace-based checks of the intended positional contract.
