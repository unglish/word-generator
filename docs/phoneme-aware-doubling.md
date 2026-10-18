# Sound-specific consonant doubling

English doubling now declares ordinary sound/spelling relations. In particular, /k/ spelled c or k can expand to ck, but /s/ spelled c cannot. Likewise the ordinary policy expands /s/ s to ss and /z/ z to zz; it does not infer a lexical ss reading for another sound. Refused expansion leaves the selected spelling unchanged. Existing selection and final spelling obligations still apply.

`DoublingConfig.realizations` contains `DoublingRealization` objects with `phoneme`, `from`, `to`, `reading`, and optional `allowInCodaCluster`. The output reading belongs to the realized unit and is recomputed by both repair planners and certificate verification. An empty list permits no expansion. Repeated keys, invalid expansion shapes and invalid reading contracts fail at model construction. Probability, stress/reduction guards, cluster constraints and the per-word quota still apply. The exceptional first-coda-cluster permission is explicit; English grants it only to the two ck relations.

When `realizations` is omitted, the existing legacy behavior remains: `doubledForms` is keyed by the selected grapheme form, and otherwise the selected letter is repeated. To use that behavior while spreading the new English config, opt out explicitly:

```ts
const legacy = createGenerator({
  ...englishConfig,
  doubling: { ...englishConfig.doubling!, realizations: undefined },
});
```

`doubledForms` is ignored when a structured realization list is present. Directly selected doubled forms consume quota by sound plus spelling in the structured policy. The existing quota preference in grapheme selection uses the same classification. As before, direct selection is counted only after the sampler's preceding position/cluster guards; this change does not redefine those guards.

An unsupported expansion consumes no doubling draw. Positive-policy sequences can therefore differ after that point even with the same seed. Repeating the same configuration and seed remains deterministic. The registered comparison is in `evaluation/experiments/phoneme-aware-doubling`; implementation fixtures do not establish full-corpus improvement or human preference.
