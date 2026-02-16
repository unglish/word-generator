# Nucleus-Coda Prevention Refactor

**Date:** 2026-02-16  
**Branch:** fix/mf-cluster  
**Type:** Refactoring (repair → prevention)

## Summary

Refactored the rhotic vowel + /ŋ/ constraint from a **repair-based** approach (post-generation cleanup) to a **prevention-based** approach (filtering during coda selection). This creates a reusable pattern for future nucleus+coda phonotactic constraints.

## Problem

Previously, the constraint preventing /ɚŋ/ and /ɝŋ/ combinations was implemented as a post-generation repair function (`repairRhoticVowelNgCoda`) that:
1. Generated syllables without awareness of nucleus+coda compatibility
2. Scanned all syllables after generation
3. Removed /ŋ/ from codas following rhotic vowels

This was inefficient and architecturally inconsistent with other phonotactic constraints (e.g., banned codas, cluster weights).

## Solution

Moved the constraint to **coda selection time** by:

1. **Adding config interface** (`src/config/language.ts`):
   - New field in `CodaConstraints`: `bannedNucleusCodaCombinations`
   - Specifies nucleus+coda pairs that are phonotactically illegal
   - Flexible structure supports multiple nucleus sounds × multiple coda sounds

2. **Adding runtime data structure** (`src/core/generate.ts`):
   - `bannedNucleusCodaMap: Map<string, Set<string>>` in `GeneratorRuntime`
   - Built once at initialization for O(1) lookup during coda selection

3. **Passing nucleus context to coda builder** (`src/core/generate.ts`):
   - Modified `ClusterContext` interface to include optional `nucleus?: Phoneme[]`
   - Updated `pickCoda()` to pass `newSyllable.nucleus` when building codas
   - Modified `isValidCandidate()` to check `bannedNucleusCodaMap` before selecting coda phonemes

4. **Removing repair function** (`src/core/repair.ts`):
   - Deleted `repairRhoticVowelNgCoda()` implementation
   - Left explanatory comment pointing to new prevention-based approach
   - Removed from repair pipeline in `generate.ts`

## Configuration

```typescript
// src/config/english.ts
codaConstraints: {
  // ... existing constraints ...
  bannedNucleusCodaCombinations: [
    {
      nucleus: ["ɚ", "ɝ"],  // Rhotic vowels
      coda: ["ŋ"],           // Velar nasal
    },
  ],
}
```

## Testing

Generated 50,000-word sample with verification script:
- **Result:** 0 instances of /ɚŋ/ or /ɝŋ/
- **Conclusion:** Prevention-based constraint is working correctly

Test script: `scripts/test-rhotic-ng.mjs`

## Benefits

1. **Performance:** Prevents generation of illegal combinations instead of fixing after the fact
2. **Consistency:** Aligns with existing prevention-based constraints (bannedCodas, clusterWeights)
3. **Maintainability:** Single source of truth in config (no dual repair + prevention logic)
4. **Reusability:** Pattern can be extended to other nucleus+coda constraints (e.g., vowel length + coda voicing)
5. **Clarity:** Constraint is declared in config alongside other phonotactic rules

## Implementation Details

### Nucleus-Aware Filtering in `isValidCandidate()`

```typescript
// Reject coda phonemes banned after the current nucleus
if (context.position === "coda" && context.nucleus && rt.bannedNucleusCodaMap) {
  // Check each nucleus phoneme (typically just one, but could be complex nucleus)
  for (const nuc of context.nucleus) {
    const bannedCodas = rt.bannedNucleusCodaMap.get(nuc.sound);
    if (bannedCodas?.has(p.sound)) {
      return false;
    }
  }
}
```

### Runtime Map Construction

```typescript
const bannedNucleusCodaMap = config.codaConstraints?.bannedNucleusCodaCombinations
  ? (() => {
      const map = new Map<string, Set<string>>();
      for (const { nucleus, coda } of config.codaConstraints.bannedNucleusCodaCombinations) {
        for (const n of nucleus) {
          if (!map.has(n)) map.set(n, new Set());
          for (const c of coda) {
            map.get(n)!.add(c);
          }
        }
      }
      return map;
    })()
  : undefined;
```

## Future Applications

This pattern can be extended to other nucleus+coda constraints:

- **Vowel length + geminate consonants** (some languages disallow long vowels before long consonants)
- **High vowels + lateral codas** (language-specific phonotactic gaps)
- **Stressed vowel + specific coda clusters** (e.g., prevent certain clusters after stressed schwa)

## Files Changed

- `src/config/language.ts` — Added `bannedNucleusCodaCombinations` to `CodaConstraints`
- `src/config/english.ts` — Configured rhotic vowel + /ŋ/ constraint
- `src/types.ts` — Added `nucleus?: Phoneme[]` to `ClusterContext`
- `src/core/generate.ts` — Added runtime map, nucleus-aware filtering, removed repair call
- `src/core/repair.ts` — Removed `repairRhoticVowelNgCoda()` function

## Commit Message

```
refactor: move rhotic vowel + /ŋ/ constraint to prevention-based

Replace post-generation repair function with nucleus-aware coda filtering
during cluster building. Adds bannedNucleusCodaCombinations config pattern
for reusable nucleus+coda constraints.

- Add CodaConstraints.bannedNucleusCodaCombinations config field
- Add bannedNucleusCodaMap to GeneratorRuntime
- Pass nucleus context to coda builder via ClusterContext
- Filter banned combinations in isValidCandidate()
- Remove repairRhoticVowelNgCoda() from repair pipeline

Tested: 50k sample, 0 /ɚŋ/ or /ɝŋ/ instances
```
