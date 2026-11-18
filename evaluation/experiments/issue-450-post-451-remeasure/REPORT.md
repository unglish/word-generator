---
cursor:
  subagentId: "bc-a3294955-ce01-5ded-9d09-d2f3a1e9bc56"
---

# Issue #450 — post-#451 re-measure

Measurement + report only. No generator, config, or weight changes. No PR.

Parent diagnosis: [`docs/issue-450-letter-length-diagnosis.md`](./issue-450-letter-length-diagnosis.md).  
Packets: `internal/issue-450/packets/post-451/`. Evidence tag: `archive/issue-450-post-451-remeasure`.

**Headline:** After **#451** (revert #443) + **#452** on `origin/main` @ `116e092`, mono **phone** counts are restored: gated 3/4/5 = **34.7 / 40.8 / 16.7%** (matches pre-#443; CMU 36.2 / 40.0 / 15.6%). The band still drives **4-letter excess** (gated **48.9%** vs ungated 36.3% vs CMU 29.2%). Spelling shortfall remains **~0.4–0.6** letters given phones; 2-onset share **44%** vs CMU **27%**. **Clear to start spelling-shortfall work** — no measurement blockers.

Method: public API `createGenerator` / `generateWord`; lexicon; morphology off; seeds **42 / 43 / 44** × **200k** each; per-seed + pooled. CMU ascii-first from pinned `cmudict.dict` revision `74790861f652b15e4ac49015a90074ad62a27690`, SHA-256 `81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22` (**verified**), policy `cmu-ascii-first-v1` (117,485 entries). Ungated = `letterLengthTargets: undefined` (post-#451 this only drops the acceptance band; `letterPeakSamplingWeight` is already gone).

---

## 1. Mono letter-length % (pooled)

| Letters | CMU | gated post-451 | ungated | gated pre-451 (diag) |
|---:|---:|---:|---:|---:|
| 1 | 0.17 | 0.00 | 0.24 | 0.00 |
| 2 | 1.06 | 0.25 | 3.60 | 0.17 |
| 3 | 8.33 | 11.76 | 21.95 | 7.96 |
| 4 | 29.15 | **48.94** | 36.32 | 45.52 |
| 5 | 36.09 | 29.16 | 27.76 | 35.19 |
| 6 | 18.74 | 9.10 | 8.94 | 10.61 |
| 7 | 5.46 | 0.76 | 1.12 | 0.55 |
| ≤3 | 9.56 | 12.01 | 25.78 | 8.13 |
| Mean | 4.831 | 4.375 | 4.194 | 4.498 |
| n | 15,106 | 77,403 | 77,817 | 121,582 |

Per-seed gated means: 42 → 4.372 (n=25,747); 43 → 4.377 (n=25,967); 44 → 4.377 (n=25,689).  
Per-seed ungated means: 4.193 / 4.201 / 4.190.

**Note:** Gated keep rate fell (~20% → ~13% of draws) because #443’s peak sampling no longer steers proposals into the band. 4-letter share returned to the pre-#443 band-on level (~48.9%).

---

## 2. Mono phone-count % — #443 skew gone

| Phones | CMU | gated post-451 | ungated | expect pre-#443 | pre-451 main (skew) |
|---:|---:|---:|---:|---:|---:|
| 1 | 0.24 | 0.26 | 0.31 | — | 0.18 |
| 2 | 5.73 | 5.63 | 5.52 | — | 3.61 |
| 3 | 36.22 | **34.73** | 34.46 | **34.7** | 24.28 |
| 4 | 39.96 | **40.80** | 41.14 | **40.8** | 48.46 |
| 5 | 15.58 | **16.74** | 16.95 | **16.7** | 23.12 |
| 6 | 2.20 | 1.82 | 1.60 | — | 0.35 |
| 7 | 0.07 | 0.01 | 0.02 | — | 0.00 |
| Mean | 3.718 | 3.736 | 3.738 | — | — |

**Confirmed:** gated phones match the pre-#443 expectation to reported precision. Gated ≈ ungated ≈ CMU. Phone skew from #443 is gone; remaining letter skew is not a phone-marginal problem.

---

## 3. Letters given phones — spelling shortfall

Mean letters \(E[L\mid P]\) for monos:

| Phones | CMU | gated | ungated | gated−CMU |
|---:|---:|---:|---:|---:|
| 1 | 2.42 | 2.06 | ~same order | −0.36 |
| 2 | 3.21 | 3.13 | | −0.08 |
| 3 | 4.30 | 3.89 | | **−0.41** |
| 4 | 5.06 | 4.49 | | **−0.56** |
| 5 | 5.85 | 5.36 | | **−0.49** |
| 6 | 6.65 | 6.18 | | **−0.47** |
| 7 | 7.73 | 6.89 | | −0.84 |

Shortfall band for the bulk mass (phones 3–6): **~0.41–0.56 letters**, unchanged in character from the diagnosis. Independent of #451.

---

## 4. Onset / shape (cheap)

| Onset len | CMU % | gated % | ungated % |
|---:|---:|---:|---:|
| 0 | 3.7 | 9.5 | 9.1 |
| 1 | **66.9** | 43.4 | 41.8 |
| 2 | **27.4** | **44.2** | 46.2 |
| 3 | 2.0 | 3.0 | 2.9 |

2-onset share still **44–46% vs CMU 27%** — proposal-side, both arms. Still the later onset-weighting step in the locked order.

---

## 5. Two-syllable summary

Ascii-first CMU disyllables n=54,063. Gated n=276,157; ungated n=275,898.

### Letter % (pooled)

| Letters | CMU | gated | ungated |
|---:|---:|---:|---:|
| 4 | 3.89 | 0.26 | 6.52 |
| 5 | 15.63 | 9.48 | 18.54 |
| 6 | 28.49 | **40.89** | 27.66 |
| 7 | 27.10 | 29.24 | 24.90 |
| 8 | 15.52 | 16.56 | 14.01 |
| 9 | 6.45 | 3.10 | 5.49 |
| Mean | 6.633 | 6.635 | 6.436 |

### Phone % (selected)

| Phones | CMU | gated | ungated | pre-451 gated |
|---:|---:|---:|---:|---:|
| 4 | 16.23 | **15.47** | 15.50 | 7.20 |
| 5 | 34.93 | **34.37** | 34.25 | 36.57 |
| 6 | 29.86 | **30.09** | 30.11 | 44.03 |
| 7 | 12.91 | 13.68 | 13.77 | 9.88 |
| 8 | 3.64 | 4.19 | 4.14 | 1.30 |

Di phone marginals also restored (no more 6-phone pile-up from #443). Letter mean gated ≈ CMU; residual shape is mid-length compression (6-letter excess / short-bin starve) under the band.

---

## 6. Does the band still help / hurt? (mono letters)

Closer to ascii-first CMU absolute share (post-#451):

| Letters | Closer arm | Note |
|---:|---|---|
| 1 | ungated | gated forbids |
| 2 | **gated** | ungated 3.60 vs CMU 1.06 |
| 3 | **gated** | ungated 22% flood; gated still +3.4 pp |
| 4 | **ungated** | gated **+19.8 pp**; ungated +7.2 pp |
| 5 | **gated** | both short; gated less short |
| 6 | **gated** | both short; nearly tied |
| 7 | ungated | both badly short |
| 8 | tie | both near zero |

**Net unchanged:** band still **helps ≤3 cosmetics** (vs short-word flood) and **manufactures the 4-letter excess**. Post-#451 the 4-letter problem is *worse* than on pre-451 main (48.9% vs 45.5%) because #443’s sampling had been partially masking band compression. Do **not** remove the band until spelling + onset work land.

---

## 7. Recommendation

| Question | Answer |
|---|---|
| #443 phone skew gone? | **Yes** — mono 3/4/5 = 34.7/40.8/16.7; di 4/5/6 ≈ CMU |
| Band still cause 4-letter excess? | **Yes** — 48.9% gated vs 36.3% ungated vs 29.2% CMU |
| Spelling shortfall still present? | **Yes** — ~0.4–0.6 letters for phones 3–6 |
| Onset bias still present? | **Yes** — 2-onset ~44% vs 27% |
| Clear to start spelling shortfall? | **Yes — no blockers** |
| Start onset or band next? | **No** — locked order: spelling → onset → band → re-evaluate #449 |

Locked work order remains: **#451 ✓ → re-measure ✓ → spelling shortfall → onset weighting → remove/replace band → re-evaluate #449**.

---

## 8. Artifacts

| Path | Contents |
|---|---|
| `internal/issue-450/packets/post-451/summary.json` | Headline tables + bandCloser |
| `internal/issue-450/packets/post-451/gen-probe-merged.json` | Merged condition payloads |
| `internal/issue-450/packets/post-451/bare-*-{mono,di}/gen-probe.json` | Per-condition raw probes |
| `internal/issue-450/scripts/gen-probe-post451.ts` | Local probe (not for main) |
| CMU side (unchanged) | `internal/issue-450/packets/cmu-side.json`, `cmu-structure-mono.json` |

Tag: `archive/issue-450-post-451-remeasure` (detached evidence; no branch PR).
