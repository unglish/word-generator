---
cursor:
  subagentId: "bc-a202ab58-6200-5956-8dff-b3de7f25ab4e"
---

# Ready pass — rebase onto #456 / mark ready

## Rebase

- Base: `origin/main` @ `632c139` (#456)
- Rebased cleanly (5 commits); force-pushed
- Head: `0eacab14` (same tree as pre-rebase `e09e694` spelling commits, atop #456)
- Golden: regenerated; **unchanged**

## #456 impact

`GraphemeTrace.respelled` records spelling-budget certificate whole-unit replacements. It does **not** cover silentE / `ow-cluster-simplify` edits.

- `mono-vowel-spelling.test.ts`: still derives surface from `baseSpelling` edits — correct for vowel digraph bounds; no change; bounds not loosened.
- `root-final-s.test.ts`: #456 **documents** when `ce`/`se` is respelled but does not stop certificates rewriting. Surface≠emitted still happens (1/78 in a 5k probe). Left the #454 workaround; removal would need assertion changes to `respelled?.form`, not just deleting the filter.

## Gates (`npm run check` PASS)

| Gate | Value | Threshold |
|---|---:|---:|
| Phoneme TV | 1.741% | 1.78% |
| Worst over | u 1.060× | 1.08× |
| Worst under | ɪ 0.911× | 0.896× |
| Bigram over | ds 2.964× | 4.25× |
| Trigram over | abl 2.202× | 3.21× |

69 + 13 review test files (was 68 + 13; +`grapheme-respelling.test.ts` from #456).

## Remaining closed poly `ow` (question only)

Morph **off**, 42/43/44 × 50k: closed surface `ow` with coda₀ ∉ {n,l} = **0**.

Morph **on**, same size — selected closed `ow` **427**:

| Cause | n | Rule |
|---|---:|---|
| Single coda n/l | 265 | `rightContext: ["n","l"]` + nonEmpty |
| Cluster starting n/l (nd, nt, ld, lz…) | 57 | same — rightContext matches first coda phone only |
| Stem-final open `ow` + suffix (s/ed) | 17 | open `ow` entry; suffix closes final syllable |
| Other (looks closed-not-n/l) | 88 | `afterCondition` includes open-only `oe` ⇒ **empty coda at selection**; final `word.syllables` coda often prefix/boundary (mis-/dis-/out-) or index vs final structure |

Reviewer’s “~400” ≈ total closed selected `ow` with morph on (427), not exclusively illegal closed-not-n/l.
