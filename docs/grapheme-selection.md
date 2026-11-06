# Grapheme legality and position

The current pipeline writes the generated base before affix attachment.
Word-edge positions here therefore describe that base; final affixed-word
alignment is handled by a separate follow-up. The one exception is the base's
last grapheme, which sees the planned suffix's spelling as its right letter
context (`notRightGraphemeContext`, below).

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
fallbacks: initial or isolated /ʊ/ after /g/ can use `oo`, and a one-syllable
base ending in /i:/ before a vowel-initial suffix can use `ee` (`ea` is the only
ordinary isolated /i:/ spelling, and it may not precede a vowel letter; see
below). These preserve the existing contextual bans. A third fallback, initial
or isolated /ɛ/ before /t/ as `ea`, was retired once ordinary `e` became legal
before /t/ (see [below](#ordinary-e-before-t-312)): every /ɛ/
then has a positive ordinary spelling, so it could no longer fire.
The inventory also permits `n`/`ng` in legal /ŋ/ clusters (think, length) and
final /dʒ/→`ge` after tense vowels (age), removing contradictory exclusions that
previously depended on implicit restoration.

## Ordinary `e` before /t/ (#312)

/ɛ/ → `e` is legal before /t/, within a syllable (*pet*) and across a syllable
boundary (*letter*). It used to be banned there, so every such /ɛ/ was written `ea`.
`ea` stays available with unchanged weights: English has both *wet* and *sweat*,
and no corpus ratio between them is claimed.

The `magic-e` spelling rule turns a split vowel digraph into vowel + consonant + e
(*tiem* → *time*). It checks which phonemes own the letters it matches, through the
rule's `letterRoles` (see [Spelling rule letter roles](#spelling-rule-letter-roles)),
so a consonantal `y` is not read as a vowel (*yet* stays *yet*, not *yte*).

Evidence (measurements against main, quality comparison, calibration, the
original probe) is kept at tag `archive/pr-312`:

```sh
git fetch origin tag archive/pr-312
git show archive/pr-312:evaluation/quality/experiments/ordinary-et-rebased/README.md
```

## Spelling rule letter roles

A spelling rule with `scope: "syllable"` may declare `letterRoles`: for each listed
capture group, the syllable segment (`onset`, `nucleus` or `coda`) whose phonemes
must own every letter of that group. Ownership comes from the base-spelling
alignment (`BaseSpelling.segmentAt`). The capture groups must spell the whole match.
A match whose letters have the wrong roles is left unchanged and draws no
probability roll. English `magic-e` matches `([aiouy])(e)(C)$` and requires nucleus,
nucleus, coda.

## `ea` context (#381)

English does not write `ea` before a doubled consonant (*head*, not *headd*) or
before another vowel letter. Two configured rules enforce this:

- `GraphemeCondition.notRightGraphemeContext` bans listed letters directly after
  the grapheme. It is checked only where that letter is fixed when the grapheme
  is chosen: at the end of a base, the first letter of its planned suffix. Every
  ordinary `ea` uses the English alias `notBeforeVowelLetter` (`a e i o u`).
- `doubling.neverDoubleAfter: ["ea"]` vetoes doubling of a consonant written
  directly after an `ea` nucleus (trace reason `never-double-after`; like the
  other doubling skips, no roll is drawn). It also drops directly chosen doubled spellings (`ck`, `ssi`)
  there while another candidate remains; the trace records
  `preferenceRelaxed: "never-double-after"` if none does.

Measurements and side effects are kept at tag `archive/evidence-pre-cleanup`
(see [Evidence](#evidence)).

Trace `selection` records actual segment and syllable positions, stage counts,
the fallback reason, and any relaxation of the soft consonant-doubling quota.
All traced weights, including singleton pools, are actual configured weights.
Tracing consumes no random draws. A missing `selection` record in an old trace
means the new diagnostics are unobserved, not zero.

This enforces selection legality. Later string repairs and spelling/pronunciation
alignment remain separate quality questions.

## The /gz/ and /ks/ routes

Before legal selection, /gz/ before a vowel reached the `gz-to-x` rule only
through an illegal zero-weight `ze` (`mexeocowt`, with a stray `e`). Legal
selection writes that medial /z/ as `s`, which the rule does not match.
Medial coda /z/ after /g/ is therefore written `z` (`fricatives.ts`), so
`gz-to-x` writes `x` as in *exact* and *exist*. Widening the rule to `gs` was
rejected because letters cannot separate /gz/ from /gs/. A cluster-level
/gz/→`x` spelling with segment ownership remains possible future work.

Final-rime /k/→`ck` keeps its syllable-scoped preference (`itipacrex`). But /k/
before a word-final /s/ is a medial segment, so `c` competes at its mid-word
weight and fewer `k`/`ck` spellings reach `ks-to-x`: word-final /ks/ is written
`x` less often than before legal selection. That side effect is not yet tuned.

The common-word rewrite fixtures now start from legal ordinary spellings.
They previously forced an `mc`-conditioned `c` into *could*, excluded first-syllable
`ee` into *people*, and excluded isolated `ee`/`ou` spellings into other examples;
the old empty-set restoration masked those invalid setups. Their final lexical
rewrite expectations are unchanged. Tests that expected hard-ban restoration
and treated a monosyllable's coda as word-initial have been replaced with
trace-based checks of the intended positional contract.

## Evidence

Measurements for legal grapheme selection (the original frozen comparison, the
rebased comparison against main after #309), the preregistered selection probe,
and the `ea` context change (#381) are kept at tag `archive/evidence-pre-cleanup`:

```sh
git fetch origin tag archive/evidence-pre-cleanup
git show archive/evidence-pre-cleanup:evaluation/experiments/legal-grapheme-selection/comparison.md
git show archive/evidence-pre-cleanup:evaluation/quality/experiments/legal-grapheme-selection-rebased/README.md
git show archive/evidence-pre-cleanup:evaluation/quality/probes/grapheme-selection/README.md
git show archive/evidence-pre-cleanup:evaluation/quality/experiments/ea-spelling-381/README.md
```
