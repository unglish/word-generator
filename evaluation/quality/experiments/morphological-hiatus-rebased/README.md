# PR #316 rebased review evidence

Measured on November 4, 2026 against main `e65d87e730fd4aa38277bd278c711aea7c7483e5`
(after #309, #310, #386 and #385). Candidate generator:
`2889826f5ec8d04f55d0ba489bfa0b70e4588dc7`, clean. Later commits on the branch
change only docs and evidence, not generator source.

## What changed in the rebase

The original single #316 commit rebased onto main with no conflicts. Four
follow-up changes were needed because main had moved:

- `src/core/morphology/hiatus.test.ts`: since #309, `syllableCount` sets the
  root's syllable count, and affix phonemes no longer count against the root's
  phoneme target. The fixed-boundary fixture now asks for one root syllable and
  a root-only target. Before this fix it asked for 2–3 root syllables, so
  within-root hiatus repair inserted an /h/ that the fixture's small grapheme
  table could not spell (`No legal grapheme for /h/`). The seed-3 `broing` check
  became a property search, following the #380 rule that tests must not pin a
  seed to a word. Under the legacy policy, some word in a stream has an inserted
  /h/ with no written `h`; under English, the stream has no fallback events and
  every recorded decision is `preserved`.
- `src/core/lexical.test.ts`: the bridge-attribution test needs a bridge, so it
  now enables the custom prefix fallback explicitly.
- `evaluation/quality/probes/morphological-hiatus/analyze.test.ts` was removed.
  It used `node:test`, pinned seeds to words (`broing`, seed 404), and no longer
  typechecks now that main's `tsconfig.quality.json` covers probes. #310's
  archived probe likewise keeps only `README.md` and `analyze.ts`. The original
  probe and the `evaluation/experiments/morphological-hiatus/` archives stay as
  historical pre-#309 evidence. Their numbers are stale.
- The `MorphHiatusDecisionTrace` comment now matches the post-#309 order:
  decisions are recorded before final stress repair and pronunciation.

`src/core/golden-output.json` was regenerated with `npm run golden:update`. Only
3 of 160 golden words change, all in "lexicon, morphology", all in pronunciation
only. Spelling and RNG draw counts are unchanged:

| Spelling | Main | Branch |
|---|---|---|
| reasparl | ˌrɪˈhæs.pɚl | ˌrɪˈæs.pɚl |
| reupenetion | ˌrɪˌhəˈpʰi:n.ʃən | ˌrɪˌəˈpʰi:n.ʃən |
| reecockalenal | ˌrɪˌhi:.kʰəˌkʰəlˈɛn.əl | ˌrɪˌi:.kʰəˌkʰəlˈɛn.əl |

## Why the original CI failed, and why it no longer does

The original PR failed one gate: the rarest common trigram `ugh` measured
0.00614× its CMU frequency, against a 0.0062× floor. Main has since made that gate
report-only (`6dc0782d`, `TRIGRAM_UNDERREP_GATE_BLOCKING`), because about 6
occurrences per 200,000 words is below the margin seed noise can flip. It was not
loosened for this PR. On the rebased branch, `ugh` reads 0.0168× in any case
(main: 0.0140×).

## Trace evidence

Same public-API stream on both sides (`createSeededRng(316)`, `generateWord` with
`morphology: true, trace: true`). Draw indices are evidence, not test pins.

Text mode, draw 5, written `showing` on both sides (root `show` + suffix `ing`):

| | Main | Branch |
|---|---|---|
| Pronunciation | ˈʃəʊ.həŋ | ˈʃəʊ.əŋ |
| Syllables (onset.nucleus.coda) | ʃ.əʊ. / h.ə.ŋ | ʃ.əʊ. / .ə.ŋ |
| `structural` | `morphSuffixHiatusFallback` inserted `h`, syllable 1 | `morphHiatusDecision` root-suffix, 0→1, `əʊ`/`ɪ`, `fallbackEnabled: false`, `preserved` |
| Root grapheme units | /ʃ/→sh /əʊ/→ow | /ʃ/→sh /əʊ/→ow |
| `morphology` emitted parts | root `show`, suffix `ing` | root `show`, suffix `ing` |

Main's /h/ has no grapheme unit. The root writer sees only the root's phonemes
plus the suffix's written text (`orthographyFollowing`), and the suffix's
letters are fixed. So the bridge is pronounced but never spelled.

Lexicon mode, draw 24, written `preechditese` on both sides (prefix `pre`):
main /ˌpʰri:ˈhɛtʃ.dəˌti:z/ with `morphPrefixHiatusFallback` at syllable 1; branch
/ˌpʰri:ˈɛtʃ.dəˌti:z/ with a `preserved` prefix-root decision (`i:`/`ɛ`). Root
grapheme units are identical.

### #310 interaction

The root is spelled from its own syllables plus the suffix's written text, so
the bridge /h/ never entered root spelling. Removing it cannot reach the
`No legal grapheme` path. In 80,000 traced words (lexicon and text, 20,000 per
side), no generation threw, and every `zero-total-weight` diagnostic in the
quality comparison stays at 0.

## Is any side effect structural? (#309 interaction)

On the same stream, main and branch spellings are identical for the first 427
lexicon words and 326 text words, then diverge. Cause: the bridge draw came from
#309's per-attempt look-ahead stream. Without it, later look-ahead draws
(stressed-nucleus re-picks) shift, which can change a carried root nucleus
repair, and so the root's spelling draws and attempt selection.

Control (not shipped): a temporary build kept the disabled policy's bridge draw
but discarded the result. Across 20,000 lexicon words it matched main exactly
in every spelling. Exactly the 1,198 words with a main fallback differed in
pronunciation, and once the inserted /h/ onset was removed their syllables
(onsets, nuclei, codas, stress) were identical to main's in every case. So the
only structural change is the deleted /h/. Every other difference in the
quality comparison below comes from resampling the look-ahead stream. Spending
a dead RNG draw to keep streams paired would be a workaround, so it was not
adopted.

Over those 20,000 words the branch recorded 1,229 lexicon boundary decisions
(402 prefix-root, 827 root-suffix) and 524 text decisions (174 / 350). All were
`preserved`, and none had a final-structure mismatch (left coda and right onset
empty, both nuclei present). All 1,737 main fallback events in these streams
inserted /h/.

## Quality comparison (`npm run quality:pr -- --base origin/main`)

Full report: [quality-comparison.md](quality-comparison.md) (JSON alongside).
200,000 words per side, four profiles, five seed streams each.

| Profile | Affixed words with a morphological hiatus fallback | Phoneme JSD (bits) | Trigram JSD (bits) | Unique spellings |
|---|---|---|---|---|
| lexicon-default | 3,022/35,092 (8.612%) → 0/35,098 (0%) | 0.004738 → 0.004413 | 0.145941 → 0.146331 | 49,496 → 49,492 |
| text-default | 1,369/22,287 (6.143%) → 0/22,266 (0%) | 0.006264 → 0.006207 | 0.155761 → 0.155798 | 39,314 → 39,286 |
| lexicon-bare | n/a (no affixes) | unchanged | unchanged | unchanged |
| monosyllables-bare | n/a (no affixes) | unchanged | unchanged | unchanged |

Every replicate stream moved the hiatus rate the same way (lexicon −9.33 to −7.98
pp; text −6.48 to −5.51 pp). The other diagnostics move by under 0.12 pp, with
replicate ranges that straddle zero. Examples: lexicon disyllabic primary/secondary
stress adjacency 40.350% → 40.312% (range −0.62 to +0.89), text 40.455% → 40.564%
(range −0.14 to +0.29). Mean letters fall by 0.005. Bare profiles are
identical on every reported metric, as expected.

## Gates (seed 42, limits unchanged)

| Measure | Main | Branch | Limit |
|---|---|---|---|
| Phoneme total variation | 1.640% | 1.640% | ≤ 1.78% |
| Pearson r (report-only) | 0.99829 | 0.99829 | — |
| Max over-representation | /k/ 1.055× | /k/ 1.055× | ≤ 1.066 |
| Min representation | /ɔ/ 0.946× | /ɔ/ 0.946× | ≥ 0.918 |
| Max absolute gap | /n/ 0.352% | /n/ 0.352% | ≤ 0.39% |
| Most over-represented bigram | `ds` 2.864× | `ds` 2.872× | ≤ 4.25 |
| Most over-represented trigram | `abl` 2.215× | `abl` 2.205× | ≤ 3.21 |
| Rarest common bigram | `ex` 0.0470× | `ex` 0.0439× | ≥ 0.0215 |
| Rarest common trigram (report-only) | `ugh` 0.0140× | `ugh` 0.0168× | 0.0062 |

The phoneme gate samples bare lexicon words (morphology off), so it does not
change. The n-gram gates include morphology and move slightly.

## Ten-seed phoneme calibration

Both revisions ran `npm run calibrate:phonemes -- --count 10 --jobs 4 --output ...`
(200,000 words per seed). [main](main-calibration.json) and
[branch](branch-calibration.json) are identical in every per-seed result and
proposal, because calibration samples lexicon words with morphology off:

| Measure | Main and branch (min–max, mean) | Limit |
|---|---|---|
| Total variation % | 1.549–1.654, 1.597 | ≤ 1.78 |
| Max over-representation | 1.0488–1.0595, 1.0553 | ≤ 1.066 |
| Min representation | 0.9429–0.9494, 0.9473 | ≥ 0.918 |
| Max absolute gap (pp) | 0.299–0.362, 0.334 | ≤ 0.39 |

## Performance

Three alternating `test:perf` runs: main 6,293–6,680 words/s (median 6,526),
branch 6,694–6,890 (median 6,738). The difference is within run-to-run noise;
floor 4,500. Median batch variance 1.22–1.34× (main) and 1.20–1.28× (branch),
ceiling 3×.

## Checks

`npm run check` (770 tests passed, 1 skipped; 260 review tests), `npm run build`,
and `npm run test:diagnostics` pass.
