# @unglish/word-generator

Generate English-like nonce words using configurable phonotactics.

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
```

Detailed trace workflow: [`docs/word-trace-diagnostics.md`](./docs/word-trace-diagnostics.md)

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
- `npm run test:perf`
- `npm run analyze:phonemes`
- `npm run analyze:trigrams`
- `npm run audit:trace`

## Documentation

- Contribution workflow: [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- Agent-specific constraints: [`agents.md`](./agents.md)
- Diagnostics/design docs index: [`docs/README.md`](./docs/README.md)
- Tuning notes and diagnostics: [`TUNING.md`](./TUNING.md)
