# word-generator
Generate English-sounding nonsense words.

## Installation

```bash
npm install @unglish/word-generator
```

## Basic Usage

```ts
import wordGenerator from '@unglish/word-generator';

// Generate a single word
const word = wordGenerator.generateWord();
console.log(word);

// Deterministic output by seeding
const rng = wordGenerator.random.seedRandom(42);
const seeded = wordGenerator.generateWord({ rand: rng });
```

## Demo

Run a local demo with Vite:

```bash
npm run dev
```

Then open <http://localhost:5173> to try the interactive demo located in `demo/`.

## Tests

Run the unit tests with:

```bash
npm test
```

## Scoring Words

The library includes a simple **biphone** (phoneme bigram) model for ranking
pronunciations. The model was derived from CMUdict v0.7a: ARPAbet entries were
converted to IPA and stress digits were removed before counting bigram
frequencies. The table contains log probabilities for 40 phonemes and 1287
biphone pairs.

When calling `scoreWord(word)`, unknown phoneme pairs receive a fixed penalty
(`1e-8`). Scores are normalized by the number of pairs in the input. The model
is bundled as a static object but can be swapped by passing a custom table to
`scoreWord`.

## Project Goals

See [agents.md](./agents.md) for the project's purpose and [core design goals](./agents.md#-core-design-goals).
