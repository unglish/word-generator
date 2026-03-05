# Pronunciation Config Update

Pronunciation behavior is configured under `LanguageConfig.pronunciation`.
Stress and aspiration are declarative and data-driven.

## Current shape

```ts
interface LanguageConfig {
  pronunciation: {
    stress: StressRules;
    aspiration?: AspirationRules;
    vowelReduction?: VowelReductionConfig;
  };
}
```

## Stress schema

```ts
type PrimaryStressRules =
  | { type: "fixed"; fixedPosition: number }
  | { type: "initial" }
  | { type: "penultimate" }
  | {
      type: "weight-sensitive";
      disyllabicWeights: [number, number];
      polysyllabicWeights: {
        heavyPenult: number;
        lightPenult: number;
        antepenultHeavy: number;
        antepenultLight: number;
        initial: number;
      };
    }
  | { type: "ot"; otConfig: OTStressConfig };

interface StressRules {
  primary: PrimaryStressRules;
  secondary: {
    enabled: boolean;
    probability: number;
    heavyWeight: number;
    lightWeight: number;
    candidateWindow: "first-three" | "all-nonprimary";
  };
  rhythmic: {
    enabled: boolean;
    probability: number;
    requireUnstressedNeighbors: boolean;
  };
  nucleus: {
    stressedNucleusBan?: string[];
    unstressedNucleusBoost?: Record<string, number>;
  };
}
```

## Aspiration schema

```ts
interface AspirationRules {
  enabled: boolean;
  targets: AspirationTargetSelector[];
  rules: AspirationRule[];
  fallbackProbability: number;
}

interface AspirationTargetSelector {
  segment: "onset" | "nucleus" | "coda";
  index?: number;
  sounds?: string[];
  manner?: Phoneme["mannerOfArticulation"][];
  place?: Phoneme["placeOfArticulation"][];
  voiced?: boolean;
}

interface AspirationRule {
  id: string;
  when: {
    wordInitial?: boolean;
    stressed?: boolean;
    postStressed?: boolean;
    syllableIndexClass?: "initial" | "medial" | "final";
    previousCodaSounds?: string[];
  };
  probability: number;
}
```

## Notes

- Aspiration is represented on phonemes via `phoneme.aspirated = true`.
- `phoneme.sound` remains canonical (no mutation to append `ʰ`).
- Pronunciation output still renders aspiration diacritics when `aspirated` is set.
