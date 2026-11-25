# Per-stage random streams

**Issue:** #556 (stage S0 of #555). Code: `src/core/stage-streams.ts` and the
derivation helpers in `src/utils/random.ts`.

Each stage of word generation draws from its own deterministic random stream.
A change to how one stage draws, such as a new selection engine or one more
spelling roll, leaves the draws of every other stage unchanged. Paired-seed
before→after comparisons then show the effect of the change itself, not a
reshuffle of every later choice.

Before this scheme, one stream ran through the whole word. Any extra or skipped
draw moved every later draw, so a spelling change could alter pronunciations,
and a selection change could alter every spelling. Two special cases worked
around this: a per-attempt morphology look-ahead stream (`lookaheadSeed`), and a
medial-doubling seed taken from the root-length draw (`medialSeed`). Both now
fall under the scheme.

## The word stream and the word key

The word stream is `options.rand` if the caller supplies one, otherwise a
Mulberry32 stream seeded from `options.seed`, otherwise `Math.random`.
`generateWords` shares one word stream across the batch.

Each word takes **exactly two draws** from the word stream, whatever the
configuration, the number of root attempts or whether tracing is on. Each draw
becomes a 32-bit word, `floor(r × 2³²)`, and the pair `(hi, lo)` is the word's
stream key. A draw outside [0, 1) throws a `RangeError`. A batch is therefore
deterministic for a seed, and a caller's stream advances by two draws per word.
A 64-bit key keeps whole-word collisions out of large batches; with one 32-bit
draw, a million-word batch would repeat about a hundred keys.

A caller-supplied `rand` keys the word; it no longer feeds individual choices.
A constant `rand` gives the same word every time, but not, for example, the
first option of every weighted choice.

## Stage streams

A stage's stream is Mulberry32 seeded with

```
seed = fold(fold(fold(fold(0x811c9dc5, fnv1a(stage)), index), hi), lo)
fold(h, x) = fmix32((h ^ x) + 0x9e3779b9)
```

where `fmix32` is the MurmurHash3 32-bit finaliser, `fnv1a` is 32-bit FNV-1a
over the stage name, and `index` is 0 for word stages and `attempt + 1` for
root attempt `attempt` (zero-based). The derivation has no dependencies and no
state beyond the key.

The stage and index go in before the key. Folding the key first would squeeze
it to one 32-bit value shared by every stream, and two keys that met there
would give two identical words (about a hundred pairs per million words).
Folded last, the key reaches each stream through a different 64-to-32-bit map.
Two words can still share one stream's seed, as any 32-bit seed allows, but
not every stream's seed at once.

| Stage | Index | Draws (today's code) |
| --- | --- | --- |
| `set_constraints` | 0 | root phoneme and syllable counts, root edge lengths |
| `plan_morphology` | 0 | affix plan: template and affixes |
| `plan_shape` | attempt | `distributePhonemes` |
| `select_segments` | attempt | `generateSyllables`, including `adjustBoundary` and `repairVowelHiatus` |
| `assign_stress` | attempt | `applyStress` |
| `post_stress_repair` | attempt | stressed and positional nucleus repairs, unstressed-root alternation |
| `preview_morphology` | attempt | affix assembly and final stressed-nucleus repair (was `lookaheadSeed`) |
| `spell` | attempt | root spelling and bare-word gap spellings |
| `finalize_root_spelling` | selected attempt | medial onset doubling (was `medialSeed`) |
| `render_pronunciation` | attempt or selected attempt | `generatePronunciation` |

`repair` (the structural cluster and coda repairs), `score` and
`attach_morphology` draw nothing and have no stream. While they run, the
context holds an RNG that throws, so a new draw there fails loudly until the
stage is given a stream in `src/core/stage-streams.ts`.

The finishing stages run for the selected attempt and use that attempt's
streams. A bare word renders its pronunciation during its attempt, before
scoring, and an affixed word renders it after selection; both use the
`render_pronunciation` stream of the attempt whose root is rendered. A stage
that runs twice within one attempt (bare-word spelling resumes after the
pronunciation is rendered) continues its own stream.

The affix plan has its own stream because it takes a varying number of draws:
a bare plan takes fewer than a suffixed one. Sharing `set_constraints` would let
any affix change move the root edge draws that follow it. A word whose plan
comes out bare is therefore the same word that `morphology: false` gives.

`select_segments` has its own stream so that S1 can put a replaceable selection
engine behind it without moving any other stage's draws.

## Trace

`WordTrace.random` records `{ scheme, key }`: the derivation version
(`stage-streams/1`) and the key as 16 hex digits, `hi` then `lo`. With the table above, they
rebuild any stage's stream for that word. Bump `STAGE_STREAM_SCHEME` whenever a
stage is added, renamed or split, since that changes which numbers a stage
receives.

## Guarantees and tests

`src/core/stage-streams.test.ts` checks that:

- each word takes two draws from the caller's stream, with tracing on or off,
  and a draw outside [0, 1) throws;
- `seed` and an equivalent `rand` give identical words and traces, and
  `generateWords` matches word-by-word generation over one stream;
- a word whose affix plan is bare equals the word generated with morphology
  off;
- extra draws in one stage leave every other stage's draws unchanged. The test
  compares English with every unstressed-root alternation at probability 0
  (it draws but never fires) against English with no alternation rules (no
  draws), and requires identical words.

`src/core/stage-stream-wiring.test.ts` shifts one stage's draws at a time and
checks that:

- every stage in the table reads its own stream: shifting it changes some word;
- shifting the spelling streams leaves the root and the pronunciation alone,
  and shifting the pronunciation stream leaves the root and the spelling alone,
  whenever the same attempt is selected;
- the finishing stages use the selected attempt's streams: shifting another
  attempt's leaves the word unchanged.

Changing a stage's draws still changes that stage's later draws within the word.
Changing which attempt is selected changes the finishing stages' streams,
because they follow the selected attempt.
