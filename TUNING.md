# Tuning Process — Word Generator

How we identify, diagnose, and fix phonotactic and orthographic outliers.

## Overview

```
Baseline → Analyze (phonemes first) → Diagnose → Fix → Verify → Guardrails → Ship
```

## #250 Closure Checklist

- Boundary policy keys use `generationWeights.boundaryPolicy` only:
  - `equalSonorityDrop`
  - `risingCodaDrop`
- Junction validation is centralized in `src/core/junction.ts` via
  `validateJunction`.
- SSP Rule-1 detection scans the full coda (`hasRisingCodaTowardBoundary`).
- Structural tracing includes `risingCodaBoundaryDrop` plus enriched
  `sspBoundaryDrop` payloads (`violation`, `preDropCoda`).
- `scripts/trace-audit.mjs` reports SSP drops by violation and per-boundary
  rates.

## Phoneme-First Policy (active)

- Primary optimization target: **phoneme distribution alignment**
- Primary merge gates: **phoneme guardrails** (`src/config/phoneme-thresholds.json`)
- Trigram analysis remains important, but is **observational/non-blocking** during this phase unless catastrophic regressions appear.
- `src/core/ngram-quality.test.ts` follows `STRICT_NGRAM_QUALITY` by default (strict unless explicitly set to `0`). `NGRAM_GATES_BLOCKING` can still override for backwards compatibility. The trigram under-representation gate is the exception: it logs its worst trigram but blocks only with `NGRAM_TRIGRAM_UNDERREP_BLOCKING=1`, because the rarest common trigram (e.g. `ugh`, ~6 per 200k words) varies across seeds by more than the ratchet margin.
- Allowed levers for this cycle:
  - phoneme inventory weights (`src/elements/phonemes.ts`)
  - generation probabilities (`src/config/weights.ts`, `src/config/english.ts`)
- Frozen levers for this cycle:
  - grapheme/spelling tuning

## Canonical Run Defaults

Use this default profile unless a specific experiment needs otherwise:

- **Total sample size:** 2,000,000 words
- **Seed policy:** `42, 123, 456, 789, 1337` (400k words per seed)
- **Mode:** `lexicon`
- **Morphology:** `false`
- **Primary analyzer:** `node scripts/analyze-cmu-trigrams.mjs`
- **Canonical outputs:** `memory/trigram-2m-analysis.json` and `memory/trigram-2m-analysis.md`

For the phoneme-first track, add:

- **Primary analyzer:** `node scripts/analyze-cmu-phonemes.mjs`
- **Canonical outputs:** `memory/phoneme-2m-analysis.json` and `memory/phoneme-2m-analysis.md`
- **Normalization source of truth:** `data/cmu/phoneme-normalization.json`

## Non-CMU Phoneme Handling (required)

The generator can emit phoneme symbols that are not present in the CMU-mapped baseline.
Handle them explicitly; do not silently drop them.

- Compute and report `generatedOnlyPhonemes` (symbol + generated frequency)
- Shared-key Pearson uses only `shared` keys by definition
- Always report:
  - `nonCmuMassPct` (total generated mass on generated-only phonemes)
  - `coverageAdjustedR = sharedPearsonR * (1 - nonCmuMassPct / 100)`
- Escalation rule:
  - if `nonCmuMassPct > 1.5%`, prioritize generated-only contributors before other gaps
- Bucketed reporting is mandatory:
  - `shared`, `generatedOnly`, `cmuOnly`

## Phase 1: Baseline

**Goal:** Establish a reference corpus that matches what we're generating.

- Use **lexicon-based** n-gram frequencies (CMU Pronouncing Dictionary), not prose corpora
- Prose corpora (Norvig, Google Books) skew toward function words and don't reflect word-internal structure
- Durable CMU baselines stored in `data/cmu/`
- Generated reports stored in `memory/`
- Regenerate baselines if the reference dictionary changes
- Keep demo baseline parity with:
  - `node scripts/sync-demo-cmu-baselines.mjs --check` (verify)
  - `node scripts/sync-demo-cmu-baselines.mjs` (update)

**Lesson learned:** We initially used prose-based baselines and got misleading results (e.g., "of" appearing under-represented because it's a function word, not a word-internal pattern). Switching to CMU lexicon baselines made outlier analysis meaningful.

### Improvement opportunity
- **Frequency-weighted lexicon baseline**: Weight CMU entries by word frequency (Zipf scale) so common words ("the", "about") count more than obscure ones ("syzygy"). Raw CMU treats all 117k words equally.
- **Separate baselines by word length**: Short words have different n-gram distributions than long ones. Consider stratified analysis.

## Phase 2: Analyze

**Goal:** Generate a large sample and compare to baseline to find outliers.

1. Generate **2M words** (5 seeds × 400k each; canonical run)
2. Extract **phoneme** frequencies
3. Compare to CMU lexicon phoneme baseline using ratio (generated freq / baseline freq)
4. Rank by ratio and absolute gap
5. Track generated-only mass and coverage-adjusted Pearson

**Tools:** `scripts/analyze-cmu-phonemes.mjs` (canonical 2M phoneme analysis)

**Output:** Saved to `memory/phoneme-2m-analysis.{json,md}`

### Standard report fields

Each canonical phoneme report should include:

- `generatedAt` timestamp
- Config: seeds, words-per-seed, total words, mode, morphology
- Aggregate metrics: shared-key count, Pearson r
- Top over-represented phonemes (ratio, gap, generated freq, baseline freq)
- Top under-represented phonemes (ratio, gap, generated freq, baseline freq)
- Top absolute-gap phonemes
- Generated-only phonemes + non-CMU mass
- Coverage-adjusted Pearson
- Per-seed worst over/under entries

### Improvement opportunities
- **Automate as CI job**: Run lexicon comparison on every PR and post a comment with top outliers and deltas from main
- **Track trend over time**: Maintain a `memory/outlier-history.json` showing how top outliers change across PRs
- **Combined score**: Instead of just ratio, weight by absolute frequency × ratio to prioritize high-impact outliers
- **Under-representation analysis**: We've mostly focused on over-representation. Under-represented patterns (missing k-clusters, "ngs", "rry") deserve equal attention

## Phase 3: Diagnose

**Goal:** Trace the root cause of an outlier through the generation pipeline.

1. Generate **50k words** (enough for statistical patterns, fast enough for tracing)
2. Extract all words containing the target pattern
3. **Sample 10%** of instances for detailed tracing (or all if <500)
4. For each traced word, identify:
   - Phoneme sequence that produced the pattern
   - Syllable position (onset, nucleus, coda, cross-syllable)
   - Whether it's base-form, morphological, or cross-syllable
   - Which config/rule allowed it
5. **Categorize** instances by root cause (percentages)
6. Identify the specific config entry, weight, or missing constraint

### WordTrace requirement (mandatory)

For n-gram root-cause claims, use `trace: true` evidence by default.
Do not conclude a cause from surface strings alone.

### WordTrace field-to-question mapping

- `stages`: Where in the pipeline did the syllable structure shift?
- `graphemeSelections`: Did grapheme weighting/conditioning create the written trigram?
- `structural`: Was it introduced by `finalS`, `nasalStopExtension`, boundary events, etc.?
- `repairs`: Did a repair rule create or preserve the pattern?
- `morphology`: Is the pattern affix-driven vs base-form generation?

**Key questions during diagnosis:**
- Is this phonotactically valid in English? (Check CMU dictionary for real examples)
- Is this a base-form issue or morphological? (e.g., "asked" = ask + -ed is valid)
- Is this a phoneme issue or a spelling issue? (e.g., "dse" was a spelling bug)
- Can real English words contain this pattern? (Always check before eliminating)

**Output:** Saved to `memory/{pattern}-diagnostic.md`

### Improvement opportunities
- **Standardized diagnostic script**: Create a reusable `scripts/diagnose.ts <pattern>` that automates steps 1-4
- **CMU validation step**: Automatically check if the pattern exists in CMU dictionary and list real English examples before recommending elimination
- **Pipeline stage tagging**: Tag each instance with which pipeline stage created it (phoneme selection → cluster validation → repair → grapheme → spelling) to pinpoint where intervention should happen
- **Prevention over repair**: Always prefer preventing invalid patterns during generation over repairing them after. The `bannedNucleusCodaCombinations` pattern is the right model.

## Phase 4: Fix

**Goal:** Implement the minimal, targeted fix at the right level.

**Fix hierarchy (prefer higher):**
1. **Config correction** — Remove invalid entries (e.g., `["m","f"]` from attestedCodas)
2. **Phonotactic constraint** — Prevent at generation time (e.g., `bannedNucleusCodaCombinations`)
3. **Grapheme constraint** — Constrain spelling rules (e.g., `rightContext`/`notRightContext`)
4. **Weight adjustment** — Tune frequencies (e.g., `clusterWeights`)
5. **Repair rule** — Fix after generation (last resort)
6. **Spelling rule** — Post-hoc orthographic fix (absolute last resort)

**Principles:**
- Fix at the **source**, not downstream
- Prefer **declarative config** over imperative code
- Make fixes **reusable** (new constraint types benefit future fixes)
- Check if the fix affects **other patterns** before committing
- One fix per PR when possible (easier to track impact)

### Improvement opportunities
- **Fix impact preview**: Before committing, generate a quick 100k sample to preview the fix's effect on the target AND other patterns
- **Dry-run mode**: Add a `--dry-run` flag to constraint changes that reports what would be filtered without changing output
- **Config validation**: Add CI checks that validate attestedCodas entries against known English phonotactics

## Phase 5: Verify

**Goal:** Confirm the fix works and quantify improvement.

1. Generate **100k-500k words** with the fix applied
2. Count target pattern instances (before → after)
3. Calculate reduction percentage
4. If instances remain, **trace them** to confirm they're legitimate (cross-syllable, morphological)
5. Document: before count, after count, reduction %, remaining instance analysis

**Thresholds:**
- **>95% reduction** for invalid patterns (should be near-zero)
- **Within 2× of CMU baseline** for valid-but-overweighted patterns

**Output:** Saved to `memory/{pattern}-fix-verification.md`

## Phoneme-Length Acceptance (#223)

Top-down phoneme targeting is now the supported English generation model.
When tuning phoneme-length behavior, verify against the configured target tables
instead of depending on a raw local CMU dictionary file.

Normal verification:

- `npm run analyze:phoneme-length`
- `npm test`
- `npm run test:quality`
- `npm run audit:trace`
- `npm run analyze:trigrams`

Acceptance thresholds for `scripts/phoneme-length-dist.ts`:

- all phoneme-length buckets within `1.0pp` of the configured lexicon target
- 6-phoneme bucket within `1.5pp`
- `mode=lexicon`
- `morphology=false`

### Improvement opportunities
- **Automated verification script**: `scripts/verify-fix.ts <pattern> <before-count> <sample-size>`
- **A/B comparison**: Generate same-seed samples with and without fix for direct comparison

## Phase 6: Guardrails (Primary)

**Goal:** enforce phoneme distribution quality as the merge gate.

1. Run phoneme quality tests (`src/core/phoneme-quality.test.ts`)
2. Validate thresholds in `src/config/phoneme-thresholds.json`:
   - minimum shared Pearson r
   - maximum non-CMU generated mass
   - maximum over-representation ratio among common phonemes
   - minimum under-representation ratio among common phonemes
   - maximum absolute-gap among common phonemes
3. Run build + existing core tests
4. Run trigram report for monitoring (non-blocking during phoneme-first cycle)

**Output:** Saved to `memory/phoneme-2m-analysis.{json,md}` + scout diffs

### Improvement opportunities
- **Quality benchmark expansion**: The existing `vitest.quality.config.ts` could include n-gram gates (e.g., "no trigram >500× over-represented")
- **Snapshot testing**: Store n-gram frequency snapshots and diff against them in CI
- **Regression budget**: Allow small regressions (<10%) in non-target patterns if the target improvement is >50%

## Phase 7: Ship

**Goal:** Merge, deploy, and document.

1. Push branch, create PR with clear description (what, why, results)
2. Wait for CI tests to pass
3. Merge with `--squash --delete-branch`
4. Rebuild demo: `cd demo && npm run build`
5. Deploy: `sudo cp -r dist-demo/* /var/www/html/`
6. Update `MEMORY.md` with significant findings

### Improvement opportunities
- **Auto-deploy on merge**: GitHub Action that rebuilds and deploys demo on merge to main
- **Release notes**: Auto-generate from PR descriptions
- **Changelog entries**: Track which n-gram outliers were fixed in each version

---

## Session Workflow

A typical tuning session:

```
1. Run canonical lexicon analysis (2M sample) → "What's broken?"
2. Pick biggest outlier                       → "What hurts most?"
3. Check CMU dictionary for real examples     → "Is this even valid English?"
4. Run word trace (`trace: true`, 50k sample, 10% traced) → "Why is this happening?"
5. Identify fix level and implement           → "How do we fix it?"
6. Verify (100k-500k sample)                 → "Did it work?"
7. Check regressions (full test suite + comparison) → "Did we break anything?"
8. Ship (PR → CI → merge → deploy)           → "Let's go"
9. Repeat from step 1                         → "What's next?"
```

## Tools

| Script | Purpose |
|--------|---------|
| `scripts/analyze-cmu-phonemes.mjs` | Canonical 2M phoneme analysis and report generation |
| `scripts/phoneme-length-dist.ts` | Manual acceptance check for top-down phoneme-length targeting |
| `scripts/build-cmu-phoneme-baseline.mjs` | Build CMU phoneme baseline mapped to generator symbols |
| `scripts/analyze-cmu-trigrams.mjs` | Trigram monitoring report (non-blocking for phoneme-first cycle) |
| `scripts/diagnose.ts` | Pattern-specific diagnosis with WordTrace sampling |
| `scripts/sync-demo-cmu-baselines.mjs` | Sync/check `demo/cmuBaselines.js` against `memory` baselines |
| `src/core/phoneme-quality.test.ts` | Phoneme guardrail test gates |

## CMU Tooling Audit (2026-03-07)

The raw CMU dictionary remains local-only and ignored. Normal verification
should rely on committed baselines and config, not on `data/cmudict-0.7b.txt`.

| Script | Classification | Notes |
|--------|----------------|-------|
| `scripts/phoneme-length-dist.ts` | keep and repair | Normal verification; now compares generated output to committed top-down targets. |
| `scripts/build-cmu-phoneme-baseline.mjs` | keep and repair | Local helper for rebuilding `data/cmu/cmu-lexicon-phonemes.json`; can mirror committed demo baseline when raw CMU is absent. |
| `scripts/build-cmu-baseline.ts` | manual source-regeneration | Rebuilds committed `data/cmu/cmu-length-baseline.json`; requires local ignored `data/cmudict-0.7b.txt`. |
| `scripts/generate-bigram-table.ts` | manual source-regeneration | Rebuilds `src/phonotactic/arpabet-bigrams.ts`; prefers local raw CMU file, otherwise downloads upstream. Not required for normal verification. |
| `scripts/generate-baseline.ts` | manual source-regeneration | Rebuilds `src/phonotactic/english-baseline.json`; prefers local raw CMU file, otherwise downloads upstream. Not required for normal verification. |
| `scripts/full-cmu-baseline.ts` | remove | Stale duplicate of the phonotactic baseline flow with no active references. |

## Phoneme Guardrail Ratchet

The test suite includes phoneme quality gates (`src/core/phoneme-quality.test.ts`)
that compare generated phoneme frequencies against the CMU lexicon phoneme baseline.
Gates cover both representation shape and coverage:

- shared-key Pearson floor
- non-CMU generated mass ceiling
- over-/under-representation ratio bounds for common phonemes
- absolute-gap ceiling for common phonemes

Thresholds are in `src/config/phoneme-thresholds.json` and follow a **ratchet** pattern.
Each limit is calibrated from how much the metric varies across seeds on the
current generator, not from a flat percentage of one seed:

```sh
npm run calibrate:phonemes            # 30 seeds, k = 3, prints tables to stdout
npm run calibrate:phonemes -- --output calibration.json
```

The script runs the gate's exact measurement (sample size, lexicon mode, morphology
off, shared normalization and `computePhonemeQualityMetrics`) on seed 42 plus 29
seeds whose Mulberry32 streams start evenly spaced around the RNG cycle, so no two
runs reuse draws. It reports min, max, mean and sample SD per metric and proposes:

- upper-bound limits: worst observed + 3·SD, rounded up
- lower-bound limits: worst observed − 3·SD, rounded down
- zero-spread metrics (generated-only mass, missing CMU phonemes): 0

Why k = 3 past the *worst* seed rather than the mean: any change to RNG consumption
effectively reseeds the gate, so seed-42 noise must not fail a PR. The worst of 30
normal draws already sits about 2 SD above the mean, so the limit lands near
mean + 5 SD. That leaves room for SD being underestimated from 30 samples and
for skew in the worst-of-many-phonemes metrics. In the first calibration
([record](evaluation/diagnostics/phoneme-threshold-calibration/)), one of 10
held-out seeds fell outside the calibration range on three metrics but stayed
inside every limit. A flat percentage (the old ×1.10 rule) ignores that the
spread differs by metric by orders of magnitude.

When to re-run:

1. After an intentional distribution change (tuning PR), re-run the calibration on
   that branch and commit the new limits with it. Explain in the PR why the shift is
   wanted.
2. If a PR fails the gate, run `npm run calibrate:phonemes -- --count 10` on it. If
   the metric moved on most seeds, it is a real shift to review, not noise. Do not
   loosen limits just to pass it.
3. Keep `seed`, `sampleSize` and `minCommonBaselinePct` fixed. Changing them
   invalidates the calibration.

## Reference Data

| File | Contents |
|------|----------|
| `data/cmu/cmu-lexicon-letters.json` | CMU letter frequencies |
| `data/cmu/cmu-lexicon-bigrams.json` | CMU bigram frequencies (638 unique) |
| `data/cmu/cmu-lexicon-trigrams.json` | CMU trigram frequencies (8,190 unique) |
| `data/cmu/cmu-lexicon-phonemes.json` | CMU phoneme frequencies mapped to generator symbols |
| `data/cmu/phoneme-normalization.json` | Shared normalization policy (analyzer + demo) |
| `data/cmu/cmu-length-baseline.json` | CMU word-length and syllable-count baseline |
| `data/cmu/cmu-lexicon-baseline.md` | Human-readable baseline report |

## History

| Date | Fix | Pattern | Reduction |
|------|-----|---------|-----------|
| 2026-02-15 | PR #199 | dse (monosyllable position bug) | 96.5% |
| 2026-02-15 | PR #200 | ts/ns/ds (position-based cluster weighting) | 99%+ |
| 2026-02-15 | PR #202 | mf (invalid attestedCodas) | 99.3% |
| 2026-02-15 | PR #202 | whu (grapheme constraints) | 99.9% |
| 2026-02-15 | PR #202 | skt (invalid attestedCodas) | 98.9% |
| 2026-02-15 | PR #202 | rng (bannedNucleusCodaCombinations) | 100% |
| 2026-02-26 | codex/ngram-outlier-remediation | `ea`/`ern`/`dis` over-representation, `io`/`ion`/`tio`/`ns` under-representation | multi-knob retune + `-ian` suffix |

## 2026-02-26 N-gram Outlier Retune Notes

Trace-first diagnosis identified dominant root causes:

- `ea` and `eat` skew: over-weighted `/ɛ/ -> ea` and `/i:/ -> ea`
- `ern`/`rn` skew: over-weighted `/ɚ/ -> er`
- `dis` skew: high `dis-` prefix frequency
- `io`/`ion`/`tio` deficit: low `-tion` suffix incidence relative to CMU
- `ns` deficit: over-suppressed coda cluster weights from earlier hard clamp
- `ian` severe deficit: missing `-ian` morphology inventory

Implemented retune strategy:

- Lower `ea` mapping pressure (`/ɛ/`, `/i:/`)
- Lower `/ɚ/ -> er` pressure
- Reduce `dis-` prefix frequency
- Increase `-tion` suffix frequency
- Relax selected `coda.final` and `coda.nonFinal` cluster multipliers (`n,s`/`t,s`/`d,s` families)
- Add `-ian` suffix to morphology inventory

## Post-Tuning Documentation Ratchet

After each successful tuning cycle:

1. Update this file with new strategy patterns that worked.
2. Update `docs/word-trace-diagnostics.md` with new trace signatures and anti-patterns.
3. Record concrete threshold/process changes (with dates) in `memory/` artifacts.
