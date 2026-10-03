# Q20: origin uncertainty and a soft orthographic-style experiment

The existing `Grapheme.origin` comment promises an etymological source, but the
inventory stores one unsourced integer per phoneme/spelling pair. `/m/ -> mb`
uses code 5 outside the five-label array. The field is not consulted by the
current writer. Correcting a numeric index alone would not establish linguistic
coherence or reader preference.

A lexical borrowing history belongs to a word and can include multiple stages.
The same spelling pattern need not imply one history. The primary
[American Heritage thumb entry](https://ahdictionary.com/word/search.html?q=thumb)
traces the word through Middle English to Old English;
[plumb](https://ahdictionary.com/word/search.html?q=plumb) passes through Old French
from Latin. This supports ambiguity for final `mb`; it does not identify the
history of a generated word or explain every historical spelling change.

Likewise, [philosophy](https://ahdictionary.com/word/search.html?q=philosophy)
includes Greek, Latin and Old French transmission, whereas
[nephew](https://ahdictionary.com/word/search.html?q=nephew) is documented through
Old French from Latin. Do not infer Greek ancestry from `ph` alone. These are
lexeme histories, not corpus frequency estimates for a grapheme.

## Proposed metadata and behavior

Preserve legacy codes as explicitly unsourced legacy claims. Add a typed
assessment that records unassessed or lexeme-dependent status, source references,
example-specific borrowing pathways and uncertainty. Unsupported legacy labels
must never become categorical runtime filters. The invalid `mb` code needs an
explicit migration/provenance record; assigning it to a language by guess is not
an acceptable correction. Public compatibility and omitted output/trace/RNG
behavior require measurement before deciding the migration.

The style pilot separates orthographic associations from etymology. A fixed
word-level latent profile softly favors plain or marked spellings, without
asserting that an invented root has a historical origin. Initial feature keys
are exact phoneme/form pairs: `/f/ -> ph`, `/s/ -> ps`, and initial `/n/ -> mn`.
The [mnemonic entry](https://ahdictionary.com/word/search.html?q=mnemonic) and
[psalm entry](https://ahdictionary.com/word/search.html?q=psalm) provide lexical
examples, not measured association strengths. All proposed multipliers are
explicit experimental heuristics, not probabilities estimated from those sources.
Affix and unassessed spelling associations remain neutral rather than fabricated.

Choose one profile per written word after its underlying lexical plan is fixed.
Use it across the word's eligible grapheme choices. Apply the style multiplier
only after existing legal candidate construction. Positive bounded multipliers
preserve support; no prohibited spelling becomes eligible, no hard origin filter
or arbitrary fallback is added. Omission and zero strength consume no additional
RNG. Record the actual profile draw, candidates, base/style/final weights and
final spelling-unit outcomes in trace evidence. Repair effects must remain visible.

## Evaluation that remains

Prepare an isolated composed dependency checkout containing Q13–Q15 and freeze
registration before generator tuning/captures. The current root checkout lacks
that complete composition and must not be used as the formal style baseline.
Exact control `1159465fe6c10f55a97e8c5851e8a75c604450e7` is a candidate dependency
base, not a yet-registered Q20 baseline. Preserve its existing failures.

Measure omitted/zero-strength output/trace/RNG parity through public APIs, then
full registered public captures, independent kernel/trace reconstruction,
original gates/diagnostics and unchanged paired timing. Report feature marginals,
within-word co-occurrence and opportunity denominators, final repair survival,
diversity, phonology/stress, morphology and all broad quality regressions.
Greater use of a feature or agreement with its own latent label is not evidence
of improved English wordlikeness. A blinded reader comparison with frozen
candidate/population/inference choices and actual observations is still required.
Do not call Q20 complete from metadata or fixture tests alone.
