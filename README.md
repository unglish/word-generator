# word-generator

Generate English-sounding nonsense words based on phonotactic rules.

Part of the [Unglish](https://github.com/unglish) project. Zero runtime dependencies.

## Installation

```bash
npm install @unglish/word-generator
```

## Quick Start

```ts
import { generateWord } from "@unglish/word-generator";

const word = generateWord();
console.log(word.written.clean);   // e.g. "brintle"
console.log(word.pronunciation);   // IPA, e.g. "ˈbrɪn.təl"
console.log(word.written.hyphenated); // e.g. "brin-tle"
```

## API

### `generateWord(options?): Word`

Generate a single word using the default English config.

```ts
import { generateWord } from "@unglish/word-generator";

// Deterministic — same seed always produces the same word
const word = generateWord({ seed: 42 });

// Force a specific syllable count (1–7)
const long = generateWord({ syllableCount: 4 });

// Apply morphological affixation (prefixes/suffixes)
const affixed = generateWord({ morphology: true });
```

### `generateWords(count, options?): Word[]`

Generate multiple words sharing a single RNG stream, so each word is different
but the full sequence is deterministic from one seed.

```ts
import { generateWords } from "@unglish/word-generator";

const words = generateWords(50, { seed: 42 });
// 50 distinct words, fully reproducible
```

### `createGenerator(config): WordGenerator`

Create a generator from a custom `LanguageConfig`. Use this to override
phoneme inventories, cluster constraints, stress rules, or grapheme mappings.

```ts
import { createGenerator, englishConfig } from "@unglish/word-generator";

const gen = createGenerator(englishConfig);
const word = gen.generateWord({ seed: 42 });
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `seed` | `number` | — | Integer seed for deterministic output |
| `rand` | `() => number` | — | Custom RNG (takes priority over `seed`) |
| `mode` | `"text" \| "lexicon"` | `"lexicon"` | `"text"`: monosyllable-heavy (mimics running prose). `"lexicon"`: balanced distribution (mimics a dictionary) |
| `syllableCount` | `number` | — | Force exactly this many syllables (1–7) |
| `morphology` | `boolean` | `false` | Apply prefix/suffix affixation to the root |
| `trace` | `boolean` | `false` | Attach diagnostic trace to `word.trace` |

### Word Shape

Every generated word is a `Word` object:

```ts
interface Word {
  syllables: Syllable[];      // onset/nucleus/coda arrays of Phoneme objects
  pronunciation: string;      // IPA string
  written: {
    clean: string;            // e.g. "brintle"
    hyphenated: string;       // e.g. "brin-tle"
  };
  trace?: WordTrace;          // present only when trace: true
}
```

### Default Export

The default export bundles `generateWord` with the phoneme/grapheme inventories
and RNG utilities — useful for quick exploration:

```ts
import wordGenerator from "@unglish/word-generator";

wordGenerator.generateWord({ seed: 1 });
wordGenerator.phonemes;   // phoneme inventory & lookup tables
wordGenerator.graphemes;  // grapheme (spelling) inventory
wordGenerator.random;     // RNG helpers (overrideRand, getRand, etc.)
```

## Generation Modes

| Mode | Behavior | Use Case |
|---|---|---|
| `"lexicon"` (default) | Balanced syllable distribution | Building word lists, dictionaries |
| `"text"` | Heavy monosyllable bias | Simulating running prose |

## Debugging With Trace

Pass `trace: true` to inspect every decision the generator made:

```ts
const word = generateWord({ trace: true, seed: 42 });

word.trace?.summary;            // { decisions, repairs, morphologyApplied }
word.trace?.stages;             // syllable snapshots at each pipeline stage
word.trace?.graphemeSelections;  // spelling choices with weights & dice rolls
word.trace?.repairs;            // which repair rules fired
word.trace?.structural;         // boundary adjustments
```

See [docs/word-trace-diagnostics.md](./docs/word-trace-diagnostics.md) for a
full walkthrough.

## Demo

Run the interactive web demo locally:

```bash
npm run dev
```

Then open <http://localhost:5173>.

## Development

```bash
npm test              # unit tests (vitest)
npm run test:quality  # quality regression gates
npm run test:perf     # performance benchmarks
npm run build         # TypeScript + Vite build
npm run lint          # ESLint
npm run format        # Prettier
```

## Project Structure

```
src/
  index.ts              # public API entry point
  types.ts              # Word, Syllable, Phoneme, Grapheme types
  config/               # language configs, weights, quality thresholds
    english.ts          # English language config
    language.ts         # LanguageConfig interface & validators
    weights.ts          # generation probability constants
  core/                 # generation pipeline
    generate.ts         # main word generation logic
    pronounce.ts        # IPA pronunciation & stress (Optimality Theory)
    write.ts            # orthographic output (grapheme selection)
    repair.ts           # phonotactic cluster repairs
    stress-repair.ts    # stress-related repairs
    trace.ts            # diagnostic tracing
    morphology/         # affix attachment
  elements/             # phoneme & grapheme inventories
    phonemes.ts         # consonant & vowel definitions
    graphemes/          # spelling representations by category
  phonotactic/          # phonotactic scoring & validation
    score.ts            # ARPABET bigram scorer
  utils/                # RNG, weighted selection
```

## Design Goals

| Principle | Description |
|---|---|
| Modern TypeScript | Strict mode, ESM-first, strong types |
| Minimal Dependencies | Zero runtime deps |
| Deterministic | Same seed + config = same word |
| Phonological Fidelity | Obeys plausible English phonotactics |
| Composable API | Each stage independently testable |
| Multimodal Output | Works in CLI, Web, Node, and Worker environments |

See [agents.md](./agents.md) for full contributing guidance and [TUNING.md](./TUNING.md) for the quality-tuning methodology.

## License

MIT
