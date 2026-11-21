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

- [x] Inspect recent commits for high-blast-radius behavioral changes.
- [x] Trace affected runtime paths for concrete crash/data-loss/security triggers.
- [x] Validate suspected issues with focused reproduction (tests or executable scenario).
- [x] Implement minimal fix and tests only if severity is critical and confirmed.
- [x] Run verification (targeted tests and relevant full checks), then summarize findings.

## Review (to fill after implementation)

- Status: Completed.
- Notes: Fixed critical morphology planning crash by validating template-weight/affix-inventory consistency; added regression tests and verified via `npm test -- src/config/language.test.ts` and `npm test -- src/core/generate.test.ts`.

---

# Issue #432 — Morphophonemic cluster legality (Completed)

## Plan

- [x] Inventory morphology alternation path; reuse archive/pr-355 guard semantics.
- [x] Add morphology-local projection + cluster-legality guard (no generate.ts rewrite).
- [x] Wire atomic reject/skip into prepareMorphophonemicRules + written halves.
- [x] Enable `morphophonemicPolicy.preserveClusterLegality` for English.
- [x] Port focused unit + integration tests.
- [x] Run full suite + lint; open PR.

## Review

- Status: Completed.
- Notes: `/sk/→/ss/` before `-ity` is rejected atomically; later ordered rules still run; generate.ts untouched. Full `npm test` (1061) and lint pass.

---

# Issue #459 — ey/ay open-syllable only (Completed)

## Plan

- [x] Measure before counts (seeds 1000000–1019999)
- [x] Restrict ay/ey with `syllableShape: { coda: "empty" }`
- [x] License closed-final `ai` + closed-final `ae` before one coda consonant (magic-e → `a_e`)
- [x] Document /s|/z/ ban; update grapheme-selection.md
- [x] Add seeded + distribution tests; golden:update
- [x] Run check, build, quality:pr; commit and push

## Review

- Status: Completed.
- Decision: existing `syllableShape.coda: "empty"`; /s|/z/ root coda disallowed.
- Target pattern before→after on 1000000–1019999: ey before non-sibilant coda 142→0, ay 281→0; before s/z 17+32→0.
- Review fix: a bare closed-final `a` read /æ/ (bepan, 362 words); now `ae` (one coda consonant, split to `a_e`) or `ai` (clusters).
- Review fix: `ai` keeps no coda condition, so monosyllables still reach `ay` via open `ai` + no-final-i (flaying, not flaing).
- quality:pr: lexicon-default trigram JS +0.0009 bits; no invariant regressions; FOOT /ʊ/ mono +0.38 pp (noise).

---

# Issue #458 — consonant + y → i before non-i suffixes (Completed)

## Plan

- [x] Capture before counts on seeds 1000000–1019999
- [x] Wire `Y_TO_I` into every non-`i`-initial suffix; keep y for i-initial suffixes
- [x] Extend boundary transforms so C+y + `-s` yields `-ies` via `affixWritten: "es"`
- [x] Add seeded regression tests + large-sample distribution test
- [x] `npm run golden:update` (no fixture change); `npm run check`; `npm run build`
- [x] `npm run quality:pr`; gather before/after traces
- [x] Commit and push current branch only; run outsource measurement script

## Review

- Status: Completed.
- Notes: True C+y before non-i suffixes on the issue window went 245+115 → 0 (surface Cy leftovers are `/aɪ/` `ye` + drop-e). Golden fixture unchanged. `npm run check` and `npm run build` pass.

---

# Gate noise — phoneme total variation and mono `aw` cluster bound (Completed)

## Plan

- [x] `npm run calibrate:phonemes -- --jobs 3` on main 81df038c (30 streams)
- [x] `maxTotalVariationPct` 1.78 → 1.88 (worst 1.7714 + 3 × SD 0.0342, rounded outward); other limits unchanged
- [x] Mono `aw`-before-cluster bound: 30 seed triples on main → mean 0.58%, SD 0.22%, worst 0.94%; bound 1% → 1.6%
- [x] `npm run check`

## Review

- Status: Completed.
- Notes: Both limits sat about 0.3 SD above main's worst case, so spelling-only branches that only reshuffle RNG draws failed them (TV 1.7825 on seed 42; `aw` 1.07%). No generator change.

---

# #459 follow-up — closed `ae` before an e-final or vowel-final coda spelling (Completed)

## Plan

- [x] Find closed `ae` syllables no syllable rule rewrites (100k seeds from 5000000): 17, all codas spelled `ge`, `ce` or `nge`, plus `ssi` seen in a shifted sample
- [x] `ae-before-e-coda`: drop the digraph's `e` before a one-consonant coda spelled with a final `e` (`ge`, `ce`, `gue`) or `nge` (`ataege` → `atage`, `snaenge` → `snange`); other clusters take `ai` (`faelse` → `failse`, not *false*)
- [x] `ae-unsplit-to-ai`: let the role-checked coda group end in a vowel letter (`ezaessier` → `ezaissier`)
- [x] Search-based test; `npm run golden:update` (unchanged); `npm run check`

## Review

- Status: Completed.
- Notes: Closed `ae` that no syllable rule rewrote, 100k seeds from 5000000: 17 → 0 (9 of the 17 still showed `ae` on the surface; silent-e or suffix e-drop had fixed the rest). 100k seeds from 6000000: 17 words change, 13 spelling-only (all better on the trigram scorer) and 4 different words from length-rejection resampling.

---

# Issue #471 — /ɚ/ `re` only in an open final syllable (Completed)

## Plan

- [x] Measure before counts (seeds 2000000–2019999)
- [x] Add `syllableShape: { coda: "empty" }` and `midWord: 0` to /ɚ/ → `re`
- [x] Add seeded + distribution tests; update grapheme-selection.md

## Review

- Status: Completed.
- /ɚ/ `re` before a same-syllable coda (or mid-word) 186 → 0 words; open word-final `re` 38 → 33 and open before a suffix 39 → 38 (other spellings take its share of the RNG-shifted words).

---

# Issue #472 — /aɪ/ `ie` needs an onset (Completed)

## Plan

- [x] Measure before counts (seeds 2000000–2019999)
- [x] Require an onset for /aɪ/ → `ie`; restrict /aɪ/ → `is` to an onsetless /aɪ/ before /l/; lower `eye` `startWord` 2 → 1
- [x] Add seeded + distribution tests; update grapheme-selection.md

## Review

- Status: Completed.
- Words starting with `ie` 68 → 1 (the /i:/ `iend`); onsetless /aɪ/ `ie` 124 → 0 words; /aɪ/ `is` not before /l/ 31 → 0. On 100k seeds, root-initial onsetless /aɪ/ is now `i` 89%, `eye` 9%, `is` 1% word-initially (main: `ie` 44%, `i` 44%, `eye` 7%, `is` 5%) and `i` 87%, `eye` 12% after a prefix; `is` after an onset 101 → 0.
- Rejected: an onsetless `ie` kept before one coda consonant for magic-e (*ice*). About 25 of its 43 initial uses put magic-e's `e` before a vowel letter (`iseiloo`), and dropping it scored better on the trigram model (42 words: −2.830 → −2.745, 24 better / 18 worse).

---

# Issue #473 — /ɔɪ/ `oy` open-syllable only (Completed)

## Plan

- [x] Measure before counts (seeds 2000000–2019999)
- [x] Add `syllableShape: { coda: "empty" }` to /ɔɪ/ → `oy`; check `oy` before a suffix survives
- [x] Issue note: /aʊ/ → `ow` gets `notRightContext: ["t"]` (/p/ and /m/ left alone: `ou` there reads /u:/ and raised `-oum`)
- [x] Add seeded + distribution tests; update grapheme-selection.md

## Review

- Status: Completed.
- /ɔɪ/ `oy` before a same-syllable coda 58 → 0 words (all now `oi`); surface `oy` + consonant letter 65 → 7 (6 are `oy` + suffix, *toys* type; 1 is a medial open `oy` before the next onset, `cengoyquacar`, *boycott* type).
- /aʊ/ `ow` before /t/ 16 → 0 words; trigram score better for 14 of the 14 changed words.
