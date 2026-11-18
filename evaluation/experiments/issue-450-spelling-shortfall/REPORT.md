---
cursor:
  subagentId: "bc-63460735-ad25-5bc0-b892-3a6cc487b1ea"
---

# Issue #450 — locate the monosyllable spelling shortfall

Measurement + report only. No generator, config, weight, threshold, or test changes. No PR.

Prior: [`issue-450-post-451-remeasure.md`](./issue-450-post-451-remeasure.md), [`issue-450-letter-length-diagnosis.md`](./issue-450-letter-length-diagnosis.md).  
Packets: `internal/issue-450/packets/spelling-shortfall/`. Tag: `archive/issue-450-spelling-shortfall`.

**Headline:** On ungated main @ `116e092`, bare monosyllables are **0.64 letters short** of all ascii-first CMU monos (4.19 vs 4.83). Against the orthographic **“neither”** (uninflected-ish) CMU class the **letter-mean** gap shrinks to **~0.39**, but the phone-conditional shortfall stays large (**mass-weighted \(E[L\mid P]\) gap ~0.58**). Alignment (mono coverage **88.5%**, hand error **~3%**) attributes that shortfall mainly to **under-use of coda doubling / `ck`·`tch`·`dge` (~0.19 letters/word)**, **shorter nucleus polygraphs (~0.11)**, **`ce`/`ge`/`ve`-class multiletter codas (~0.10)**, and **silent/magic `e` (~0.10)**. Consonant digraphs (`sh`/`ch`/`th`/`ng`/…) are **not** short. Disyllables stay near CMU because their nuclei already carry far more digraph mass. **Clear for a fix-decision** on those four levers — wait for a decision before implementing.

Method: public API `createGenerator` / `generateWord`; lexicon; morphology off except the morph-on cross-check; seeds **42/43/44** × **200k** (step 1–2 gen); CMU pinned revision `74790861…`, SHA-256 `81917843…` (**verified**); ungated = `letterLengthTargets: undefined`.

---

## 1. Ungated letters-given-phones (replaces re-measure §3)

### Monosyllables

| Phones | CMU \(E[L\mid P]\) | ungated gen | Δ | gen weight |
|---:|---:|---:|---:|---:|
| 1 | 2.42 | 1.25 | −1.17 | 0.3% |
| 2 | 3.21 | 2.39 | −0.82 | 5.5% |
| 3 | 4.30 | 3.47 | **−0.83** | 34.5% |
| 4 | 5.06 | 4.49 | **−0.56** | 41.1% |
| 5 | 5.85 | 5.40 | −0.46 | 17.0% |
| 6 | 6.65 | 6.22 | −0.44 | 1.6% |
| 7 | 7.73 | 7.23 | −0.50 | ~0% |

| | CMU | ungated gen |
|---|---:|---:|
| Letter mean | 4.831 | 4.194 |
| Letter-mean gap | | **−0.636** |
| Mass-weighted \(E[L\mid P]\) gap | | **−0.651** |
| n | 15,106 | 77,817 |

Full letter distributions at each phone count: `packets/spelling-shortfall/step1-ungated-lgp.json`.

### Disyllables

| Phones | CMU | ungated gen | Δ | gen weight |
|---:|---:|---:|---:|---:|
| 3 | 4.40 | 3.52 | −0.88 | 1.5% |
| 4 | 5.33 | 4.79 | −0.54 | 15.5% |
| 5 | 6.18 | 5.88 | −0.30 | 34.3% |
| 6 | 7.04 | 6.94 | −0.10 | 30.1% |
| 7 | 8.00 | 7.95 | −0.04 | 13.8% |
| 8 | 8.95 | 8.96 | +0.01 | 4.1% |
| 9 | 9.80 | 10.00 | +0.19 | 0.7% |

| | CMU | ungated gen |
|---|---:|---:|
| Letter mean | 6.633 | 6.436 |
| Letter-mean gap | | **−0.197** |
| Mass-weighted \(E[L\mid P]\) gap | | **−0.233** |
| n | 54,063 | 275,898 |

Ungated mono shortfall is **~3×** the di letter-mean gap and **~2.8×** the di mass-weighted gap — not a uniform per-phone deficit.

---

## 2. Comparator: CMU inflection

### Class sizes (ascii-first monos, existing heuristic)

| Class | n | share | mean letters | mean phones |
|---|---:|---:|---:|---:|
| `-s`-like | 2,891 | 19.1% | 5.19 | 4.32 |
| `-ed`-like | 1,152 | 7.6% | 6.24 | 4.43 |
| neither | 11,063 | **73.2%** | **4.59** | 3.49 |
| all mono | 15,106 | 100% | 4.83 | 3.72 |

Inflected classes are **longer in letters and phones** (e.g. “walked”: +2 letters for often +1 phone). Bare generated roots never add that morphology.

### Gap vs “neither”

| Measure | vs all CMU | vs neither | closed |
|---|---:|---:|---:|
| Letter-mean \|gap\| | 0.636 | **0.395** | **0.242 (38%)** |
| Mass-weighted \(E[L\mid P]\) \|gap\| | 0.651 | **0.575** | 0.076 (**12%**) |

**Reading:** Roughly **a third of the raw 0.64 letter-mean gap** is the inflected comparator. Most of the **phone-conditional** shortfall remains (~0.58). Use the mass-weighted gap as the spelling target; the letter-mean gap mixes comparator phone-length mix with spelling depth.

### Hand-check of the heuristic (100/class, fixed seeds)

| Class | errors / 100 | rate | Notes |
|---|---:|---:|---|
| `-s`-like | 32 | **32%** | Wrong stems (`trees←tre`, `names←nam`), surnames, non-plurals |
| `-ed`-like | 25 | **25%** | e-drop pasts assigned to shorter stems (`hoped←hop`, `cared←car`) |
| neither | 0 | **0%** | No clear false negatives in sample |

**`-s` / `-ed` error rates ≫ 10% → bound, don’t point-quote, those class means.** The **neither** sample is clean on false negatives; residual false “neither” (missed inflections) would make the neither-gap a **slight under-estimate** of the true uninflected gap. Safe band for the remaining letter-mean gap: **about 0.39–0.64**, with phone-conditional shortfall **~0.55–0.65**.

### Morph-on cross-check (ungated, stay mono)

Morphology on, keep monosyllabic surfaces: letter mean **4.65**, gap vs all CMU monos **−0.18** (mass-weighted \(E[L\mid P]\) still **−0.44**). Affixation closes much of the raw letter-mean gap by adding letters, but it is a **different object** than the gate’s bare root — not a substitute for fixing root spelling.

---

## 3. CMU grapheme alignment (probe only)

| | Mono | Di |
|---|---:|---:|
| Coverage | **88.5%** (13,376 / 15,106) | 80.1% (43,323 / 54,063) |
| Gate (~85%) | **pass** | **fail** — do not lean on di CMU positional claims |

**Tie-break:** among candidate forms for (phoneme, position), pick **longest**, then **highest inventory frequency**, then **lexicographically smallest**. Search: DFS backtracking; first full cover wins. Candidates = `graphemeMaps` inventory + stated orthographic extras; vowel-letter fallback only (no blind consonant fallback).

**Silent letters (own categories, never folded into a neighbour):**
- `silent-k-in-kn` / `silent-g-in-gn` / `silent-w-in-wr`
- `silent-gh`
- `silent-l` (walk, could, half, …)
- `silent-e-before-coda` (-es/-ed letter `e`)
- `silent-b-in-mb` / `silent-n-in-mn`
- `silent-final-e`, trailing `silent-h`
- `geminate-extra` for doubled consonant letters

**Hand-check:** 100 aligned monos, seed `450003`. Hard error rate **3%** (peers, wuertz, sram); soft flag schell. **≤5% gate pass.**

Top unaligned patterns (mono) are dominated by opaque loans / search failures (`fail:tongue`, `fail:basque`, …) after the backtracking upgrade — see `step3-align.json`.

---

## 4. Where the mono gap lives

### Positional letters/phone (aligned CMU neither vs ungated gen traces)

| Position | CMU neither mean L/phone | multi share | gen mono mean | multi share | gen di mean | multi share |
|---|---:|---:|---:|---:|---:|---:|
| onset | 1.10 | 8.0% | 1.03 | 2.7% | 1.04 | 4.1% |
| nucleus | **1.34** | **33.4%** | **1.17** | **16.1%** | **1.27** | **26.9%** |
| coda | **1.28** | **27.3%** | **1.15** | **15.3%** | 1.13 | 13.0% |

Generator monos under-spell **nuclei and codas**; onsets are closer. Generator **disyllable nuclei** already approach CMU mono nucleus depth.

### Mechanism table (letters/word; CMU neither aligned − ungated gen)

Target: step-2 mass-weighted \(E[L\mid P]\) gap vs neither = **0.575**.

| Mechanism | CMU rate | gen rate | **contribution** | >0.05? |
|---|---:|---:|---:|---|
| Doubling / `ck` / `tch` / `dge` | 0.248 | 0.053 | **0.194** | yes |
| Vowel digraphs/trigraphs (nucleus) | 0.279 | 0.166 | **0.112** | yes |
| Other multiletter (`ce`/`ge`/`ve`/`qu`/…) | 0.148 | 0.048 | **0.100** | yes |
| Silent / magic `e` (final + before coda) | 0.213 | 0.114 | **0.099** | yes |
| Other silents (kn/wr/gh/l/mb/…) | 0.019 | 0.001 | 0.018 | no |
| Consonant digraphs (`sh`/`ch`/`th`/`ng`/`wh`/`ph`) | 0.142 | 0.140 | **0.002** | no |
| **Sum** | | | **0.526** | |
| **Residual vs 0.575** | | | **+0.049** | |

Residual **+0.05** (under-explained): coverage bias, hand-alignment noise, and extras that aren’t a perfect partition of \(E[L\mid P]\). **Not papered over.**

Letter-mean gap vs neither (0.395) is **smaller** than the mechanism sum because gen phones are slightly **longer** than neither-CMU phones (3.74 vs 3.49) — more phones, still fewer letters. The mass-weighted gap is the right spelling target.

### Mechanisms >0.05 — rates, code, examples

#### A. Doubling / `ck` / `tch` / `dge` (+0.19)
- **Context:** lax vowel + single coda (and inventory `ck`/`tch`/`dge` after lax).
- **Code:** `src/config/english.ts` `doubling` (`probability: 80`, `trigger: "lax-vowel"`); `src/core/spelling-doubling.ts` `tryDoubling`; `src/elements/graphemes/doubling.ts`; `stops.ts` (`ck`); `affricates.ts` (`tch`, `dge`); deprioritised in `grapheme-selection.ts` `neverDoubleAfter` path.
- **CMU examples:** add, ack, abbs, all, aase  
- **Gen examples:** ock, well, bill, liff, track  

#### B. Nucleus vowel polygraphs (+0.11)
- **Context:** stressed mono nuclei; CMU multi-letter share ~33% vs gen ~16%.
- **Code:** `src/elements/graphemes/vowels.ts`, `diphthongs.ts`; weights via `src/core/grapheme-selection.ts` position weights / `isolatedSyllableWeight`.
- **CMU examples:** ae, ah, ahl, ai, ahr  
- **Gen examples:** craym, bie, erl, scrile, glarts  

#### C. Other multiletter codas (`ce`/`ge`/`ve`/…) (+0.10)
- **Context:** soft-c/g and similar multi-letter coda/nucleus-adjacent units not in the digraph or doubling buckets.
- **Code:** `fricatives.ts` / `affricates.ts` / `stops.ts` forms (`ce`, `ge`, `ve`, `se`, …); selection in `grapheme-selection.ts`.
- **CMU examples:** ace, age, aase, ambs  
- **Gen examples:** ince, phece, quace, lence, renge  

#### D. Silent / magic `e` (+0.10)
- **Context:** final silent `e` after single coda; also `-es` letter `e`. Gen mono applies `applySilentE` at **2×** config probability (still under-fires vs CMU).
- **Code:** `src/config/english.ts` `silentE` (`probability: 35`) + `spellingRules` `magic-e`; `src/core/write.ts` `applySilentE` (mono doubles probability).
- **CMU examples:** abe, ache, ade, aide, fame  
- **Gen examples:** sole, linke, scrile, blunde, bacse  

Consonant digraphs are **matched** — not a fix target for length.

---

## 5. Why disyllables are only ~0.20 short

From the positional tables (not argument):

1. **Nucleus depth:** gen di nucleus multi-letter share **26.9%** and mean L/phone **1.27**, vs mono gen **16.1% / 1.17**. Di nuclei already look like CMU mono nuclei; mono nuclei do not.
2. **Doubling / silent-e are word-final / mono-biased:** gen di doubling extras/word **0.165** (≫ mono gen 0.053) while CMU mono still leads; silent-e is configured with a **mono 2×** boost and still under-shoots CMU mono. Di letter-mean sits at **6.44 vs CMU 6.63**.
3. **Phone-conditional gaps shrink with phone count** in di (Δ ≈ 0 at 7–8 phones). Mass sits where spelling is already near one-letter-per-phone plus shared digraphs.

So the shortfall mechanisms in §4 are **concentrated in stressed monosyllable nuclei/codas and word-final silent-e/doubling**, not a global per-phone tax. Di coverage on the CMU aligner is only ~80%, so this explanation leans on **gen di traces + letter/phone means**, not di CMU unit alignments.

---

## 6. Ranked proposals — do not implement

General spelling behaviour only. No word lists, gap spellings, or closed-class edits.

### 1. Raise coda doubling / `ck`·`tch`·`dge` after lax vowels (largest)
- **Change:** increase effective doubling / digraph-coda use in mono codas — e.g. `doubling.probability` (80→higher) and/or inventory weights for `ck`/`tch`/`dge` in `stops.ts` / `affricates.ts` / `doubling.ts`; keep `neverDouble` / `neverDoubleAfter` guards.
- **Expected close:** ~**0.15–0.19** letters/word of the mono mass-weighted gap if mono doubling approaches CMU ~0.25/word.
- **Risks:** phoneme gate (already recalibrated in #452); trigrams (`ll`/`ss`/`ck` bursts); over-long gated 4-letter band interaction later.
- **Measure:** ungated mono \(E[L\mid P]\); doubling/extra rate from traces; `npm run quality:compare` phoneme + trigram.

### 2. Enrich mono nucleus polygraphs
- **Change:** boost multi-letter nucleus weights for monosyllables / isolated syllables (`isolatedSyllableWeight`, endWord/startWord on `vowels.ts` / `diphthongs.ts`) without adding new gap spellings.
- **Expected close:** ~**0.08–0.11**.
- **Risks:** digraph n-grams; vowel phoneme confusion if forms drift from readings.
- **Measure:** nucleus multi share in traces; \(E[L\mid P]\) for phones 3–5.

### 3. Soft-coda multiletter (`ce`/`ge`/`ve`/…)
- **Change:** raise positional weights for existing multi-letter coda forms already in inventory.
- **Expected close:** ~**0.07–0.10**.
- **Risks:** soft-c/g reading violations (`reading.ts`); trigram `ce`/`ge` spikes.
- **Measure:** “other multiletter” extras/word; reading-audit diagnostics.

### 4. Silent / magic `e` rate on monos
- **Change:** raise `silentE.probability` and/or revisit the mono 2× cap in `applySilentE`; keep `magic-e` rule.
- **Expected close:** ~**0.06–0.10**.
- **Risks:** final-`e` trigrams; interaction with doubling (e vs double); gated length band later.
- **Measure:** silent-e fire rate from traces; mono \(E[L\mid P]\).

### 5. (Later, out of scope here) onset length mix; letter band
- Onset 2-share and the acceptance band remain on the locked roadmap **after** spelling. Noted only.

---

## 7. Not verified / limits

- Gold morphology for CMU (heuristic only; `-s`/`-ed` hand error 25–32%).
- Di CMU alignment coverage 80% — below gate; no di mechanism partition from CMU units.
- Alignment is probe-only; not a committed aligner; residual **+0.05** on the mass-weighted gap.
- Generator silent-e detection from traces is approximate (surface vs `graphemeSelections`).
- No re-run of full quality harness under hypothetical weight changes.
- Did not touch #449 or its branch.

---

## 8. Tag

`archive/issue-450-spelling-shortfall`

---

## Recommendation

**Clear to decide a spelling fix** aimed at (1) mono coda doubling/`ck`·`tch`·`dge`, (2) mono nucleus polygraphs, (3) soft multiletter codas, (4) silent/magic `e` — in that order. Do **not** chase consonant digraphs for length. Keep onset weighting and the letter band for later steps in the locked order. **Stop here; wait for a decision before any implementation.**
