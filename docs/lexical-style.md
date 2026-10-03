# Origin uncertainty and the opt-in spelling-style experiment

A phoneme/spelling correspondence cannot establish an invented word's history.
The English inventory now records `originAssessment` on every grapheme. Its
`legacy` record retains the old numeric code and marks the claim unsourced.
Unassessed entries make no language assignment; assessed entries contain cited,
example-specific pathways. `/m/ → mb` retains code 5 for compatibility and has a
null legacy label because the code lies outside `ORIGINS`. Its examples include
both native and borrowed words. The old `origin` property is deprecated as an
etymological claim and has no role in generator weighting.

`englishOriginSources` exposes the reference registry. Examples describe lexical
histories, not an exhaustive explanation of spelling development, estimated
spelling frequencies or the ancestry of generated roots. Custom inventories may
omit `originAssessment`; these entries remain unassessed.

## Optional soft style

```ts
import { createGenerator, englishConfig, englishStyleExperiment } from "word-generator";

const generator = createGenerator({
  ...englishConfig,
  lexicalStyle: structuredClone(englishStyleExperiment),
});
const word = generator.generateWord({ seed: 237, morphology: true, trace: true });
```

The registered pilot has equally weighted plain and marked styles and three
exact feature keys: `/f/ → ph`, `/s/ → ps`, `/n/ → mn`. Feature weights receive
multipliers 0.5 or 1.5 respectively at strength 1. These are explicit heuristic
choices; cited dictionary examples do not estimate their strengths. Unassessed
associations and affix spellings remain neutral. Other profiles can declare
bounded positive multipliers between 0.5 and 2, with strength between 0 and 1.
Every feature must assess every style and reference a configured inventory entry.

One style is sampled at the first lexical-root spelling after phone preparation
and is retained across the requested word's length retries. Every root spelling
choice uses that same style. Omission and a validated strength of zero preserve
the existing selection and RNG schedule and do not add style trace fields.
An enabled policy intentionally adds a draw and changes the subsequent RNG
stream; same-seed treatment words are not independent paired phonologies.

Weighting operates after existing legal candidate construction. It preserves
positive support and every hard condition. Ordinary selection, conditioned
sequence probabilities, local normalization and coverage planning receive the
same resolver law. A styled spelling with no compatible continuation remains
excluded by the conditioned sequence; style never relaxes that obligation.
Shared constructions and later repairs retain their existing rules rather than
being assigned a guessed historical origin.

With tracing enabled, `word.trace.lexicalStyle` records the actual draw, profile,
style and normalized priors. Each grapheme decision's `styleWeights` records
local legal base weights, multipliers, final weights and association references.
Those are local weights before global sequence conditioning and later edits.
`conditionedSelection` records the actual conditioned probability/path; final
spelling and repair ledgers record whether a selected form survived. A replay
must reconstruct the frozen style resolver when verifying a conditioned path.

## Verification and limits

The initial implementation passes strict generator and focused-test types,
touched lint, six kernel tests and seven integration tests. Integration checks
cover complete inventory assessments, omission/zero word/trace/RNG parity,
enabled trace/plain parity in both writer paths, replay of actual conditioned
paths, one draw across forced retries, unknown feature rejection and analytical
probability/obligation cases. These are bounded development checks rather than
the full registered sample.

The frozen registration is in
`evaluation/experiments/lexical-style/measurement-preimplementation.json`.
Full control/candidate captures, independent trace reconstruction, broad metrics,
original unchanged gates and paired timing remain required. Report opportunities,
feature marginals and within-word co-occurrence separately from diversity and
reader judgments. Feature enrichment, metadata correction or agreement with the
model's own style label cannot establish better English wordlikeness. The default
English config does not enable this experiment. Frozen blinded reader evaluation,
calibrated inference and actual observations remain required for Q20.
