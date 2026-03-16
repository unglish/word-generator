# Lint Remediation — In Progress

## Plan

- [x] Run `eslint --fix` across `src/**/*.ts`.
- [x] Manually resolve remaining lint violations (`no-unused-vars`, residual indent/quotes).
- [x] Re-run `npm run lint` until clean.
- [x] Re-run targeted tests impacted by lint edits.
- [x] Commit and push lint-only fix.

## Review (to fill after implementation)

- Status: Completed.
- Notes: Lint passes with `npm run lint`; targeted regression tests pass.

---

# Issue #15 — Morphophonemic Alternations (In Progress)

## Plan

- [x] Add typed morphophonemic rule config + validation plumbing (`language.ts` + tests).
- [x] Implement alternation engine in morphology attachment (`attach.ts`) with deterministic rule ordering.
- [x] Extend trace payload to include fired alternation evidence.
- [x] Add initial English alternation rules for `-ity` family.
- [x] Add focused unit/integration tests for alternation behavior and trace evidence.
- [x] Run targeted + project-level test suites (`attach`, `trace`, config, full `npm test`).
- [x] Commit in atomic logical steps and push branch.

## Review (to fill after implementation)

- Status: Completed.
- Notes: Implemented config/runtime/test changes; full suite passing; atomic commits pushed to remote branch.

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

---

# Critical Bug Inspection — 2026-03-15 (In Progress)

## Plan

- [x] Inspect recent high-blast-radius commits (`perf`, generation core, persistence/config movement) and shortlist risky behavioral changes.
- [x] Trace each shortlisted change through caller chains to confirm or reject concrete critical failure scenarios.
- [x] If a critical bug is confirmed, implement a minimal fix and add regression tests.
- [x] Run targeted and relevant full tests to validate the fix and avoid regressions.
- [x] Commit and push audit results (and fix if needed) to `cursor/critical-bug-inspection-60bf`.

## Review (to fill after implementation)

- Status: Completed.
- Notes: Found deterministic ENOENT crashes in CMU analysis scripts after durable baseline move removed implicit `memory/` directory from clean checkouts. Fixed by creating `memory/` recursively before report writes in all affected scripts; validated with `npm run build`, reduced-size `analyze:trigrams`/`analyze:phonemes`, and full `scripts/underrep-baseline.ts` run from a clean `memory/` state.

# Critical Bug Inspection — 2026-03-16 (In Progress)

## Plan

- [ ] Inspect recent commits for high-blast-radius behavioral changes.
- [ ] Trace affected runtime paths for concrete crash/data-loss/security triggers.
- [ ] Validate suspected issues with focused reproduction (tests or executable scenario).
- [ ] Implement minimal fix and tests only if severity is critical and confirmed.
- [ ] Run verification (targeted tests and relevant full checks), then summarize findings.

## Review (to fill after implementation)

- Status: In progress.
- Notes: Pending investigation results.
