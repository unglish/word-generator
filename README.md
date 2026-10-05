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

`syllableCount` requests an exact **root** count from 1–7. Affixes are applied
independently afterward: a one-syllable root plus `-ing` has two syllables;
`un-` plus a one-syllable root plus `-ness` has three. There is no final-word
syllable ceiling. With automatic length, the configured phoneme, syllable, and
letter targets also describe the root.

This changes the earlier whole-word budget behavior: affixes no longer consume
the requested count or shorten the planned root. Existing morphology-enabled
seeded outputs change. Bare generation (`morphology: false`) retains its prior
budget behavior and seeded outputs. Seeds remain deterministic within the same
version and configuration.

The text-mode quality benchmark accepts an average finished spelling length
strictly below 7 characters, including affixes. This owner-accepted guardrail
accommodates longer finished words under root-only budgets; it is neither a
per-word limit nor an empirical English mean. Other quality thresholds remain
unchanged.

The English writer caps ordinary vowel-letter runs at two. It preserves a
generator-selected vowel spelling ending in terminal `y`, such as `ey` or
`oi` rewritten to `oy`, even when adjacent letters make the run longer.
This exception follows the selected vowel unit; arbitrary final `y` does not
qualify. Terminal `y` is vocalic for consonant repairs, while `y` before a
vowel remains consonantal (`yet`, `yawn`), and `w` remains consonantal.

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
console.log(word.trace?.targetPhonemeCount);
console.log(word.trace?.syllablePlans);
console.log(word.trace?.stages[0]);
console.log(word.trace?.graphemeSelections[0]);
```

For top-down length diagnostics, inspect:

- `trace.targetPhonemeCount` for the planned root phoneme budget
- `trace.syllablePlans` for the per-root-syllable onset/coda budget
- `trace.syllableCount` for the root count; `word.syllables.length` for the
  completed count including selected affix allomorphs

Detailed trace workflow: [`docs/word-trace-diagnostics.md`](./docs/word-trace-diagnostics.md)

## Top-Down Phoneme Targeting

Generation plans roots top-down, then attaches the selected affixes:

1. sample a target root phoneme count,
2. sample a compatible root syllable count,
3. distribute onset/coda consonant budgets across syllables,
4. generate and select the root using root phoneme and letter targets,
5. attach affixes, resolve allomorphs, and finish pronunciation and spelling.

The built-in English config ships with this wired through:

- `phonemeLengthWeights`
- `phonemeToSyllableWeights`

Custom language configs should provide both tables. They are required parts of
`LanguageConfig`, not optional tuning extras.

Nuclei can opt into explicit base-word segment weights with
`nucleusWordPosition`. See [nucleus edge semantics and migration](./docs/phoneme-edge-contexts.md)
for the distinction from legacy syllable-position weights.

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
- `npm run calibrate:phonemes` (recalibrates phoneme gate limits from multi-seed spread; see [`TUNING.md`](./TUNING.md#phoneme-guardrail-ratchet))

See [corpus diagnostics](./docs/corpus-diagnostics.md) for reproducible analyzer
streams, complete distribution metrics, and trace-backed outlier reports.

For frozen baselines and per-step linguistic comparisons, see
[quality baselines](./docs/quality-baselines.md). The benchmark preserves traced
outputs, source/configuration provenance, and original/previous-step comparisons.

## Documentation

- Contribution workflow: [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- Agent-specific constraints: [`agents.md`](./agents.md)
- Diagnostics/design docs index: [`docs/README.md`](./docs/README.md)
- Tuning notes and diagnostics: [`TUNING.md`](./TUNING.md)
