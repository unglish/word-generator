# Tuning Process — Word Generator

How we identify, diagnose, and fix phonotactic and orthographic outliers.

## Overview

```
Baseline → Analyze → Diagnose → Fix → Verify → Regress → Ship
```

## Canonical Run Defaults

Use this default profile unless a specific experiment needs otherwise:

- **Total sample size:** 2,000,000 words
- **Seed policy:** `42, 123, 456, 789, 1337` (400k words per seed)
- **Mode:** `lexicon`
- **Morphology:** `false`
- **Primary analyzer:** `node scripts/analyze-cmu-trigrams.mjs`
- **Canonical outputs:** `memory/trigram-2m-analysis.json` and `memory/trigram-2m-analysis.md`

## Phase 1: Baseline

**Goal:** Establish a reference corpus that matches what we're generating.

- Use **lexicon-based** n-gram frequencies (CMU Pronouncing Dictionary), not prose corpora
- Prose corpora (Norvig, Google Books) skew toward function words and don't reflect word-internal structure
- Baselines stored in `memory/cmu-lexicon-{letters,bigrams,trigrams}.json`
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
2. Extract letter, bigram, and trigram frequencies
3. Compare to CMU lexicon baseline using ratio (generated freq / baseline freq)
4. Rank by ratio — highest over-represented and under-represented
5. Flag anything **>50×** as a major outlier (trigrams) or **>15×** (bigrams)

**Tools:** `scripts/analyze-cmu-trigrams.mjs` (canonical 2M trigram analysis)

**Output:** Saved to `memory/trigram-2m-analysis.{json,md}`

### Standard report fields

Each canonical analysis report should include:

- `generatedAt` timestamp
- Config: seeds, words-per-seed, total words, mode, morphology
- Aggregate metrics: shared-key count, Pearson r
- Top over-represented trigrams (ratio, gap, generated freq, baseline freq)
- Top under-represented trigrams (ratio, gap, generated freq, baseline freq)
- Top absolute-gap trigrams
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

### Improvement opportunities
- **Automated verification script**: `scripts/verify-fix.ts <pattern> <before-count> <sample-size>`
- **A/B comparison**: Generate same-seed samples with and without fix for direct comparison

## Phase 6: Regression Check

**Goal:** Ensure the fix doesn't break other things.

1. Run **full test suite** (`npm test`) — all tests must pass
2. Generate **100k+ sample** and run lexicon comparison
3. Compare to previous analysis — flag any pattern that changed **>20%**
4. Check for **new outliers** that appeared
5. Verify the fix didn't just **shift** the problem (e.g., fixing "ns" made "ts" worse)

**Output:** Saved to `memory/{pattern}-regression.md` or combined with verification

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
| `scripts/analyze-cmu-trigrams.mjs` | Canonical 2M trigram analysis and report generation |
| `scripts/diagnose.ts` | Pattern-specific diagnosis with WordTrace sampling |
| `scripts/sync-demo-cmu-baselines.mjs` | Sync/check `demo/cmuBaselines.js` against `memory` baselines |
| `vitest.quality.config.ts` | Quality benchmark gates |

## N-gram Quality Ratchet

The test suite includes n-gram quality gates (`src/core/ngram-quality.test.ts`)
that compare generated bigram/trigram frequencies against the CMU lexicon baseline.
Gates catch both **over-representation** (too much of a pattern) and
**under-representation** (common patterns missing or severely rare).

Thresholds are in `src/config/ngram-thresholds.json` and follow a **ratchet** pattern:

### Over-representation
1. After each successful tuning fix, re-run the 5× baseline analysis:
   - Seeds: 42, 123, 456, 789, 1337 — 200k words each
   - Compare to CMU baseline frequencies
   - Find the worst over-representation ratio across all 5 runs
2. Set new threshold = max ratio × 1.1 (10% margin)
3. Commit updated `ngram-thresholds.json` as part of the fix PR

### Under-representation
1. Same 5× analysis, but look at the **lowest** generated/CMU ratio
2. Only consider **common** patterns (bigrams >0.1% in CMU, trigrams >0.05%)
   — avoids flagging obscure patterns the generator shouldn't need to produce
3. Set new threshold = min ratio × 0.9 (10% margin, more lenient)
4. As the generator covers more English patterns, ratchet thresholds **up**

**Current state:** Many common patterns (ko, ngs, nce) are near-absent in
generated output, so initial under-rep thresholds are 0. These will tighten
as the generator improves.

Both directions ensure thresholds only tighten over time — improvements are locked in.

See `memory/ngram-threshold-baseline.md` and `memory/ngram-underrep-threshold-baseline.md`
for the initial 5-run data.

## Reference Data

| File | Contents |
|------|----------|
| `memory/cmu-lexicon-letters.json` | CMU letter frequencies |
| `memory/cmu-lexicon-bigrams.json` | CMU bigram frequencies (638 unique) |
| `memory/cmu-lexicon-trigrams.json` | CMU trigram frequencies (8,190 unique) |
| `memory/cmu-lexicon-baseline.md` | Human-readable baseline report |

## History

| Date | Fix | Pattern | Reduction |
|------|-----|---------|-----------|
| 2026-02-15 | PR #199 | dse (monosyllable position bug) | 96.5% |
| 2026-02-15 | PR #200 | ts/ns/ds (position-based cluster weighting) | 99%+ |
| 2026-02-15 | PR #202 | mf (invalid attestedCodas) | 99.3% |
| 2026-02-15 | PR #202 | whu (grapheme constraints) | 99.9% |
| 2026-02-15 | PR #202 | skt (invalid attestedCodas) | 98.9% |
| 2026-02-15 | PR #202 | rng (bannedNucleusCodaCombinations) | 100% |

## Post-Tuning Documentation Ratchet

After each successful tuning cycle:

1. Update this file with new strategy patterns that worked.
2. Update `docs/word-trace-diagnostics.md` with new trace signatures and anti-patterns.
3. Record concrete threshold/process changes (with dates) in `memory/` artifacts.
