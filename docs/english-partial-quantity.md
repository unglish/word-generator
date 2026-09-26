# Partial English quantity

The English configuration now gives the five existing atomic diphthongs two
nuclear moras. OT primary stress, the alternative weight-sensitive strategy,
and secondary stress therefore recognize an open diphthong syllable as heavy.
Previously the shared legacy rule counted nucleus array elements, so an atomic
diphthong in an open syllable was light.

The named model is `english-legacy-partial-quantity-v1`:

| Source inventory entries | Nuclear contribution |
| --- | --- |
| /eɪ aɪ əʊ ɔɪ aʊ/ | 2 moras |
| /ɪ ɛ æ ʊ ʌ ə/ | 1 mora |
| /i: u ɑ ɔ ɚ ɜ/ | Unspecified |

These are model-qualified phonological quantities, not predictions of acoustic
duration. The inventory's source symbols and `tense` flags remain unchanged:
/ʊ/ still has its legacy `tense: true`, /əʊ/ is not renamed, and /ɜ/ receives no
assumed lexical identity or quantity. This partial model does not establish a
reference dialect. See the [quantity/weight distinction and linguistic sources](./syllable-weight.md).

The active policy uses `coda: "weight-by-position"`. A nonempty coda establishes
heavy weight without asserting an exact coda mora count. An open syllable whose
quantity is unspecified retains analytical weight `unknown`; its operational
decision explicitly falls back to the legacy segment-count rule. The only
operational classification change in the default inventory is an open atomic
diphthong changing from light to heavy. Constraint weights, stress windows,
secondary weights, noise and rhythmic rules are unchanged.

## Legacy opt-out

```ts
const legacyConfig = {
  ...englishConfig,
  pronunciation: {
    ...englishConfig.pronunciation,
    stress: {
      ...englishConfig.pronunciation.stress,
      syllableWeight: { type: "legacy-segment-count" as const },
    },
  },
};
const generator = createGenerator(legacyConfig);
```

This restores the old stress behavior and random draw sequence. Output phoneme
objects still carry the additive `nuclearQuantity` metadata; declared quantity
snapshots also remain visible in `trace.stressWeight`. Exact historical object
comparisons must explicitly strip that metadata and compare the newly added
stress-weight observation separately. Removing metadata from a custom inventory
alone is insufficient because the existing reduction implementation can obtain
replacement phones from the default module inventory. That implementation is
outside this change.

## Decision evidence and measurement

`trace.stressWeight` describes the root at stress assignment, before nucleus
repair, reduction, resyllabification, the rhythmic pass and morphology. In
particular, its secondary decision is before the rhythmic pass. It does not
claim that the final affixed word's stress or reduced vowel identity has been
resolved. Final stress ordering remains a separate improvement.

The [preregistered probe](../evaluation/quality/probes/syllable-quantity/README.md)
and [dated clarification](../evaluation/quality/probes/syllable-quantity/activation-amendment.md)
compare the immutable original, the exact 200,000-word shared-weight control,
and the activation using the same four profiles and five distinct seeded streams.
The mechanism denominator is every open atomic diphthong present at stress
assignment. Broader final-output metrics are retained; a corrected weight
classification alone does not establish an overall quality gain. Equal draw
coordinates after activation need not contain identical roots because changed
stress can change later random consumption and rejection behavior.
