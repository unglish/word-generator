# Measurable linguistic improvements

This plan covers all twelve areas of the 2026-09-26 linguistic audit. Each row is
a focused PR or experiment. Independent changes start from the same generator
revision; genuine representation dependencies are declared instead of hidden in
unrelated diffs. No generator change is bundled into the benchmark foundation.

For behavioral changes, capture the fixed development protocol, compare against
the original baseline, and report all metrics, eligible denominators, actual
morphology/length strata, diversity and performance. After integration, repeat
against the preceding cumulative step: isolated improvements may interact.
Reserve validation for settled milestones. Pin supplementary probes before
tuning and apply the same probe to both archived corpora. Historical traces that
lack a required field must be marked unavailable, never counted as clean.

## PR inventory

| ID | Scope | Primary evidence | Dependencies / current work |
|---|---|---|---|
| Q00 | Frozen baselines, integrity, comparison and archived-word rescoring | Full archive verification; deterministic replay; no regeneration during rescoring | In progress |
| Q01 | Canonical analyzer stream sampling and complete distribution metrics | No overlapping per-word seed ranges; synthetic absent-category penalties; explicit normalization losses | In progress, independent |
| Q02 | Final-word trace provenance and orthographic ownership | Final surface equals output; resolved affix and segment ownership; trace on/off parity | Shared representation with Q04/Q13 |
| Q03 | Rejection and fallback accounting | Actual attempts, selected attempt, status and reason counts; impossible/late-acceptance fixtures | Independent |
| Q04 | Underlying lexical forms; morphology and final stress before surface realization | Missing primary, primary schwa and primary reduced-vowel rates; lexical/surface provenance; one realization pass | In progress; coordinate with existing PR #305 |
| Q05 | Licensed hiatus across morphological boundaries | Unlicensed /h/ bridges by boundary type; phone/spelling agreement | Final morphology representation |
| Q06 | Preserve resolved allomorphs | Resolved written and phone variants survive final reconstruction; allomorph matrix | Coordinate with Q04 |
| Q07 | Segment edge versus syllable position | /ʊ/ coverage in closed final syllables; forbidden open-position rate; audited inventory migration | Independent |
| Q08 | Typed vowel quantity and shared syllable-weight analysis | Open long-vowel/diphthong classification and resulting stress distributions | Declared dialect/quantity contract |
| Q09 | Whole-pattern secondary stress and rhythm | Clash/lapse and secondary-schwa rates by length and morphology; explicit exceptions | Q04, Q08 |
| Q10 | Conditional nucleus/coda legality | /æŋ/ coverage; final open checked vowels; legality after nucleus replacement | Q07; coordinate with Q04 |
| Q11 | Legal cluster extensions | No duplicate coda segments; legal final-/s/ continuation; cluster coverage | Independent |
| Q12a | Licensed positive-weight grapheme selection | Zero-weight and forbidden-choice rates, including singleton candidates; fallback counts | In progress, independent |
| Q12b | Restore ordinary /ɛ/→e before /t/ | Conditioned /ɛt/ spellings and traced contribution to exceptional ea patterns | Independent; weights require evidence |
| Q13 | Grapheme units preserved through repairs | No partial digraph deletion or unlicensed zero realization; legal long letter clusters | Q02 |
| Q14a | Complete split-digraph constructions | No unresolved spelling obligation; alternatives and pronunciation retained | Q12a, Q13 |
| Q14b | Following-letter conditions for soft c/g | No incompatible following letters; licensed exceptions and search-fallback rates | Q12a, Q13, Q14a |
| Q15 | Coherent corpus processing and reference populations | Pinned sources/checksums/licenses; common filtering/variant policy; matched population sizes | Coordinate with existing PR #304 |
| Q16 | Target dialect, phonemic identity and display notation | Complete mapping coverage; explicit coarse versus stress-preserving scores | Independent contract; coordinate with Q08/Q15 |
| Q17 | Offline conditional onset/rime model | Held-out fit by stress/position/class; smoothed backoff, rare-tail and diversity checks | Q07, Q08, Q10, Q15, Q16; reuse #304 where appropriate |
| Q18 | Typed stem/affix compatibility | Category transitions; incompatible combinations absent; permitted combinations retained | Q04, Q06; productivity assumptions explicit |
| Q19 | Frequency-based running-text targets | Sourced type/token policy; held-out length/phone fit; function-word handling | Q15 |
| Q20 | Soft lexical-style experiment | Correct origin metadata; opt-in coherence/diversity and blinded reader results | Q13–Q15; human evaluation |
| Q21 | Blinded written baseline/candidate study | Frozen conditions, balanced assignment, strata and export/analysis validation | Existing written rubric retained |
| Q22 | Auditory wordlikeness study | Verified pronunciation stimuli, audio hashes, blinded assignment and modality-specific analysis | Q04, Q16, Q21 |
| Q23 | Independent read-aloud agreement study | Elicited readings, adjudicated phones/stress, alternatives and participant/item-aware analysis | Q14, Q16, Q21 |

## Existing work to preserve

- [PR #304](https://github.com/unglish/word-generator/pull/304) adds frozen-study
  wordlikeness scoring and a pinned CMU reference model. It does not tune the
  generator; inspect and reuse its corpus/scoring contracts where applicable.
- [PR #305](https://github.com/unglish/word-generator/pull/305) guards root budgets
  during morphology planning. Its source overlaps Q04; root budgets and final
  lexical stress are different hypotheses and remain separate reviews.

## Evidence and completion

Record each PR's hypothesis, source revision, target measure, traces/fixtures,
isolated benchmark, observed regressions, performance, and any remaining human
evidence. Link the resulting PR here when created. A statistical model can validly
remain opt-in or be rejected when the measured hypothesis fails; an improved
corpus score is not proof of better words for readers.

Human-study infrastructure and human-study results are separate deliverables.
Real ratings, verified audio and independent readings cannot be replaced with
synthetic ratings or infrastructure tests. Anonymous sessions must not be treated
as independent participants. No human preference gain is claimed until the
relevant study provides evidence.

The [baseline guide](quality-baselines.md) defines the frozen protocol and
comparison limits. Original captures remain immutable when evaluators evolve.
