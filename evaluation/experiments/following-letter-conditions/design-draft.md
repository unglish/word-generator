# Q14b: following-letter conditions — design work

Status: initial-sequence conditioning and generic rewrite/batch guards are
implemented opt-in. The control analysis is retained in `control-baseline/`;
raw temporary archive availability is documented in `premeasurement/`.
`measurement.json` registers candidate configuration and acceptance limits.
Formal candidate capture, broad comparisons and promotion remain pending.
Parent checkpoint is Q14a `f284fb8`;
Q14a remains opt-in and has failed acceptance criteria of its own.

## Concrete failure

The retained development witness is `carowngs` at lexicon-default seed
101601885, draw 2775. Original selection assigns /s/ to `c` with positive weight
1120 and /æ/ to `a`. The `c` cell survives intact before `a`. The next-phone
front-vowel test passes, while the declared soft-c reading requires e/i/y.
The only root edit is a later vowel completion elsewhere. This is evidence of
one actual incompatible selection, not a population prevalence estimate.

The current resolver sees fixed next-phone context and previous written form.
Its condition interface has no next-written-form field. Separate reading
metadata already states written-context obligations. Changing a phone category
alone cannot enforce an obligation on the eventual written letter.

## Required design decisions before implementation

1. Define productive soft-c, soft-g and hard-reading contexts from primary
   linguistic evidence, including lexical exceptions. Do not elevate the
   current reading table to a complete linguistic specification by assumption.
2. Specify when following letters become known. Compare joint conditioned
   selection, bounded lookahead and post-selection whole-unit replacement.
   Preserve complete units, phones, shared codas, split markers and explicit
   provenance. Merely refusing every affected word is not a solution.
3. Define the sampling law, treatment of zero weights and duplicate inventory
   entries, exact RNG draw schedule, fallback and search-exhaustion behavior.
   Evaluate conditional distributions rather than silently retuning frequencies.
4. Define how later completion and repairs preserve these obligations. Root
   and final morphological ownership must have separate denominators. Missing
   ownership or lexical evidence is unavailable, not automatically valid.
5. Specify opt-in configuration and exact omitted-policy compatibility. Custom
   configurations must remain typed and cannot silently inherit English rules.

## Prospective measurement requirements

Before candidate capture, freeze the completed policy, implementation-independent
observers/recount, exact control configuration and archive, and test matrix.
Use the unchanged 200,000-word development protocol; keep validation sealed.
Compare original baseline and immediate control with a common evaluator and
retain quality/performance failures, diversity, lengths and morphology strata.

Count eligible units, compatible/incompatible following letters, unavailable
ownership, licensed exceptions, replacements, rejected proposals and exhausted
searches. Distinguish initial selection from final-root preservation and final
assembled-word status. Retain complete stratified witnesses with phone, selected
form, emitted cells, edits, repairs, structural events and morphology.

Adversarial fixtures must cover vowel letters differing from next-phone
categories, word edges, syllable boundaries, clusters, shared units, split
constructions, later vowel completion, lexical replacement, opaque rewrites,
custom inventories and conditions, and probabilities/weights with deterministic
boundaries. Compare full public output, traces, RNG calls and next values with
tracing on/off and with the policy omitted. Measure performance in fresh fixed
AB/BA pairs, separately from profiling and concurrent diagnostic work.
