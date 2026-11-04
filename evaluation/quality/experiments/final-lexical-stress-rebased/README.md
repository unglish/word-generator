# PR #309 rebased review evidence

Measured against current main `93e934cf0c01ba2e9fa2bc13157d7fe68c21776e` on November 4, 2026.
The candidate generator is the adopted look-ahead design rebased at `713b36a9aef686bc0f57860f0af553cecce43a1a`.
The capture records a dirty generator state because the golden fixture was regenerated with
`npm run golden:update`; no runtime generator changes followed the rebase.

## Design and integration

Each root attempt applies the planned affix's stress changes and final nucleus repair,
then spells the root once. Affix choices use a separate per-attempt RNG stream.
Repaired root syllables use final-word stress for spelling; other syllables use root stress.
Surface pronunciation is realized once, after the selected root is assembled with its affixes.
The lexical schwa weight remains 560 and all phoneme gate limits are unchanged.

Conflict resolution preserves #380's property-located examples and all root-stage guarantees.
The obsolete re-pinning commit becomes empty. The single golden fixture was regenerated
because lexical stress, pronunciation timing, affix RNG isolation, and the adopted schwa
retune intentionally change output and RNG consumption.
The allomorph evidence analyzer now reads `lexical.root` when available, retaining its
root-only pronunciation-stage fallback for historical archives; both formats are tested.
Issue #381's ea spellings remain out of scope.

## Ten-seed phoneme calibration

Both revisions ran `npm run calibrate:phonemes -- --count 10 --jobs 4 --output ...`:
200,000 words per seed, lexicon mode, morphology off. The script's proposed thresholds
were not adopted. Current limits: r >= 0.9983, over <= 1.066, representation >= 0.918,
absolute gap <= 0.39 pp; non-CMU mass and missing CMU keys must both be zero.

| Seed | r branch / main | Max over branch / main | Min representation branch / main | Max gap pp branch / main |
|---:|---:|---:|---:|---:|
| 42 | 0.998471 / 0.998478 | 1.0455 / 1.0481 | 0.9486 / 0.9527 | 0.3057 / 0.3223 |
| 189550743 | 0.998400 / 0.998482 | 1.0505 / 1.0486 | 0.9489 / 0.9360 | 0.3400 / 0.3323 |
| 379101444 | 0.998355 / 0.998546 | 1.0503 / 1.0473 | 0.9452 / 0.9380 | 0.3172 / 0.3061 |
| 568652145 | 0.998486 / 0.998298 | 1.0467 / 1.0527 | 0.9489 / 0.9493 | 0.2840 / 0.3545 |
| 758202846 | 0.998267 / 0.998469 | 1.0558 / 1.0440 | 0.9464 / 0.9380 | 0.3244 / 0.3766 |
| 947753547 | 0.998348 / 0.998376 | 1.0547 / 1.0477 | 0.9503 / 0.9404 | 0.3513 / 0.3576 |
| 1137304248 | 0.998475 / 0.998328 | 1.0486 / 1.0517 | 0.9509 / 0.9439 | 0.3160 / 0.3555 |
| 1326854949 | 0.998488 / 0.998456 | 1.0516 / 1.0482 | 0.9530 / 0.9544 | 0.2966 / 0.3366 |
| 1516405650 | 0.998553 / 0.998270 | 1.0442 / 1.0539 | 0.9488 / 0.9432 | 0.3074 / 0.3730 |
| 1705956351 | 0.998401 / 0.998493 | 1.0471 / 1.0463 | 0.9429 / 0.9509 | 0.3345 / 0.3323 |

All seeds have zero normalization losses, zero non-CMU mass, and zero missing CMU keys.
The ranges reproduce the October 19 report. The branch has one below-floor r:
seed 758202846, 0.9982665111. Main has two at full precision: seed 568652145,
0.9982983732, and seed 1516405650, 0.9982703342. The first rounds to 0.99830;
the earlier “one seed on both” summary obscured this. Seed 42, used by CI, passes on both.
Every other metric passes on every seed. No further tuning was performed.

## Quality comparison

Each capture uses the fixed development protocol: four profiles, five seeds each,
10,000 words per stream, 200,000 words per revision, all with tracing.
`quality:compare` verified both summaries and their compatible evaluator, protocol,
references, runtime, and dependencies. See [the full report](quality-comparison.md)
and its compressed JSON for denominators, strata, and per-stream ranges.

In lexicon-default, missing primary stress falls from 2,529/47,078 polysyllables to
0/47,116; primary schwa from 812/50,000 to zero; primary reduced vowels from
322/50,000 to zero. In text-default, these counts fall from 7,898, 702, and 73 to zero.
Forced bare monosyllables contain schwa in 10,615/50,000 main outputs and 0/50,000
candidate outputs. Every candidate profile has zero sampled standalone schwa cases.

Tradeoffs remain visible: adjacent primary/secondary stress in disyllables increases
31.780% -> 39.718% in lexicon-default and 17.545% -> 41.020% in text-default.
Zero-total-weight grapheme choices move 6.246% -> 6.238% in lexicon-default,
6.144% -> 6.362% in lexicon-bare, and 2.396% -> 2.592% in text-default.
Lexicon-default hiatus fallback moves 8.854% -> 9.040%, duplicate codas
0.494% -> 0.562%, and final open checked vowels 1.098% -> 1.212%.
These are descriptive diagnostics, not an automatic overall quality pass or human preference evidence.
Orthographic mismatch still compares root-owned spelling with the whole affixed word;
it is not proof that the new root trace is stale.

## Trace witnesses

`generateWord({ seed: 11, morphology: true, trace: true })` produces `sarininive`,
IPA `ˌsɑ.rɪˈnɪn.əv`, with planned suffix `ive`:

- `applyStress`: root nuclei /ɑ ɪ ə/, stress primary / none / none.
- `assembleMorphology`: root stress becomes secondary / none / primary.
- `repairFinalStressedNuclei`: promoted root syllable 2 changes /ə/ -> /ɪ/.
- `generateWrittenForm.before`: primary / none / primary. The unrepaired first
  syllable retains root primary stress; repaired syllable 2 uses final primary stress.
- `graphemeSelections`: syllable 2 chooses phoneme /ɪ/, grapheme `i`.

The complete word and trace are in [trace-witness.json](trace-witness.json).
The archived main witness [main-schwa-witness.json](main-schwa-witness.json) is
`smarn` /smərn/, forced-monosyllable stream seed 3297327738, draw 2:
`applyStress` and `generatePronunciation` both retain /ə/ with no lexical primary.
The candidate corpus has zero such cases; this is a sampled invariant, not a claim
of exhaustively checking all seeds. RNG positions are not matched-word pairs.

## Validation and performance

`npm run check` passes: 738 generator/quality tests passed, one pre-existing skip,
and 260 review tests passed. `npm run build` and `npm run test:diagnostics` pass
(the latter has six tests). The first check attempt exposed and led to the analyzer
fix above; it also hit sandbox-denied temporary Git metadata and a CPU-contention
hook timeout. The complete rerun passed with Git-worktree access and calibration finished.

After all captures and checks completed, three alternating branch/main runs of
`npm run test:perf` all passed both the 4,500 words/sec throughput floor and batch
variance gate. Each run measures 10,000 words with seed 42 after the suite's warmup.

| Run | Branch words/sec | Main words/sec |
|---|---:|---:|
| 1 | 6,837 | 7,269 |
| 2 | 6,710 | 7,125 |
| 3 | 6,854 | 6,647 |
| Median | 6,837 | 7,125 |

Median throughput is 4.04% lower (4.21% more time per word), close to the accepted
historical ~3.5% slowdown. Main's third run shows the wall-clock noise; these are
three local observations, not a precise confidence interval or isolated benchmark.

Full raw captures, manifests, sources, and logs are retained locally in
`memory/pr309-review/`; do not delete them when removing this worktree without backing them up.
The compact gate, quality, and trace evidence is committed here. No merge was performed.
