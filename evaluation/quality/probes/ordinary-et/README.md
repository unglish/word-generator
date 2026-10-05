# Ordinary /ɛ/ before /t/: supplementary probe v1

Preregistered before changing the generator on 2026-09-26. The isolated branch
starts at 8e9ceb2. No frequency or positional weight will change: remove only
`notRightContext: ["t"]` from the ordinary /ɛ/ → e entry. The unchanged e frequency
is 100; ea remains 140. This restores an option, not an empirically fitted ratio.

Apply this same evaluator to the immutable original 200,000 development words
and the candidate 200,000 words. Do not regenerate the baseline. The frozen v1
evaluator and protocol remain unchanged. Record this probe's source hash and the
input manifest hash. The standalone reader verifies the manifest and protocol
fingerprints, scheduled shard set, compressed byte counts/checksums, and every draw
coordinate/count before returning a report. It parses the same bytes it verified.
It uses no imports from the separately frozen evaluator. Never use validation seeds
while choosing the implementation.

Primary measure: among traced /ɛ/ decisions immediately followed by /t/ in the
flattened base-word grapheme decisions, the proportion retaining e after condition
filtering must become 100%. Candidate selection must actually use e in both
same-rime and cross-syllable environments, with positive traced selected weights.
Existing ea must remain selectable in positions where its unchanged weights permit
it. Do not choose a desired eat trigram ratio or change any quality gate.

Report eligible decisions and affected words, e/ea selection counts, emitted
forms, condition/position retention, selected weights, and denominators separately
for same-rime (same syllable, nucleus then coda), cross-syllable, and other adjacency.
Stratify by generated-base syllable position (isolated/initial/medial/final), literal
vowel position (initial/medial), whether the following t ends the base, actual
morphology, and returned syllable count. These positions refer to the generated
base before affix assembly; final-word alignment is historically incomplete.

For each eligible pair, report the vowel's surviving owned letters and the t's
surviving owned letters after base orthography repairs. Count owned contiguous ea
and eat occurrences separately from raw substrings. The eat contribution requires
e and a owned by the eligible ɛ choice and t owned by its immediately following t
choice. Raw ea/eat denominators include all occurrences and all phoneme sources.
Distinguish base-surface attribution from final-output attribution: final attribution
is available only when trace.orthography.surface exactly equals written.clean;
otherwise report unavailable rather than interpreting stale ownership as current.

Record every available string-repair trace event in eligible words as contextual evidence, including
its before/after ea/eat counts and up to three traced witnesses per stratum. Repair
presence is not proof that it changed the eligible pair: report owned-letter change
separately. Existing duplicate deletion, boundary insertion and post-join vowel
capping do not emit complete repair events: an empty event list is not evidence of
no rewrite. Preserve full witness traces for causal inspection. Missing orthography
is unknown, never counted as no repair. Compare the unchanged frozen metrics,
lengths, phoneme/trigram distributions, diversity, and performance independently.

Run: `node --import tsx evaluation/quality/probes/ordinary-et/analyze.ts RUN_DIRECTORY`
The report goes to stdout. Review denominator changes: shorter spellings affect
length rejection and RNG consumption, so equal stream indices need not represent
the same candidate. This probe establishes restored spelling availability, not
human preference or lexical frequency accuracy.

## Exploratory regression discovered after capture

`exploratory:consonantalYMagicE` was added after inspecting candidate traces; it is
not a preregistered success criterion. Its denominator is the same eligible /ɛ/+t
pairs. Count a pair only when the immediately preceding /j/ emits y in the same
syllable, /ɛ/ emits e, /t/ emits t, and a recorded same-syllable magic-e repair
rewrites an ending yet to yte. This links the apparent y letter to its consonantal
phoneme role and requires the actual repair event. Keep named traced witnesses.
Apply exactly this detector to both original and candidate archives. The repair
uses `([aiouy])e([bcdfghjklmnpqrstvwxyz])$` with 95% probability, so restoring e
exposes an existing character-only rule that mistakes consonantal y for a vowel.
Q13/Q14a must resolve this using aligned grapheme/phoneme roles, not a y spelling
ban or a change to the restored e weight.
