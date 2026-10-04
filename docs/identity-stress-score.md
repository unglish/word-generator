# Separate identity and stress diagnostics

`createIdentityStressScorer` adds an observational diagnostic to the identity
contract. It leaves generation, RNG use, the legacy helper, and existing quality
scores unchanged. It reports coarse ARPABET and stress-sensitive ARPABET scores
separately. Neither score measures human preference or certifies English phonology.

The source declaration is `english-legacy-v1` at the surface layer. The target is
the provisional `rhotic-general-american-reference-v1` comparison reference from
the identity contract. This crosswalk does not migrate the generator to that
dialect. Legacy `ə` and `ʌ` remain distinct observations but both project to AH;
`ɜ` remains ambiguous and unavailable for the strict score. Aspiration, stress
erasure, possible identity mergers, and unresolved identities remain per-segment
losses. No underlying vowel identity is reconstructed from reduction flags.

```ts
import {
  generateWord, observeWordIdentity, createIdentityStressScorer,
  observeSurfaceStressEvidence,
} from "@unglish/word-generator";

// reference contains authenticated integer native/base transition tables.
const scorer = createIdentityStressScorer(reference);
const word = generateWord({ seed: 42, trace: true });
const observation = observeWordIdentity(word, {
  sourceProfile: "english-legacy-v1", layer: "surface",
});
const explicit = scorer.score(observation);
const evidence = observeSurfaceStressEvidence(observation, word.trace);
const traced = scorer.score(observation, evidence);
```

Create a fresh observation with `observeWordIdentity` after editing the source word.

The factory validates integer counts, the exact observed vocabulary, row/column
conservation, event and entry totals, and every native-to-base projected pair
count. It compiles detached tables. Its digest fields describe the caller's
declared model; the pure factory cannot authenticate external corpus bytes.
The experiment's `loadPinnedReference` authenticates the compressed artifact,
canonical artifact digest, source digest, and selected population at the file
boundary. The caller must perform equivalent authentication for another model.

Each probability is `(count + 0.5) / (rowTotal + 0.5 * vocabularySize)`. Vocabulary
contains exactly the observed target symbols and `#`. A nonempty word contributes
one initial boundary transition, every internal transition, and one final boundary
transition. The score is the mean negative base-2 log probability per transition.
There are no transitions between words. Vowel stress digits are retained in the
native alphabet and erased in the base alphabet; their numeric scales therefore
cannot be subtracted to claim a quality improvement.

Unknown, ambiguous, incompatible, out-of-vocabulary, or missing-stress items stay
aligned. A word with any unavailable item receives a null score and zero scored
transitions. It never receives a partial-word score or fabricated adjacency across
a deleted item. Known items remain visible within an unavailable projection.

Only actual primary/secondary syllable marks support the explicit-only score.
Absence remains unavailable. The separately versioned trace adapter accepts v1/v2
stress-pattern records only when exactly one `surface-after-realization` snapshot
has word coordinates and its complete segmented geometry, raw sounds, and marks
match the observation. An explicit `unmarked` snapshot then supports stress zero.
This is a declared operational crosswalk: a recorded final `unmarked` state maps
to target stress zero. It is not an independent pronunciation observation or proof
of a lexeme's unstressedness. Trace-supported coverage is conditional on that
convention and remains separate from the original explicit-mark completeness.
It rejects contradictory marks, missing/duplicate/incomplete snapshots, and unknown
versions. This is a final-surface evidence decoder, not a validator of the complete
trace event history. Supplied evidence is a caller declaration and must come from
that decoder or equivalent validated observations. Binding detects accidental reuse
after word mutation; it is not a cryptographic provenance signature.

The preregistered experiment scores all 600,000 existing development records:
the original 200,000-word baseline and both Q09 200,000-word archives. It generates
no new study words and opens no validation cohort. It authenticates every archived
artifact and its source/evaluator provenance before and after measurement. Every
score stream retains aligned projections, evidence, losses, and unavailable reasons.
Reports include all profiles, seeds, actual morphology, syllable counts, phone
counts, written Unicode code-point counts, and deterministic witnesses. Full-coarse totals remain separate from the
coarse/native totals over exactly the same eligible words within each arm. Eligibility
may differ between arms; those denominators must be reported alongside comparisons.

An independent Python implementation recomputes every projection, transition,
score, evidence binding, loss, aggregate, stratum, and witness. Its score tolerance
is fixed at `1e-12` absolute plus `1e-12` relative; identities and integer counts
require exact equality. Full source and archive bindings are frozen before the
corpus measurement. The initial summary-format failure is retained as evidence;
Q09's capture-only records explicitly remain unevaluated by the historical evaluator.

```sh
node --import tsx evaluation/experiments/identity-stress-score/study.ts --out /new/output
python3 -B evaluation/experiments/identity-stress-score/verify.py /new/output /new/proof.json
npx vitest run --config vitest.identity-stress.config.ts
npx tsc -p evaluation/experiments/identity-stress-score/tsconfig.json
```

The source freeze and protocol contain the original absolute archive locations.
Reproduction requires the pinned archives at those locations or an explicitly
registered relocation that preserves every input byte. New observations require
a new source registration; do not silently update the existing freeze. The model
depends on the Q15c transition reference (PR #332); the runtime identity API depends
on PR #318, which is still open. These are declared dependencies, not current-main
integration claims. Full experimental verification, review, and publication status
are recorded separately; the existence of this documentation does not establish them.
