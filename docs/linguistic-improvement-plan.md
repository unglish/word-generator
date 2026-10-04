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
| Q09a | Complete stress patterns and assignment provenance | Seven explicit domains; ordered assignments, prior origins and actual draw/skip evidence; output/RNG parity | [PR #330](https://github.com/unglish/word-generator/pull/330), against #326; all 200,000 complete words and old traces preserved, all 281,110 assignments independently replayed, every descriptive counter independently recounted; local perf gates pass; inherited failures retained |
| Q09 | Whole-pattern secondary stress and rhythm | Clash/lapse and secondary-schwa rates by length and morphology; explicit exceptions | [PR #334](https://github.com/unglish/word-generator/pull/334), against #330, adds the pure conditional law: 229,587 independent rational-reference cases and all 1,440 frequency checks over 600,000 draws pass, with full transcript/tape verification. [Draft PR #337](https://github.com/unglish/word-generator/pull/337) adds measured opt-in runtime activation: adjacent marked pairs decrease, bare-word lapses increase, and median throughput falls 17.1% untraced / 48.1% traced; default behavior stays legacy. The root-placement hypothesis preserves proposal secondary count, so disyllabic clashes and final assembled grammar require separate hypotheses |
| Q10a | Restore ordinary /æŋ/ availability | Generation-stage versus later /æŋ/ coverage; existing custom exclusions retained | [Draft PR #320](https://github.com/unglish/word-generator/pull/320); initial /æŋ/ syllables 0→1,664 across all 20 streams; independent archive counters agree; `ang` gate failure, increased trigram divergence and other regressions retained |
| Q10b1 | Preserve configured rime legality during root nucleus replacement | Existing pair exclusions after stress/edge replacement; retain the selected coda | [PR #324](https://github.com/unglish/word-generator/pull/324), against the exact Q07 + Q11 dependency control; prepared-root violations 22/327,029→0/326,957 pair slots in 200,000 words; 600,000 original/control/candidate draws independently checked; all local gates pass; broader metrics remain mixed |
| Q10b2 | Preserve final checked-vowel legality through realization and assembly | Separately scoped final lexical/surface contract and morphology ownership | Q04 and final ownership remain necessary; Q10b1's root assertion does not establish final-word legality |
| Q11 | Legal cluster extensions | No adjacent duplicate coda segments introduced by extension; legal final-/s/ continuation; separated repeats and cluster coverage retained | [Draft PR #313](https://github.com/unglish/word-generator/pull/313); 6,045 root-stage duplicates removed in 200,000 words; three morphology residuals, cluster-frequency shifts, stress-clash increase and `ugh` gate failure disclosed |
| Q11b | Preserve cluster legality through morphological alternations | Transformation-specific collision rates and trace ownership; retain licensed boundary repetition | Existing /sk/→/ss/ after `ity` softening identified by Q11; separate from root extensions |
| Q12a | Licensed positive-weight grapheme selection | Zero-weight and forbidden-choice rates, including singleton candidates; fallback counts | [Draft PR #310](https://github.com/unglish/word-generator/pull/310); zero-weight choices removed in 200,000-word capture, `ex` gate failure disclosed |
| Q12b | Restore ordinary /ɛ/→e before /t/ | Conditioned /ɛt/ spellings and traced contribution to exceptional ea patterns | [Draft PR #312](https://github.com/unglish/word-generator/pull/312); restored e in all 2,632 eligible candidate pairs, while exposing 13 consonantal-y magic-e errors; weights unchanged |
| Q12c | Preserve phonemic readings through configured doubling | Sound-specific doubled-form support; distinguish sampled doubling from adjacent letters belonging to different phones | [Draft PR #338](https://github.com/unglish/word-generator/pull/338), against exact #335. Structured sound/form/result rules and repair-reading propagation remove all 1,682 ordinary-policy unsupported sampled expansions in the frozen 200,000-word candidate, including 220 `/s/: c→ck` events. Independent recount covers all 400,000 control/candidate words, 131,621 integer comparisons and 119 complete witnesses. Legacy parity passes 83,072 calls over 20,768 coordinates. Six fixed pairs show an 8.73% median paired local throughput gain; speed-floor passes 0/6→6/6, with all variance gates passing. Raw five-consonant words decrease 252→247, unresolved spelling cells increase 63,911→63,938, and broader metrics remain mixed. Full suite retains five failures; quality retains one, and full lint retains seven errors in an unchanged predecessor file. No human or complete final-pronunciation gain is claimed |
| Q13 | Grapheme units preserved through repairs | No partial digraph deletion or unlicensed zero realization; legal long letter clusters | [Draft PR #328](https://github.com/unglish/word-generator/pull/328), against the exact Q02a + Q12a + Q06 dependency control; cap-partial `th` 126→0 and cap-attributed units with no surviving lineage 1,700→0 in 200,000 words; 1,517 certificates replayed; longer clusters, quality failures and a material performance regression retained |
| Q13 performance | Reuse full spelling context during budget measurement | Exact word/trace/RNG/certificate parity; fixed paired timing against #328 | [PR #331](https://github.com/unglish/word-generator/pull/331); 800,000 core and 84,800 supplementary API calls preserve behavior; six fixed pairs show 6.4% median paired local throughput gain and 0/6→6/6 speed-floor passes; inherited quality failures remain |
| Q13b | Aligned spelling of multiple phonemes by one grapheme | Explicit ownership and pronunciation preservation for /ks, gz/→x and similar units | Active on `codex/aligned-shared-graphemes`, against exact #338. The construction law is registered at `2810ff0`; pure policy implementation `0c75a21` passes 36 tests plus strict TypeScript and changed-source lint. Generator activation still awaits shared ownership and later-edit integration. All 200,000 archived words yield 1,170 ks→x, 311 cx→x, 44 gz→x and 2,629 cw→qu edits. One gz rewrite consumes /g,ʒ/ and four consume part of /ŋ,z/ selections; 39 valid-pair gz and 104 qu events cross syllable parts. Typed multi-phone ownership, whole-unit preservation, explicit sampling phases and independent measurement are required before activation |
| Q13c | Preserve units through adjacent-letter deduplication | Exact source-phone multiplicity and context-licensed whole-unit normalization | [Draft PR #335](https://github.com/unglish/word-generator/pull/335), stacked on #331. Independent replay of Q13's 200,000-word archive agrees on all 902 registered historical count leaves, including 7,712 deletion events, 7,398 fully erased later units and 31 final partial `th` units. The frozen 200,000-word candidate now has zero deduplication-attributed erased units and partial `th` units; independent structural replay agrees on 13,835 integer leaves. All 25 normalization certificates pass production license replay. Raw five-consonant words increase 203→252; median paired local throughput falls 4.22%, speed-floor passes 6/6→2/6, and quality failures remain. True shared constructions remain Q13b |
| Q14a | Complete split-digraph constructions | No unresolved spelling obligation; alternatives and pronunciation retained | Q12a, Q13 |
| Q14b | Following-letter conditions for soft c/g | No incompatible following letters; licensed exceptions and search-fallback rates | Q12a, Q13, Q14a |
| Q15a | Shared source parsing and explicit compatible population | Lossless records, complete entry accounting, model/score parity with new implementation provenance | [PR #323](https://github.com/unglish/word-generator/pull/323), stacked on #304; 135,166 source records reconciled, 117,485 accepted; every model field and all 400 frozen score rows unchanged; old artifacts preserved |
| Q15b | Matched-population reference statistics | Shared selected-entry digest, integer event counts, independent recount and archived-word reference sensitivity | [PR #325](https://github.com/unglish/word-generator/pull/325), stacked on Q15a; all joint/legacy tables independently reconstructed; same 200,000 original words compared under both references and independently recounted; no generator or historical baseline changes; local validation passes |
| Q15c | Explicit regeneration and consumer migration | Pinned source, policy, units and output identity; no mutable or percentage fallback | [PR #327](https://github.com/unglish/word-generator/pull/327) migrates the phoneme builder; [PR #329](https://github.com/unglish/word-generator/pull/329) migrates the length builder; [PR #332](https://github.com/unglish/word-generator/pull/332) migrates the transition builder; [PR #333](https://github.com/unglish/word-generator/pull/333) adds the explicit score-reference builder, with every ordered score row independently checked. [Draft PR #336](https://github.com/unglish/word-generator/pull/336) measures fixed-vector table sensitivity over 317,485 rows with independent reconstruction; no generated words or gates change. Historical consumer and gate adoption remain separate |
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

Q09a now records executed stress assignments and complete origin chains through
root, morphology, final lexical and surface stages. Its frozen Python recount
agrees with all 125,511 reported integer counter leaves across both 200,000-word
archives, including every stream and morphology/length stratum. The separate
20,000-coordinate source comparison preserves words, old traces and RNG use
with tracing on and off. Earlier traces already contained five stage patterns;
the two intermediate patterns and ordered assignment origins were unavailable.
The verifier's pre-analysis object-key-order correction and both source versions
are retained explicitly. This expands evidence without claiming a rhythm or
naturalness improvement. Both sources pass the unchanged performance gates in
one control-first interval; that pair does not establish a stable speed effect.

The separate Q13 performance revision changes only budget measurement's repeated
character classification and token-context reconstruction. Its complete outputs,
traces and RNG use match all 200,000 immutable Q13 archive coordinates under both
trace modes, with all 1,517 certificates verified. Six preregistered isolated
pairs improve in the same direction: median paired throughput rises 6.4% on this
machine (range 5.99–7.24%), and optimized runs pass the unchanged speed floor in
6/6 cases versus 0/6 for the frozen predecessor. All twelve variance gates pass.
The full suite's five failures and quality suite's cap failure are byte/value
identical to the predecessor. This recovers one measured cost without resolving
Q13's broader linguistic or performance limitations; #328 remains a draft.

The next Q09 slice separates mathematical verification from generator activation.
An independently written Python oracle enumerates literal selection, gate and
left-to-right rhythm histories using rational arithmetic, then sums histories
that produce the same pattern. The pure TypeScript analysis matches all 229,587
registered configuration/factor cases, including 1,013,770 secondary-count strata
and 3,717,680 pattern queries. Every well-formed pattern is checked for the small
root grid, including 3,174,685 queries with exactly zero support. Long-root cases
check deterministic-rhythm endpoint support rather than claiming exhaustive
stochastic coverage. The largest finite-log or materialized-probability error is
1.279e-13, within unchanged preregistered limits. The one numerical-fixture domain
correction was versioned before full-grid execution; original protocol bytes
remain available. This verifies the declared real-valued law, not a finite-RNG
distribution, sampler transcript, generated-word improvement or reader judgment.
Sampler execution gets its own frozen numerical and frequency checks before the
separate runtime and trace integration.

Those sampler checks now pass for all six registered cases. The largest distance
between the implemented finite-grid law and the continuous target is 2.949e-10,
below the preregistered 1e-8 limit. One frozen OS random tape supplies exactly
600,000 primary draws; all 1,440 block/aggregate frequency comparisons pass the
registered simultaneous bounds. The independent verifier reconciles every full
transcript with its actual tape inputs and accepted numerical tree. A separate
parent audit independently recounts all raw masks, schedules, 1,501,143 used
uniforms, thirty transcript hashes, exact frequency errors and source bindings.
Of 34 positive-probability patterns, 33 appear; the missing rare pattern has an
expected count of 0.895, and its missing witness remains unavailable. There are
no added draws or rerolls. The 3,348 prerequisite calls are separate from the
frequency sample. These results rely on the declared independent-uniform input
assumption and reviewed numerical predicate; they do not establish improved
generated stress, reader preference, or the generator's seeded-RNG distribution.
PR #334 publishes all raw proof archives, the exact tape and the frozen source
bundle. Its 24 public-law fixtures and 47 proof-test groups pass; dedicated
quality passes 12/12. The full suite retains #330's three failures with 517 passes
and one skip. Both quality-report write attempts are preserved, as are four raw
log EOF whitespace warnings; source and documentation checks pass. No generator
activation, automatic CI pass or performance result is claimed.

Q13c's archived-word investigation locates the residual deduplication mechanism
without generating a new corpus. The 7,712 events affect 7,697 words; 7,398 later
units lose all lineage and 314 are partially cut at the deletion site. Later
rewrites leave 301 final partial-source units in 300 words; these final outcomes
are distinct from the event-time count. A separate parent-written Python replay
agrees with every one of the 902 registered historical count leaves across the
total, four profiles, twenty streams and ten resolved-morphology groups. This
independently verifies structure and counts, not reading or probability licenses.
All 31 final partial `th` units follow an exactly owned coda /t/ plus onset /θ/
or /ð/. The proposed local policy
retains phone identity and permits only independently checkable whole-unit
normalizations under actual selection context. Inventory form matches are upper
bounds, not evidence that those replacements are licensed. The first experiment
will expose unknown constructions and normalization-related cap refusals, retain
existing gates, and leave upstream duplicate phones, final affix ownership and
split-marker interpretation to their separately scoped work.

Implementation review exposed two denominator-verification gaps before Q13c
capture: an altered count could fit the original interval check, and a guard
could be moved past a later syllable deletion. The candidate now records every
scheduled guard, including empty skips, and replays its exact phase/part cursor
to recount comparisons and collision episodes. Both adversarial cases are
covered by regressions; independent review reproduces their rejection. All 98
related tests, TypeScript and touched lint pass. The typed historical reader
also emits identical JavaScript to its frozen predecessor after its declared
function rename. These checks improve measurement integrity; candidate corpus
and performance evidence remain pending, and generic regex execution is not
independently authenticated by this guard verifier.

The pre-capture full suite has 606 passes, one skip and five failures: `ex`
representation, three consonant-run gates, and a newly failing `ck`/double-letter
gate. The earlier `ugh` failure now passes; equal failure totals do not imply
unchanged failures. Dedicated quality passes 11/12, with 64 raw long-consonant
words versus the predecessor's 62. These are fixed test schedules, not the
registered 200,000-word candidate comparison. Replaying the doubling gate's
10,000 seeds with full traces reproduces all eight witnesses. Each has exactly
one original doubling increment; its `rr` consists of separately owned /ɚ/ and
/r/ units retained with `would-erase-phone`. This distinguishes letter adjacency
from a second executed doubling, without waiving the gate. Two of those same
traces also record `/s/ → c → ck`, motivating the separate Q12c reading-license
investigation. All outcomes and the new gate failure remain in the candidate
record; no threshold changed.

The transition-builder migration in #332 produces a fresh reference from the same
117,485 selected entries. Both independent implementations agree on 859,818
transition events per view, all 2,985 stress-preserving bins and all 1,339 base-phone
bins. Start and end counts each equal the selected-entry count. Two CLI builds
produce identical bytes, and all 261 protected prior files remain unchanged.
The historical active table has 976,831 events from an unverified population;
that population difference requires a separately registered scoring comparison
before adoption. The initial sandbox IPC failure and successful fresh retry are
both retained. This PR improves reference reproducibility without changing
generated words, active scores or quality gates; its dependency target receives
local validation rather than automatic main-target CI.

The score-reference builder in #333 makes the scoring population and historical
model explicit while preserving the active scorer, table and gates. Two full
builds are byte-identical. Independent Python computation agrees exactly on all
117,485 ordered score rows and eight summary values: 234,978 numeric comparisons.
All 32 registered real CLI/check commands pass, alongside 248 review tests and
nine independent Python fixture groups. Of 292 protected predecessor files, the
289 outside the declared builder/documentation scope remain byte-identical.
The selected population's mean score per transition is −3.905332152470734; this
is a descriptive reference, not held-out evidence or an output-quality gain.
Model/corpus overlap and the historical population remain unresolved. The
archived old builder's whitespace-related packaging failure is retained; gzip
transport preserves its original bytes. No runtime generator or consumer changed,
and this dependency-targeted PR has local validation rather than automatic CI.

The Q09 opt-in runtime has independently passing integration fixtures, including
original-policy mutation and returned-attempt isolation. All 77 frozen published
law/proof files and three registered design documents retain their hashes. The
formal delegation study completes 160,000 public calls over 20,000 development
coordinates, plus 160 subsequent RNG checks. Omitted, explicit legacy and
supported zero-penalty paths match the exact #334 control for live properties,
full v1 traces and RNG consumption. Independent review confirms all stream
coordinates, recorded output/RNG hashes, report/input binding and 111 pinned
source/tool files. This is sampled delegation compatibility, not evidence of a
positive-penalty quality gain.

The Q09 capture review corrected schedule and engine bindings and delayed final
scored publication until broader source checks pass. Thirteen adapter tests pass
independently, including coherently rehashed shorter/reordered archives and both
post-rescore failure paths. The completed mechanism observer and independent
conditional-pattern verifier have now passed bounded source review and 41
independently executed synthetic checks (29 Node, 12 Python). Review also closed
a Python report-path gap: the verifier now excludes the frozen control checkout,
including aliases, before writing. All 52 runtime/package files, eight delegation
tool files and 77 published proof files remain unchanged. The 27-file measurement
tool closure and fixed development schedule are frozen for the control/active
corpus study; timing and measured quality outcomes remain pending. The runtime
candidate has not yet been published as a PR.

Q13c has 137 passing related tests (87 normalization, 44 coverage, six observer).
A source-pinned mapping reconciles all 35 registered mechanism requirements with
inspected assertions. Public join, positive-normalization and separate-final-/s/
cases run all three registered seeds. Additional checks cover UTF-16 offsets,
actual marker-bearing spellings, separate nuclei, successive normalizations,
soft quotas, changed conditions/features and forged licenses/versions. Strict
TypeScript and touched lint pass; all ten frozen preparation files are unchanged.
Initial fixture-input mistakes and failed logs are retained. These additions
change test coverage, not generator behavior or the reported quality failures.

The separately versioned Q13c analyzer has passed independent bounded source
review. It binds external source/manifest hashes, exact archive/schedule sets,
configuration and source bundles, and before/after integrity. Its production
license replay remains distinct from the required independent raw recount.
The independently reviewed compatibility harness has now completed 80,000
omitted-policy calls and 40,000 active trace-on/off calls over 20,000 coordinates,
plus eight separately accounted mutation calls. Every scheduled comparison
passes: omitted-policy live properties, complete words/v1 traces and consumed RNG
bytes match exact #331; active trace-on/off outputs and RNG behavior match each
other. Source checks pass before and after. Independent report reconciliation
checks all 20 streams, 140 current source/tool files, ten historical preparation
pins and 55 control files against Git. This is sampled compatibility, not an
active/control equality or quality claim; the 200,000-word candidate capture,
independent structural recount and timing remain pending. Both control and
candidate still alias a returned phoneme into later calls: mutation compatibility
passes, while returned-value isolation is explicitly false. That inherited
behavior is not silently fixed or reported as successful isolation in this
spelling experiment.

The frozen Q09 runtime study now contains 200,000 control and 200,000 active
words, independently observed and rescored with the unchanged common evaluator.
The independent active recount agrees across all 20 streams and 788 contexts;
3,112 same-primary/count law queries retain 1,802 positive and 1,310 exact-zero
patterns. Within the active returned attempts, proposal versus applied adjacency
falls from 29,760 to 28,194 while secondary count remains 37,783. This is a
within-attempt mechanism result, not a causal pairing of control and active words.
Trigram divergence worsens against the immediate control in the three
non-monosyllable profiles, and disyllabic clashes remain. The final dedicated
quality suite passes 12/12; the broader suite has 555 passes, one skip and the
same three inherited failures. Preregistered broader rhythm/quantity endpoints
are being completed through a separate archived-word supplement. Controlled
timing and those endpoints remain pending, so runtime activation is not yet a
completed PR or an overall quality improvement.

The Q13c formal candidate capture and independent structural recount are now
complete. Across 200,000 words, all 13,835 integer leaves agree; exact ordered
UTF-16 append/edit/guard replay and certificate phone multiplicity pass. Compared
with the dependency control, deduplication-attributed units with no surviving
lineage fall from 7,398 to zero and partial `th` units from 31 to zero. Of 7,530
candidate collision episodes, 7,505 retain their units and 25 normalize a whole
unit. All 25 emitted normalization certificates pass the separate production
license replay. The independent structural proof does not independently establish
English readings or conditional spelling support. Common metrics remain mixed:
monosyllable trigram divergence increases by approximately 0.006672 bits while
unique monosyllable spellings increase by 1,293. The already recorded new doubling
gate failure and other quality failures remain; controlled timing is pending.
These observations support the registered deletion correction, not a general
claim that readers prefer the candidate.


Q13c is now published as [Draft PR #335](https://github.com/unglish/word-generator/pull/335).
Three commits separate the unchanged baseline harness, normalization behavior and
registered tests, and measured evidence. The outcome bundle pins 103 copied
artifacts; all 140 frozen source/tool bytes still match after packaging. The
fixed six-pair local performance series retains every outcome: median
candidate/control throughput is 0.95777 (4.22% lower), range 0.92277–0.96097.
The predecessor passes the 4,500 words/sec floor in 6/6 runs, the candidate in
2/6; both pass all six variance gates. Raw five-consonant words increase from
203 to 252 in the 200,000-word corpus, most strongly in forced monosyllables
(68→111 of 50,000). Existing full-suite and quality failures remain. The draft
is a measured correction with unresolved tradeoffs, not a merge recommendation.

The Q09 archived-word supplement now passes source/archive checks across all
400,000 words and independently checks 788 retained conditional contexts. At
final lexical structure, adjacent marked pairs fall 47,730→46,180; words with
unstressed runs of at least two syllables fall 25,355→24,937. Words with
secondary schwa after surface realization fall 9,403→9,190. Aggregate movement
is not uniform: bare-root runs of at least three unstressed syllables increase
1,771→1,822, and default-lexicon lexical secondary-schwa words increase
2,143→2,168. Stressed-nucleus repair events rise 44,689→44,702; selected-attempt
index sums rise 509,882→510,537. These are archived population comparisons, not
matched words or a full rejected-attempt study. All strata and witnesses remain
in the supplemental report.

Q09's unchanged default performance suite passes both gates (6,862 words/sec;
median variance 1.37). Its first separate configured timing matrix is invalid:
all 24 slots fail before returning a word because the external runner assumes
a nonexistent factory `generateWords` method. Those failures and original tools
are preserved. The corrected external runner uses public `generateWord` with a
shared public seeded RNG for each batch, counts 13,100 generation calls separately
from 3,052 logical operations, and passes 34 synthetic checks plus a small real
control/active, trace-off/on interface smoke. A new complete fixed timing series
has now completed all 24 slots and 314,400 words with unchanged source authority.
All original untraced gates pass. Median active/control throughput is 0.82916
without tracing (17.08% lower; range 0.82180–0.84578) and 0.51919 with tracing
(48.08% lower; range 0.50890–0.53457). The trace-on measurements are descriptive,
not an invented trace-on gate. The failed first matrix remains preserved and
contributes no usable speed observations. The runtime and full measured companion are now published in draft PR #337.

Q15's paired transition-reference study has a reviewed freeze of 338 source
files (325 unchanged parent files and 13 new study files) and 30 input files.
The frozen CLI matrix passes all 15 cases and its two full 317,485-row runs
produce 22 byte-identical files. Independent Python numerical/structural proof
passes all 317,485 rows and 5,325,847 numeric comparisons with zero sign/near-zero
disagreements. The largest absolute difference is approximately 6.935e-12; the
largest relative discrepancy is on a near-zero decomposition residual, with
absolute difference 3.482e-13, still within the fixed tolerance. All 338 source
and 30 input pins remain unchanged. Per-word scores and tolerance are unchanged;
separately labeled compensated arithmetic stabilizes only decomposition sums.
This holds generated vectors fixed and measures reference sensitivity, not a
new generator, reference adoption or held-out wordlikeness improvement.

Q15 is now published as [Draft PR #336](https://github.com/unglish/word-generator/pull/336),
stacked on exact #333, head `71f5a6f6af2291e14d0b012f1ab5911a3d7ecca0`.
Its two commits separate the 13 frozen study files from the measured evidence.
All 22 canonical study files are preserved, including the exact report through
lossless gzip. Normalized B−A means are +0.004067774 for English and −0.003184122
for generated vectors; the normalized English-minus-generated gap increases
0.307366448→0.314618344. B English is in-sample, historical A overlap is unknown,
and phone-count subgroup gaps use the full English population, not a
length-matched reference. These results establish measurement sensitivity only.

Q09 runtime is now [Draft PR #337](https://github.com/unglish/word-generator/pull/337),
stacked on exact #334, head `8a2ffd618a63f4b2295728a63b552fbdfc1e4c6f`.
Three commits separate the unchanged baseline harness, frozen runtime/tools, and
153 evidence files. All 189 runtime/evidence scope files retain reviewed hashes.
The complete 1,507,751,990-byte supplement is preserved in a 20,039,908-byte XZ
transport; raw 400,000-word shards remain external and explicitly required for
whole-corpus replay. Both failed and corrected timing histories remain included.
Full-suite inherited failures, mixed distribution results and throughput costs
remain disclosed. Neither draft establishes human preference or default adoption.
Both remote draft heads and intended stacked bases were verified after creation;
no merge or CI-success claim is made.

Q12c now has a committed preregistration and complete exploratory control inventory
on `codex/phoneme-aware-doubling` (`3ed13d3`), stacked on exact #335. The observer
verified the external manifest SHA and every archive artifact before and after
reading 200,000 existing records; no generation occurred. It reconciles 1,010,404
root spelling units to grapheme events, 17,362 sampled expansions, 3,408 failed
rolls and 2,878 directly selected quota-counted ck units. All 465 relation/reason
categories and 18 first complete trace witnesses are preserved. This observer
provides integrity/consistency evidence, not an independent linguistic proof.
The design explicitly covers output-reading propagation through both repair
planners, legacy custom-policy parity, legal-expansion coverage, full corpus
side effects and six paired fresh-process timing comparisons. Candidate source,
formal observer and independent recount must be reviewed and frozen before the
new 200,000-word capture. Runtime implementation and a measured PR remain open.

Q12c candidate implementation is committed at `91fd20a93d8b91c1fd3f2477ea66d83d1f8f3a4c`.
The model binds expansions and direct-form quota classification to sound plus
spelling; both repair planners propagate the resulting reading through search,
certificates and verification. English declares fourteen ordinary relations.
Custom configurations can explicitly retain legacy behavior, including equal-text
overrides; archived-coordinate fixtures keep their original expectations with
that opt-out. The focused simplification pass replaces serialized lookup keys
with nested native maps. All 184 targeted fixtures pass, including forged
certificate rejection; strict TypeScript and targeted lint pass.
The unchanged quality suite currently reports 11/12 passing, with 65 words
failing the five-consonant-letter gate. An initial report-write permission
failure is preserved separately and the permitted rerun writes its report.
These are preparation results, not the registered 200,000-word comparison or
a human-quality claim. Formal source/tool freeze and independent measurement
remain required before a measured PR is ready.

The exact Q12c implementation revision's full-suite rerun completes with 676
passing, one skipped and five failing tests: ex representation 0.010933807 versus
0.0215, consonant-run counts 10 and 33 in the 100k schedules, 39 in the custom
10k schedule, and six ck-plus-double regex matches versus a maximum of five.
All remain failures; repeated-letter matches are not automatically evidence of
two sampler doublings. The two legacy-coordinate failures in the first run
are resolved by explicit legacy configuration, with expected values unchanged.

Q12c explicit legacy opt-out now matches the exact #335 control over 20,768
coordinates and 83,072 public generation calls: 20,000 registered development
coordinates plus 768 custom-override coordinates. Complete traced/untraced
values, cumulative RNG calls and all 128 next-value probes agree. Source,
protocol, registration and executable pins are checked before and after.
The proof is preserved in the branch's `legacy-parity` directory (commit
`36c030c`), including the initial failed runner that confused an omitted trace
property with an explicit undefined property. No runtime correction was needed.
This is immediate-value compatibility, not cross-call alias isolation or a
hermetic installed-dependency proof. The new pure retained-event observer has
31 passing archived-witness and malformed-evidence tests. Full aggregation,
independent recount, formal freeze/capture and timing remain outstanding.

### Q08a cumulative compatibility checkpoint — 2026-10-03

The [complete current comparison](../evaluation/experiments/shared-weight-control/current-composition-2026-10-03/README.md) measures candidate `c15565aca3e613a5f321e3128e22098cf6c9aff5` against Q06-containing control `233b455732920ac529b2dda2a623df0a6ca17446`. Both full 200,000-word archives reproduce through untouched public APIs; an independent recount checks all 400,000 raw records, every metric/distribution/actual stratum/sample and full bounded weight/stress witness. Every legacy payload, per-draw RNG boundary and next RNG value matches across arms after removing only added `trace.stressWeight`. Original 1,000-word trace-on/off prefixes also match words and callback boundaries. All core summary fields except run ID and all distributions remain identical. All 340,840 nuclear segments remain unspecified; quantity is not inferred from spelling. Root-before-repair stress is corroborated for 142,491 bare words; final correspondence for 57,509 affixed words remains unavailable.

Original and current gates are recorded separately without changing floors, samples or helpers. Fifteen commands complete: thirteen pass, with identical ten-error inherited full-lint failures in both arms. Current unit suites pass 513/551 tests (one existing skip each); 49 targeted fixtures, types and all original/current quality gates pass. Twelve original native timing runs pass across six alternating pairs, descriptive median candidate/control ratio 0.985235. The complete retained checkpoint contains 397 independently owned files / 332,621,609 bytes; the 284-member compact packet explicitly pins all forty external raw shards and 75 selected actual runtime files. Its verifier authenticates bytes and recorded outcomes, not a scientific rerun or a complete runtime installation.

PR #319 has merged as `d2c083aa04a6b3c744017e3b09626b29b6bdc9e3`; source/config/package comparison finds no changed measured bytes between its candidate and merge. Subsequent main `cd96f54f72038efb48e37c2003c4f700f9076671` differs in eight source paths, recorded in the packet's merge binding. This checkpoint supports compatibility at the measured heads; later combined behavior, human output quality and stable performance gain remain unestablished. The original standalone evidence is preserved.

### Full merged Q07/Q08a composition — 2026-10-03

The [complete merged comparison](../evaluation/experiments/shared-weight-control/merged-composition-2026-10-03/README.md) measures main `cd96f54f72038efb48e37c2003c4f700f9076671` against Q08a candidate `c15565a`, with the same full development protocol, evaluator and reference. All 400,000 complete words/traces replay through untouched public APIs and match the independent core/nucleus/allomorph/quantity/stress recount. Original trace-off prefixes preserve words and callback boundaries. Every one of the 200,000 candidate legacy payloads matches earlier verified Q07 `fa8c537` after removing only added `trace.stressWeight`; complete core summaries except run ID and full phone/trigram distributions also match. This closes the combined Q07/Q08a verification gap at the two named heads.

Q07's prepared closed-final FOOT coverage remains 15/159,868 to 2,506/159,945 and output open-final FOOT 2/30,880 to 0/31,130. Both arms preserve all their observed source-derived `im` forms and emitted-part outputs. Quantity remains unspecified for all 340,840/341,105 observed nuclear segments; affixed final-root stress correspondence and broader default edge-repair safety remain unavailable. Complete three-way diagnostic comparisons preserve the mixed results; no overall human quality gain is established.

Fifteen gate commands complete: thirteen pass and the same ten inherited lint errors fail both full-lint commands. Units pass 551/565 tests (one existing skip each); 63 targeted fixtures, types and every original/current quality gate pass. Twelve original native timings pass, descriptive median candidate/control ratio 0.959941; all six pairs show lower candidate throughput, with uncontrolled ambient activity and a brief overlapping compact-summary check recorded. The complete 456-file / 446,089,973-byte retained checkpoint carries both current archives and the full earlier Q07 legacy reference. A 323-member compact packet pins sixty external raw shards, 75 selected runtime files and the separately external twenty original-baseline raw shards. Its verifier passes against all retained and original-baseline files, without claiming a scientific rerun, complete runtime installation or future-main certification.
