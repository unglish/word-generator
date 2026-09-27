# Experimental shared spellings

`LanguageConfig.sharedSpellings` opts into structured spellings for ordered
sequences of two or more phones. The English default does not enable this
experiment yet. Its registered corpus comparison and performance measurements
are still outstanding; passing integration tests is not evidence of improved
wordlikeness.

Each rule has an `id`, ordered `phonemes: [{ sound }]`, `form`, percentage
`probability`, `scope` (`syllable`, `word`, or `both`) and `context`. Context can
require noninitial position and a following vowel phone whose written letter is
in a configured list. The writer requires `writtenFormConstraints.policy` to be
`preserve-phones`.

A shared rule's ID must match exactly one entry in `spellingRules`. This fixes
its execution position relative to the other rules. Its scope can narrow that
entry's scope, but cannot add a pass the predecessor did not occupy. The matched
regex never runs in structured mode. The retired `cx-to-x` cleanup cannot be
used as a shared slot. A missing or ambiguous predecessor is a configuration
error, rather than silently omitting or relocating the shared rule.

Absent `sharedSpellings` retains the legacy path. An explicit empty list selects
structured provenance while disabling the migrated `ks-to-x`, `gz-to-x`,
`cw-to-qu` and `cx-to-x` regexes. Other regexes keep their configured order.
This empty policy is a diagnostic control, not a quality improvement.

At a shared slot, the writer scans matching adjacent original source units in
source order. It checks complete live ownership, phone/context support and
neighbor readings before sampling each candidate. Failed syllable trials can
retry at a word slot; previously consumed phones cannot form another shared
spelling. Refusals and probabilities zero or 100 use no random draw. Other
eligible trials use exactly one draw and succeed strictly below probability/100.

Trace version 4 retains every pass and rule-slot boundary, including no-op regex
slots and empty shared scans, plus source windows, attempts, joint constructions
and subsequent guarded edits. The public evidence verifier requires the matching
explicit `sharedSpellings` configuration. It derives the required ordered slots
from that configuration and the required syllable passes from the original phone
boundaries, then checks complete event-time ledger reconstruction and shared
reading licenses. Omitted slots, missing scans, misplaced operations and invalid
joint decisions are rejected. A successful result reports
`sharedWriterSchedule: "verified"` with pass, slot and scan counts.

The lower-level ledger replayer alone still reports the schedule as unverified;
its self-consistent operation stream is not sufficient evidence of completeness.
The combined verifier is producer-assisted, not an independent implementation of
the generator. Generic regex sampling and lexical-gap eligibility are not
independently regenerated. Morphological ownership after the root remains a
separate task. The registered corpus, independent recount and performance checks
remain necessary before any quality claim or default activation.
