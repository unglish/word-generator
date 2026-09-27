# Q14b observation contract

Status: prospective observer design, not a registered generation policy. No
candidate result or population prevalence is asserted. Parent: Q14a f284fb8.

## Two independent questions

Record declared-reading compatibility and linguistic interpretation separately.
The first asks whether a spelling obeys its configured certificate. The second
asks whether that departure is a productive-pattern failure, an exception that
requires lexical evidence, or outside the supported model. A hard g before e
can fail the current certificate without being an impossible English reading.
Do not collapse these axes into a single quality score.

## Population and boundaries

Enumerate every base spelling phone, not just surviving c/g letters. Use
soundAtSpelling, preserving the final pronunciation separately: later reduction
can change the pronunciation without changing the correspondence selected by
the writer. Retain inventory identity, selected form and afterDoubling form.

Maintain separate initial-selection and final-root records for each phone.
Initial-selection context is the concatenation of recorded afterDoubling forms,
labelled a reconstructed selection surface, not a claimed historical whole-root
snapshot. It excludes subsequent edits. Final-root context uses the final cell
ledger. Never infer one boundary from the other.

Final assembled-word status requires a morphology-aware ownership map. Until
that map exists, report unavailable for every eligible root event, including
cases where string equality looks persuasive. Do not certify survival by
substring search or by treating all suffixes as harmless.

## Ownership and following letter

Authenticate each complete base trace with the configured evidence verifier
before producer-assisted observation. An already authenticated archive may be
reused only with exact archive, configuration, verifier-source and dependency
pins, plus an explicit chain to its completed verification seal. A matching
word string or an old successful run is insufficient.

Resolve the complete current unit with its exact output cell identities. For
selection, normalization, licensed replacement and completion, retain the
corresponding reading evidence and certificate identity. Generic rewrite
ancestry is not ownership. Missing units, partial spans, unresolved rewrites
and unsupported versions remain unavailable with separate reasons.

After a complete unit, observe the immediately adjacent physical cell's letter.
Its source may be a single unit, shared construction or split construction;
that does not by itself make the visible letter unknowable. Record that origin
separately. Do not require the following phone to own a single grapheme. A
closed root edge is a known boundary, represented distinctly from an unknown
or not-yet-written edge. Compare against the full ledger, not syllable-local
slices. For a multiletter unit such as sc, the context begins after the whole
unit; an internal c is not a second independently owned correspondence.

If the target phone belongs to a live shared construction, record joint-owned
and the exact construction/correspondence. Do not assign every shared letter to
every constituent phone. Joint ownership is neither automatically compatible
nor a single-unit error. Unsupported joint contextual analysis is unavailable.
Retired constructions cannot establish current ownership.

## Classification axes

Every phone receives one ownership status per boundary: single-owned,
joint-owned, unavailable, or outside-supported-version. Within single-owned
records, every reading receives exactly one declared-reading status:

- contextual-compatible: require/forbid constraints accept the observed letter
  or known root edge;
- contextual-incompatible: those constraints reject the known context;
- context-unavailable: the required edge or letter is not established;
- non-contextual: no following-letter obligation is declared;
- reading-unavailable: correspondence metadata cannot be authenticated or its
  reading requires an unrepresented lexical/construction context.

Keep the target inventory strata explicit: /s/ c and sc; /dʒ/ g; /k/ c;
/g/ g and gu. Track all other following-letter readings separately, including
/ŋ/ n, so a repair cannot improve c/g while hiding regressions elsewhere.
Record c/g-bearing replacements outside these strata without assuming they
have the same rule (ge, dge, ch and lexical g are not interchangeable).

For linguistic interpretation, separate productive soft-pattern departures,
hard-c pattern departures, hard-g exception-sensitive contexts, and unsupported
lexical/construction evidence. No lexical exception is licensed merely because
a dictionary contains some word with the same neighboring letters. Licensing
requires the actual lexical identity and its pronunciation evidence. Counts of
exception-sensitive contexts are not counts of proven pronunciation errors.

## Accounting and independent verification

Per boundary, ownership totals must equal the number of base phones. Within
single-owned records, reading-status totals must equal single-owned totals.
Publish all target strata with zero-filled categories, denominators and rates;
also publish unavailable and joint-owned counts. Never drop them from the
population silently. Pair initial/root observations by phone identity only
inside one trace; do not pair candidate/control words after RNG consumption
changes. Report transitions, including replacements into non-target forms.

The independent implementation must read archived traces and implement its own
ownership, cell adjacency and arithmetic checks without importing production
observer/resolver code. Disagreement is a failed measurement, not a category to
suppress. Independent agreement validates the stated accounting, not linguistic
truth. Keep complete witnesses for each status, origin, transition and rule,
with stable stream coordinates and artifact hashes.

## Required adversarial checks

Cover /s/ c before a despite a front-vowel phone; c before e produced by a
non-front phone; hard g before e without a lexical certificate; sc as one unit;
gu followed by e/i versus another letter; known root edge versus unknown edge;
following shared/split cells; target shared ownership; normalized and completed
units; opaque and partial rewrites; cross-syllable adjacency; changes to the
following vowel after initial selection; final morphology lacking ownership;
custom inventories with missing or different reading metadata; and empty
populations. Mutate cell identities and certificate references to ensure a
plausible-looking string cannot pass authentication.

The retained carowngs witness must remain contextual-incompatible for /s/ c at
the selection and final-root boundaries and unavailable at the final assembled
boundary. Its later reduced pronunciation must not replace soundAtSpelling in
the correspondence audit.
