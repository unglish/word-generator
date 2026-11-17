# Issue #450 — letter-length diagnosis (main only)

Diagnosis only. No generator, config, or weight changes. No PR.
Evidence tag: `archive/issue-450-diagnosis`. Working packets: Project store `internal/issue-450/`.

**Headline:** Under current main, the monosyllable letter-length gate does not merely trim a short-word deficit — it **distorts phone-count mass toward 4–5 phones**, which then spells as a **4-letter pile-up**. Ungated proposal phones already nearly match CMU; residual spelling is slightly short per phone. Prefer removing/replacing the distorting letter band and fixing phone/shape proposal, not another acceptance-only knob. Re-evaluate #449’s `letterLengthRelaxedAfter` after that; it is a stopgap under the present band, not the root fix.

Method constants unless noted: `origin/main` @ `8da3c1d`; public API `createGenerator` / `generateWord`; lexicon mode; seeds **42 / 43 / 44** × **200k** draws each; figures reported per seed and pooled; CMU from pinned `cmudict.dict` revision `74790861f652b15e4ac49015a90074ad62a27690`, SHA-256 `81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22`, policy `cmu-ascii-first-v1` (117,485 entries). Legacy `data/cmu/cmu-length-baseline.json` cited only where the issue text uses it.

---

## 1. Comparability

### Flaw
Bare generated monosyllables (morphology off) vs **all** CMU monosyllables mixes uninflected and inflected CMU types. The letter gate also scores **roots before affixes**, so morph-on surfaces are a different object than the gate’s decision variable.

### CMU populations
| Population | Mono n | Notes |
|---|---:|---|
| Legacy baseline `bySylLen[1]` (issue text) | 17,011 | 135,158 pronunciation-line artifact |
| Ascii-first joint (pinned contract) | 15,106 | 117,485 selected spellings |

Legacy vs ascii-first mono letter % (selected bins):

| Letters | Legacy CMU | Ascii-first CMU |
|---:|---:|---:|
| 2 | 1.29 | 1.06 |
| 3 | 8.15 | 8.33 |
| 4 | 27.25 | 29.15 |
| 5 | 34.59 | 36.09 |
| 6 | 20.51 | 18.74 |
| 7 | 6.75 | 5.46 |
| Mean | 4.90 | 4.831 |

### Inflection share (ascii-first monos)
**Method:** orthographic heuristic — treat as regular-ish plural `-s`/`-es` or past `-ed`/`-d` when a plausible stem spelling exists as another selected entry. Possessive `-'s` **cannot** appear under ascii-letter-only selection.

| Class | Share of monos |
|---|---:|
| plural-like `-s` with stem present | 19.1% |
| past-like `-ed` with stem present | 7.6% |
| either | **26.8%** |
| neither | 73.2% |

**Error:** false positives (lexical `s`/`ed` endings with coincidental stems); false negatives (stem absent / irregular spelling changes); no POS. Order-of-magnitude useful, not gold morphology. Spot examples retained in `internal/issue-450/packets/cmu-side.json`.

### Like-for-like letter tables (pooled; ascii-first CMU)

Bare gated vs morph-on words that **remain** monosyllabic:

| Letters | CMU | bare gated | morph-stay mono |
|---:|---:|---:|---:|
| 2 | 1.06 | 0.17 | 0.07 |
| 3 | 8.33 | 7.96 | 5.18 |
| 4 | 29.15 | 45.52 | 32.74 |
| 5 | 36.09 | 35.19 | 34.90 |
| 6 | 18.74 | 10.61 | 17.98 |
| 7 | 5.46 | 0.55 | 7.92 |
| Mean | 4.831 | 4.498 | 4.942 |
| Kept / 600k draws | — | 121,582 | 54,619 |

Per-seed bare gated means: 42 → 4.499 (n=40,702); 43 → 4.492 (n=40,290); 44 → 4.503 (n=40,590).  
Per-seed morph-stay means: 42 → 4.945; 43 → 4.932; 44 → 4.949.

Morph-stay is closer on 4/6 and mean, but it is a **filtered morph channel** (zero-syllable affixes / bare plans), not the gate’s root population, and it **overshoots** 7-letter while starving 3-letter.

### Pairing used below
**Bare generated monosyllables (morphology off) vs ascii-first CMU monosyllables.**  
Why: matches the gate’s scored object (roots / bare words), matches #450’s proposal/acceptance question, and uses the pinned corpus contract. Legacy percentages in the issue body are close but not the contract population; morph-stay is reported above as a sensitivity, not the primary comparator.

---

## 2. Ungated

`createGenerator({ ...englishConfig, syllableStructure: { ...letterLengthTargets: undefined } })` — disables acceptance band **and** `letterPeakSamplingWeight` (confirmed by existing tests/docs).

### Mono letter % (pooled)

| Letters | CMU | gated main | ungated |
|---:|---:|---:|---:|
| 1 | 0.17 | 0.00 | 0.24 |
| 2 | 1.06 | 0.17 | 3.60 |
| 3 | 8.33 | 7.96 | 21.95 |
| 4 | 29.15 | 45.52 | 36.32 |
| 5 | 36.09 | 35.19 | 27.76 |
| 6 | 18.74 | 10.61 | 8.94 |
| 7 | 5.46 | 0.55 | 1.12 |
| ≤3 | 9.56 | 8.13 | 25.79 |
| Mean | 4.831 | 4.498 | 4.194 |
| n | 15,106 | 121,582 | 77,817 |

Per-seed ungated means: 4.193 / 4.201 / 4.190.

### Mono phone % (pooled)

| Phones | CMU | gated | ungated |
|---:|---:|---:|---:|
| 1 | 0.24 | 0.18 | 0.31 |
| 2 | 5.73 | 3.61 | 5.52 |
| 3 | 36.22 | 24.28 | 34.46 |
| 4 | 39.96 | 48.46 | 41.14 |
| 5 | 15.58 | 23.12 | 16.95 |
| 6 | 2.20 | 0.35 | 1.60 |
| 7 | 0.07 | 0.00 | 0.02 |

**Ungated phones nearly track CMU; gated phones do not.** The letter band is not a passive trim — it reallocates phone mass into 4–5 and out of 3 and 6.

---

## 3. Decomposition

Identity: \(P(L)=\sum_P P(P)\,P(L\mid P)\).

CMU joint built from the pinned dictionary + ascii-first selection (not the legacy length JSON). Generator joints from the same bare mono draws as §2.

### \(P(L\mid P)\) mean letters (mono)

| Phones | CMU \(E[L\mid P]\) | gated | ungated | gated−CMU |
|---:|---:|---:|---:|---:|
| 1 | 2.42 | 2.04 | ~1.2 | −0.38 |
| 2 | 3.21 | 3.12 | ~2.4 | −0.09 |
| 3 | 4.30 | 3.89 | ~3.5 | −0.41 |
| 4 | 5.06 | 4.49 | ~4.5 | −0.57 |
| 5 | 5.85 | 5.36 | ~5.3 | −0.49 |
| 6 | 6.65 | 6.12 | ~6.2 | −0.53 |

Gated and ungated both spell **short of CMU** given phone count. Gated \(P(L\mid P)\) is also **peak-compressed** (e.g. at 4 phones: CMU 23.5% four-letter / 49.6% five-letter vs gated 55.7% / 39.3%).

### Counterfactuals — letter-distribution L1 vs CMU (total variation ×2)

| Condition | Actual L1 | CF1: gen \(P(P)\) + CMU \(P(L\mid P)\) | CF1 explains | CF2: CMU \(P(P)\) + gen \(P(L\mid P)\) | CF2 explains |
|---|---:|---:|---:|---:|---:|
| bare gated | 0.327 | 0.153 | **53.3%** | 0.484 | **−47.7%** (worsens) |
| bare ungated | 0.468 | 0.021 | **95.6%** | 0.491 | −4.9% |

Per-bin gated gaps (percentage points, gen−CMU):

| L | Actual | CF1 (phones) | CF2 (\(L\mid P\)) |
|---:|---:|---:|---:|
| 3 | −0.4 | −2.7 | +3.8 |
| 4 | **+16.4** | −4.5 | **+20.4** |
| 5 | −0.9 | +3.3 | −7.7 |
| 6 | −8.1 | +3.4 | −9.8 |
| 7 | −4.9 | +0.9 | −4.7 |

**Reading:**  
- **Ungated:** letter mismatch is almost entirely the phone marginal (already close); leftover is mild.  
- **Gated:** phones and spelling interact. The **+16 pp four-letter pile** is primarily a **gated \(P(L\mid P)\)** effect (acceptance shaping which spellings survive), while phone skew explains much of the **global** L1 and the long-bin deficit pattern when spelling is held at CMU. Do not rank a single aggregate as the sole cause — report both levers.

---

## 4. Location

Q3 says **phones are off under the gate**, so structure first; spelling depth via traces for the short \(E[L\mid P]\).

### Onset / coda lengths (monos; CMU via existing #304 `syllabify`, not a new aligner)

| Onset len | CMU % | gated % | ungated % |
|---:|---:|---:|---:|
| 0 | 3.7 | 6.6 | 9.1 |
| 1 | **66.9** | 40.4 | 41.8 |
| 2 | 27.4 | **50.0** | 46.2 |
| 3 | 2.0 | 3.0 | 2.9 |

| Coda len | CMU % | gated % | ungated % |
|---:|---:|---:|---:|
| 0 | 6.3 | 8.4 | 14.1 |
| 1 | **50.3** | 44.5 | 44.4 |
| 2 | 36.4 | 43.6 | 38.1 |
| 3 | 6.9 | 3.6 | 3.5 |

Common shapes: CMU prefers **1-1-1** (32.8%) then **1-1-2** (24.8%); gated prefers **2-1-1** (25.8%), **1-1-2** (21.3%), **2-1-2** (18.3%). Generated monos are **onset-heavy / two-consonant-onset heavy** vs CMU. Ungated is similar in shape, slightly more empty onsets/codas — so shape bias is largely **proposal-side**, while the gate mainly reweights which phone counts survive.

### Letters / phone by position (`trace: true`, seeds 42/43/44 × 2k kept monos, pooled)

| Position | gated mean L/phone | gated multi-letter share | ungated mean | ungated multi |
|---|---:|---:|---:|---:|
| onset | 1.034 | 3.4% | 1.027 | 2.7% |
| nucleus | 1.209 | 20.4% | 1.166 | 16.2% |
| coda | 1.175 | 17.4% | 1.162 | 16.1% |

Overall multi-letter grapheme share: gated **12.8%** vs ungated **11.0%** of selections. No CMU positional grapheme aligner used (none committed for this; see `docs/base-spelling-provenance.md` / `docs/grapheme-selection.md` for generator-side provenance only). Count-level shortfall in §3 stands.

---

## 5. Two-syllable

Same seeds/API; keep words with exactly two syllables. Ascii-first CMU disyllables n=54,063.

### Letter % (pooled)

| Letters | CMU | gated | ungated |
|---:|---:|---:|---:|
| 4 | 3.89 | 0.14 | 6.52 |
| 5 | 15.63 | 5.10 | 18.54 |
| 6 | 28.49 | **42.89** | 27.66 |
| 7 | 27.10 | 34.97 | 24.90 |
| 8 | 15.52 | 15.45 | 14.01 |
| 9 | 6.45 | 1.33 | 5.49 |
| Mean | ~6.75 (legacy) / joint ~ | 6.650 | 6.436 |
| n | 54,063 | 230,587 | 275,898 |

Per-seed gated means ≈ 6.649 / 6.652 / 6.648; ungated ≈ 6.438 / 6.433 / 6.437.

### Phone % (pooled, selected bins)

| Phones | CMU | gated | ungated |
|---:|---:|---:|---:|
| 4 | 16.23 | 7.20 | 15.50 |
| 5 | 34.93 | 36.57 | 34.25 |
| 6 | 29.86 | **44.03** | 30.11 |
| 7 | 12.91 | 9.88 | 13.77 |
| 8 | 3.64 | 1.30 | 4.14 |

### Counterfactuals (gated di L1)
Actual L1 0.445; CF1 (phones) explains **66.6%**; CF2 (\(L\mid P\)) explains **31.5%**. Same qualitative story as monos: **gate warps phone mass**; ungated phones again track CMU closely.

---

## 6. Does the band help? (per letter length, monos)

Closer to ascii-first CMU absolute share:

| Letters | Closer arm | Note |
|---:|---|---|
| 1 | ungated | gated forbids |
| 2 | **gated** | ungated overshoots (3.60 vs 1.06) |
| 3 | **gated** | ungated massively overshoots |
| 4 | **ungated** | gated much worse (+16 vs +7 pp) |
| 5 | **gated** | |
| 6 | **gated** | both short; gated less short |
| 7 | ungated | both badly short |
| 8 | ungated | both near zero |

**Net:** the band **helps ≤3 and 5–6 cosmetics** by crushing ungated’s short-word flood, but it **manufactures the 4-letter excess** and **destroys phone fidelity**. It is not a neutral measurement scaffold.

---

## 7. Ranked proposals + #449 effect

Propose only — not implemented.

### 1. Remove or replace the letter-length acceptance band (and its sampling weight) as a phone-distorting hard filter — **preferred (a)**
- **Changes:** stop using written-length accept/reject (and `letterPeakSamplingWeight`) as the primary length controller; keep phoneme-target matching.
- **Gap:** restores ungated-like phone marginals (already near CMU); removes artificial 4-letter / 4–5-phone pile.
- **Risks:** short-bin flood (2–3 letters) returns; stress coupling documented in `docs/rejection-accounting.md` changes; golden / quality gates move.
- **Measure:** mono+di phone % and letter % vs ascii-first CMU; phoneme TV gate; n-gram; per-seed 42/43/44.

### 2. After (1), fix monosyllable **shape / phone-count proposal** toward CMU
- **Changes:** onset-length mix (cut 2-onset share), coda mix, and/or explicit mono phone-length weights — config/proposal only.
- **Gap:** remaining phone residual once band distortion is gone; supports longer tails (6–7 letters) via more 5–6 phone monos.
- **Risks:** cluster legality, repair load, phoneme-identity gates.
- **Measure:** phone marginals + onset/coda/shape tables vs CMU `syllabify` reference.

### 3. Raise **letters-per-phone** without chasing common-word lists
- **Changes:** nucleus/coda multi-letter grapheme weights; doubling policy review; avoid gap-spelling / word-list levers (out of scope).
- **Gap:** systematic \(E[L\mid P]\) shortfall (~0.4–0.6 letters).
- **Risks:** trigram / illegal digraph regressions; speed.
- **Measure:** \(P(L\mid P)\) tables; trace multi-letter shares by position; quality suite.

### 4. Principled soft gate from CMU/gen ratio tables — **(b), secondary**
- **Changes:** reweight or softly reject using empirical CMU/gen ratios (letters and/or phones), possibly stratified by syllable count.
- **Gap:** can target bins directly.
- **Risks:** if still keyed on **letters**, repeats phone distortion; ratio tables overfit legacy vs ascii-first; becomes another opaque accept loop.
- **Measure:** same as (1), plus show phone marginals **must not** regress vs ungated baseline.

### View on (a) vs (b)
Recommend **(a) first** (remove need for the distorting band), then proposal calibration (2–3). Use **(b)** only as a thin, preferably **phone-stratified** safety rail — not as the primary length engine. A letter-ratio gate without fixing phones would bake in the failure mode #450 already sees.

### Would #449’s `letterLengthRelaxedAfter` still be needed?
**Under today’s band:** yes as a local 2-letter acceptance patch (PR #449’s own data: 2-letter 0.17% → ~1.11% while ≤3 barely moves).  
**After (a)+proposal work:** **likely not**, or only after re-measurement — ungated already **overshoots** 2-letter (3.60% vs 1.06%). Shipping #449 now does not fix the 4-letter / 6–7-letter proposal problem and should not be mistaken for the #450 fix.

### Permanent analyze scripts (propose, do not add yet)
- `npm run analyze:letter-phone-joint` — gen vs ascii-first CMU joints by syllable count; seeds 42/43/44; per-seed + pooled.
- `npm run analyze:length-counterfactual` — CF1/CF2 L1 shares from those joints.
- `npm run analyze:mono-shapes` — onset/coda/shape vs CMU `syllabify`.
Optional: ungated toggle flag on the above.

---

## 8. Corrections posted as issue #450 comment

Comment body prepared and posted via `gh` (see comment URL after push). Corrections only — issue body not rewritten:

1. Comparator should be **ascii-first CMU monos (n=15,106)**, not only legacy `bySylLen[1]` (n=17,011); bin % differ (e.g. 4-letter 29.15% vs 27.25%).
2. ~**27%** of ascii-first monos look like regular `-s`/`-ed` with a stem present; possessive `-'s` is **excluded** by policy — so “all CMU monos” is not an uninflected lexicon.
3. The ≤3 “structural ceiling” under acceptance-only edits is **band-conditioned**. Ungated ≤3 is **~25.8%** (overshoot), not stuck at ~8.2%.
4. The **4-letter excess is worse with the gate on** (45.5%) than ungated (36.3%) vs CMU ~29%; the band is causal, not neutral.
5. Gated mono **phones** diverge sharply from CMU; ungated phones nearly match — so this is not “proposal letter targets only.”
6. #449-style acceptance can open 2-letter bins but **cannot** repair phone distortion or the 4/6/7 pattern; diagnosis recommends band removal/replacement before further acceptance knobs.

---

## 9. Not verified

- Gold morphological annotation of CMU (heuristic inflection share only).
- CMU positional grapheme alignment / letters-per-phone by onset|nucleus|coda on the dictionary (no committed aligner; not built).
- Full quality harness / phoneme TV / n-gram gates under hypothetical fixes (diagnosis only).
- PR #449 branch behaviour beyond its PR description (branch not checked out).
- Text-mode or morph-on primary distributions beyond the morph-stay sensitivity.
- Whether doubling-stress coupling (`docs/rejection-accounting.md`) quantitatively explains part of gated \(P(L\mid P)\).
- Joint builder’s `bySyllables` marginals alone (we rebuilt phone×letter joints from the pinned dict).

---

## 10. Tag name

`archive/issue-450-diagnosis`
