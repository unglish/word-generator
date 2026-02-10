# Design: Deterministic RNG + Quality DX

**Issues:** #33 (per-generator RNG), #36 (race condition), plus quality workflow improvements.

**Goal:** Make word generation fully deterministic per-call, speed up the dev feedback loop, and keep CI gates reliable.

---

## Part 1: Per-Generator RNG (#33, #36)

### Problem

The current RNG is a global mutable singleton (`src/utils/random.ts`):

```ts
let rand = defaultRand;
export const getRand = () => rand;
export const overrideRand = (fn) => { rand = fn; };
```

Every call to `generateWord({ seed })` does:
1. Saves current global RNG
2. Overrides global with seeded RNG
3. Generates word (all internal code calls `getRand()`)
4. Restores previous RNG in a `finally` block

**Problems:**
- Not thread-safe — concurrent calls corrupt each other's state
- Upstream repairs shift seed progression, changing downstream metrics (we saw this: #78 merged → rengTeng count changed from 75 to 111)
- Quality gates need wide margins to absorb seed drift
- Can't test changes in isolation

### Proposed Design

**A. `GeneratorContext` with scoped RNG**

```ts
// src/utils/random.ts
export interface RNG {
  (): number;  // returns [0, 1)
}

// Mulberry32 — excellent distribution, 4 lines, 32-bit state
export function createSeededRng(seed: number): RNG {
  let t = seed | 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 2 ** 32;
  };
}

export function createDefaultRng(): RNG {
  return () => Math.random();
}
```

**B. Add `rand` to existing `WordGenerationContext`**

The existing `WordGenerationContext` is already threaded through the entire pipeline. Just add the RNG field — no new types, no signature changes:

```ts
// src/types.ts — existing interface, one field added
export interface WordGenerationContext {
  rand: RNG;               // ← NEW: per-word RNG instance
  word: Word;
  syllableCount: number;
  currSyllableIndex: number;
}
```

`GeneratorRuntime` (config, phonemes, caches) stays separate — it's shared across all words. `WordGenerationContext` is per-word, and the RNG belongs there.

**C. `generateWord` accepts seed OR custom RNG**

```ts
export interface GenerateOptions {
  seed?: number;
  rand?: RNG;            // custom RNG — takes priority over seed
  syllableCount?: number;
  // ...existing options
}

export function generateWord(options: GenerateOptions = {}): Word {
  const rand = options.rand
    ?? (options.seed !== undefined ? createSeededRng(options.seed) : createDefaultRng());
  
  const ctx: GeneratorContext = {
    rand,
    word: { syllables: [], pronunciation: '', written: { clean: '', hyphenated: '' } },
    syllableCount: options.syllableCount || 0,
    currSyllableIndex: 0,
  };
  
  runPipeline(runtime, ctx);
  return ctx.word;
}
```

**D. `generateWords` batch API — shares a single RNG instance**

```ts
export function generateWords(count: number, options: GenerateOptions = {}): Word[] {
  const rand = options.rand
    ?? (options.seed !== undefined ? createSeededRng(options.seed) : createDefaultRng());
  
  const results: Word[] = [];
  for (let i = 0; i < count; i++) {
    const ctx: GeneratorContext = {
      rand,  // shared — each word advances the same RNG state
      word: { syllables: [], pronunciation: '', written: { clean: '', hyphenated: '' } },
      syllableCount: options.syllableCount || 0,
      currSyllableIndex: 0,
    };
    runPipeline(runtime, ctx);
    results.push(ctx.word);
  }
  return results;
}
```

With a shared RNG, `generateWords(100, { seed: 42 })` is deterministic AND more efficient than 100 individual calls (no per-call RNG setup overhead).

**E. Deprecate global RNG**

- Keep `getRand`/`overrideRand`/`resetRand` exports but mark deprecated
- Internal code uses `ctx.rand` exclusively
- Remove global state after one minor version

### Migration Strategy

The RNG is called in ~15 locations via the `g()` (weighted random choice) helper and a few direct `getRand()()` calls. The change is mechanical:

1. Add `rand` parameter to `g()`: `g(choices, rand)`
2. Pass `ctx.rand` through all pipeline functions
3. Update `createWrittenFormGenerator` to accept RNG (it's a closure — thread through)
4. Update repair functions, stress assignment, pronunciation
5. Remove global RNG usage

**Estimated touch:** ~8 files, ~40 call sites. No logic changes — purely threading a parameter.

### Determinism Guarantee

After this change:
- `generateWord({ seed: 42 })` produces the **exact same word** regardless of what other code runs before/after
- Quality gates become fully deterministic — no more CI seed variance
- Gate thresholds can be tightened to exact expected values

---

## Part 2: Quick-Check Script

### Problem

Testing a fix currently requires running the full 200k quality suite (~17s). During iteration, you want sub-second feedback.

### Proposed: `npm run check`

A lightweight script that generates 10k words and prints pattern counts:

```ts
// scripts/check.ts
import { generateWord } from '../src/core/generate.js';

const N = 10_000;
const words: string[] = [];
for (let i = 0; i < N; i++) {
  words.push(generateWord({ seed: i }).written.clean.toLowerCase());
}

const patterns = {
  'dk': (w: string) => w.includes('dk'),
  'bk': (w: string) => w.includes('bk'),
  'pk': (w: string) => w.includes('pk'),
  'ckt': (w: string) => w.includes('ckt'),
  'ngx': (w: string) => w.includes('ngx'),
  'owngs': (w: string) => /owngs/.test(w),
  'reng/teng': (w: string) => /[rt]eng$/.test(w),
  '5+cons': (w: string) => longestConsonantRun(w) >= 5,
  '4+cons': (w: string) => longestConsonantRun(w) >= 4,
};

console.log(`\n  Quick Check (${N.toLocaleString()} words)\n`);
for (const [name, test] of Object.entries(patterns)) {
  const count = words.filter(test).length;
  const pct = (count / N * 100).toFixed(3);
  const bar = '█'.repeat(Math.min(count, 40));
  console.log(`  ${name.padEnd(12)} ${String(count).padStart(5)}  (${pct}%)  ${bar}`);
}
```

**Usage:** `npm run check` → ~1s, prints a dashboard.

**package.json:**
```json
"check": "npx tsx scripts/check.ts"
```

### Pattern Registry

Both `check` and `quality.test.ts` should share the same pattern definitions to avoid drift. Extract to `src/core/quality-patterns.ts`:

```ts
export const QUALITY_PATTERNS = {
  dk: (w: string) => w.includes('dk'),
  bk: (w: string) => w.includes('bk'),
  // ...
};
```

Both scripts import from there. Add a new pattern once, it shows up everywhere.

---

## Part 3: Streamline CI Quality Suite

### Current State
- 5×200k common word trials: ~80s (interesting but not actionable as a gate)
- 200k hard gates + metrics: ~17s
- Total: ~95s per PR

### Proposed
- **Remove common word trials from CI.** Move to a separate `npm run bench:words` for manual/periodic use.
- **Keep 200k gates in CI.** These are the actual quality safety net.
- **CI time: ~17s** (down from ~95s)

### Updated vitest.quality.config.ts

Just remove the trial tests from the CI include, or gate them behind an env var:

```ts
const TRIALS = process.env.WORD_TRIALS ? parseInt(process.env.WORD_TRIALS) : 0;
```

CI runs with `WORD_TRIALS=0` (gates only), manual runs with `WORD_TRIALS=5`.

---

## Implementation Plan

### Phase 1: Per-Generator RNG (1-2 sessions)
1. Create `RNG` interface + Mulberry32 factory (`createSeededRng`)
2. Add `rand` to `GeneratorContext`
3. Update `g()` helper to accept `rand` parameter
4. Thread `rand` through pipeline (~8 files, ~40 call sites)
5. Update `createWrittenFormGenerator` closure
6. Add `rand?: RNG` to `GenerateOptions` (custom RNG in public API)
7. Add `generateWords(count, options)` batch API with shared RNG
8. Deprecate global RNG exports
9. Verify: `generateWord({ seed: 42 })` identical across runs
10. Verify: `generateWords(100, { seed: 42 })` deterministic
11. Tighten quality gate thresholds to exact values

### Phase 2: Quality DX (1 session)
1. Extract shared pattern registry
2. Create `scripts/check.ts`
3. Add `npm run check` to package.json
4. Gate common word trials behind env var
5. Update CI to skip trials

### Phase 3: Cleanup
1. Remove deprecated global RNG (next minor version)
2. Update docs
3. Close #33, #36

---

## Risk Assessment

- **Phase 1 is mechanical but wide.** Touching 8 files with ~40 call sites. Low logic risk but high merge-conflict risk if other PRs are in flight. Should be done on a clean main with no concurrent work.
- **Phase 2 is low risk.** Additive only.
- **Determinism change will shift all quality numbers.** Every gate threshold will need re-baselining after Phase 1. Plan for this.

---

## Resolved Questions

1. **RNG algorithm:** ✅ **Mulberry32** — 4 lines, excellent distribution, replaces `Math.sin()` hack.
2. **Public API:** ✅ **Yes** — `generateWord({ rand: myCustomRng })` accepts any `() => number` function. Custom RNG takes priority over `seed`.
3. **Batch generation:** ✅ **Yes** — `generateWords(count, options)` shares a single RNG instance across all words in the batch. Deterministic and efficient.
4. **Context type:** ✅ **Extend `WordGenerationContext`** — add `rand: RNG` to the existing interface. No new wrapper type. `GeneratorRuntime` stays separate (shared config vs per-word context).
5. **Gate tightening:** ✅ **Separate follow-up PR** (#81) after RNG migration lands. Don't mix plumbing with thresholds.

## Implementation Notes (from review)

- **`getWeightedOption` is highest-fanout** — tackle first, add `rand` param, everything else follows
- **`write.ts` closures** — `applySpellingRules` uses `getRand()()` inside `replace()` callbacks. Thread `rand` through closure scope carefully.
- **Document API subtlety:** `generateWords(50, { seed: 42 })` ≠ calling `generateWord({ seed: 42 })` 50 times (latter creates 50 identical streams). JSDoc this.
- **Document `rand` + `seed` together:** seed silently ignored when `rand` provided. JSDoc note.
- **Quick-check script:** use `generateWords(10_000, { seed: 1 })` (batch API, seed 1 not 0)
