# Pronunciation Config Migration

This release consolidates pronunciation controls under a required
`LanguageConfig.pronunciation` object.

## Breaking change summary

Old top-level fields are removed:

- `stress`
- `aspiration`
- `vowelReduction`

New required grouped field:

```ts
interface LanguageConfig {
  pronunciation: {
    stress: StressRules;
    aspiration?: AspirationRules;
    vowelReduction?: VowelReductionConfig;
  };
}
```

## Aspiration schema update

Aspiration now uses context tables instead of individual probability fields.

Old:

```ts
aspiration: {
  enabled: true,
  postSProbability: 5,
  wordInitialProbability: 95,
  stressedProbability: 90,
  postStressedProbability: 50,
  defaultProbability: 30,
}
```

New:

```ts
pronunciation: {
  aspiration: {
    enabled: true,
    probabilities: {
      postS: 5,
      wordInitial: 95,
      stressed: 90,
      postStressed: 50,
      default: 30,
    },
    precedence: ["postS", "wordInitial", "stressed", "postStressed", "default"],
  },
}
```

## Notes

- Aspiration is now represented on phonemes via `phoneme.aspirated = true`.
- `phoneme.sound` remains canonical (no mutation to append `ʰ`).
- Pronunciation output still renders aspiration diacritics when `aspirated` is set.
