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

Every stage stream is a window on Mulberry32's single cycle of 2³² states, and
the seed only picks where the window starts. Two streams, of one word or of
two words, can therefore cover overlapping stretches of the cycle, offset from
each other. They overlap about as often as random starting points would: over
1.6 million streams, about 300 pairs share a seed and about 18,000 pairs share
part of their draws. Seeds spaced along the cycle (as the diagnostics' default
seeds are) keep word keys distinct, not stage streams apart.

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
for exactly the code of the stage. Between stages the context holds an RNG that
throws, so a new draw outside a stage fails loudly, and stages do not nest:
`inStage` throws when called inside another stage. The stages that run before there is a
context (`set_constraints`, `plan_morphology`, `plan_shape`) take their stream
as an argument.

The finishing stages run for the selected attempt and use that attempt's
streams. A bare word renders its pronunciation during its attempt, before
scoring, and an affixed word renders it after selection; both use the
`render_pronunciation` stream of the attempt whose root is rendered. A stage
that runs twice (bare-word spelling resumes after the pronunciation is
rendered) continues its own stream. `src/test-support/stage-run-order.ts`
records the order for each kind of word, and the wiring test checks it against
every attempt's draws.

Streams separate draws, not data. A bare word's gap spellings are exact
whole-word overrides matched against its realized syllables, so a different
vowel reduction can change which override applies. The gap spelling is applied
before the attempt is scored, so the `render_pronunciation` stream can change
not only that word's spelling but its letter count, its score, which attempt is
selected and with it the root. In English only the two-syllable overrides
(*any*, *people*) can be reached this way. Affixed words render after spelling
and selection and are not affected.

Medial doubling is a second such path. It reads the word's syllables, which for
a bare word are the realized ones, since its pronunciation is already rendered,
and for an affixed word are the ones before realization. With
`reduceSecondaryStress: true`, a reduced vowel can therefore change whether a
bare word's medial onset doubles. English sets it to false and reduces only lax
vowels the doubler does not check, so English cannot reach this path.

The affix plan has its own stream because it takes a varying number of draws:
a bare plan takes fewer than a suffixed one. Sharing `set_constraints` would let
any affix change move the root edge draws that follow it. A word whose plan
comes out bare is therefore the same word that `morphology: false` gives.

`select_segments` has its own stream so that S1 can put a replaceable selection
engine behind it without moving any other stage's draws.

## Trace

`WordTrace.random` records `{ scheme, key }`: the derivation version
(`stage-streams/1`) and the key as 16 hex digits, `hi` then `lo`. A `rand` that
returns `hi / 2**32` and then `lo / 2**32` regenerates the word through the
public API, with the same config, options and package version.

The scheme versions the derivation only: how the key is drawn, the stage-name
hash, the index and the fold. Bump `STAGE_STREAM_SCHEME` when any of these
changes, since every stream then changes. Adding, renaming or splitting a stage
changes that stage's streams under the same derivation and needs no bump, like
any other change to generation; the golden fixture shows it. Known-answer
vectors in `stage-streams.test.ts`, next to the pinned scheme string, give every
stage's seed for a fixed key and the first draws of streams built from a fixed
caller stream. Changing an existing vector's value needs a new scheme; adding
or removing a stage's row does not.

## Guarantees and tests

`src/core/stage-streams.test.ts` checks that:

- every stage's seed for a fixed key matches its known-answer vector, every
  stage has one, and streams built from a fixed caller stream draw known first
  values (which pins the key, the attempt index and the generator);
- each word takes two draws from the caller's stream, with tracing on or off,
  and a draw outside [0, 1) throws;
- a traced word's key regenerates it through the public API;
- `inStage` refuses to nest and leaves the context between stages;
- tracing gives the same words and takes the same number of draws from every
  stage stream;
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
counts each stage stream's draws (`withStageDraws`), records the order stages
draw in (`withStageRuns`) or shifts one stage's draws (`withShiftedStage`)
through an internal hook in `stage-streams.ts`. Other tests use
`expectSameWordsAndDraws` (`src/test-support/expect-same-draws.ts`) to show that
tracing or an inert config draws nothing: identical words alone cannot show
that, because a draw at the end of a stage's stream changes no word.

The golden fixture (`src/core/golden-output.json`) records, for each case, the
draws of each word stage and of each attempt stage on every word's first root
attempt. That attempt always runs, in the order `stage-run-order.ts` records
for its kind of word, so a change leaves the counts of every stage that runs
before it unchanged. When a change moves a draw into an earlier stage's stream, which
the wiring test below cannot always see, the fixture diff shows draws arriving
in that earlier stage. Totals over all attempts would not show it: a change that
alters output changes which attempts run, and with them every stage's total.
The finishing stages draw on the first attempt only when it is selected, so
their counts also move with selection.

`src/core/stage-stream-wiring.test.ts` shifts one stage's draws at a time and
checks that:

- every stage in the table reads its own stream: shifting it changes some word;
- every attempt's stages draw in the order `stage-run-order.ts` records;
- shifting the spelling streams leaves the root and the pronunciation alone,
  and shifting the pronunciation stream leaves the root and the spelling alone
  whenever the same attempt is selected. Gap-spelled words are left out of the
  second check, since their pronunciation draws can change the spelling and the
  selected attempt (above);
- the finishing stages use the selected attempt's streams. Over words whose
  selected attempt is a later one and draws from the stage, shifting another
  attempt's stream leaves the word unchanged, and shifting the selected
  attempt's changes some words. For `render_pronunciation` this includes
  fallback words whose selected attempt is not the last one run;
- shifting a stage leaves the first attempt's draws in every stage that runs
  before it for that kind of word unchanged, which is what the golden fixture's
  counts rely on. `preview_morphology` is left out, because its first attempt
  draws in about one word in 1,000.

Changing a stage's draws still changes that stage's later draws within the word.
Changing which attempt is selected changes the finishing stages' streams,
because they follow the selected attempt.
