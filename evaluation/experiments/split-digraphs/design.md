# Q14a construction and completion design

Status: implementation contract, frozen with `formation-law.md` and
`completion-law.md` before runtime implementation. The formation law resolves
the support table and route choices discussed below. No candidate results exist.

## Representation

Use a dedicated `SplitVowelConstruction`, not a shared-phone construction with
an invented empty phone. One vowel phone licenses two separated written spans.
Store its source unit and phone IDs, original selected form, realized vowel
component IDs, marker cell IDs, intervening complete unit IDs and cell IDs,
syllable, stress, rule ID, writer slot, formation cursor and probability event.
The intervening consonants retain their own readings and identities. The marker
has a `split-vowel-marker` origin referencing the construction, not generic
rewrite ancestry. A selected consonant's existing e cannot become this marker.

Keep original selections and source phones immutable. Treat construction state
as a separate layer over the event-time cell ledger. Replayers must recover
formation from input cells and config rather than trusting reported support.
An unavailable old trace never becomes a zero-violation observation.

## Candidate enumeration and atomic realization

Enumerate original nucleus units in source order. At the former syllable
`magic-e` slot, inspect that syllable's complete live nucleus and coda; at the
existing word-stage silent-e slot, inspect the final root syllable. Resolve
nucleus cells by ownership, never substring position. Require the complete
nucleus, all intervening coda units and their complete live readings, and the
recorded right edge. Distinguish missing ownership from unsupported policy.

A candidate supplies a typed vowel sound, selected/current form, proposed vowel
component, marker form, coda phone/form sequence, stress and edge context.
Policy describes support without drawing. Check resulting neighboring c/g
readings and all existing constructions before sampling. Commit vowel change
and marker insertion atomically. No successful event may leave only one half.

Register separate formation routes for the two former mechanisms. Preserve
named ordering relative to other rules. The structured mode suppresses the
legacy `magic-e` regex and `applySilentE` mutation; leaving either active would
permit unverified second formations. Keep append-only consonant convention
separate and prevent it from duplicating a live split marker.

Only eligible probabilistic candidates draw. Zero and 100 percent skip the
RNG; intermediate probabilities consume exactly one draw. Any failed optional
formation leaves a supported alternative unchanged. A nucleus already in a
live split construction cannot form another. Register explicitly whether a
failed syllable attempt can retry at the word slot, with separate denominators.
Legacy mode retains its original draw behavior exactly.

## Completing an obligation is not optional decoration

Bare vowel units with `open-vowel-or-split-marker` need a satisfied reading in
the final root. An optional formation roll cannot certify an unresolved bare
vowel. Before final root output, classify each such unit:

- phonologically and orthographically open: retain the supported open reading;
- supported live split construction: retain its exact component/marker binding;
- otherwise: seek a complete supported alternative vowel spelling through the
  existing resolver's hard context and positive weights, with explicit evidence;
- no supported alternative: retain an explicit infeasible result, never claim a
  complete spelling or erase phones to satisfy a letter budget.

The proposed alternative-selection law is specified in `completion-law.md`: a
single source-ordered pass conditions existing resolver weights on supported
whole-nucleus replacements, with exact draw/skip behavior. It must be pinned
with the formation policy before coding. Choosing a shortest form merely to clear a
metric is not the objective. Do not lower configured weights or discard
alternatives without a declared linguistic rule. Report unresolved obligations
and fallback use alongside completed constructions, including all failures.

## Later operations and final scope

A generic edit may neither delete part of a live construction nor change its
licensed interval or neighboring reading. Whole-unit alternative realization
may retire it only through an explicit atomic transition with replacement
reading evidence. Whole-root lexical replacement records supersession and
unavailable new ownership, as in Q13b. Coverage and normalization must understand
these states, not merely refuse every word containing a construction.

Root and assembled-word evidence stay distinct. A suffix may alter spelling or
remove e. Until Q02 supplies final ownership, report final construction status
as unavailable rather than copying the root certificate onto final output.
This limitation does not excuse unreported root damage or remove the Q02 goal.

## English support table still to settle

Preserve the inventory's sound identities: eɪ/a_e, i:/e_e, aɪ/i_e, əʊ/o_e,
and u/u_e are distinct relations. Do not reinterpret u as an inserted /j/.
Each relation must enumerate accepted input forms and coda sound/form sequences.
Evaluate the existing one-or-two-coda behavior explicitly, including clusters,
digraphs, r-contexts, soft c/g, doubled consonants and already e-final units.
No support follows solely from a spelling's positive sampling weight.

The explicit 48-example table in `exploration/coda-evidence.json` has been
checked against the pinned CMU source, including multi-letter th and two-phone
st/ng intervals. It supplies attestations rather than frequencies or automatic
licenses for arbitrary input ownership.

Use the primary-source distinctions in `linguistic-design-notes.md`, the
recorded control witnesses and explicit counterexamples to justify this table.
Keep unsupported lexical exceptions separate from productive configurations.
Do not silently narrow the task to one easy consonant class; every existing
formation path and every configured vowel obligation needs an explicit outcome.

## Acceptance and measurements

Pin this completed law, exact control source/config/archive, all observers and
independent recount before candidate capture. Use the unchanged 200,000-word
development protocol and compare to both original baseline and immediate
control. Keep validation sealed. Retain broad diagnostics, diversity, length,
morphology and all quality failures; no per-word causal pairing after changed
RNG consumption. Use six fresh fixed performance pairs in AB, BA, AB, BA, AB, BA
order, with unchanged gates and every raw result retained.

Primary measures: formed and completed obligations with explicit denominators;
unresolved obligations; unsupported vowel readings; partial nucleus consumption;
consonant-marker theft; altered phone order/multiplicity; silent later damage;
retained supported alternatives; search failures and fallback outcomes. Recount
all integers and complete first witnesses independently. Keep production-only
reading licenses and schedule reconstruction clearly distinguished from an
independent arithmetic/structural implementation.

Adversarial fixtures must include identical vowel substrings in another unit,
consonantal y, multi-letter coda units, two-phone codas, soft/hard c/g, existing
consonant-owned e, failed optional rolls, probabilities 0/100, missing ownership,
partial prior edits, competing shared constructions, later marker deletion,
whole-root replacement and morphology changes. Prove traced/untraced parity
and exact legacy word/trace/RNG parity through public APIs.
