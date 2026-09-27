# Registered formation law v1

Control: Q13b source `5f9b3ebd495857e02e4104a3b02f89e9c06bfc8c` and its
unchanged measured generator archive (manifest
`8fa4c8216beedf0d2803f18c2864ddbde1ea805af866071fac1c30ab34b1f876`).
This is a productive spelling hypothesis, not a complete English grammar.

## English support

The 48 verified rows in `exploration/coda-evidence.json` define the exact
per-vowel coda sound sequence and intervening written string admitted by v1.
No cartesian generalization across vowels is implied. For example, the table
admits /eɪ/ with /s,t/ written st and /n,dʒ/ written ng, and several vowels
with /ð/ written th. The coda must also pass current contextual reading checks
with the proposed final e: a matching string alone is insufficient. Segment
boundaries come from the complete source units; there is no synthesized coda
segmentation. These are licensed output contexts, not frequencies or weights.

The nucleus is exactly one source phone with a whole live unit. Output vowel
components are eɪ→a, i:→e, aɪ→i, əʊ→o, u→u, followed by separate final e.
The marker and component represent that vowel; intervening consonants remain
independently owned. All original stress values are admitted and reported in
strata; no stress distribution is tuned. Rhotic/reduced/other vowel sounds
have no formation rule and cannot borrow these licenses.

## Routes and draws

At the unique existing syllable `magic-e` slot, a nucleus whose complete live
form is ae, ie, oe, ue or ye may form its sound's registered output in that
syllable. Use probability 95 percent. This deliberately tests the sound, not
the first letter: ie belonging to /i:/ may become e_e, whereas onset y can
never participate as a nucleus. Complete ew and er units are not split here.

At the existing word-stage silent-e slot, only the final root syllable is
eligible. Match its current complete nucleus form to an exact configured
`silentE.swaps` relation for the same sound and registered output component.
Use configured probability 35, multiplied by 2 for a monosyllabic root and
capped at 100, preserving the current numeric policy. No other probabilities
or weights change. A failed syllable trial may retry here if the word route's
own conditions hold. Record both events; they are not independent word trials.

Enumerate one candidate per original nucleus per applicable slot in source
order. Existing live split construction means an explicit already-satisfied
outcome and no draw. Validate whole ownership, exact coda relation, edge,
neighbor readings and existing construction preservation before sampling.
Refusals and probabilities 0/100 consume no draw. Intermediate probabilities
consume one finite uniform value in [0,1), succeeding strictly below p/100.
Reject invalid configuration probabilities or malformed uniform values.

An absent split policy is exact legacy mode. A present empty table disables
these two legacy formation mechanisms but still records unresolved obligations;
it is a diagnostic control, never a successful quality intervention. English
candidate activation uses the full table and completion law, not the empty mode.

## Ownership and edits

Accept whole original units or whole authenticated licensed replacement units.
Generic rewrite ancestry, partial units, unavailable context and uncertain
normalization ownership are unavailable input, not clean ownership. Existing
shared consonant constructions may supply intervening ownership only when their
complete ordered phones and current reading match the same table row; they
cannot be partially consumed. Both marker insertion and vowel replacement form
one atomic ledger event, including unchanged vowel components.

Formation must preserve all unrelated live readings. No letters from a coda
unit ending in e are stolen or relabeled as the vowel marker. Already e-final
coda strings are absent from the table. Append-only consonant e remains a
separate operation; existing markers prevent duplicate appending. Later edits
must preserve both component and marker, or explicitly replace/retire the
construction with complete supported evidence. Lexical whole-root replacement
records supersession and unavailable new ownership.

After all ordinary root writer operations, run `completion-law.md` once, before
publishing the root spelling. It repairs unresolved open/split obligations
through supported whole-nucleus alternatives. No additional optional formation
retry occurs in this pass. Coverage and normalization also preserve live split
readings. The final audit retains every unresolved or unavailable outcome.
Final morphology ownership is not certified by a root construction.

## Evidence and stopping rule

Implement the complete contract in `design.md` and `completion-law.md`, retain
all failure categories and use unchanged gates. No candidate is declared
successful merely because formed constructions are valid: unresolved obligation
counts, unavailable ownership, fallback selection, alternatives, distributions,
and performance must all be reported. A failed hypothesis remains a measured
draft with its failures. Changing this law requires a new version and an
explicit account of which development results were already inspected.
