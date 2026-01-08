# Code Review Recommendations

This document provides recommendations for improving the `@unglish/word-generator` library's **performance**, **maintainability**, and **modularity** (especially for supporting other languages).

---

## Summary of Fixes Applied

| Issue | Action Taken |
|-------|--------------|
| 315 ESLint errors | Auto-fixed 301, manually fixed remaining 14 |
| 3 `@ts-ignore` directives | Replaced with type-safe `getPositionWeight()` helper |
| Unused `isValidSyllableBoundary` function | Removed |
| Unused variables (`hasCoda`, `prevSyllable`, `nextPhoneme`) | Removed |
| Non-null assertions | Replaced with proper null checks |
| Missing return types | Added explicit `: void` return types |
| Outdated dependencies | Updated all to latest versions |
| ESLint v7 → v9 migration | Created new `eslint.config.js` flat config |
| Security vulnerabilities | Fixed via `npm audit fix` |

---

## 🚀 Performance Recommendations

### 1. **Pre-compile Regex Patterns** ✅ (Partially Done)

The codebase already pre-compiles regex patterns in `invalidClusterRegexes`, but there's room for optimization:

```typescript
// Current: Regex created from array at module load (good)
const invalidClusterRegexes = {
  onset: new RegExp(invalidOnsetClusters.map(r => r.source).join('|'), 'i'),
  ...
};
```

**Recommendation:** Consider using a single compiled regex per position rather than iterating through arrays in `getInvalidClusters()`. The current approach is already efficient.

### 2. **Optimize Weighted Random Selection**

The `getWeightedOption` function recalculates total weight on every call:

```typescript
// Current implementation
const totalWeight = options.reduce((sum, [, weight]) => sum + weight, 0);
```

**Recommendation:** For frequently used weight tables (like syllable counts), pre-compute cumulative weights:

```typescript
// Pre-computed at module initialization
const syllableCountOptions = [
  [1, 5000], [2, 30000], [3, 29700],
  [4, 3000], [5, 200], [6, 50], [7, 5]
];
const syllableCountCumulativeWeights = precomputeCumulativeWeights(syllableCountOptions);

// Fast lookup O(log n) with binary search
function getWeightedOptionFast<T>(options: [T, number][], cumulativeWeights: number[]): T {
  const target = getRand()() * cumulativeWeights[cumulativeWeights.length - 1];
  const index = binarySearch(cumulativeWeights, target);
  return options[index][0];
}
```

### 3. **Reduce Object Creation in Hot Paths**

The `buildCluster` function creates new context objects and arrays in tight loops:

```typescript
// Hot path - called many times per word
const grapheme = chooseGrapheme(
  phoneme,
  position,
  isCluster,
  phonemeIndex === 0,
  phonemeIndex === flattenedPhonemes.length - 1,
  prevPhoneme?.phoneme,
);
```

**Recommendation:** Use object pooling or mutable context objects for frequently created/destroyed objects:

```typescript
// Reuse a single context object per generation
const clusterContext: ClusterContext = {
  position: "onset",
  cluster: [],
  ignore: [],
  isStartOfWord: false,
  isEndOfWord: false,
  maxLength: 0,
  syllableCount: 0,
};

function resetClusterContext(ctx: ClusterContext, position: SyllablePosition, ...): ClusterContext {
  ctx.position = position;
  ctx.cluster.length = 0;
  ctx.ignore.length = 0;
  // ...
  return ctx;
}
```

### 4. **Lazy Initialization for Grapheme Maps**

The ~190 grapheme entries are processed at module load time:

```typescript
// Runs on import - ~190 iterations
for (const position of ["onset", "nucleus", "coda"] as const) {
  for (const grapheme of graphemes) {
    // ...
  }
}
```

**Recommendation:** For applications that import but may not immediately use the library, consider lazy initialization:

```typescript
let _graphemeMaps: GraphemeMaps | null = null;

export function getGraphemeMaps(): GraphemeMaps {
  if (!_graphemeMaps) {
    _graphemeMaps = initializeGraphemeMaps();
  }
  return _graphemeMaps;
}
```

### 5. **Consider Web Worker Support** ✅ (Already Exists)

The demo already uses Web Workers (`unglish-worker.js`). For the main library, consider:

- Exporting a dedicated worker entry point
- Providing batch generation APIs for generating multiple words efficiently

---

## 🛠️ Maintainability Recommendations

### 1. **Split Large Data Files**

`graphemes.ts` is 1,955 lines with 190 entries. Consider splitting by phoneme category:

```
src/elements/
  graphemes/
    index.ts          # Re-exports all, creates maps
    vowels.ts         # i:, ɪ, e, ɛ, æ, etc.
    consonants.ts     # Stops, fricatives, nasals
    diphthongs.ts     # eɪ, aɪ, ɔɪ, etc.
    affricates.ts     # tʃ, dʒ
```

### 2. **Add Data Validation**

Currently, there's no validation that phoneme/grapheme data is correct:

```typescript
// Recommended: Add validation at build time or module load
function validatePhoneme(p: Phoneme, index: number): void {
  if (!p.sound) throw new Error(`Phoneme at index ${index} missing 'sound'`);
  if (p.onset !== undefined && p.onset < 0) {
    throw new Error(`Phoneme '${p.sound}' has negative onset weight`);
  }
  // Validate that at least one position weight exists
  if (p.onset === undefined && p.nucleus === undefined && p.coda === undefined) {
    console.warn(`Phoneme '${p.sound}' has no position weights`);
  }
}

// Run in development mode
if (process.env.NODE_ENV !== 'production') {
  phonemes.forEach(validatePhoneme);
}
```

### 3. **Extract Magic Numbers into Constants**

There are many magic numbers throughout the codebase:

```typescript
// Current
return getWeightedOption([[true, 95], [false, 5]]);
return getWeightedOption([[true, 90], [false, 10]]);
```

**Recommendation:** Create a configuration object:

```typescript
// src/config/weights.ts
export const WEIGHTS = {
  syllableCount: {
    1: 5000,
    2: 30000,
    3: 29700,
    4: 3000,
    5: 200,
    6: 50,
    7: 5,
  },
  hasOnset: {
    wordInitial: { yes: 95, no: 5 },
    afterCoda: { yes: 80, no: 20 },
  },
  hasCoda: {
    monosyllabic: { yes: 80, no: 20 },
    wordFinal: { yes: 90, no: 10 },
    default: { yes: 30, no: 70 },
  },
  // ...
} as const;
```

### 4. **Improve Test Coverage**

Current test coverage focuses on happy paths. Add:

- **Edge cases**: Empty inputs, single-syllable words, maximum syllable counts
- **Determinism tests**: Ensure same seed always produces same output across versions
- **Phonotactic validation**: Test that generated words follow English phonotactics
- **Property-based tests**: Use a library like `fast-check` to generate random inputs

```typescript
import { fc } from 'fast-check';

describe('Property-based tests', () => {
  it('should always produce valid syllable structure', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 7 }), fc.integer(), (syllableCount, seed) => {
        const word = generateWord({ syllableCount, seed });
        return word.syllables.every(s => s.nucleus.length > 0);
      })
    );
  });
});
```

### 5. **Add JSDoc Comments to Public API**

The main export lacks documentation:

```typescript
// Current
export default {
  generateWord,
  random,
  phonemes,
  graphemes,
};

// Recommended
/**
 * @unglish/word-generator - Generate English-sounding nonsense words
 * 
 * @example
 * ```ts
 * import unglish from '@unglish/word-generator';
 * 
 * // Generate a random word
 * const word = unglish.generateWord();
 * console.log(word.written.clean); // e.g., "brondel"
 * 
 * // Generate deterministic words
 * const seeded = unglish.generateWord({ seed: 42 });
 * ```
 */
export default {
  /** Generate a single word with optional configuration */
  generateWord,
  /** Random number generation utilities for seeding */
  random,
  /** Phoneme inventory and maps */
  phonemes,
  /** Grapheme (written form) inventory and maps */
  graphemes,
};
```

---

## 🌍 Modularity Recommendations (Multi-Language Support)

The current architecture is English-centric. Here's how to support other languages:

### 1. **Create a Language Configuration Interface**

```typescript
// src/types/language.ts
export interface LanguageConfig {
  /** Unique identifier (e.g., "en", "es", "ja") */
  id: string;
  
  /** Display name */
  name: string;
  
  /** Phoneme inventory for this language */
  phonemes: Phoneme[];
  
  /** Grapheme mappings */
  graphemes: Grapheme[];
  
  /** Invalid cluster patterns */
  invalidClusters: {
    onset: RegExp[];
    coda: RegExp[];
    boundary: RegExp[];
  };
  
  /** Syllable structure constraints */
  syllableStructure: {
    /** Allowed onset lengths (e.g., [0, 1, 2, 3] for English) */
    onsetLengths: number[];
    /** Allowed coda lengths */
    codaLengths: number[];
    /** Weight distribution for syllable counts */
    syllableCountWeights: [number, number][];
  };
  
  /** Sonority hierarchy mapping */
  sonorityLevels: Map<string, number>;
  
  /** Stress assignment rules */
  stressRules?: StressRules;
}
```

### 2. **Refactor Core Functions to Accept Configuration**

```typescript
// Current (English-only)
export const generateWord = (options: WordGenerationOptions = {}): Word => {
  // Uses hardcoded phonemes, graphemes, etc.
};

// Recommended (language-agnostic)
export const generateWord = (
  options: WordGenerationOptions = {},
  config: LanguageConfig = englishConfig
): Word => {
  // Uses config.phonemes, config.graphemes, etc.
};

// Or use a factory pattern
export function createWordGenerator(config: LanguageConfig) {
  return {
    generateWord: (options?: WordGenerationOptions) => generateWordImpl(options, config),
    generateWords: (count: number, options?: WordGenerationOptions) => { /* ... */ },
  };
}

// Usage
import { createWordGenerator } from '@unglish/word-generator';
import { spanishConfig } from '@unglish/word-generator/languages/spanish';

const spanishGenerator = createWordGenerator(spanishConfig);
const word = spanishGenerator.generateWord();
```

### 3. **Extract English-Specific Data into a Module**

```
src/
  languages/
    index.ts              # Language registry
    english/
      index.ts            # English configuration
      phonemes.ts         # English phoneme inventory
      graphemes.ts        # English grapheme mappings
      clusters.ts         # English phonotactic constraints
      stress.ts           # English stress rules
    spanish/              # Future: Spanish support
    japanese/             # Future: Japanese support
```

### 4. **Support Different Writing Systems**

Some languages use non-Latin scripts. Add support for:

```typescript
export interface GraphemeConfig {
  /** Primary writing system */
  script: 'latin' | 'cyrillic' | 'hiragana' | 'katakana' | 'hangul' | 'arabic';
  
  /** For languages with multiple scripts (e.g., Japanese) */
  alternateScripts?: {
    script: string;
    graphemes: Grapheme[];
  }[];
}
```

### 5. **Create a Plugin System for Custom Phonotactics**

Allow users to extend or modify phonotactic rules:

```typescript
export interface PhonologicalPlugin {
  /** Called before syllable generation */
  beforeSyllable?: (context: WordGenerationContext) => void;
  
  /** Custom cluster validation */
  validateCluster?: (cluster: Phoneme[], position: SyllablePosition) => boolean;
  
  /** Post-process generated word */
  postProcess?: (word: Word) => Word;
}

// Usage
const customPlugin: PhonologicalPlugin = {
  validateCluster: (cluster, position) => {
    // Disallow "ng" at onset (valid for English but explicit)
    if (position === 'onset' && cluster.some(p => p.sound === 'ŋ')) {
      return false;
    }
    return true;
  },
};

generateWord({ plugins: [customPlugin] });
```

### 6. **Consider IPA as the Canonical Representation**

Currently, phonemes use IPA symbols, but graphemes are English-specific. For multi-language support:

```typescript
// Use IPA as the internal representation
interface UniversalPhoneme {
  ipa: string;           // IPA symbol (e.g., "p", "t", "k")
  features: {
    voiced: boolean;
    place: PlaceOfArticulation;
    manner: MannerOfArticulation;
  };
}

// Language-specific grapheme mapping
interface LanguageGrapheme {
  ipa: string;           // What phoneme this represents
  orthography: string;   // How it's written in this language
  // ...
}
```

---

## 📊 Architecture Diagram (Proposed)

```
┌─────────────────────────────────────────────────────────────────┐
│                        @unglish/word-generator                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Language   │    │   Language   │    │   Language   │      │
│  │   English    │    │   Spanish    │    │   Custom     │      │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘      │
│         │                   │                   │               │
│         └───────────────────┼───────────────────┘               │
│                             │                                   │
│                    ┌────────▼────────┐                          │
│                    │  LanguageConfig │                          │
│                    │  - phonemes     │                          │
│                    │  - graphemes    │                          │
│                    │  - constraints  │                          │
│                    └────────┬────────┘                          │
│                             │                                   │
│         ┌───────────────────┼───────────────────┐               │
│         │                   │                   │               │
│  ┌──────▼──────┐    ┌───────▼───────┐   ┌──────▼──────┐        │
│  │  Syllable   │    │  Pronunciation │   │   Written   │        │
│  │  Generator  │    │   Generator    │   │   Form      │        │
│  └─────────────┘    └───────────────┘   └─────────────┘        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐        │
│  │                    Core Utilities                    │        │
│  │  - Weighted random    - Sonority calculations       │        │
│  │  - Seeded RNG         - Cluster validation          │        │
│  └─────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Priority Action Items

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| 🔴 High | Extract magic numbers into config | Low | High |
| 🔴 High | Add JSDoc to public API | Low | High |
| 🟡 Medium | Split graphemes.ts into smaller files | Medium | Medium |
| 🟡 Medium | Add property-based tests | Medium | High |
| 🟡 Medium | Create LanguageConfig interface | Medium | High |
| 🟢 Low | Optimize weighted selection | Medium | Low |
| 🟢 Low | Add data validation | Low | Medium |
| 🟢 Low | Implement lazy initialization | Low | Low |

---

## Conclusion

The codebase is well-structured with good separation of concerns. The main areas for improvement are:

1. **Performance**: Pre-compute weights, reduce object allocation in hot paths
2. **Maintainability**: Split large files, add validation, improve test coverage
3. **Modularity**: Create language configuration system to support non-English languages

The architectural changes for multi-language support would be the highest-impact improvement, enabling the library to generate phonologically plausible words for any language with a defined phoneme inventory.
