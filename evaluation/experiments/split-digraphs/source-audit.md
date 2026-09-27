# Q14a source audit and measurement requirements

Status: design investigation, not a registered intervention or measured result.
Inspected control: `codex/aligned-shared-graphemes` at `5f9b3eb`, following
Q13b's measured candidate. No generator change or distribution claim is made.

## Distinct mechanisms that require a common contract

- `src/config/english.ts`, `magic-e`: the syllable regex moves an e after
  a final letter. Its letter classes include y; it has no source-phone or
  nucleus-role condition. A match alone cannot establish a split digraph.
- `src/core/write.ts`, `applySilentE`: the word-stage swap checks the selected
  nucleus form and one or two coda phones, then locates text with `lastIndexOf`.
  That location is not authenticated against the live nucleus unit. Sampling
  occurs before finding that substring. The comments describe one consonant,
  while executable eligibility allows two; a registration must specify both
  phone count and written-unit constraints explicitly.
- `appendSilentE` serves a consonant spelling convention. An appended e must
  not automatically acquire the preceding vowel's split-marker function.
- `src/core/spelling-coverage.ts`, `checkReadings`: an open-vowel obligation
  currently passes only with an open phone structure and open written part.
  Generic silent-e ancestry deliberately cannot certify the alternative.
- `src/elements/graphemes/reading.ts`: the e in dge belongs to the consonant
  unit and explicitly cannot be borrowed to certify a different vowel.

## Required intervention scope

Represent the nucleus component and remote marker as one typed construction,
with separate intervening consonant ownership. Bind the construction to its
source vowel, exact live cells, ordered intervening units, configured reading
and lifecycle. Preserve legitimate alternative spellings. Do not count disabling
both formation mechanisms as fulfilling Q14a. Define interaction with existing
shared constructions, normalization, coverage, later regex edits and lexical
replacement before activation. Final morphology must either preserve a verified
construction or report its ownership unavailable; root evidence cannot certify
an assembled word.

The law still needs explicit decisions on coda classes, multi-letter consonant
forms, stress, syllable versus word position, existing consonant-owned e, rule
slots, probabilities and draw consumption. These decisions must be registered
before examining candidate distributions. Existing defaults are observations,
not evidence that every eligible context is linguistically licensed.

## Measurement contract to complete before tuning

Use public APIs and retain full traces. Separate historical regex matches,
word-stage swaps and append-only markers; historical construction eligibility
is unavailable unless reconstructible from the archived source and event state.
Count eligible and refused candidates by rule, phone, stress, coda phones,
written forms, length and morphology. Record complete first witnesses for every
failure and refusal category. Independently recount structural ownership and
all reported integers; identify production-only phonological license checks.

Primary checks must include completed obligations, unresolved obligations,
wrong-unit consumption, stolen consonant markers, phone preservation, later
marker damage and retained supported alternatives. A lower unresolved-cell
count alone is insufficient. Reuse the frozen development protocol, original
baseline and exact immediate control; keep sealed validation untouched. Include
legacy word/trace/RNG parity, traced/untraced parity, full quality gates and
fixed paired performance with all failures retained. No human-quality claim
follows from these mechanical measures.

## Concrete control witnesses

The full trace report now provides cases beyond the regex-only diagnosis:

- `lexicon-default`, seed `69212153`, draw `2648`, edit `0`: selected
  onset /j/→y, nucleus /ɛ/→e and coda /b/→b are rewritten `yeb`→`ybe`.
  The y is explicitly an onset, not the vowel component of a split digraph.
- Same profile/seed, draw `8954`, edit `0`: onset /j/→y and nucleus /u/→ew
  are rewritten `yew`→`ywe`; the w belongs to the nucleus unit, not a coda.
- Same profile/seed, draw `4315`, edit `0`: onset /j/→y and nucleus /ɚ/→er
  are rewritten `yer`→`yre`; the r belongs to that nucleus unit.

These establish role-blind rewrites in specific archived outputs. They are not
prevalence estimates from the selected witnesses. The review index links 74
magic-e first witnesses to exact coordinates, source phones and units; complete
traces remain in `exploration/control-inventory-v1.json.gz`. Any proposed law
must handle these through role and complete-unit checks, not string exceptions.
