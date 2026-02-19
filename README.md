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

## Debugging With Trace

Use `trace: true` when diagnosing unexpected outputs. This adds a `word.trace`
object with stage snapshots, grapheme decisions, structural events, repair logs,
and morphology metadata.

```ts
import { generateWord } from "@unglish/word-generator";

const word = generateWord({ mode: "lexicon", trace: true, seed: 42 });

console.log(word.written.clean);
console.log(word.trace?.summary);
console.log(word.trace?.graphemeSelections[0]);
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
