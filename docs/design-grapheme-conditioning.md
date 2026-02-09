# Design: Context-Conditioned Grapheme Selection (Issue #10)

## Problem Statement

The grapheme layer picks spellings based on phoneme identity, syllable position (onset/nucleus/coda), and word position (start/mid/end). It has no awareness of:

1. **Adjacent phonemes** — `⟨igh⟩` appears freely but English restricts it to before /t/ ("night", "fight", never *"ighn" or *"ighs")
2. **Syllable boundary context** — consonant doubling fires after any lax vowel, even across syllable boundaries where it's inappropriate
3. **Reduced vowels** — doubling fires after schwa, producing "rekkettayt" instead of natural spelling
4. **Global word constraints** — multiple doublings in one word (13% of output), unusual endings

### Current Error Rates (5000-word sample)

| Issue | Count | Rate |
|-------|-------|------|
| Multiple doublings per word | 652 | 13.0% |
| `⟨igh⟩` in wrong context | ~130 | 2.6% |
| `⟨ough⟩` appearing at all | ~27 | 0.5% |
| Unusual word endings | 235 | 4.7% |

## Taxonomy of Constraints

The rules fall into three fundamentally different categories:

### A. Phonemic Context Conditions (per-grapheme)
"This spelling is only valid when surrounded by certain sounds."

Examples:
- `⟨igh⟩` for /aɪ/ → only before /t/ or word-final
- `⟨tch⟩` for /tʃ/ → only after lax vowels
- `⟨ck⟩` for /k/ → only after lax vowels
- `⟨dge⟩` for /dʒ/ → only after lax vowels
- `⟨c⟩` for /s/ → only before front vowels (soft c)
- `⟨g⟩` for /dʒ/ → only before front vowels (soft g)
- `⟨ti⟩`/`⟨ci⟩`/`⟨si⟩` for /ʃ/ → only before vowels
- `⟨wr⟩` for /r/ → word-initial only
- `⟨kn⟩` for /n/ → word-initial only
- `⟨mb⟩` for /m/ → word-final only

**These are properties of the grapheme itself.** They travel with the grapheme data and are language-specific because each language defines its own grapheme inventory. A French config would have completely different graphemes with different conditions.

### B. Doubling Strategy (language-level orthographic convention)
"How does this language signal vowel length/quality through consonant spelling?"

This is a **writing system strategy**, not a property of individual graphemes:
- English: doubles consonants after short/lax vowels to signal vowel quality
- Italian: doubles to signal actual long consonants (gemination)
- Finnish: doubles both vowels (length) and consonants (gemination)  
- French: doubles inconsistently (mostly etymological)
- Spanish: almost never doubles

**This belongs in the language config** alongside vowel reduction and stress rules.

### C. Post-Selection Spelling Rules (language-level cleanup)
"After we've picked all the graphemes, fix up the result."

Examples:
- No word-final bare `⟨v⟩` → append `⟨e⟩` ("have", "give", not *"hav", *"giv")
- Magic-e: VCe pattern for tense vowels ("bake", "note")
- `⟨ks⟩` → `⟨x⟩` reduction (25% probability)
- No word-final `⟨j⟩` → use `⟨ge⟩`/`⟨dge⟩` instead

**These are regex-like transformations on the written output.** They already partially exist as `reductionRules` in `write.ts` — they just need to be formalized and moved into the config.

## Design

### Part A: GraphemeCondition (per-grapheme context)

```typescript
interface GraphemeCondition {
  /**
   * Left phoneme context filter.
   * If specified, the previous phoneme's sound must be in this list
   * (or match a category shorthand like "lax-vowel", "front-vowel").
   */
  leftContext?: string[];

  /**
   * Right phoneme context filter.
   * If specified, the next phoneme's sound must be in this list.
   */
  rightContext?: string[];

  /** Forbidden left phoneme context. */
  notLeftContext?: string[];

  /** Forbidden right phoneme context. */
  notRightContext?: string[];

  /**
   * Word-position restriction.
   * If specified, this grapheme is only valid in these positions.
   */
  wordPosition?: ("initial" | "medial" | "final")[];
}
```

**Category shorthands** for `leftContext`/`rightContext` to avoid listing every phoneme:
- `"lax-vowel"` → all vowels where `tense === false`
- `"tense-vowel"` → all vowels where `tense === true`
- `"front-vowel"` → vowels with `placeOfArticulation === "front"`
- `"vowel"` → any vowel phoneme
- `"consonant"` → any non-vowel phoneme

These expand at grapheme-map build time, so runtime selection is still a simple Set lookup.

**Selection algorithm change** in `chooseGrapheme()`:
```
1. Filter graphemeList to those whose condition is satisfied (or has no condition)
2. If filter removes ALL options, fall back to unconditioned list
3. Proceed with frequency-weighted selection on filtered list
```

#### Rules to Encode

| Grapheme | Phoneme | Condition |
|----------|---------|-----------|
| `⟨igh⟩` | /aɪ/ | `rightContext: ["t"]` or `wordPosition: ["final"]` |
| `⟨ough⟩` | /oʊ/ | Remove entirely or reduce frequency to ~1 |
| `⟨tch⟩` | /tʃ/ | `leftContext: ["lax-vowel"]` |
| `⟨ck⟩` | /k/ | `leftContext: ["lax-vowel"]` |
| `⟨dge⟩` | /dʒ/ | `leftContext: ["lax-vowel"]` |
| `⟨c⟩` | /s/ | `rightContext: ["front-vowel"]` |
| `⟨c⟩` | /k/ | `notRightContext: ["front-vowel"]` (prevent soft-c misparse) |
| `⟨g⟩` | /dʒ/ | `rightContext: ["front-vowel"]` |
| `⟨ti⟩` | /ʃ/ | `rightContext: ["vowel"]` |
| `⟨ci⟩` | /ʃ/ | `rightContext: ["vowel"]` |
| `⟨si⟩` | /ʃ/ | `rightContext: ["vowel"]` |
| `⟨wr⟩` | /r/ | `wordPosition: ["initial"]` |
| `⟨kn⟩` | /n/ | `wordPosition: ["initial"]` |
| `⟨mb⟩` | /m/ | `wordPosition: ["final"]` |
| `⟨wh⟩` | /w/ | `wordPosition: ["initial"]` |

### Part B: DoublingConfig (language-level)

```typescript
interface DoublingConfig {
  /** Master switch */
  enabled: boolean;

  /**
   * What triggers doubling.
   * - "lax-vowel": double after lax/short vowels (English)
   * - "gemination": double to represent long consonants (Italian, Finnish)
   * - "none": no systematic doubling
   */
  trigger: "lax-vowel" | "gemination" | "none";

  /** Base probability (0-100) when trigger condition is met. */
  probability: number;

  /** Max doubled consonants per word. */
  maxPerWord: number;

  /** IPA sounds that never double. */
  neverDouble: string[];

  /**
   * Word-final doubling restricted to these sounds only.
   * English: ["f", "s", "l", "z"] (staff, lass, tall, buzz).
   * If empty/undefined, word-final doubling uses the same rules as elsewhere.
   */
  finalDoublingOnly?: string[];

  /** Suppress doubling after vowels that were reduced (schwa substitution). */
  suppressAfterReduction: boolean;

  /** Suppress doubling when the next nucleus is tense or a diphthong. */
  suppressBeforeTense: boolean;

  /**
   * Probability modifier for unstressed syllable context (0.0-1.0).
   * Applied multiplicatively to base probability.
   */
  unstressedModifier?: number;
}
```

**English config:**
```typescript
doubling: {
  enabled: true,
  trigger: "lax-vowel",
  probability: 80,
  maxPerWord: 1,
  neverDouble: ["v", "w", "j", "h", "ŋ", "θ", "ð", "ʒ"],
  finalDoublingOnly: ["f", "s", "l", "z"],
  suppressAfterReduction: true,
  suppressBeforeTense: true,
  unstressedModifier: 0.5,
}
```

**Italian config (hypothetical):**
```typescript
doubling: {
  enabled: true,
  trigger: "gemination",
  probability: 100,
  maxPerWord: 3,
  neverDouble: [],
  suppressAfterReduction: false,
  suppressBeforeTense: false,
}
```

**French config (hypothetical):**
```typescript
doubling: {
  enabled: false,
  trigger: "none",
  // ... rest irrelevant
}
```

### Part C: SpellingRules (language-level post-processing)

```typescript
interface SpellingRule {
  /** Human-readable name for debugging. */
  name: string;
  /** Regex pattern to match in the written form. */
  pattern: string;
  /** Regex flags (default: "g"). */
  flags?: string;
  /** Replacement string (can use $1, $2 capture groups). */
  replacement: string;
  /** Probability (0-100) of applying when matched. Default: 100. */
  probability?: number;
}
```

**English config:**
```typescript
spellingRules: [
  {
    name: "magic-e",
    pattern: "([aiouy])e([bcdfghjklmnpqrstvwxyz])$",
    replacement: "$1$2e",
    probability: 98,
    comment: "Move trailing 'e' after single final consonant: VeC → VCe (bake, note)",
  },
  {
    name: "ks-to-x",
    pattern: "(?<!^)ks",
    replacement: "x",
    probability: 25,
  },
  {
    name: "no-final-v",
    pattern: "v$",
    replacement: "ve",
    probability: 95,
  },
  {
    name: "no-final-j",
    pattern: "j$",
    replacement: "ge",
    probability: 95,
  },
  {
    name: "no-final-i",
    pattern: "i$",
    replacement: "y",
    probability: 95,
  },
]
```

This replaces the hardcoded `reductionRules` array in `write.ts`.

### Integration with LanguageConfig

```typescript
interface LanguageConfig {
  // ... existing fields ...

  /** Vowel reduction (merged in PR #37) */
  vowelReduction?: VowelReductionConfig;

  /** Consonant doubling strategy */
  doubling?: DoublingConfig;

  /** Post-selection spelling adjustments */
  spellingRules?: SpellingRule[];

  // Note: GraphemeCondition lives on individual Grapheme objects
  // in graphemeMaps, not here. Each language's grapheme inventory
  // carries its own conditions.
}
```

## Implementation Plan

### Commit 1: Infrastructure
- Add `GraphemeCondition` to `types.ts`
- Add `DoublingConfig` and `SpellingRule` to `language.ts`
- Add `reduced?: boolean` to `Phoneme` type
- Set `reduced = true` in `pronounce.ts` during vowel reduction

### Commit 2: Doubling Reform (Phase 1)
- Add `DoublingConfig` to `englishConfig`
- Refactor `chooseGrapheme()` doubling logic into `shouldDoubleConsonant()`
- Wire up all doubling constraints
- Move `reductionRules` to `spellingRules` in config

### Commit 3: Context Conditioning (Phase 2)
- Add `condition` field to priority graphemes (the 15 rules from Part A table)
- Add `meetsCondition()` filter to `chooseGrapheme()`
- Expand category shorthands at build time

### Testing
- Existing phonotactic regression gate
- New: generate 1000 words with fixed seed, assert:
  - Multiple-doubling rate < 3% (down from 13%)
  - Zero `⟨igh⟩` violations
  - Zero `⟨ough⟩` appearances
  - No word-final bare `⟨v⟩`
- Before/after error rate comparison
