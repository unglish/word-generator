# "whu" Pattern Constraint Verification

**Date:** 2026-02-15
**Commit:** 744a5fe
**Branch:** fix/mf-cluster

## Problem
The pattern "whu" was appearing 82 times per 100k words (117× over-represented vs CMU Dictionary baseline of 0.7 per 100k).

## Solution Implemented

### 1. /w/ → "wh" Grapheme (glides.ts)
Added `notRightContext` constraint to block u-type vowels:
```typescript
{
  phoneme: "w",
  form: "wh",
  condition: {
    wordPosition: ["initial"],
    notRightContext: ["u", "ʊ", "ʌ", "ə", "ɚ", "ɜ", "ʊə", "aʊ", "aʊə", "əʊ", "əʊə"]
  }
}
```

**Rationale:** Blocks patterns like:
- "whur" (/wɚ/ - w + r-colored schwa)
- "whut" (/wʌ/ - w + short u)
- "whoo" (/wu/ - w + long u)

### 2. /h/ → "wh" Grapheme (fricatives.ts)
Restricted `rightContext` and reduced frequency:
```typescript
{
  phoneme: "h",
  form: "wh",
  frequency: 0.1,  // Very low (was 1)
  condition: {
    rightContext: ["əʊ", "o", "ɔ"]  // Only for "whole", "whore" patterns
  }
}
```

**Rationale:** 
- Removed "u" and "ʊ" from allowed vowels
- Prevents /hʊ/ → "whu" (like "whut")
- Preserves legitimate patterns: "whole" (/həʊl/), "whore" (/hɔ:/)

## Test Results (100k words)

### Before Fix
- **whu count:** 82 instances
- **Pattern:** 117× over-represented vs CMU baseline (0.7/100k)

### After Fix
- **whu count:** 11 instances
- **Reduction:** 87% (from 82 to 11)
- **Over-representation:** Reduced from 117× to ~16×

### Valid "wh" Patterns Still Generated
Sample of words starting with "wh" (100k sample):
- whotho, whakeen, whaditee, wheditesh, wheathitokeald
- whatid, whenotoa, whivala, whapurn, whetew
- whekay, wheithele, whadetreen

**Pattern categories verified:**
- ✅ "wha" patterns (what-like)
- ✅ "whe" patterns (when-like, where-like)
- ✅ "whi" patterns (white-like, which-like)
- ✅ "who" patterns (who-like)
- ✅ Total wh- words: 589 in 100k (~0.6%)

## Remaining "whu" Instances

The remaining 11 instances are primarily mid-word occurrences where the constraint doesn't apply (e.g., "howhue" = /həʊ.hu/). These are edge cases that would require more complex syllable-boundary-aware constraints.

## Impact Summary

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| whu per 100k | 82 | 11 | -87% |
| Over-representation | 117× | ~16× | -86% |
| Valid wh- words | ~600 | 589 | -2% (negligible) |

**Conclusion:** Successfully eliminated the majority of "whu" over-representation while preserving valid "wh" spelling patterns. The constraint effectively blocks u-type vowels after /w/ when using the "wh" grapheme.
