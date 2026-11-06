# Nucleus segment edges

Q07 separates a nucleus segment's position in the generated base word from the
legacy syllable-position weights. This is a narrow inventory migration: FOOT /ʊ/
must be available inside closed final rimes while remaining forbidden at an
actual open base-word edge. No frequencies or distribution gates are tuned.

## Inventory audit and contract

Legacy `startWord`, `midWord`, and `endWord` do not consistently describe literal
segments. Onset selection sees the first-syllable flag, coda selection sees the
last-syllable flag, and nucleus selection sees both. A nucleus in a monosyllable
must pass both filters; weighting then prefers its initial weight. Grapheme
position fields have their own syllable-based contract and are unchanged here.

The inventory's zero position weights are /ʊ/ at the end, /ŋ/ at the start, /h/ at
the end, and /ʒ/ at both ends. Only /ʊ/ is migrated. /ŋ/ already has zero onset
weight, /h/ zero coda weight, and /ʒ/ needs a separate distributional audit before
changing its restriction. All other phoneme position weights remain unchanged.

An optional structured `nucleusWordPosition: { initial, medial, final }` overrides
the legacy position tuple only during nucleus selection. Its scope is each
nucleus segment in the generated base/root word, before affix assembly. Consonant
clusters retain their existing semantics. /ʊ/ keeps its existing numeric tuple
`{ initial: 2, medial: 2, final: 0 }`; its old fields remain for compatibility.
Weights must be finite and nonnegative; zero excludes the corresponding position.
An isolated nucleus segment is both initial and final and must satisfy both
restrictions. A zero on either edge forbids it. Otherwise the initial weight
has precedence, matching the existing simultaneous-edge weighting convention.

The initial generation decision uses the realized onset and planned coda.
Structure repair can remove a coda, so shared eligibility is checked again on
the actual base word after stress and structure changes, before spelling or
pronunciation. Stress-driven nucleus replacement uses the same eligibility.
Its relative replacement weights remain the existing nucleus-only weights;
the new positional tuple changes hard eligibility in that pass, not its weights.
Actual validation accounts for each segment's index within a multi-segment
nucleus. If no eligible replacement exists, generation reports an incompatible
configuration instead of emitting a prohibited nucleus.
The current root sampler continues to generate one nucleus segment per syllable;
this change does not add multi-segment nucleus sampling.

This can alter the proposal distribution and retry stream; it is not an output
parity change. The general checked-vowel and nucleus/coda compatibility work is
Q10. In particular, this PR does not fix /æŋ/ or reinterpret `tense`.
The replacement pool can still select another checked vowel, such as /æ/, at an
open final edge under those legacy rules. The supplementary probe reports repair
transitions and how often the resulting base ends in another open checked vowel;
removing open final /ʊ/ alone does not establish legality of the whole rime.
Integration with Q04/PR #309 must retain this check after its final lexical stress pass and
before surface realization, with an explicit decision about base-word versus
assembled-word coordinates.

## Evidence

In generated output, /ʊ/ now appears in closed final base syllables and closed
monosyllables, and never at an open final edge of the prepared base or the final
surface word. With the default configuration, `repairNucleusWordPositions` is not
exercised; custom-configuration tests force coda removal to cover it.

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
