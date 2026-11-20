---
cursor:
  subagentId: "bc-a202ab58-6200-5956-8dff-b3de7f25ab4e"
---

# Poly `ow` decision + `ou` fix

Head before this pass: `27ef91a`. Change: one new medial closed `/əʊ/` `o` grapheme (`midWord: 1`, `isolatedSyllableWeight: 0`).

## 1. Uninflected comparator — closed `ow` not before n/l

SCOWL≤60 ∩ CMU polysyllables, inflection classifier (`none` only), syllabify, per-syllable greedy form align.

| Bucket | Count spelled `ow` | Examples |
|---|---:|---|
| Open | 146 | (stem-final open `ow`) |
| Closed before n/l | 6 | |
| **Closed other** | **3** | overgrowth, unbowed, undergrowth |

Word-level false positives (follows/borrowed/…) were inflected stem+suffix. **3 is not large → keep the `ow` restriction in longer words (intended).**

Packets: `comparator-uninflected-poly-ow.json`, `comparator-uninflected-poly-ow-aligned.json`.

## 2. `ou` rise — cause

Paths (poly, morph off, seeds 42/43/44 × 40k):

| Path | Main | Head `27ef91a` (before fix) |
|---|---:|---:|
| selected `ou→ou` | 57 | **428** |
| rewrite `ow→ou` (`ow-cluster-simplify`) | 247 | 45 |
| surface `ou` closed | 271 | 458 |

Almost all of the new closed `ou` is **direct selection**. Once closed `ow` is limited to n/l, medial syllables had `o` with `midWord: 0`, so the only remaining candidate was `ou` (reads as “out”).

Comparator uninflected poly `/əʊ/` `ou`: aligned **6 closed** (boulder, poultry, shoulder, soulful, …) / **0 open** in the aligned subset — rare.

## 3. Fix

Added closed-only medial `o`:

```ts
{ phoneme: "əʊ", form: "o", frequency: 500,
  startWord: 0, midWord: 1, endWord: 0,
  isolatedSyllableWeight: 0,
  condition: { syllableShape: { coda: "nonEmpty" } } }
```

Monos still use the existing `o` via `isolatedSyllableWeight: 8` only.

| Metric | Before (`27ef91a`) | After |
|---|---:|---:|
| Poly selected `ou` closed | 414 / 40k×3 | **8** |
| Poly surface `ou` closed | 458 | **53** (≈45 rewrite) |
| Poly `ow` share | 7.6% | **7.0%** (open ow restored) |
| Mono band-off `ow` | 10.0% | **10.0%** |
| Mono shipping `ow` | 16.7% | **17.1%** (seed noise) |

## 4. Poly movements ≥0.5pp (main → after fix)

əʊ o **+4.15pp**; əʊ ow **−3.65pp** (intended closed cut); əʊ ou **−1.18pp** (fix); u u −1.24; u u+e +1.11; aɪ ye −1.11; …
