# Per-stage random streams

**Issue:** #556 (stage S0 of #555). Code: `src/core/stage-streams.ts`, which is
internal: the derivation is not part of the package's public API.

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
| `spell` | attempt | root spelling and bare-word gap spellings (see below) |
| `finalize_root_spelling` | selected attempt | medial onset doubling (was `medialSeed`) |
| `render_pronunciation` | attempt or selected attempt | `generatePronunciation` |

`repair` (the structural cluster and coda repairs), `score` and
`attach_morphology` draw nothing and have no stream.

Each root attempt's context carries that attempt's streams. Every stage that
runs on the context, including the finishing stages of the selected attempt,
binds its stream with `inStage(context, stage, ...)` in `src/core/generate.ts`
for exactly the code of the stage, and puts back what was bound before when
the stage ends. Between stages the context holds an RNG that throws, so a new
draw outside a stage fails loudly. The stages that run before there is a
context (`set_constraints`, `plan_morphology`, `plan_shape`) take their stream
as an argument.

The finishing stages run for the selected attempt and use that attempt's
streams. A bare word renders its pronunciation during its attempt, before
scoring, and an affixed word renders it after selection; both use the
`render_pronunciation` stream of the attempt whose root is rendered. A stage
that runs twice (bare-word spelling resumes after the pronunciation is
rendered) continues its own stream.

Streams separate draws, not data. A bare word's gap spellings are exact
whole-word overrides matched against its realized syllables, so a different
vowel reduction can change which override applies: the `render_pronunciation`
stream can then change that word's spelling. In English only the two-syllable
overrides (*any*, *people*) can be reached this way. Affixed words render after
spelling and are not affected.

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
stage is added, renamed or split, or the fold changes, since that changes which
numbers a stage receives. Known-answer vectors in `stage-streams.test.ts` pin
every stage's seed for a fixed key, and the first draws of streams built from a
fixed caller stream, so any such change fails there and not only in the golden
fixture.

## Guarantees and tests

`src/core/stage-streams.test.ts` checks that:

- every stage's seed for a fixed key matches its known-answer vector, every
  stage has one, and streams built from a fixed caller stream draw known first
  values (which pins the key, the attempt index and the generator);
- each word takes two draws from the caller's stream, with tracing on or off,
  and a draw outside [0, 1) throws;
- tracing takes the same number of draws from every stage stream;
- `seed` and an equivalent `rand` give identical words and traces, and
  `generateWords` matches word-by-word generation over one stream;
- a word whose affix plan is bare equals the word generated with morphology
  off;
- extra draws in one stage leave every other stage's draws unchanged. The test
  compares English with every unstressed-root alternation at probability 0
  (it draws but never fires) against English with no alternation rules (no
  draws). It requires identical words and identical draw counts in every
  stream except `post_stress_repair`, and that `post_stress_repair` does draw
  more for many seeds.

Both files use the probe in `src/test-support/stage-stream-probe.ts`, which
counts each stage stream's draws (`withStageDraws`) or shifts one stage's draws
(`withShiftedStage`) through an internal hook in `stage-streams.ts`. Other
tests use it to show that tracing or an inert config draws nothing: identical
words alone cannot show that, because a draw at the end of a stage's stream
changes no word.

The golden fixture (`src/core/golden-output.json`) records each stage's draws
for each case. When a change moves a draw to another stage's stream, which the
wiring test below cannot always see, the fixture diff shows draws leaving one
stage and arriving in another.

`src/core/stage-stream-wiring.test.ts` shifts one stage's draws at a time and
checks that:

- every stage in the table reads its own stream: shifting it changes some word;
- shifting the spelling streams leaves the root and the pronunciation alone,
  and shifting the pronunciation stream leaves the root and the spelling alone
  (apart from gap spellings, above), whenever the same attempt is selected;
- the finishing stages use the selected attempt's streams: shifting another
  attempt's leaves the word unchanged.

Changing a stage's draws still changes that stage's later draws within the word.
Changing which attempt is selected changes the finishing stages' streams,
because they follow the selected attempt.
