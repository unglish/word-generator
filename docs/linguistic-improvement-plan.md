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
| Q00 | Frozen baselines, integrity, comparison and archived-word rescoring | Full archive verification; deterministic replay; no regeneration during rescoring | [PR #307](https://github.com/unglish/word-generator/pull/307); applicable CI passes |
| Q01 | Canonical analyzer stream sampling and complete distribution metrics | No overlapping per-word seed ranges; synthetic absent-category penalties; explicit normalization losses | [PR #308](https://github.com/unglish/word-generator/pull/308); applicable CI passes; output preserved |
| Q01b | Measure fixed-gate rejection across unchanged-generator streams | Exact rejection counts, gate-event provenance and disjoint consumed RNG-state intervals; no independence or linguistic false-positive claim | [PR #321](https://github.com/unglish/word-generator/pull/321); applicable CI passes; 12/20 unchanged-source streams fail only the rare `ugh` gate; separate seed-42 control passes; all 4.2 million words independently recounted; thresholds unchanged |
| Q02 | Final-word trace provenance and orthographic ownership | Final surface equals output; resolved affix and segment ownership; trace on/off parity | Shared representation with Q04/Q13 |
| Q02a | Exact base-spelling edit provenance | Complete word, legacy trace and RNG parity; replayable cell lineage for every edit | [PR #317](https://github.com/unglish/word-generator/pull/317); applicable CI passes; initial 20,000-word parity/replay control, followed by 200,000 archived-word/legacy-trace comparisons and exact ledger replays; final affix ownership remains separate |
| Q03 | Rejection and fallback accounting | Actual attempts, selected attempt, status and reason counts; impossible/late-acceptance fixtures | [PR #311](https://github.com/unglish/word-generator/pull/311); applicable CI passes; 20,000-word output and RNG parity verified |
| Q04 | Underlying lexical forms; morphology and final stress before surface realization | Missing primary, primary schwa and primary reduced-vowel rates; lexical/surface provenance; one realization pass | [Draft PR #309](https://github.com/unglish/word-generator/pull/309); stress defects removed in 200,000-word capture, rhythm/open-vowel tradeoffs and `ugh` gate failure disclosed; coordinate with #305 |
| Q05 | Licensed hiatus across morphological boundaries | Unlicensed /h/ bridges by boundary type; phone/spelling agreement | [Draft PR #316](https://github.com/unglish/word-generator/pull/316); 8,343 affected words→0 in 200,000 words, 12,563 preserved boundaries checked, morphology-disabled archives byte-identical; `ugh` gate failure and broader tradeoffs retained |
| Q06 | Preserve resolved allomorphs | Resolved written and phone variants survive final reconstruction; allomorph matrix | [PR #315](https://github.com/unglish/word-generator/pull/315); all 248 identifiable `in`→`im` opportunities now retain `im`; 13 core diagnostic counts unchanged; applicable CI passes; coordinate with Q04/Q02 |
| Q07 | Segment edge versus syllable position | /ʊ/ coverage in closed final syllables; forbidden open-position rate; audited inventory migration | [PR #314](https://github.com/unglish/word-generator/pull/314); closed-final base FOOT 15→2,506 in 200,000 words, open-final FOOT 3→0 in bases and 2→0 in outputs; applicable CI passes, mixed broader diagnostics retained |
| Q08a | Typed vowel quantity and shared syllable-weight analysis | Shared operational decisions; exact word, legacy-trace and RNG parity | [PR #319](https://github.com/unglish/word-generator/pull/319); applicable CI passes; initial 20,000-draw RNG/trace control and complete 200,000-word archive equality; all 340,840 root nuclei remain unspecified |
| Q08b | Activate a named partial English quantity model | Open modeled diphthongs use heavy weight; conditioned primary/secondary stress and broader diagnostics | [Draft PR #322](https://github.com/unglish/word-generator/pull/322), stacked on Q08a; light open diphthongs 14,024/14,024→0/14,093; default monosyllabic-schwa regression and `ugh` failure retained; exact legacy opt-out/RNG parity verified |
| Q09 prerequisite | Detach structured metadata across lexical views | Caller-mutation isolation; complete word/trace/RNG parity | [PR #326](https://github.com/unglish/word-generator/pull/326), against the exact Q04 + Q08b + Q06 composition; five mutation fixtures fail before and pass after; all 200,000 word/trace records are byte-identical and 20,000 scheduled draws preserve RNG use; inherited failures retained |
| Q09 | Whole-pattern secondary stress and rhythm | Clash/lapse and secondary-schwa rates by length and morphology; explicit exceptions | Q09a observation proceeds from #326's independently verified detached control; Q09b rhythm behavior remains separate |
| Q10a | Restore ordinary /æŋ/ availability | Generation-stage versus later /æŋ/ coverage; existing custom exclusions retained | [Draft PR #320](https://github.com/unglish/word-generator/pull/320); initial /æŋ/ syllables 0→1,664 across all 20 streams; independent archive counters agree; `ang` gate failure, increased trigram divergence and other regressions retained |
| Q10b1 | Preserve configured rime legality during root nucleus replacement | Existing pair exclusions after stress/edge replacement; retain the selected coda | [PR #324](https://github.com/unglish/word-generator/pull/324), against the exact Q07 + Q11 dependency control; prepared-root violations 22/327,029→0/326,957 pair slots in 200,000 words; 600,000 original/control/candidate draws independently checked; all local gates pass; broader metrics remain mixed |
| Q10b2 | Preserve final checked-vowel legality through realization and assembly | Separately scoped final lexical/surface contract and morphology ownership | Q04 and final ownership remain necessary; Q10b1's root assertion does not establish final-word legality |
| Q11 | Legal cluster extensions | No adjacent duplicate coda segments introduced by extension; legal final-/s/ continuation; separated repeats and cluster coverage retained | [Draft PR #313](https://github.com/unglish/word-generator/pull/313); 6,045 root-stage duplicates removed in 200,000 words; three morphology residuals, cluster-frequency shifts, stress-clash increase and `ugh` gate failure disclosed |
| Q11b | Preserve cluster legality through morphological alternations | Transformation-specific collision rates and trace ownership; retain licensed boundary repetition | Existing /sk/→/ss/ after `ity` softening identified by Q11; separate from root extensions |
| Q12a | Licensed positive-weight grapheme selection | Zero-weight and forbidden-choice rates, including singleton candidates; fallback counts | [Draft PR #310](https://github.com/unglish/word-generator/pull/310); zero-weight choices removed in 200,000-word capture, `ex` gate failure disclosed |
| Q12b | Restore ordinary /ɛ/→e before /t/ | Conditioned /ɛt/ spellings and traced contribution to exceptional ea patterns | [Draft PR #312](https://github.com/unglish/word-generator/pull/312); restored e in all 2,632 eligible candidate pairs, while exposing 13 consonantal-y magic-e errors; weights unchanged |
| Q13 | Grapheme units preserved through repairs | No partial digraph deletion or unlicensed zero realization; legal long letter clusters | [Draft PR #328](https://github.com/unglish/word-generator/pull/328), against the exact Q02a + Q12a + Q06 dependency control; cap-partial `th` 126→0 and cap-attributed units with no surviving lineage 1,700→0 in 200,000 words; 1,517 certificates replayed; longer clusters, quality failures and a material performance regression retained |
| Q13b | Aligned spelling of multiple phonemes by one grapheme | Explicit ownership and pronunciation preservation for /ks, gz/→x and similar units | Q13; Q12a exposes reliance on illegal /z/→ze choices for the current `gz-to-x` string repair |
| Q13c | Preserve units through adjacent-letter deduplication | Exact source-phone multiplicity and licensed shared spelling | Q13's cap policy leaves 31 observed partial `th` units from syllable-join deduplication; this requires a separate construction/ownership hypothesis |
| Q14a | Complete split-digraph constructions | No unresolved spelling obligation; alternatives and pronunciation retained | Q12a, Q13 |
| Q14b | Following-letter conditions for soft c/g | No incompatible following letters; licensed exceptions and search-fallback rates | Q12a, Q13, Q14a |
| Q15a | Shared source parsing and explicit compatible population | Lossless records, complete entry accounting, model/score parity with new implementation provenance | [PR #323](https://github.com/unglish/word-generator/pull/323), stacked on #304; 135,166 source records reconciled, 117,485 accepted; every model field and all 400 frozen score rows unchanged; old artifacts preserved |
| Q15b | Matched-population reference statistics | Shared selected-entry digest, integer event counts, independent recount and archived-word reference sensitivity | [PR #325](https://github.com/unglish/word-generator/pull/325), stacked on Q15a; all joint/legacy tables independently reconstructed; same 200,000 original words compared under both references and independently recounted; no generator or historical baseline changes; local validation passes |
| Q15c | Explicit regeneration and consumer migration | Pinned source, policy, units and output identity; no mutable or percentage fallback | [PR #327](https://github.com/unglish/word-generator/pull/327) migrates the manual phoneme builder; [PR #329](https://github.com/unglish/word-generator/pull/329) separately migrates the length builder, with 144 corpus tests, eight independent verifier tests and 15 real CLI checks; all length marginals and syllable-conditioned rows independently reconstructed for 117,485 entries; historical consumers and gate adoption remain separate |
| Q16 | Target dialect, phonemic identity and display notation | Complete mapping coverage; explicit coarse versus stress-preserving scores | [PR #318](https://github.com/unglish/word-generator/pull/318) adds a pure legacy observer; all 1,146,606 original segments accounted for, including 3,456 ambiguous /ɜ/, with independent count verification; applicable CI passes; no generator behavior or dialect migration; coordinate with Q08/Q15 |
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

## Current interpretation

The first captures establish mechanical improvements, not a reader preference
result. Q04 removes missing primary stress and primary-stressed schwa in the
frozen development sample, while increasing the measured disyllabic stress-clash
and final-open-checked-vowel rates. Q12a removes 5,836 words with observed
zero-weight grapheme decisions, while the existing `ex` distribution gate fails.
Both remain drafts; those failures are neither hidden nor resolved by relaxing
thresholds. Their full comparison artifacts retain unchanged and worsened
metrics as well as the intended gains.

Q03 preserves 20,000 outputs, selected candidate indices, RNG call counts and
next RNG values while exposing actual search costs. Historical traces cannot
supply executed-attempt counts; reproduced baseline code establishes parity,
and archived baseline words independently anchor the output comparison.

Q11 eliminates observed root-stage coda duplication while preserving separated
repetition such as /sts/ and /ksts/. The three final residuals all follow the
existing `-ity` /sk/→/ss/ alternation. Large changes in some cluster frequencies
and a small stress-clash increase are retained in its report. Q12b restores
ordinary e without tuning any weight, but its traced supplementary probe detects
13 new consonantal-y errors in a later magic-e rewrite even though the current
test suite passes. That exploratory defect keeps Q12b in draft. Passing one
target metric or the existing test suite is insufficient to declare a general
quality improvement.

Q07 supplies the first narrow nucleus-position override, migrating only FOOT.
Its selected candidate samples satisfy the declared open-edge restriction and
restore closed-rime coverage in every stream. Bare-lexicon corpus divergence and
zero-weight grapheme counts, and some text-mode diagnostics, worsen. The report
retains these tradeoffs. No selected sample exercised post-coda replacement;
custom fixtures expose its remaining general checked-vowel limitation for Q10.

The [baseline guide](quality-baselines.md) defines the frozen protocol and
comparison limits. Original captures remain immutable when evaluators evolve.

Q06 retains all 248 source-identifiable `im` selections in the spelling, while
all 13 core diagnostic counts and eligible denominators remain unchanged.
Explicit realization covers 57,509 affixed words and 64,031 selected affixes.
Fifty existing root cleanup edits remain visible; morphological parts are not
phone-to-character ownership. Q05 removes all recorded morphology bridge
insertions and preserves 12,563 traced vowel boundaries. Its 100,000 bare outputs
are byte-identical to the original, while affixed sampling and several broader
diagnostics change. Its failed rare-spelling gate keeps the candidate in draft.

Q02a records exact base-spelling edit lineage while preserving the complete
200,000-word baseline and all historical trace fields. Every new ledger replays
to its recorded surface. This establishes a control for repair experiments;
lineage does not by itself prove that a rewrite preserves pronunciation. Its
initial paired performance run shows about 6.8% lower throughput, disclosed in
the PR. Final morphological ownership remains outside this base-only contract.

Q16a observes the original archive without generating a candidate corpus. Its
1,146,606 segments comprise 1,143,150 resolved legacy identities and 3,456
ambiguous /ɜ/ identities. The coarse CMU projection merges schwa with STRUT and
merges /ɚ/ with the unresolved /ɜ/; the observer exposes those losses. Absent
stress marks and underlying-vowel history remain unavailable evidence. These
are improvements in measurement, with no claim of improved generated words.

Q08a replaces duplicated weight predicates with one typed analysis while retaining
the exact legacy decision. Its 20,000 scheduled draws preserve complete words,
existing traces and RNG consumption; the new trace distinguishes unknown nuclear
quantity from operational heavy/light weight. A separately named partial English
model will measure diphthong activation against this control. The existing tense
flag supplies no implicit mora count, and final stress/rhythm remain separate.

Q08b activates only the named partial quantity model. All 14,093 candidate open
atomic diphthongs have heavy operational weight, and every other context retains
its prior classification rule. An independent recount of all 400,000
control/candidate records confirms the mechanism counts and declared/unknown
quantities. However, default monosyllabic schwa rises by 1.013 percentage points
and the unchanged rare-`ugh` gate fails. The draft reports these tradeoffs; the
correction does not establish better overall stress patterns or reader judgments.

Q15a makes #304's source selection reusable without changing its population or
scoring semantics. Independent counting agrees on all 117,485 selected entries
and every exclusion; both frozen 200-row rubric score sets are unchanged. These
are 400 rows for the same 200 spellings, not independent human observations.
The new source fingerprint is preserved separately from historical artifacts.
Q15b now adds the matched reference separately. All 117,485 entries feed the same
integer tables; the old phone percentages retain an unknown corpus denominator.
The unchanged 200,000 original draws produce different scores under the new
population. For text-mode written length, JSD falls by 0.012278669 bits despite
identical outputs. Independent reconstruction/recounting agrees on all tables
and raw draw counts; independently computed distances agree within 7.206e-14.
This establishes reference sensitivity, not an output-quality improvement.

Q01b measures the existing gates without changing their policy. Twelve of twenty
unchanged-generator streams fail the `ugh` floor; each requires six events, while
observed counts range from one to nine. The separate seed-42 control has six and
passes. All 4.2 million words are independently recounted. The first three control
witnesses spell `ugh` across a syllable boundary using separate u, g and h
selections. That bounded trace evidence illustrates a limitation of interpreting
character counts as spelling constructions. The CI test remains deterministic;
these results do not establish a linguistic false-positive rate, waive candidate
failures, or justify fitting a new threshold to a preferred change.

Q10a removes one unsupported default exclusion without changing weights. Initial
/æŋ/ becomes available in all twenty streams, with 1,664 observed syllables.
Later stress repair and final realization are separately counted. The unchanged
`ang` gate fails, trigram divergence rises in all four profiles, and some structural
diagnostics worsen. The draft preserves those results rather than claiming that
phonotactic availability alone establishes better overall output.

Q10b1 preserves the coda's configured compatibility when the nucleus is replaced.
The dependency control's 22 prepared-root violations become zero; all 19,300
candidate stress replacements have events reconciled to exact stage coordinates.
The 50,000 forced-monosyllable outputs remain byte-identical. Other spelling,
stress and diversity diagnostics move in both directions. The current `ugh` gate
passes, but this neither repairs nor waives the Q11 dependency's recorded failure.
The PR targets an explicit dependency-control branch; repository CI only triggers
against `main`, so its completed checks are local rather than automatic CI runs.

The Q09 metadata prerequisite fixes shared nested quantity objects without changing
sampled generator behavior. Five public mutation fixtures distinguish the corrected
root, assembled and surface views from the composition control. All twenty raw
archive shards are byte-identical, and the separate trace-on/off comparison retains
every prior trace field and RNG boundary. Both isolated performance runs pass.
The composition's three inherited test failures remain visible; this is preparation
for observation, not acceptance of the draft stress models.

Q13 now supplies a bounded spelling-repair experiment with explicit reading
obligations. Its 1,517 certificates cover 1,549 changed-phone occurrences in 1,516
words; 5,317 words have at least one refusal. Independent Python counting and cell
replay agree with every report table. Reading and probability licenses are separately
replayed by the frozen production TypeScript verifier, not reimplemented in Python.
The observer implementation was finalized after generation began; its preregistered
endpoints and both report revisions remain documented. Historical missing budget
episodes are unavailable evidence, not zero repair need.

This cap policy removes the targeted deletions, but raw five-consonant-run words
rise from 22 to 203 per 200,000 words. The full suite retains five failures against
unchanged gates, and one quality gate fails. An isolated candidate-first timing
pair measures approximately 4,140 versus 6,705 words/sec, below the unchanged
4,500 floor. The draft preserves these costs. Performance work will use this frozen
candidate as its own control; duplicate deletion and final affix ownership remain
separate work.

Q15c's first migration makes the manual phoneme builder require explicit source,
policy, integer units and a fresh destination. Native stress tokens and the two
declared projections match the independently reconstructed parent reference exactly.
Direct and npm builds produce identical bytes; missing inputs, existing outputs
and protected paths are exercised through the real CLI. Historical references,
analyzers, demo inputs and generator behavior remain unchanged.

The separate length-builder migration in #329 requires the same explicit pinned
inputs and fresh-output contract. Independent Python reconstruction verifies every
written, phone and syllable histogram bin and each syllable-conditioned written
and phone row. All 247 protected prior files remain byte-identical. Its population
of 117,485 selected ASCII spellings differs explicitly from the historical length
baseline's 135,158 pronunciation lines; it does not silently replace that baseline
or migrate a consumer. Conditional marginals do not encode the full written/phone
joint distribution. This is a reproducibility improvement, with no generator
output or reader-preference gain claimed.

These dependency-targeted PRs have local validation; the repository's automatic
CI workflow triggers only for PRs targeting main.
