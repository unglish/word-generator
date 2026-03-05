# Issue #15 — Morphophonemic Alternations (In Progress)

## Plan

- [x] Add typed morphophonemic rule config + validation plumbing (`language.ts` + tests).
- [x] Implement alternation engine in morphology attachment (`attach.ts`) with deterministic rule ordering.
- [x] Extend trace payload to include fired alternation evidence.
- [x] Add initial English alternation rules for `-ity` family.
- [x] Add focused unit/integration tests for alternation behavior and trace evidence.
- [x] Run targeted + project-level test suites (`attach`, `trace`, config, full `npm test`).
- [ ] Commit in atomic logical steps and push branch.

## Review (to fill after implementation)

- Status: In progress.
- Notes: Implemented config/runtime/test changes; full suite passing; atomic commits created.

---

# Word Generation Performance ROI — Completed

## Summary

Identified and implemented two high-ROI optimizations to the word generation hot path, yielding **~21% throughput improvement** (5163 → ~6260 words/sec).

## Changes Implemented

### 1. Attested cluster prefix lookup (O(n) → O(1))

**Problem:** `isValidCandidate` and `shouldStopClusterGrowth` used `Array.from(rt.attestedOnsetSet).some(a => a.startsWith(key + "|"))` — O(n) over ~25 onset / ~60 coda entries per candidate phoneme during cluster building.

**Fix:** Reused the existing `attestedOnsetPrefixSet` and `attestedCodaPrefixSet` (built at runtime from proper prefixes). Replaced `.some()` with `Set.has(key)` — O(1) lookup.

**Files:** `src/core/generate.ts` (4 call sites)

### 2. Phoneme-by-sound Map

**Problem:** `config.phonemes.find(p => p.sound === sound)` — O(n) linear search over ~45 phonemes, used in:
- Nasal stop extension (n→d, m→b, ŋ→g)
- Final /s/ append
- Vowel hiatus bridge options

**Fix:** Added `phonemeBySound: Map<string, Phoneme>` to `GeneratorRuntime`, built once at config load. Replaced `.find()` with `Map.get()` — O(1) lookup.

**Files:** `src/core/generate.ts`

## Verification

- All tests pass (`npm test`)
- Perf gate passes (`npm run test:perf`)
- Throughput: ~5163 → ~6260 words/sec (measured 3 runs: 6171, 6339, 6281)

## Future Opportunities (not implemented)

- **RNG reuse for `generateWords`:** When calling `generateWord({ seed: i })` in a loop, each call creates a new `createSeededRng(i)`. Recommend `generateWords(n, { seed })` for batch use.
- **getWeightedOption pre-compute:** For static weight arrays, total could be cached — but arrays are usually small (2–10 items), so ROI is low.
- **pronounce.ts / morphology/attach.ts:** Same `phonemes.find` pattern exists; could pass `phonemeBySound` if those paths become hot.
