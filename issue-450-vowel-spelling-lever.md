---
cursor:
  subagentId: "bc-a202ab58-6200-5956-8dff-b3de7f25ab4e"
---

# Issue #450 — monosyllable vowel spelling lever (ready for review)

PR: https://github.com/unglish/word-generator/pull/453 (`cursor/mono-vowel-spelling-450`).  
Head: `0eacab14` (rebased onto `main` @ `632c139` / #456). Evidence tag: `archive/pr-453` (`960966a`).  
Follow-ups: #454, #455, #457. Packets: `vowel-lever-final/` · `vowel-lever-cleanup/` · `vowel-lever-ou/` · `vowel-lever-ready/`.

## Ready pass (no further spelling changes)

Rebased cleanly onto #456 (certificate respells on grapheme selections). Golden unchanged. `npm run check` **PASS**.

| Gate | Value | Threshold |
|---|---:|---:|
| Phoneme TV | 1.741% | 1.78% |
| Worst over | u 1.060× | 1.08× |
| Worst under | ɪ 0.911× | 0.896× |
| Bigram over | ds 2.964× | 4.25× |
| Trigram over | abl 2.202× | 3.21× |

### #456 vs our tests

- `mono-vowel-spelling.test.ts` still walks `baseSpelling` edits for surface (silentE / ow-cluster). `#456` `respelled` is certificate-only — not a simpler substitute here; bounds unchanged.
- `root-final-s.test.ts` #454 workaround **kept**: certificates still rewrite `ce`/`se`; `#456` only records it. Surface≠emitted still occurs.

### Remaining closed poly `ow` (observation only)

Morph off: **0** closed `ow` with coda₀ ∉ {n,l}.  
Morph on (~427 closed selected `ow` / 150k): **265** single n/l; **57** n/l-clusters (`rightContext` matches first phone only); **17** stem-final open `ow`+suffix; **88** open-at-selection appearing closed in final syllable dump (prefix/boundary). Reviewer’s “~400” ≈ total closed selected with morph on.

## Final-pass summary

Criterion is **per-form, per-context surface** share. Missing forms are shortfalls (#455), not holes to backfill by inflating another digraph.

1. **`/əʊ/` `ow`:** open + single-coda (n/l) only → band-off surface `ow` **10.0%** (cmp **11.7%**). **Poly application is intended** (see below).
2. **`/ɔ/` `aw` before clusters:** aw-before-cluster **&lt;1%** of /ɔ/.
3. **`/i:/` `ee`:** band-off surface `ee` **26.5%** (was **0%** on main).
4. **Poly `ou` fix:** medial closed `o` entry so restricted `ow` does not dump medial mass onto `ou`.

## Poly `/əʊ/` `ow` — **intended**

Independent review: the earlier “83” closed-`ow` list was mostly **inflected** stem+suffix (follows, borrowed…). Stem-final open `ow` is untouched; what dropped is root-internal `ow` before a consonant.

**Uninflected** SCOWL≤60 ∩ CMU polys, per-syllable align (`packets/vowel-lever-ou/`):

| Bucket | Spelled `ow` | Examples |
|---|---:|---|
| Open | 146 | stem-final open `ow` |
| Closed before n/l | 6 | |
| Closed other | **3** | overgrowth, unbowed, undergrowth |

**3 is not large → keep the change.**

Poly surface (seeds 42/43/44 × 40k, morph off), after `ou` fix:

| Form | Main | Head | open/closed main | open/closed head |
|---|---:|---:|---:|---:|
| ow | 10.7% | **7.0%** | 1181/959 | 1232/**179** |
| o | 62.4% | 66.5% | 3727/8756 | 3746/9589 |
| o+e | 25.0% | 25.8% | 89/4916 | 116/5061 |
| ou | 1.5% | **0.3%** | 33/271 | 15/**53** |

## Poly `ou` rise and fix

At `27ef91a`, closed poly surface `ou` jumped (main 271 → 458; selected `ou→ou` 57 → 428). Rewrite `ow→ou` actually **fell** (247 → 45).

**Cause:** with closed `ow` limited to n/l, medial syllables had `o` at `midWord: 0`, so the only remaining candidate was `ou` (“out”).

**Comparator** uninflected poly `/əʊ/` `ou`: ~6 closed (boulder, poultry, shoulder, soulful…) — rare.

**Fix:** add closed-only medial `o` (`midWord: 1`, `isolatedSyllableWeight: 0`, `syllableShape: nonEmpty`). Monos unchanged (still use isolated `o`).

| Metric | `27ef91a` | After |
|---|---:|---:|
| Selected `ou` closed | 414 | **8** |
| Surface `ou` closed | 458 | **53** (mostly rewrite) |
| Band-off mono `ow` | 10.0% | **10.0%** |
| Shipping mono `ow` | 16.7% | **17.1%** |

## Cleanup (tests / description)

`/i:/` `ee` fallbackOnly: **0** hits → kept, #457. Hunt loop removed; seed **20260930** for `/ʊ/` `oo`. `/i:/` `ea` floor **0.18** from measured **19.9%**.

Shipping vs band-off digraph inflation (letter band over-selects open): ow 10%→17%, aw 16%→29%.

## Part 1 comparator

SCOWL 2020.12.07 SHA-256 `5587667caa20c4891390c2d42dbb4d5c4c3f41bee77af1457ece3ba23fb859cc`; CMU ascii-first `81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22`; uninflected n=3,734; aligned 92.8%.

## 1. Per-form surface (`/əʊ/` remeasured after ou fix)

| Form | Main | Band-off | Shipping | Comparator |
|---|---|---|---|---|
| ow | 3.4% | **10.0%** (740/28/1) | **17.1%** (830/28/1) | 11.7% |
| o | 48.1% | 42.0% | 27.0% | **29.3%** |
| o+e | 44.5% | 46.1% | 53.7% | **35.1%** |
| ou | 3.7% | 1.9% | 2.0% | 0.4% |
| **oa** | 0 | 0 | 0 | **18.8%** → #455 |
| oe | 0.3% | ~0 | 0.2% | 3.8% |

`/ɔ/` `/i:/` band-off/shipping from cleanup packet (unchanged weights). Comparator splits: o **29.3%** / o+e **35.1%**; e **3.0%** / e+e **4.8%**.

## 2. Poly movements ≥0.5pp (main → after ou fix)

| Phone\|form | Δ |
|---|---:|
| əʊ\|o | **+4.15pp** |
| əʊ\|ow | **−3.65pp** (intended) |
| əʊ\|ou | **−1.18pp** (fix) |
| u\|u | −1.24 |
| u\|u+e | +1.11 |
| aɪ\|ye | −1.11 |
| əʊ\|o+e | +0.82 |
| ɔ\|o+e | +0.77 |
| u\|ew | −0.66 |
| u\|ue | +0.63 |

## 3. Mean letters (final pass; ou fix is poly-medial only)

| Condition | Main | Revised | Δ |
|---|---:|---:|---:|
| Ungated mono | 4.192 | 4.254 | +0.062 |
| Gated mono | 4.374 | 4.423 | +0.049 |

## 4. Gates

`npm run check` **PASS** after ou fix (68 + 13 review). Golden unchanged.

## 5. Follow-ups

- #454 — aue + ce/se surface≠trace  
- #455 — `oa` / `au` inventory  
- #457 — unused `/i:/` `ee` fallbackOnly  

## Unverified

- Aligner coverage: 7058/23024 uninflected polys failed greedy align; closed-other count uses the aligned subset (plus manual check of word-level 14).  
- Shipping mono tables for phones other than `/əʊ/` not re-run after ou fix (weights for those phones unchanged).  
- Soft ce/ge/ve/se vs form-level split shares.
