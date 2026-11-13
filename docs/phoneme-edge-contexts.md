# Nucleus segment edges

Q07 separates a nucleus segment's position in the generated base word from the
legacy syllable-position weights. FOOT /ʊ/ must be available inside closed final
rimes while remaining forbidden at an actual open base-word edge. Issue #398
extends the open-final ban to the full checked set /ɪ ɛ æ ʌ ʊ/ without retuning
inventory frequencies: closed finals keep legacy syllable weights.

## Inventory audit and contract

Legacy `startWord`, `midWord`, and `endWord` do not consistently describe literal
segments. Onset selection sees the first-syllable flag, coda selection sees the
last-syllable flag, and nucleus selection sees both. A nucleus in a monosyllable
must pass both filters; weighting then prefers its initial weight. Grapheme
position fields have their own syllable-based contract and are unchanged here.

The inventory's zero position weights include /ʊ/ at the end (via
`nucleusWordPosition`), /ŋ/ at the start, /h/ at the end, and /ʒ/ at both ends.
/ʊ/ keeps `nucleusWordPosition: { initial: 2, medial: 2, final: 0 }` so closed
finals remain legal when legacy `endWord` is 0. /ŋ/ already has zero onset
weight, /h/ zero coda weight, and /ʒ/ needs a separate distributional audit.

English sets `forbidOpenCheckedFinal: true`. That bans /ɪ ɛ æ ʌ ʊ/ at an open
final base-word edge during nucleus selection and post-coda / stress repair,
independent of `nucleusWordPosition`, so /ɪ ɛ æ ʌ/ keep their legacy closed-final
weights (`endWord` ≠ `midWord`). Forms like `tra` / `sny` / `swa` are excluded.
Custom configs may set `forbidOpenCheckedFinal: false` (morphology fixtures with
checked-only pools do this).

An optional structured `nucleusWordPosition: { initial, medial, final }` overrides
the legacy position tuple during nucleus selection when present. Its scope is each
nucleus segment in the generated base/root word, before affix assembly. Consonant
clusters retain their existing semantics. Weights must be finite and nonnegative;
zero excludes the corresponding open edge. An isolated nucleus segment is both
initial and final and must satisfy both restrictions. A zero on either edge
forbids it. Otherwise the initial weight has precedence.

The initial generation decision uses the realized onset and planned coda.
Structure repair can remove a coda, so shared eligibility is checked again on
the actual base word after stress and structure changes, before spelling or
pronunciation. Stress-driven nucleus replacement uses the same eligibility.
If no eligible replacement exists, generation reports an incompatible
configuration instead of emitting a prohibited nucleus.

## Evidence

Checked vowels appear in closed final base syllables and closed monosyllables,
and not at an open final edge of the prepared base under the default English
inventory. Custom-configuration tests force coda removal to cover
`repairNucleusWordPositions`. Issue #398 measures the residual open-checked rate
with the quality harness metric `final_open_checked_vowel`, especially on
`monosyllables-bare`.

The preregistered protocol, the original 200,000-word comparison with its
supplementary nucleus-edge reports, and the cumulative reproduction after Q06
(2026-10-03) are kept at tag `archive/evidence-pre-cleanup`, along with the
`nucleus-edges.ts` probe that produced the supplementary reports:

```sh
git fetch origin tag archive/evidence-pre-cleanup
git show archive/evidence-pre-cleanup:evaluation/experiments/nucleus-word-edges/comparison.md
git show archive/evidence-pre-cleanup:evaluation/experiments/nucleus-word-edges/nucleus-comparison.json
git show archive/evidence-pre-cleanup:evaluation/experiments/nucleus-word-edges/current-composition-2026-10-03/README.md
git show archive/evidence-pre-cleanup:evaluation/quality/probes/nucleus-edges.ts
```
