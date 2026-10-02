# @unglish/word-generator

Generate English-like nonce words using configurable phonotactics.

## Human review pilot

The separate `review.html` page collects anonymous written-wordlikeness judgments
on frozen samples. Supabase stores responses privately for the owner; reviewers
can only receive words and submit ratings. See the
[setup, export, and verification guide](./docs/human-review.md).

## Install

```bash
npm install @unglish/word-generator
```

## Quick Start

```ts
import { generateWord, generateWords } from "@unglish/word-generator";

const one = generateWord();
console.log(one.written.clean);

const deterministic = generateWord({ seed: 42 });
console.log(deterministic.written.clean);

const batch = generateWords(5, { seed: 42, mode: "lexicon" });
console.log(batch.map(w => w.written.clean));
```

`generateWords(count, { seed })` is deterministic and yields different words in
the same seeded stream.

By default generation includes morphology when the active config enables it.
Pass `{ morphology: false }` for bare root forms.

## RNG Control

```ts
import { createSeededRng, generateWord } from "@unglish/word-generator";

const rand = createSeededRng(42);
const a = generateWord({ rand });
const b = generateWord({ rand });
```

Use `seed` for one-off deterministic calls, or pass `rand` to control a shared
RNG stream.

## Trace-First Diagnostics

For n-gram or orthography outliers, use `trace: true` and inspect `word.trace`
instead of only checking surface strings.

```ts
import { generateWord } from "@unglish/word-generator";

const word = generateWord({ seed: 42, mode: "lexicon", trace: true });

console.log(word.written.clean);
console.log(word.trace?.summary);
console.log(word.trace?.stages[0]);
console.log(word.trace?.graphemeSelections[0]);
console.log(word.trace?.finalWord?.spelling.surface); // final operational lineage
```

Detailed trace workflow: [`docs/word-trace-diagnostics.md`](./docs/word-trace-diagnostics.md)

Underlying segments and final stress are retained in `word.lexical`; surface
phones remain in `word.syllables`. See [lexical and surface realization](./docs/lexical-realization.md).

## Top-Down Phoneme Targeting

Generation now plans words top-down:

1. sample a target phoneme count,
2. sample a compatible syllable count,
3. distribute onset/coda consonant budgets across syllables,
4. generate phonemes, repairs, pronunciation, and spelling.

The built-in English config ships with this wired through:

- `phonemeLengthWeights`
- `phonemeToSyllableWeights`

Custom language configs should provide both tables. They are required parts of
`LanguageConfig`, not optional tuning extras.

After retuning those tables, run:

```bash
npm run analyze:phoneme-length
npm run test:quality
```

## Boundary Policy Config (0.6.0)

Boundary adjustment probabilities moved to a dedicated
`generationWeights.boundaryPolicy` object.

```ts
import { createGenerator, englishConfig } from "@unglish/word-generator";

const generator = createGenerator({
  ...englishConfig,
  generationWeights: {
    ...englishConfig.generationWeights,
    boundaryPolicy: {
      equalSonorityDrop: 90,
      risingCodaDrop: 25,
    },
  },
});
```

Breaking change:

- `generationWeights.probability.boundaryDrop` was removed.
- Use `generationWeights.boundaryPolicy.equalSonorityDrop` instead.

## Pronunciation Config

Stress and aspiration are declarative under `pronunciation`.

```ts
import { createGenerator, englishConfig } from "@unglish/word-generator";

const generator = createGenerator({
  ...englishConfig,
  pronunciation: {
    ...englishConfig.pronunciation,
    stress: {
      ...englishConfig.pronunciation.stress,
      primary: { type: "penultimate" },
    },
    aspiration: {
      enabled: true,
      targets: [{ segment: "onset", index: 0, manner: ["stop"], voiced: false }],
      rules: [{ id: "word-initial", when: { wordInitial: true }, probability: 100 }],
      fallbackProbability: 0,
    },
  },
});
```

## Development

```bash
npm test
npm run lint
npm run dev
```

Additional checks:

- `npm run test:quality`
- `npm run analyze:phoneme-length`
- `npm run test:perf`
- `npm run analyze:phonemes`
- `npm run analyze:trigrams`
- `npm run audit:trace`

## Documentation

- Contribution workflow: [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- Agent-specific constraints: [`agents.md`](./agents.md)
- Diagnostics/design docs index: [`docs/README.md`](./docs/README.md)
- Tuning notes and diagnostics: [`TUNING.md`](./TUNING.md)

See [grapheme selection](docs/grapheme-selection.md) for hard constraints, positional scopes, and explicit fallbacks.

See [sound-specific consonant doubling](docs/phoneme-aware-doubling.md) for the English realization policy, custom rules, and the explicit legacy opt-out.

See [experimental shared spellings](docs/shared-spellings.md) for the opt-in multi-phone spelling policy and its current verification limits.
