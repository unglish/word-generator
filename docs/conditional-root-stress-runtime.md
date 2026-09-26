# Experimental conditional root stress

The generator can opt into the separately proved complete-pattern sampler. Its
English default remains the legacy explicit-secondary plus directional-rhythm
procedure. This experiment changes where root secondary stress is placed while
preserving the actual legacy proposal's number of secondary marks K and the
actual primary position.

```ts
import { createGenerator, englishConfig } from "@unglish/word-generator";

const generator = createGenerator({
  ...englishConfig,
  pronunciation: {
    ...englishConfig.pronunciation,
    stress: {
      ...englishConfig.pronunciation.stress,
      rootPattern: { type: "count-conditioned", lambda: Math.log(2) },
    },
  },
});
const word = generator.generateWord({ seed: 51, trace: true });
```

The fixed named law weights each supported complete pattern by its legacy
history-summed mass times `exp(-lambda * adjacentMarkedPairs)`, conditional on K.
Each extra adjacency approximately halves conditional mass at the illustrated
penalty. This penalty is an experimental modeling choice, not a fitted English
grammar. A sample can still have adjacent stresses. In particular, a disyllable
with primary plus one secondary has no alternative without adjacency.

Omission or `{type:"legacy"}` uses the old executor. A supported
`{type:"count-conditioned",lambda:0}` validates the analytical domain and then
delegates to that same old executor, with no proposal or sampler calls. The policy
is copied when the factory is created. Changes to a caller's policy object later
do not change that generator. Other configuration reference semantics remain as
before.

The opt-in domain requires an unmarked, nonempty root before one primary
assignment. The pure law enforces finite probabilities in [0,100], finite
nonnegative secondary weights, its ordered-sum restrictions and conservative
log-magnitude bound of 1024. It preserves the zero-total-weight final-candidate
fallback. Unsupported inputs throw; they are not clamped, truncated, retried, or
silently delegated to legacy. Root-dependent errors can occur after the real
primary draws; streams are not rolled back. Actual stress RNG values must be
finite in [0,1). See [the pure API contract](conditional-root-stress-law.md) for
the declared real-valued law and finite-precision limitations.

For positive lambda the primary helper runs once on the real root. The legacy
explicit-secondary and rhythmic decisions then run on a detached proposal.
Their realized K is passed to the sampler, and sampled secondaries are applied
once in ascending root order. Morphology, nucleus repair, spelling, reduction,
and aspiration follow in their existing order. Their output may change as a
consequence of the changed stress and additional RNG calls. Final affix-induced
adjacencies are observable residuals, not repaired by this policy.

## Trace compatibility

Omitted, explicit legacy, and supported zero-lambda traces retain v1 unchanged.
Positive activation emits `trace.stressPattern.version === 2`. The existing
`StressPatternTrace` export still denotes v1; `WordStressPatternTrace` is the
public discriminated union. Consumers must narrow its version.

Positive traces have six actual domains: root before primary, root after
primary, root after pattern application, assembled after morphology, final
lexical before realization, and surface after realization. Explicit-secondary
and rhythmic phases occur only in the `rootPattern.proposal` namespace, whose
assignments use `proposalEventId` and `assignedInProposal`. They are not applied
word events. K0 has an observed decision and empty application, not fake events.

The old `stressWeight` property is absent on the positive path because its
`secondary.applied` meaning would be false. The same actual shared analysis is
available in v2 `weightInput`, before root nucleus repair. Unknown quantities
remain unknown; operational fallback is not inferred linguistic quantity.

V2 applied origins link only actual applied event IDs. Morphology effects refer
to the word-local Q06 resolved affix records. Actual realized syllable arrays
set offsets, including zero-syllable phone additions and allomorphic length
changes. Every real overwrite is retained, even demotion and re-promotion of the
same syllable. Snapshots and decisions are detached from returned word forms,
configuration, and one another.

Frozen v1-only observers must reject v2. Use a new version-aware observer rather
than interpreting missing legacy phases as clean or unavailable historical data.
The trace covers the returned attempt; discarded attempts and non-stress RNG
calls are not reconstructed. Length-based selection can bias returned-pattern
frequencies, so this corpus is not a repeat of the independent sampler proof.

## Evaluation state

The runtime protocol and fixture plan are preregistered under
`evaluation/experiments/conditional-root-stress-runtime`. No active corpus or
performance outcome is claimed by this implementation. Formal delegation,
versioned capture/observer review, full control/candidate evidence, and any
English-default decision remain separate review checkpoints.

This does not resolve secondary-count priors, fixed-K disyllables, final-word
refooting, primary-window behavior, morphology classes, or perceived rhythm.
