# Q09b: opt-in root-pattern runtime integration

Read-only implementation/evaluation plan, 2026-09-26. No generator edit, new
sampler execution, runtime activation, or corpus capture accompanies this plan.

## Scope and exact starting point

Start from published ready PR #334, commit
`9e772f257def91b4370462e17156f71b8f54575d`, on
`codex/conditional-root-stress` in the `linguistic-diagnostics` checkout. Its
parent foundation is #330 `3d5f1a9feb07b7c13cd384b8c0daf9036295da60`.
Tracked files are clean; copied top-level quality tooling, `node_modules`, and
ignored reports are unrelated. A later authorized implementation should create
an explicit stacked branch from this exact commit, without changing #334.

The accepted pure law and sampler remain byte-identical. Reuse the frozen
`evaluation/experiments/conditional-root-stress/protocol/` designs, especially
`q09-active-trace-and-oracle-design.md`, and retain every protocol, tool, source
bundle, and outcome in that experiment. New runtime protocol/tools/evidence live
under a separately named `conditional-root-stress-runtime` experiment. Old
116-file proof replay remains against its published source bundle/commit;
changing the generator in a new branch must not be described as satisfying that
old whole-source freeze.

The first runtime PR enables a typed experimental **root placement policy**.
English defaults stay legacy. Given the actual legacy proposal's secondary count
K, it applies the already proved conditional sampler once. It does not change
primary selection, quantity, secondary-count priors, morphology, repair,
reduction, spelling weights, or gates. It does not claim Q09 is complete.

## Concrete configuration and delegation

Proposed public type in `src/config/language.ts`:

```ts
export type RootPatternPolicy =
  | { type: "legacy" }
  | { type: "count-conditioned"; lambda: number };

// Add to StressRules:
rootPattern?: RootPatternPolicy;
// Add to ResolvedStressRules:
rootPattern: RootPatternPolicy;
```

Omission resolves to a fresh `{type:"legacy"}` internally. Copy the selected
policy at generator creation, consistently with the existing resolved secondary
and rhythmic settings; do not retain a mutable config alias. Do not insert a
field into `englishConfig`, modify phoneme objects, or add policy metadata to
legacy returned words/traces. Public use is a copied English config passed to
`createGenerator`, setting only
`pronunciation.stress.rootPattern = {type:"count-conditioned",lambda:Math.log(2)}`.
The named policy fixes the accepted prior, adjacency score, and numerical
contract; this slice does not expose arbitrary scoring callbacks.

| Requested policy | Execution and returned diagnostics |
| --- | --- |
| Omitted | Existing legacy executor and v1 trace/stressWeight exactly |
| Explicit `legacy` | Same legacy executor and v1 trace/stressWeight exactly |
| Supported `count-conditioned`, lambda=0 | Validate admitted inputs, then execute the existing legacy placement; v1 trace/stressWeight exactly; no proposal/sample |
| Supported `count-conditioned`, lambda>0 | Detached proposal, pure law sample, one actual application; v2 only; omit stressWeight v1 |

Keep the current `applyStress` body as a clearly named legacy executor. A small
dispatcher selects the path. Lambda=0 may enter that same executor with a private
validation checkpoint immediately after its existing single primary assignment
and before explicit-secondary selection. The checkpoint receives the already
computed analysis and detached before/after marks and calls the pure constructor
for supported-domain validation only; it never samples or recomputes primary.
Omitted/explicit legacy do not run the new law validation. This avoids both
repeating primary and accidentally tightening old custom configuration behavior.

Validate the new policy's exact keys and finite nonnegative lambda at config
construction. Apply the pure law's existing domain/range checks on the actual
root/primary/weight input for zero and positive opt-in modes, including the
conservative <=1024 bound, finite gates in [0,100], finite nonnegative weights,
ordered sum/absorption restrictions, and the all-zero fallback. Do not duplicate
or relax its numerical arithmetic. Check raw stress values before using the
legacy `stressMark` helper: before-primary must be exactly undefined everywhere;
after-primary must contain exactly one `"ˈ"`, with all other values undefined.
Empty roots, extra labels, and malformed strings are errors, not unmarked data.

Wrap actually executed opt-in stress RNG calls with a finite [0,1) check without
drawing in advance. This includes primary and proposal calls, not only the pure
sampler's existing validation. It does not establish a new whole-generator RNG
validation promise for earlier/later stages. Valid supported lambda=0 executions
consume exactly the same values in the same order as legacy. Unsupported inputs
throw explicit errors; neither retries nor legacy fallback may mask them. A
root-dependent validation error may follow its real primary RNG draws; document
that errors do not roll the stream back.

## Minimal source boundaries

| File | Intended change |
| --- | --- |
| `src/config/language.ts` | Policy type, resolution, narrow opt-in validation; preserve legacy config semantics |
| `src/core/pronounce.ts` | Legacy dispatcher/checkpoint; positive-policy orchestration using existing primary/secondary/rhythm decisions; neutral observation hook for rhythm |
| New `src/core/conditional-stress-pattern.ts` | Detached proposal collector, typed applied v2 collector, shared narrow assembly/morphology observer interface |
| `src/core/trace.ts` | Add conditional observer construction and active-observer access; union trace type; positive-path stressWeight omission |
| `src/core/morphology/attach.ts` | Replace v1-only observer type/access with common applied observer interface; no change to affix selection, stress assignments, or order |
| `src/core/generate.ts` | Use active observer for existing assembly and final lexical/surface snapshot sites; retain their stage timing |
| `src/index.ts` | Export policy and v2/union public types, retaining existing v1 names |
| New focused public API tests/docs | Activation, delegation, provenance, mutation, and failure contracts |

`root-stress-law.ts`, `root-stress-law-types.ts`, accepted proof tests and frozen
proof/observer/evidence files stay unchanged. Prefer keeping
`src/core/stress-pattern.ts` itself unchanged: reuse its exported value types and
pure `analyzeStressPattern`, and satisfy a new narrow interface structurally.
Do not rewrite it into a generalized observer just to share small snapshot code.

Preserve `TraceCollector.stressPatternObserver` as the existing v1 observer for
legacy code. Add a separate conditional observer and a method returning their
common applied assembly/morphology interface; assert only one is active. This
limits source compatibility changes to the honest `WordTrace.stressPattern`
union and avoids giving v2 a fake v1 rhythmic observer.

The common downstream interface needs only `assemble(syllables,actualOffset)`,
`affix(role,effect,actualIndices)`, `assignment(index,stress,morphologyCause)`,
and `snapshot` for the three shared assembled/final/surface domains. Its cause
parameter is the existing morphology-cause subset, not proposal causes. Legacy
and v2 collectors may expose additional private/root methods independently.

Rhythm is the only placement helper coupled directly to the current observer.
Use a narrow internal observation sink for iteration start, skipped reason,
neighbor-check occurrence, raw gate result, and successful assignment. A v1
adapter writes exactly today's fields/events; a proposal adapter writes its own
namespace. Preserve the same loop, candidate/neighbor tests, coinFlip call,
iteration ordering, and actual 0/100 draws. Do not implement a second subtly
different rhythmic generator or put a temporary v1 trace on the proposal.
The existing primary and explicit-secondary helpers remain the selection source.

## Positive-lambda execution in one attempt

1. Check the admitted raw unmarked root. Compute shared weight exactly once on
   the actual root before primary. If tracing, begin v2 and detach its input
   snapshots/weight data. No trace work changes the RNG path.
2. Execute the existing primary helper once on the real root, preserving OT
   candidate order/noise/ties and custom two-argument constraints. Record real
   primary draws/assignment and `root-after-primary`. Validate that result;
   do not accept side-effectful custom constraints that break the admitted marks.
3. Build `RootStressLawInput` from those exact marks, actual operational-heavy
   values, and resolved secondary/rhythmic settings. Construct the law before
   proposal execution, so unsupported numeric input cannot consume proposal or
   sampler draws. No invented quantity or surface reweighing enters the law.
4. Deep-clone the after-primary syllables into a detached proposal context with
   no production `TraceCollector`. Run existing explicit-secondary selection and
   existing directional rhythm through the proposal observation sink. Keep
   candidate selection followed by gate even at 0/100 and all-zero weights.
   Record each actual draw, skip, and successful proposal assignment. Retain
   actual after-explicit and after-rhythm proposal marks; derive K from those
   marks and independently require K equals successful proposal assignments.
5. Call the frozen `law.sample(K, rand)` exactly once. Transfer its actual
   component/backward transcript by value, preserving all forced/drawn variants,
   summed duplicate-history mass, order, and ordinal scope. A zero-support result
   here is an integration failure, not a reason to replace the proposal or K.
6. Verify sampled primary/K/support invariants. Walk selected secondary indices
   in ascending root order and write each `"ˌ"` once to the real root. Its prior
   state is still the actual after-primary root. Never clear/rewrite the primary,
   never copy the proposal's stress object onto the word, and never run another
   rhythmic pass. Record one applied event per assignment, then the actual
   `root-after-pattern-application` snapshot.
7. Continue the current pipeline unchanged: root nucleus repair; resolved
   morphology and its effects; final promoted-nucleus repair; lexical spelling;
   one surface reduction/aspiration pass. Later phone changes are real existing
   consequences of the changed stress pattern, not application invariants.

K=0 is a full observed decision with an empty ascending application and no
sampler-assignment events. The forced result consumes only whatever draws the
frozen sampler actually requires (none for the unique primary-only pattern).
Do not omit the decision/snapshot or fabricate a secondary assignment. A
monosyllable still has its internal primary; its proposal skips secondary/rhythm.
A disyllable with fixed K=1 has only the adjacent pattern and is not repaired by
this policy. These are explicit no-placement-change strata.

## Trace v2, actual phases and provenance

Use the accepted design's discriminated `ConditionalStressPatternTrace` and
`WordStressPatternTrace = StressPatternTrace | ConditionalStressPatternTrace`.
Retain the existing exported `StressPatternTrace` as v1. Do not introduce a
structurally ambiguous `version:1|2` object with optional phase fields.

Positive activation has exactly six actual snapshots, in execution order:

1. root-before-primary
2. root-after-primary
3. root-after-pattern-application
4. assembled-after-morphology
5. final-lexical-before-realization
6. surface-after-realization

There are no applied `root-after-explicit-secondary` or `root-after-rhythmic`
snapshots on this path. Their states exist only inside the detached proposal
wrapper. Proposal assignments use `proposalEventId` and
`assignedInProposal`; neither `explicitSecondary.applied` nor rhythmic `.applied`
is reused to describe them. Proposal primary is inherited from its named actual
source snapshot, not executed a second time.

Positive traces omit the **property** `stressWeight`, not merely serialize it
away while leaving a misleading live object. The legacy branch of `toTrace`
retains its exact existing fields, including undefined-property behavior.
Actual shared weight/policy/syllable analyses are detached into v2 `weightInput`
with domain root-before-primary. This opt-in trace compatibility cost is
explicit documentation, not missing evidence or unknown quantity.

Applied v2 origins are only unmarked or an earlier applied event ID. Root-primary
is event 0; each sampled secondary references decision 0; subsequent morphology
assignments reference actual effect IDs. Never link a sampled origin to the
chosen latent component, explicit proposal choice, or proposal event: those are
not the historical cause of the applied mark. Event snapshots retain ordered
previous-origin chains, even if an overwrite later restores the same mark.
The sampler transcript uses the exact public result types where possible rather
than an independently divergent second encoding. It stores no -Infinity/NaN
or fake uniform for forced choices.

Deep-copy nested quantity, phone snapshots, origins, candidates, policy, proposal
arrays, and sampler results. Mutating config, returned word lexical/root/surface
phones, or one trace snapshot must not change a saved decision, another snapshot,
previous returned word, or later generation. Trace false follows the identical
proposal/sample/application/RNG path with no returned diagnostic object.

## Resolved morphology coordinate chains

Keep `prepareMorphology` as the authority for actual prefix/root/suffix lengths.
Its allomorphs may realize a different number of syllables from a planned or
resolved `syllableCount` declaration. Use the concrete arrays **after** zero-
syllable flattening and before assignment; never offset by written lengths or
planned counts. Root applied event indices remain root-relative historical
coordinates. After assembly, current root origins shift by actual prefix-array
length; word-coordinate overwrite events point back to those existing IDs.

`AffixStressEffect.role` remains a word-local reference to the corresponding
`trace.morphology.realization[role]`, whose Q06 selection retains planned and
resolved forms/allomorph identity. The effect itself is the current planned
Affix's `stressEffect`: allomorphic phones/forms do not silently replace the
stress rule. Final observer validation must resolve that role and check realized
syllable indices against the actual assembly, not guess identity from spelling.

Zero-realized-syllable prefixes/suffixes can insert phones into existing root
onsets/codas without adding a syllable. Keep their effect entries with
`no-realized-syllables`, empty indices/eventIds, and their real resolved identity.
Do not apply a declared stress effect to a nonexistent syllable. Conversely, an
allomorph that realizes a syllable where the plan declared zero contributes its
actual index and receives the current stress effect in current prefix-then-
suffix order. Affixes with syllableCount=0 and nonempty arrays that are flattened
remain zero-index effects according to current preparation behavior.

Preserve all actual demotions/promotions and secondary writes from
`adjustStress`, including primary -> secondary -> primary at one index,
prefix-primary followed by suffix attraction, prefix-attraction-not-applied,
and none. No final-word refooting, protected-origin deletion, or adjacency repair
is introduced. The assembled snapshot precedes final nucleus repair; final
lexical precedes realization; surface follows it. Phone alterations and zero-
syllable additions do not themselves fabricate stress events.

## Public API fixtures and exact compatibility evidence

Generation fixtures use only `createGenerator`, `generateWord`, or
`generateWords`. Pure mark/law analysis may use its already exported public API;
no internal generation tests or repeat of the published giant law/sampler study.

- Exact legacy/omitted/lambda=0 parity against #334 for complete live objects
  (including undefined keys), serialized full traces, per-draw RNG call counts,
  and next stream value. No stripping of v1/stressWeight or additive config data
  is allowed: this change adds no default metadata to phoneme/word objects.
- Initial, fixed, penultimate, weight-sensitive, and OT primary; a custom
  two-argument OT constraint; count=1 and forced roots 2..7; automatic longer
  roots; both candidate windows; both independent enabled flags; probabilities
  0/100; zero weights; one-candidate selection still drawing; valid custom
  quantities/unknown fallback. Check supported lambda=0 separately from positive.
- Positive trace-on/off whole output/RNG equivalence; v2 six-domain ordering;
  no stressWeight own-property; primary executed once; complete proposal history;
  sample output applied once in ascending order; K0; unchanged singleton support;
  a support with both adjacent/nonadjacent alternatives; duplicated latent
  histories without duplicate applied events. Scripted valid RNG tapes make
  decision boundaries and actual draw counts inspectable without searching seeds.
- Explicit supported-input errors through public configurations, including
  overflow/absorbed/invalid weights and huge finite penalty. Where reachable,
  an OT callback that corrupts marks must cause the strict post-primary error.
  Do not invent private test entrypoints to force unreachable generator states.
- Morphology none/secondary/primary/attract-preceding; both affixes; different
  planned/realized lengths; custom zero-length prefix/suffix; array flattening;
  allomorph changing zero to one syllable; two successive primary effects;
  no-net-change demotion/re-promotion; reduction and nested metadata mutation.
- Config policy is detached at factory creation; deliberate later edits to
  source policy cannot change it. Preserve existing mutation semantics for
  unrelated referenced config objects; no wholesale config cloning refactor.
- Retry/returned-attempt fixture establishes that an earlier discarded attempt
  does not leak proposal IDs, origins, or snapshots into the selected word.

Before formal corpus work, run a pinned default-delegation parity schedule:
4 profiles x 5 distinct development streams x 1,000 draws = 20,000 distinct
coordinates per configuration. Compare published #334 versus new omitted,
explicit legacy, and supported lambda=0, each trace on/off using separate equal
streams. That is 4 implementations/configurations x 2 trace modes x 20,000 =
160,000 public generation calls, reported separately from custom fixtures and
from later full captures. No paired streams share mutable RNG/config objects.
This schedule is a proposed preregistration, not an executed result.

## Versioned capture adapter; frozen metric reuse

The copied frozen #307 `captureRun` imports `generateWord` directly and records
`canonical(englishConfig)`; it has no generator/config injection point. Therefore
it cannot honestly produce this opt-in corpus unchanged. Do not mutate global
English config, redirect imports invisibly, or stamp a changed capture module
with the old evaluator digest.

Implement a new nested, versioned capture adapter. Its explicit modes are
published-control, candidate-legacy, and candidate-active; each selects a pinned
runtime and constructs the declared config through the public factory. The
initial schema-compatible archive must pin the adapter implementation as well
as runtime bytes, actual canonical effectiveConfig and override, dependency
lock, protocol, reference bytes, and full engine identity/executable SHA. Include
adapter source in its evaluator/producer source identity and a pinned adapter
provenance artifact; its initial evaluator digest is deliberately distinct.
A copied/adapted accumulator must be identified as such, not claimed to be the
frozen function. Keep this new module outside the frozen top-level evaluator.

Then call unchanged #307 `rescoreRun` on the verified immutable raw archive.
It preserves generator/effectiveConfig and the original adapter/source manifest
inside provenance, and computes the common frozen metrics with unchanged
`evaluateCorpus`, `classifyWord`, definitions and distance code. Compare those
rescored archives using the unchanged comparison path. The supplemental reader
must verify the retained producer provenance, not regard the common rescored
metric digest as proof of identical capture adapters.

Before candidate outcomes, demonstrate that the adapter's published-control
path produces exact archived words/traces and all core counts/summaries against
the original public capture path, and exact per-draw RNG boundaries via a
separate captured sidecar. Identical source cohorts already archived under
#330 may be reused as complete-word control only after byte/config/source and
metric equivalence are proven; the preferred reviewable immediate control is a
full 200k capture of exact #334 under this adapter. Do not silently substitute
the original pre-integration baseline as the immediate control.

Strengthen the new wrapper independently: exact scheduled/manifest/filesystem
shard set, regular files, no duplicate/unlisted paths or coordinates, every
compressed hash/size, complete counts, exact cohort and distinct seed schedule,
config/adapter/runtime/protocol/reference hashes before and after execution,
and exclusive outputs. Preserve interrupted/failed runs. Pin exact source
allowlists with extra-source detection and separate outcome directories before
capture, so later packaging cannot invalidate the source freeze.

## New v1/v2 observer and mechanism verification

Create new observer/verifier modules under the new experiment; do not amend the
frozen Q09a v1-only observer or the accepted sampler tools. Old v1 observers must
reject v2, not fall back to historical absence. New availability is explicit:
observed; not-executed because positive placement replaces the legacy applied
phase; unavailable historical data; unsupported version. Unavailable is never
counted as a clean pattern. Observed/n/a/unknown/unsupported denominators must
reconcile to every scheduled word in every profile/stream/morphology stratum.

Map the common endpoint **root placement complete** explicitly to v1
root-after-rhythmic and v2 root-after-pattern-application. Proposal diagnostics
are separately named. Reuse pure mark analysis for actual phases and proposal
marks without inferring quantity, lexical class, feet, or underlying vowels.

Verifier checks actual shared input against root-before-primary phones/config;
independent literal candidate/gate/rhythm replay from the recorded proposal;
raw RNG values and draw/skip ordinals; K/primary conservation; frozen public
sampler transcript replay with exactly recorded sampler draws; ordered actual
application; all morphology previous-origin/effect chains; assembly coordinates;
and all lexical/surface snapshot correspondence. Same-engine replay binds Node
executable/versions/platform/arch. Mathematical expectations use an independent
literal-history Fraction/Decimal observer, preserving duplicate histories and
zero-support distinctions. These responsibilities remain distinct.

The default source tables admit at most nine lexical root syllables (text six,
lexicon nine; morphology cannot increase root size). The preregistered observer
can enumerate complete histories for **every** observed default-cohort context
up to nine, cache by its full actual input signature, and retain the contributing
histories/counts. Verify that source bound before capture and reject an
unexpected out-of-domain record rather than silently omit it. Custom long-root
integration fixtures relay the already proved law; they do not create an
exhaustive corpus claim for unbounded custom roots.

Reuse accepted law tolerances: exact structure/support/K/primary; probability
absolute 1e-12; relative 1e-10 when reference >=1e-12; finite log absolute 2e-10;
normalization 2e-12. Store reference expectations for adjacency, unmarked runs,
edge/interior position, and heavy-syllable secondary coverage. Compare these
independent high-precision values to any production analytical claims; do not
make new numeric claims from a rounded plotted difference. Strict expected
adjacency improvement follows positive lambda where adjacency varies on
positive support; identify that eligibility combinatorially, not by an epsilon
threshold or RNG observation. Keep declared continuous-law expectations distinct
from finite-generator RNG behavior, just as #334 does.

Adversarial observer tests include: proposal events transplanted as applied
origins; a fake secondary.applied/stressWeight; placeholder root phases;
duplicate/omitted/out-of-order K0 or ascending events; wrong primary/K; altered
draw/forced marker/component; dropped duplicate history; zero-mass treated as
small positive; incorrect resolved prefix offset; nonexistent zero-syllable
assignment; broken origin predecessor; aliased quantity/sampler data; booleans
in integer coordinates; and incomplete/reordered/corrupt archives. Source
capability inference requires actual emitted contract, not declaration strings
alone. Version-specific strict parsing rejects unsupported future traces.

## Cohort and preregistered endpoints

Freeze before active outcomes: exact #334 control, new runtime/adapter/observer
bytes, original #307 schedule/metric/reference hashes, the copied effective
config, lambda=**0.6931471805599453** (`Math.log(2)`), availability rules,
field-level acceptance, witness selection, and all report denominators. Do not
try multiple penalties and pick one against a quality gate.

Use the unchanged development schedule: lexicon-default, lexicon-bare,
monosyllables-bare, text-default; five distinct seeded streams each; 10,000
returned words per stream = 200,000 control and 200,000 active returned words.
Record all existing review draws/core witnesses, plus deterministically bounded
first mechanism/provenance failure or tradeoff witnesses per named stratum.
Validation seeds remain unused until the exact frozen hypothesis is reviewed.
Do not claim Mulberry streams are independent or same-index candidate/control
words are pairs after active extra draws shift the stream.

Primary mechanism report: for each returned attempt's actual `(input,K)`, report
independent legacy versus tilted conditional expected adjacency, variable-cost
support eligibility, strictly improved/equal cases, and magnitude. Also report
actual proposal-versus-applied adjacency delta, K equality, primary equality,
excess above support minimum, and both full distributions. The paired
proposal/application comparison is within one decision; it does not assume
unchanged candidate/control future words. Every proposal/application can retain
or even increase adjacency; lower expected cost is not a per-draw no-clash rule.

Important selection limitation: archives retain the selected attempt, not all
stress samplings executed before length-based rejection. Changed placement can
alter spelling/realization/acceptance. Therefore retained sampled frequencies
are not an unbiased new sampler-frequency test, nor proof of a paired causal
quality effect. The #334 sampler proof remains the numerical prerequisite;
this corpus tests integration and reports retained-output behavior. Trace scope
and attempts retain their existing meanings; do not invent rejected histories.

Hard integration acceptance: all supported executions succeed without silent
fallback; primary and K preserved at application; no segment change during
application; full trace on/off and delegation parity; valid detached v2
transcripts; all applied events/origins/morphology correspond; no fabricated
availability; immutable complete archives and exact counters. Final lexical
primary integrity is checked against the current contract, while secondary
counts may legitimately change under morphology.

Report all broader diagnostics, including unchanged frozen core metrics,
phoneme/trigram/length/uniqueness counts, attempts and actual morphology; root vs
assembled/final/surface adjacencies by orientation/origin; K and position/weight/
unknown strata; initial/internal/final unmarked runs (including length>=2 and
>=3); heavy secondary coverage; vowel repair and secondary-stressed schwa;
missing/multiple primary; and all failed existing gates. A lapse or realization
regression is a disclosed tradeoff, not an excuse to drop a profile or retune.
The mechanism result alone does not authorize default activation.

## Validation, inherited failures, and review checkpoints

After implementation review: focused public fixtures; strict TypeScript;
touched lint; scoped simplifier; fixed parity; full unit and dedicated quality.
Use an explicitly reserved isolated performance window for paired control/active
and tracing costs; pin configuration, order, workload and unchanged existing
performance gates before timing. No claim that correctness-run duration is
performance evidence. Then freeze runtime and all new study tools, parent review
of adapter/observer/source, and separate authorization before full captures.

#334's recorded full suite is 517 passed, one skipped, **three inherited
failures**: Q06 seed167 `inlodsed` vs `immamsed`; 29 selected `im` versus >30;
`ugh` ratio 0.004901057711283718 versus unchanged 0.0062 floor. Its dedicated
quality ultimately passes12/12; the earlier sandbox report-write failure and
successful unchanged retry are preserved. Omitted/legacy runtime tests should
reproduce those failures exactly; new passing fixtures only increase the pass
count. Do not relabel them sampler failures, fix unrelated fixtures here, or
silently relax gates. If current execution differs, investigate and report the
actual difference rather than assume inheritance.

Implementation checkpoints:

1. Parent approval of this runtime/adapter/observer plan and exact new protocol.
2. Minimal runtime/v2 types plus public fixtures, review before corpus outcomes.
3. Frozen independent adapter/probe adversarial fixtures and exact delegation
   proof, review before active capture.
4. Full immediate-control/active archives, unchanged core rescoring, independent
   complete-record verification and limitations; preserve every outcome.
5. Reviewable stacked opt-in PR. Default English activation, validation-cohort
   execution and further hypotheses require separate evidence/review decisions.

## What remains after this runtime PR

Fixed-K disyllabic adjacency is structurally unresolved. The policy preserves
legacy support, including first-three explicit selection, directional rhythm,
root primary placement and secondary-count prior. It introduces no lexical
exceptions, word-class/compound guesses or universal no-clash ban.

Morphology may promote/demote/add marks after sampling and introduce final-word
adjacency. A later Q09c needs an explicit theory/contract for preserving root
prominence, affix anchors and demoted-primary origins before any assembled-word
refooting. Secondary-count priors, disyllable rates, weight/position tradeoffs,
primary-window/WSP changes, dialect/quantity completion, reduction hypotheses,
compound/lexical strata and acoustic/read-aloud judgments remain separate.
Neither a better diagnostic count nor this configurable penalty alone proves
that listeners perceive more English-like rhythm.
