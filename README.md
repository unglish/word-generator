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

## Project Goals

See [agents.md](./agents.md) for the project's purpose and [core design goals](./agents.md#-core-design-goals).
