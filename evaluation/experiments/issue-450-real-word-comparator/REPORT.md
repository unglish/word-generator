---
cursor:
  subagentId: "bc-a202ab58-6200-5956-8dff-b3de7f25ab4e"
---

# Issue #450 — real-word comparator (Part 1)

Measurement only. No generator/config/weight/test changes. No branch commits.  
Prior shortfall report: [`issue-450-spelling-shortfall.md`](./issue-450-spelling-shortfall.md) (superseded as an action basis).  
Packets: `internal/issue-450/packets/real-word-comparator/`. Tag: `archive/issue-450-real-word-comparator`.

**Headline:** Against **uninflected SCOWL≤60 ∩ ascii-first CMU monos** (n=3,734; aligned 92.8%), ungated bare mono mass-weighted \(E[L\mid P]\) gap is **~0.35** (not 0.58). **Vowel spelling strategy** explains **~0.22** letters/word (digraph/trigraph **+0.16**, split digraph **+0.07**). Doubling extras vs this comparator are only **~0.03**/word — agreeing with the review that raising `doubling.probability` cannot close 0.15–0.19. **Part 2 gate: PASS.**

Checkout: `origin/main` @ `116e092`. CMU SHA-256 `81917843…` verified.

---

## 1. Word list pin

| Field | Value |
|---|---|
| Source | **SCOWL** (Spell Checker Oriented Word Lists) |
| Version | **2020.12.07** |
| Tarball URL | `https://downloads.sourceforge.net/project/wordlist/SCOWL/2020.12.07/scowl-2020.12.07.tar.gz` |
| Tarball SHA-256 | `5587667caa20c4891390c2d42dbb4d5c4c3f41bee77af1457ece3ba23fb859cc` |
| Homepage | http://wordlist.aspell.net/ |
| Licence | Tarball `Copyright`: collective work © 2000–2018 Kevin Atkinson — permission to use/copy/modify/distribute/sell without fee if copyright + permission notice appear in supporting documentation. Components include public-domain MWords / 12Dicts / ENABLE contributions and WordNet-derived inflection data under Princeton terms. |
| Selection | `final/english-words.{10,20,35,40,50,55,60}` ∪ `final/american-words.{…}` — **exclude** proper-names, upper, abbreviations, contractions; lowercase ascii-letter-only |
| Derived list SHA-256 | `a9b5c77aa5d9096046964e2927e94f82bd0f32088945f6265dc9aa62155fea6b` (n=77,103) |
| Kept out of repo | Fetch recipe in `packets/real-word-comparator/wordlist-pin.json` |

Optional frequency view (not primary): repo `data/norvig/google-books-common-words.txt` SHA-256 `61753219…` (Norvig / Google Books common words).

### Hand-checks (fixed seeds)

| Check | Seed | Result |
|---|---:|---|
| 100 **kept** for names/junk | 450101 | **0/100** after manual review. Seven SCOWL proper-name overlaps (`wake`, `lake`, `chuck`, `cruise`, `char`, `midge`, `quint`) are ordinary English lexemes — not counted as junk. |
| 100 **dropped** for ordinary English | 450102 | **2/100** ordinary misses (`cheque`, `shorn`). Rest mostly surnames/opaque loans (~25% also in SCOWL proper-names). |

Gate (1): kept name/junk **0% < 5%** — **pass**.

---

## 2. Comparator sizes

| Population | n |
|---|---:|
| Ascii-first CMU monos | 15,106 |
| ∩ SCOWL≤60 (kept) | 6,846 |
| Dropped | 8,260 |
| Kept uninflected (heuristic; stem also in wordlist) | **3,734** |
| Kept inflected (`-s`/`-ed`-like) | 3,112 |

### Primary = uninflected real words

| Stat | Value |
|---|---:|
| Mean letters | **4.321** |
| Mean phones | **3.458** |
| Phone % 3/4/5 | 45.9 / 36.9 / 8.1 |

Ungated generator bare mono phone mean remains **~3.73–3.74** (from traces) vs comparator **3.46** — phone-shape mismatch noted for **later onset/shape work**; not acted on here.

Inflection heuristic error rates on this kept set (form check, ≤100/class): plural_s **0%**, past_ed **0%**, none **0%** in samples (stricter stem-in-wordlist rule than the earlier all-CMU heuristic).

---

## 3. Alignment + mechanisms

### Alignment on uninflected comparator

| | |
|---|---|
| Coverage | **92.8%** (3,466 / 3,734) |
| Hand-check (seed 450201, n=100) | hard errors **0%**; 1 soft flag (`drawer`) |

Gate (2): coverage ≥85% and hand error ≤5% — **pass**.

### Mechanism table (letters/word; CMU uninflected aligned − ungated gen)

Target phone-conditional gap: **0.345**.

| Mechanism | CMU | gen | **Δ** |
|---|---:|---:|---:|
| Vowel digraph/trigraph | 0.325 | 0.169 | **+0.156** |
| Vowel split digraph (V+C+e / soft `ce`·`ge`·`ve`·`se`) | 0.181 | 0.112 | **+0.069** |
| Final `e` with no vowel function | 0.016 | 0.000 | +0.016 |
| Doubling / ck·tch·dge **permitted** by generator rules | 0.101 | 0.082 | +0.019 |
| Doubling **not** permitted | 0.016 | 0.006 | +0.010 |
| Consonant digraphs | 0.160 | 0.139 | +0.021 |
| Other silents | 0.010 | 0.000 | +0.010 |
| Other (>0.03 bucket) | 0.067 | 0.013 | +0.054 |
| **Sum** | | | **0.354** |
| **Residual vs 0.345** | | | **−0.010** |

**Contradiction check vs prior shortfall report:** That report’s doubling contribution (~0.19) and LGP gap (~0.58) were inflated by surnames / all-CMU. Here doubling is **~0.03** total and vowel strategy dominates — **agrees with the review; does not support acting on `doubling.probability`.**

Gate (3): vowel spelling strategy gap **0.224 ≥ 0.08** — **pass**.

### Per-vowel strategy shares (aligned CMU vs gen; selected phones)

| Phoneme | CMU n | CMU single / digraph / split | gen n | gen single / digraph / split |
|---|---:|---|---:|---|
| ɪ | 403 | 0.91 / 0.00 / 0.09 | 2628 | 0.95 / 0.00 / 0.05 |
| æ | 365 | 0.95 / 0.00 / 0.05 | 2718 | 0.95 / 0.00 / 0.05 |
| ɛ | 311 | 0.74 / **0.14** / 0.12 | 3246 | 0.95 / **0.00** / 0.05 |
| ɑ | 301 | 0.90 / 0.04 / 0.07 | 3743 | 0.90 / 0.07 / 0.03 |
| eɪ | 299 | 0.01 / **0.43** / **0.56** | 1813 | **0.34** / 0.25 / 0.42 |
| i: | 272 | 0.04 / 0.91 / 0.05 | 1430 | 0.00 / 1.00 / 0.00 |
| əʊ | 239 | 0.22 / **0.36** / 0.43 | 737 | 0.47 / **0.08** / 0.45 |
| aɪ | 232 | 0.19 / 0.19 / 0.63 | 1385 | 0.43 / 0.09 / 0.48 |
| ɔ | 232 | 0.54 / **0.33** / 0.13 | 1748 | 0.95 / **0.00** / 0.05 |
| u | 202 | 0.06 / **0.76** / 0.18 | 982 | 0.20 / 0.59 / 0.21 |
| ɜ | 114 | 0.00 / **1.00** / 0.00 | 545 | **0.90** / 0.05 / 0.05 |
| aʊ | 103 | 0.00 / 1.00 / 0.00 | 112 | 0.00 / 1.00 / 0.00 |
| ʊ | 41 | 0.27 / **0.66** / 0.07 | 342 | 0.95 / **0.02** / 0.04 |
| ɔɪ | 33 | 0.00 / 1.00 / 0.00 | 95 | 0.00 / 1.00 / 0.00 |

Largest digraph shortfalls: **ɜ, ʊ, ɔ, əʊ, eɪ, ɛ, u, aɪ**. Split-digraph shortfall mainly **eɪ, aɪ**. Lax singles (æ, ɪ) already match.

---

## 4. Part 2 gate

| Condition | Result |
|---|---|
| Kept hand-check name/junk <5% | **PASS** (0%) |
| Alignment coverage ≥85% and hand error ≤5% | **PASS** (92.8%, 0% hard) |
| Vowel strategy accounts for ≥0.08 letters/word | **PASS** (0.224) |

**All clear → Part 2 (monosyllable vowel spelling lever) may proceed.**

---

## 5–7. Part 2 / gates / unverified

See follow-on [`issue-450-vowel-spelling-lever.md`](./issue-450-vowel-spelling-lever.md) if Part 2 runs; otherwise N/A.

**Unverified:** frequency-weighted SCOWL∩Norvig joint as primary (Norvig recorded only as optional); gold morphology; di real-word comparator; full quality harness under hypothetical weights.

---

## 8. Tag

`archive/issue-450-real-word-comparator`
