# Q09b active trace and independent oracle contract

Read-only prerequisite, 2026-09-26. Complements `q09-exact-dp-design.md` and
`q09-rhythm-design.md`. No implementation, generator capture or candidate sampling
has occurred. The concrete fixture schedule is frozen separately in
`q09-dp-oracle-protocol-v1.json`; changes after this review need a new protocol
identity, not an edited outcome-dependent tolerance.

## Recommendation: one discriminated stressPattern field

Use a new `stressPattern.version: 2` **only when the positive-lambda policy is
active**. Keep v1 exactly as it is for omitted/explicit legacy policy and for
supported lambda=0 delegation. The latter performs the existing execution after
the opt-in input checks; it does not draw a detached proposal and resample it.
Do not add legacy-policy markers or new fields to v1 returned traces.

| Choice | Consequence |
| --- | --- |
| Discriminated v2 in `stressPattern` | One authoritative applied event/origin ledger. Its version tells consumers that the root placement phases differ. Existing v1-only readers must narrow/reject. Recommended. |
| Separate `stressPolicy` field beside v1 | Keeping v1 populated would falsely imply actual explicit/rhythmic assignments and seven actual phases. Omitting v1 is honest, but makes active data resemble historical missing evidence unless every reader also checks the policy field; duplicating final snapshots/events creates two ledgers and cross-field origins. This has no useful semantic-compatibility advantage. |

Do not populate both an applied v1 and a policy trace from a temporary proposal.
Do not mark proposal assignments `applied:false` inside a v1 trace and pretend
its old contract still describes a legacy execution. On the positive-lambda
path, **omit `trace.stressWeight` v1**: its `secondary.applied` field means actual
root application before rhythm, which did not happen. Copy the same actual
shared weight analysis into an explicit v2 input field. Omission is an opt-in
trace compatibility cost, not unknown quantity or skipped secondary selection.
Omitted/legacy and supported lambda=0 retain `stressWeight` v1 exactly.

Preserve the existing exported v1 interface under its current name, also exposing
a V1 alias if useful. Add `ConditionalStressPatternTrace` and a new union type
for `WordTrace.stressPattern`. The field's wider static type requires consumers
to narrow `.version`; that cost should be documented, not hidden with casts or
an unsound return type. Do not promise that frozen v1 analysis modules compile
unchanged against future union types. Reproduce them with their pinned source
environment, and use a new observer for v2. The pure exported
`analyzeStressPattern({availability, marks})` remains unchanged and reusable.

## Concrete typed shape

Names below are proposed public contracts, not source edits. Reuse existing
phone snapshots, quantity analysis, primary-strategy and affix-effect types by
value; never share mutable arrays with a word, configuration or another snapshot.

```ts
type WordStressPatternTrace = StressPatternTrace /* unchanged v1 */
  | ConditionalStressPatternTrace;

type AppliedOriginV2 =
  | { kind: "unmarked" }
  | { kind: "event"; eventId: number };

type AppliedCauseV2 =
  | { kind: "root-primary" }
  | { kind: "root-pattern-sampler"; decisionId: 0 }
  | { kind: "morphology"; effectId: number;
      action: "demote-primary" | "affix-primary" |
              "affix-secondary" | "preceding-primary" };

interface AppliedAssignmentV2 {
  id: number;                         // index in this v2 applied ledger only
  coordinates: "root" | "word";
  syllableIndex: number;
  before: StressMark;
  previousOrigin: AppliedOriginV2;
  after: StressMark;
  cause: AppliedCauseV2;
}

type ActiveDomain = "root-before-primary" | "root-after-primary"
  | "root-after-pattern-application" | "assembled-after-morphology"
  | "final-lexical-before-realization" | "surface-after-realization";

interface AppliedSnapshotV2<D extends ActiveDomain> {
  domain: D;
  coordinates: D extends `root-${string}` ? "root" : "word";
  eventCount: number;                  // applied events preceding this snapshot
  syllables: Array<{
    onset: StressPhoneSnapshot[];
    nucleus: StressPhoneSnapshot[];
    coda: StressPhoneSnapshot[];
    mark: StressMark;
    origin: AppliedOriginV2;
  }>;
}

interface ConditionalStressPatternTrace {
  version: 2;
  execution: "count-conditioned-root-pattern";
  scope: "returned-attempt";
  rootSyllableCount: number;
  primary: Omit<StressPatternTrace["primary"], "selectedIndex"> &
    { selectedIndex: number };
  weightInput: {
    domain: "root-before-primary";
    policy: StressWeightTrace["policy"];
    syllables: StressWeightTrace["syllables"];
  };
  rootPattern: RootPatternDecision;
  assembly: { rootSyllableStart: number;
    prefixSyllables: number; suffixSyllables: number };
  morphology: AffixStressEffect[];     // eventIds refer to events below
  events: AppliedAssignmentV2[];
  snapshots: [
    AppliedSnapshotV2<"root-before-primary">,
    AppliedSnapshotV2<"root-after-primary">,
    AppliedSnapshotV2<"root-after-pattern-application">,
    AppliedSnapshotV2<"assembled-after-morphology">,
    AppliedSnapshotV2<"final-lexical-before-realization">,
    AppliedSnapshotV2<"surface-after-realization">
  ];
}
```

The generator adapter validates raw stress before converting it to `StressMark`: each before-primary value must be exactly `undefined`; afterward exactly one value must be `"ˈ"` and every other value `undefined`. Invalid runtime strings such as `"x"` or `""` are rejected, not collapsed to unmarked by the legacy helper. The pure law accepts the explicit typed marks and validates the analogous domain.

This v2 intentionally has no `input` applied origin: the admitted root starts
unmarked, and assembled affix syllables are initially unmarked before actual
affix effects. If a future contract permits pre-marked affix/root inputs, it needs
an explicit source origin and validation extension; never fabricate an applied
event to explain an otherwise unsupported mark. The existing v1 retains its
broader `input` representation and behavior.

### Proposal namespace

```ts
interface ProposalAssignment {
  proposalEventId: number;             // never a v2 applied eventId
  syllableIndex: number;               // always root coordinates
  before: "unmarked";
  after: "secondary";
  cause: { kind: "explicit-secondary" } |
         { kind: "rhythmic"; iteration: number };
}
type ProposalSecondary =
  Omit<StressPatternTrace["explicitSecondary"], "applied"> &
  { assignedInProposal: boolean };
type ProposalRhythmicIteration = Omit<RhythmicIteration, "applied"> &
  { assignedInProposal: boolean };

interface LegacyRootProposal {
  target: "detached-proposal";
  sourceAppliedSnapshot: "root-after-primary";
  explicitSecondary: ProposalSecondary;
  rhythmic: {
    enabled: boolean; probability: number;
    requireUnstressedNeighbors: boolean;
    iterations: ProposalRhythmicIteration[];
  };
  assignments: ProposalAssignment[];
  snapshots: [
    { phase: "after-explicit-secondary"; proposalEventCount: number;
      marks: StressMark[] },
    { phase: "after-rhythm"; proposalEventCount: number;
      marks: StressMark[] }
  ];
  secondaryCount: number;
}
```

The proposal starts from the detached actual after-primary state. Its two
snapshots describe proposal states even when a configured rule is disabled;
their wrapper and names never claim those phases occurred on the applied word.
Every successful proposal assignment has its own namespace; proposal IDs never
appear in an applied snapshot origin or morphology `previousOrigin`.
Under the strict domain, proposal assignments only mark unmarked positions, so
their number equals proposal K. Their order and bijection with successful gates
remain independently replayable, including skipped rhythm iterations and actual
0/100 gate draws. Primary is executed once on the real root, not duplicated in
the proposal's event ledger or RNG record.

### Policy/sampling evidence

```ts
type LogMass = { status: "zero" } |
               { status: "finite"; value: number };
type Component = { kind: "no-explicit-mark" } |
                 { kind: "explicit-mark"; syllableIndex: number };
interface ComponentMass {
  component: Component;
  prior: LogMass;
  tiltedMassAtK: LogMass;               // includes component prior pi_e
}
interface ComponentDraw {
  candidateIndex: number;
  remainingFromIndex: number;
  logCandidateMass: number;
  logRemainingMass: number;
  uniform: number;                     // an actually executed extra draw
  drawOrdinal: number;                 // zero-based within sampling only
  takeCandidate: boolean;
}
type BackwardChoice =
  | { kind: "forced"; syllableIndex: number;
      previousMarked: boolean; remainingSecondaryCount: number }
  | { kind: "drawn"; syllableIndex: number;
      previousMarked: boolean; remainingSecondaryCount: number;
      logUnmarkedMass: number; logMarkedMass: number;
      uniform: number; drawOrdinal: number };
interface RootPatternDecision {
  decisionId: 0;
  policy: {
    model: "legacy-continuous-uniform-v1";
    score: "adjacent-marked-pairs";
    lambda: number;                    // finite and strictly positive here
    numericalContract: "binary64-log-chain-v1";
    countSource: "actual-legacy-proposal";
  };
  proposal: LegacyRootProposal;
  sampling: {
    algorithm: "component-mixture-backward-chain-v1";
    targetSecondaryCount: number;
    components: ComponentMass[];       // none, then candidate order
    logPartitionAtK: number;           // Z_K, not conditional Z_K/q(K)
    componentDraws: ComponentDraw[];
    selectedComponentIndex: number;
    componentTermination: "accepted-candidate" | "last-positive" |
                          "only-positive";
    backward: BackwardChoice[];        // descending syllable index
    selectedPatternPriorLogMass: number; // summed over all supporting histories
    selectedPatternConditionalLogMass: number;
  };
  application: {
    secondaryIndices: number[];        // ascending; length exactly proposal K
    appliedEventIds: number[];         // same order, this ledger only
    adjacentMarkedPairs: number;
  };
}
```

Component selection uses the fixed ordered candidate-versus-remaining-tail
binary scheme from the DP design. Zero-mass components are not drawn; the last
positive component is forced. Backward choices likewise draw only when both
predecessor masses are positive. Draw ordinals concatenate component draws then
backward draws without padding or peeking. Purely forced choices have no uniform
placeholder. NaN/Infinity are invalid finite-field values; an unreachable state
is the explicit `zero` variant, never JSON's lossy serialization of -Infinity.

The selected pattern's prior mass must sum supporting components, not report just
the sampled latent component's mass. It can be recomputed in O(m*n) from the
recorded selected pattern and inputs. The conditional log mass is
`log q(pattern|x) - lambda*C - log Z_K`. No exponentially large pattern list or
full n*K table is serialized. The observer independently rebuilds messages and
checks each recorded conditional draw; the production trace is not its own proof.

## Applied events and morphology origin links

The real root remains at the after-primary state while the proposal/DP run.
After selection, assign secondary once to each chosen index, in ascending order.
Each such real assignment gets an applied event with cause
`root-pattern-sampler` and `decisionId:0`. Do not write the primary again or emit
events that merely clear already-unmarked positions. K=0 produces no sampler
assignment events, but still has an observed decision/application and snapshot.
No sampled component is attributed as an actual explicit-secondary origin.

Assembly relocates root coordinates by the actual realized prefix-array length.
Retain the same word-local Q06 prefix/suffix references in `morphology`, and every
executed affix assignment in its original order, including demotion/re-promotion
with no net final change. `eventIds` and `previousOrigin.eventId` refer only to
the authoritative applied v2 ledger. Zero-syllable affixes retain their status
and can add phones within the root; they do not create stress coordinates.

Example: a three-syllable root has primary at root index 1 and sampled secondary
at root index 2. A one-realized-syllable neutral prefix moves them to word
indices 2 and 3. A suffix attracting preceding stress demotes word index 2,
whose previous origin points to the real primary event, then promotes word
index 3, whose previous origin points to the real sampler event. Neither points
to a proposal ID or to the component that happened to support the chosen pattern.
Declared/planned affix lengths do not determine any of these coordinates.

The assembled snapshot precedes final stressed-nucleus repair; the final lexical
snapshot precedes realization; the surface snapshot follows it. Phone/quantity
changes remain visible without inventing new stress origins. Do not rerun weight
analysis over affixes or surface vowels. All nested quantity/phone/decision data
must be detached from configuration, words, proposal state and other snapshots.

## Unavailable phases and frozen observers

The applied v2 snapshot tuple contains six real domains. There is no applied
`root-after-explicit-secondary` or `root-after-rhythmic` snapshot; neither was an
executed applied phase. Do not insert empty arrays, repeated after-primary marks,
or the final sampled marks under those old domain labels.

A new observer should expose an availability union:

```ts
type DomainEvidence<T> =
  | { availability: "observed"; value: T }
  | { availability: "not-executed";
      reason: "positive-lambda-replaces-applied-root-placement" }
  | { availability: "unavailable";
      reason: "historical-evidence-absent" | "unsupported-version" };
```

Counts reconcile observed + not-executed + unavailable to the relevant word
denominator. No absent case enters a zero-clash or known-quantity denominator.
Proposal patterns have their own explicit target/domain and cannot be combined
with applied patterns without labeling that comparison. For a common root-final
comparison, name a new semantic endpoint such as “root placement complete” and
map v1's after-rhythm to v2's after-pattern-application explicitly; do not rename
either source phase or guess from a generic stage label.

The frozen Q09a observer's validator asserts version 1, all seven domains and
stressWeight v1 correspondence. It must stay byte-for-byte frozen and reject
active v2 input. Its historical control fallback is valid only for its pinned
source/control archive. A new caller must not retry rejected v2 words as that
historical mode. Old source/evaluator hashes and archive identities remain fixed;
new policy data requires a new observer/protocol. Version-unknown input fails or
reports unsupported evidence, never a silently clean pattern.

## Frozen finite oracle grid and numerical acceptance

`q09-dp-oracle-protocol-v1.json` fixes 75,600 core configured cases and 864
extended cases. The grid retains duplicate configured cases created by disabled
rules or coincident masks; these are 76,464 configuration cases, not a claim of
76,464 distinct probability laws. Three rational score factors create 229,392
configuration/factor cases. Check every K from 0 through n-1, explicitly labeling
zero-mass strata rather than normalizing them. Testing score factors 1, 1/2 and
1/4 verifies the parameterized algorithm; it does not authorize searching several
behavioral penalties and choosing one from word-quality outcomes.

The independent oracle literally enumerates candidate/gate/rhythm histories with
Python Fraction, then sums duplicate final patterns before conditioning/tilting.
It imports none of the production transition, DP, pruning or sampling code.
Logs use Decimal precision 100 and a precision-140 cross-check; require agreement
within 1e-80 before using the log oracle. The exact rational target factor and
binary64 `Math.log(denominator/numerator)` parameter differ by representation
error; the numerical tolerance includes that difference rather than calling
binary64 lambda mathematically exact.

Proposed pre-outcome tolerances are absolute probability error <=1e-12, relative
error <=1e-10 whenever the reference is at least 1e-12, absolute finite-log error
<=2e-10, and normalization error <=2e-12. These criteria are conjunctive where
applicable. Structural zero/positive support, K, primary/mark arrays and history
correspondence require exact agreement, without an epsilon cutoff. Retain the
maximum error and worst coordinate for every class. These are conservative
engineering bounds for short chains and normal binary64 arithmetic, not a
universal libm theorem or an outcome-calibrated test. Any missed bound is a failed
candidate or a new reviewed numerical design, not grounds to loosen it silently.

The fixed protocol also records explicit invalid-domain/numerical cases, tiny
positive gate log masses, near-unit failure mass, overflow and absorbed weight
additions, zero weights, and a proposed conservative initial log-magnitude range
of 1024. It rejects subnormal positive legacy total weight and larger accumulated
log bounds only on the opt-in analytical path. This restriction makes the current
machine-threshold caveats explicit; it is not a new legacy clamp or a linguistic
weight change. Parent review must approve this supported-range choice before code.

There are 192 additional n=16/32/64/128 endpoint-gate cases. Their rhythm is
deterministic conditional on the explicit component, allowing the same literal
oracle without exponential stochastic branching. They verify a finite longer-root
set and operation/allocation bounds, not every long stochastic input. No timing
gate or candidate samples are part of this oracle proposal.

Future public-API fixtures must also prove exact v1/lambda-zero words/trace/RNG,
trace-on/off invariance on active roots, proposal/application K equality,
morphology links, domain rejection, and detached mutations. A later statistical
frequency study needs its own frozen schedule before outcomes; this deterministic
grid is not a substitute for it. The fixed-K disyllable limitation and all
root-versus-morphology/count-prior scope limits remain unchanged.
