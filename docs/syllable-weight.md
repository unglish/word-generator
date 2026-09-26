# Shared syllable weight

OT stress, the alternative weight-sensitive primary strategy, and secondary
stress now consume one analysis per syllable. With no new configuration, their
decisions retain the existing rule: a coda or more than one nucleus **segment**
makes a syllable operationally heavy. This counts array elements, not characters
in a phoneme symbol. An atomic diphthong therefore remains operationally light in
an open syllable under the default policy. This change supplies a shared, typed
representation; it does not activate new English quantity assignments or change
constraint weights, candidates, noise, tie order, or random draws.

## Quantity and weight are different

`Phoneme.nuclearQuantity` is optional model-qualified data:

```ts
{ analysis: "my-quantity-model-v1", moras: 1 } // or 2
```

It states the segment's nuclear contribution in that phonological analysis. It
does not predict acoustic duration. The existing `tense` flag continues to affect
its existing sonority, reduction and spelling rules; it supplies no quantity
information. Missing metadata, a different analysis name, and an absent stress
mark do not imply one mora. No English inventory entries receive quantity data
in this change, including the unresolved legacy /ɜ/ entry.

Moraic structure is a phonological representation whose consonantal contribution
can vary by language and analysis, rather than a direct duration measurement.
See [Hayes (1989)](https://brucehayes.org/papers/HayesCompensatoryLengthening1989Searchable.pdf).
English vowel classifications also require an explicit choice: Moore-Cantwell's
main-stress analysis treats monophthongs as short and diphthongs as long, notes
disagreement about [i, u], and separately analyzes final-[i] behavior. That work
does not justify equating this inventory's tense labels with mora counts. See
[Moore-Cantwell (2021)](https://www.cambridge.org/core/journals/phonology/article/weight-and-final-vowels-in-the-english-stress-system/30EDBFA90E382F68C400EEFCFC0DA31D).

## Opting into a custom model

Set `pronunciation.stress.syllableWeight` on a custom `LanguageConfig`:

```ts
{
  type: "moraic",
  analysis: "my-quantity-model-v1",
  coda: "weight-by-position", // or "nonmoraic"
  unknown: "legacy-segment-count", // or "error"
}
```

Declare each modeled phoneme's `nuclearQuantity` with the same analysis name.
As with other inventory changes, every object in `phonemeMaps` must also occur in
`phonemes`; copying inventory objects requires rebuilding those map references.
The public generator validates metadata, model names and policies. The public
`analyzeSyllableWeight` and `analyzeWordWeight` functions are pure analytical
helpers over typed inputs; they do not validate an entire language configuration.

The analysis reports two separate results:

- **Analytical weight:** light, heavy or unknown under the explicit model. At
  least two known nuclear moras establish heavy weight. A complete one-mora
  nucleus is light. An explicit weight-by-position coda establishes heavy weight
  for a nonempty nucleus even when nuclear quantity is unknown. An empty nucleus
  remains unknown. The exact nuclear total is `null` unless every contribution
  is known; no exact coda or total syllable mora count is asserted.
- **Operational weight:** the light/heavy decision the stress algorithm uses,
  with its basis recorded. Unknown analytical weight either uses the explicitly
  configured legacy fallback or throws with the model and syllable index.
  `unknown: "error"` concerns unknown **weight**, so a closed syllable can pass
  while its nuclear quantity is unknown.

The default `{ type: "legacy-segment-count" }` reports analytical weight as
unknown and operational weight as the original rule. It does not interpret even
declared quantities as belonging to an implicitly selected model. A future
English partial model can be activated and measured independently.

## Reading the trace

`word.trace.stressWeight` contains detached copies of the selected policy,
declared quantity data, each nuclear contribution, analytical and operational
weight, the primary strategy and selected index, and secondary candidates with
their actual weights, selected index and application decision. Two-argument
custom `OTConstraint.evaluate` functions remain compatible; a third optional
argument exposes the shared analysis.

The trace explicitly identifies its domain as `root-before-nucleus-repair` at
`applyStress`. Primary and secondary decisions precede the separate rhythmic
pass, stressed-nucleus replacement, reduction, resyllabification and morphology.
Secondary `applied: false` does not mean the final word lacks secondary stress:
the rhythmic pass or morphology may subsequently add it. Legacy monosyllables
retain the existing omitted primary mark and `selectedIndex: null`. This trace is
not a final-word analysis or a reconstruction of underlying identity after
reduction. Historical traces without the field have unavailable decision
evidence, not zero unknown quantities.

## Evidence and scope

The [preregistered parity protocol](../evaluation/quality/probes/syllable-weight/README.md)
compares 20,000 scheduled draws in four profiles and five streams, with trace on
and off. It checks complete words, every pre-existing trace field, RNG call counts
at every word boundary and the next RNG value. Controlled custom-model fixtures
exercise all primary strategies, secondary selection rates, unknown policies,
multi-element nuclei and immutable observations. No gate or weight is tuned.

This is an additive modeling foundation. English quantity activation, final-vowel
effects, a different WSP objective, rhythm, dialect migration and the ordering of
final morphological stress remain separate changes. The reference dialect has
not been established by user preference.

The [frozen comparison](../evaluation/experiments/syllable-weight/README.md)
passed all 20,000 scheduled draws with exact legacy output, trace and RNG parity.
It includes source content bundles, stream-level counts and complete witnesses.
