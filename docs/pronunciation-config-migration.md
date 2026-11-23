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
  syllableWeight?: SyllableWeightPolicy;
  primary: PrimaryStressRules;
  secondary: {
    enabled: boolean;
    probability: number;
    heavyWeight: number;
    lightWeight: number;
    candidateWindow: "first-three" | "all-nonprimary";
    finalNucleusProbabilities?: Readonly<Record<string, number>>;
  };
  rhythmic: {
    enabled: boolean;
    probability: number;
    requireUnstressedNeighbors: boolean;
  };
  nucleus: {
    stressedNucleusBan?: string[];
    secondaryStressBan?: string[];
    unstressedNucleusBoost?: Record<string, number>;
  };
}
```

OT constraints can add a weight adjustment keyed by the candidate's nucleus.
English uses this with `NONFINALITY` to favor an earlier primary stress when the
last syllable has /ɚ/. English also disables reduction under secondary stress.
Individual reduction rules can set `finalProbability` to override their
probability at a word-final or lexical-root-final syllable.

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

## Vowel reduction schema

```ts
interface VowelReductionConfig {
  enabled: boolean;
  rules: VowelReductionRule[];
  reduceSecondaryStress: boolean;
  secondaryStressProbability?: number;
  positionalModifiers?: { wordInitial?: number; wordMedial?: number; wordFinal?: number };
}

interface VowelReductionRule {
  source: string;
  target: string;
  probability: number;
  codaModifiers?: {
    sounds?: string[];
    manner?: Phoneme["mannerOfArticulation"][];
    place?: Phoneme["placeOfArticulation"][];
    voiced?: boolean;
    multiplier: number;
  }[];
}
```

A rule's probability is multiplied by its positional modifier, by
`secondaryStressProbability` / 100 in a secondary-stressed syllable, and by the
first `codaModifiers` entry whose selector (`sounds`, `manner`, `place`,
`voiced`, as in `matchesPhoneme`) matches the first coda consonant of the
vowel's own syllable (open syllables and unlisted codas use 1). The product is
rounded to a whole percent and clamped to 0–100, so a multiplier of 0 (or one
small enough to round to 0) blocks the rule there. Every candidate vowel still
draws once, so a blocked reduction does not shift later random draws. English
blocks /ɪ/ → /ə/ before /ŋ k g ʃ tʃ dʒ v/, where CMU keeps unstressed /ɪ/ (-ing
stays /ɪŋ/), and still applies it elsewhere, e.g. before /z s d t/ (roses
[ˈɹoʊzəz]).

## Notes

- Syllable weight defaults to the existing coda/segment-count rule. An explicit
  custom moraic model can supply phonological quantity without changing the
  legacy `tense` flag; see [shared syllable weight](syllable-weight.md).
- Aspiration is represented on phonemes via `phoneme.aspirated = true`.
- `phoneme.sound` remains canonical (no mutation to append `ʰ`).
- Pronunciation output still renders aspiration diacritics when `aspirated` is set.
