# Q02 final-word ownership: mutation audit and implementation contract

Status: historical design and checkpoint record. The final integrated candidate
and completed corpus/performance checks are described in [RESULTS.md](RESULTS.md);
Diagnostic outcomes and retained failures are recorded there; publication
remains outstanding.
Immediate spelling source: 0d841bda8504bce34ec97220ec8c5737d87cbbf6.
The parallel Q04 lexical pipeline must be composed explicitly before claiming
that the final provenance representation covers that pipeline too.

## Observed representation gaps

`applyMorphophonemicRules` replaces a boundary phone in place and applies regex
rewrites to a root string. Its fired events retain whole strings and sounds,
but not persistent phone/cell identities or the exact matched spans.
`applyBoundaryTransforms` applies ordered regex replacements and blocking rules
without recording executed operations. `applyMorphology` concatenates resolved
prefix/root/suffix strings, flattens zero-syllable affixes into root segments,
may insert hiatus bridges, then reassigns stress and generates pronunciation.
Post-assembly consonant repair mutates part strings again. Bare gap spelling can
replace the complete root. Existing final orthography explicitly uses inferred
alignment. `assembledParts` and `emittedParts` establish part text only; they do
not prove sound-to-letter ownership or preservation of root cell identities.

## Required implementation

Carry persistent root phone and cell identities from the base ledger into final
assembly. Give resolved affix phones and cells explicit identities and provenance
back to the selected allomorph, including zero-syllable affixes. Instrument each
actual phone replacement/insertion and each actual string mutation where it
executes. Record regex matches and replacement semantics, not post-hoc edit-distance
alignments. Retain deleted cells and transformed units as explicit outcomes.
Track both final phone order and surface order through affix attachment, stress
and realization. Gap overrides require explicit whole-form supersession.

Distinguish exact operational lineage from a licensed phonemic reading: knowing
which affix supplied a character is not a verified alignment of its letters to
individual phones. Represent joint and unresolved mappings explicitly until a
structured construction licenses them. Do not split an affix string among phones
by heuristic alignment or silently inherit a root reading after a sound change.

A final replay verifier must reconstruct the final surface and phone sequence
from authenticated source operations. Reject missing, reordered, duplicated,
misattributed and forged operations. Cover empty strings, repeated letters,
regex capture replacements, blocked transforms, both boundaries, zero-syllable
affixes, hiatus bridges, gap overrides and final consonant repairs.

## Measurement before claiming completion

Freeze a configuration and source control before implementation measurements.
Preserve complete legacy output, legacy trace fields, RNG draw counts and next
values under public generation APIs. Verify trace-on/off parity. Capture the
fixed 200,000-word development protocol and replay every final ledger; independently
recount ownership categories and all unavailable denominators. Compare original,
immediate control and candidate using common metrics and actual morphology strata.
Run the unchanged quality gates and six fixed paired performance measurements.
Do not equate a complete mutation ledger with zero unresolved pronunciation.

Q02 remains incomplete until final surface equality, resolved affix/segment
ownership, trace parity and replay are all measured. Q10b2/Q11b/Q18 must use this
representation where their claims concern assembled words; root-only evidence
cannot establish their final-word contracts.

## First implementation checkpoint

Branch `codex/final-word-ownership` now contains an unconnected regex mutation
recorder and span replay primitive. A differential matrix checks 3,762 combinations
against native String.replace, including captures, named captures, lookbehind,
zero-length matches, Unicode and stateful regex flags. All three focused tests
pass, including ambiguous repeated-letter deletion and malformed replay spans.
This does not yet authenticate a rule or map replacement letters to phones.
Next: instrument actual boundary and morphophonemic edits and attach persistent
root/affix identities, without changing generation behavior.

## Assembly implementation checkpoint

Executed morphology edits now feed a persistent cell ledger. Unchanged root
cells retain base-cell references; affix cells carry side/offset origins; edited
cells carry event/offset origins. Final consonant repair uses its existing
operation callback, preserving actual deletion positions. Snapshot and internal
replay tests reject missing same-text edits, forged input/output identities,
altered final origins and incorrect affix offsets. The 600-seed public API test
now also replays assembled final cells and checks emitted surface equality.

The existing 10,000-word assembly test passes with instrumentation, and strict
TypeScript has been checked after each implementation chunk. The first parity
test attempt used an unsupported `rng` option and was corrected to `rand`; that
failed attempt is not evidence of generator parity.

This remains operational lineage, not authentication of configured rule execution
or a pronunciation license. Missing work includes phone identities and alternation
links, bare/gap final handling, initial-source and rule-schedule authentication,
Q04 composition, formal source freeze, baseline parity and full-corpus evaluation.

## Parent parity checkpoint

The implementation now carries the root phone ledger from the pre-pronunciation
writer output through both pronunciation passes, records actual aspiration and
reduction mutations, and exposes one final-word record. Bare gap overrides are
explicit whole-root mutations; planned bare morphology retains the live ledger.
A forced gap test checks replacement lineage and unchanged phone identities.

A direct comparison against parent commit `0d841bd` passes 4,000 cases / 8,000
public calls across lexicon/text, tracing on/off and registered spelling policy
on/off. It preserves all legacy output and trace fields, 321,456 parent RNG draws,
and 4,000 next-value probes. All 2,000 traced cases contain final-word provenance.
Only the explicitly introduced trace fields are removed for legacy comparison.
Both source trees are hash-checked before and after. Scripts, results and source
pins are retained under `.local-evidence/q02`. This is a development parity probe,
not a frozen quality study or independent authentication of provenance.

Next: authenticate initial root/affix sources and configured operation schedules,
compose Q04 explicitly, then freeze and evaluate the complete candidate.

## Source binding checkpoint

Cross-record validation now binds initial final-ledger root cells to the base
ledger (using pre-gap inputs where relevant), root phone coordinates to writer
phones, and affix cells/phones to the resolved allomorph form. It checks final
surface and phone sequences against the returned word. A forged base-cell link
that remains internally replayable is rejected by the source-binding test.
The 600-seed integration probe passes these checks.

An additional replay regression fixes interleaved pronunciation and morphology:
realization records now name their exact change index instead of assuming all
realizations form a trailing block. The prior 4,000-case parity result describes
the earlier source hash; it is not silently reused as verification of this change.

These bindings compare recorded sources; they do not yet prove selected allomorph
eligibility, bridge licenses or rule scheduling from configuration. Those remain
required before formal acceptance.

## Configured allomorph checkpoint

The trace now records exact prefix/suffix configuration indices. A separate
validator checks configured planned forms, original allomorph indices, stable
specificity priority and resolved forms, given the recorded boundary features.
It passes the 600-seed probe and rejects forged selections and configuration
indices. Boundary-feature provenance is still a distinct outstanding check;
this validator does not claim to authenticate that input by itself.
The legacy parity projection must explicitly include the new
`configurationIndices` field when the next parity run is registered.

## Boundary-feature checkpoint

Initial registered phones retain detached feature objects. Allomorph selection
has a pre-attachment phone snapshot. Configuration validation links its root
features to the writer boundary and replays the recorded feature-change chain
before comparing the selected boundary. The 600-seed probe and boundary-voicing
forgery regression pass. Legacy traces without writer feature evidence report
unavailability rather than a successful feature check.

This does not yet authenticate the pronunciation decisions themselves: a
configuration-based replay of those passes and their actual RNG draws remains
necessary. Add `selectionPhones` to the explicit new-field parity projection.

## Pronunciation rule replay checkpoint

Traced pronunciation passes now retain actual inputs, draw tapes, mutation
records, outputs and rendered pronunciation. Production-rule replay consumes
every recorded draw exactly once, rejects missing/unused draws and altered
outputs/mutations, and uses the supplied language configuration. Two hundred
public words exercise root and affixed passes. The corruption fixture explicitly
forces aspiration; its initial seed-only fixture had no mutation and was rejected
as ineffective coverage.

Word-level verification binds the first pass to writer boundary features and the
last pass to the returned syllables/pronunciation. Allomorph validation checks
its pre-attachment state against that replayed root output. The 600-seed probe
passes. This is production-rule replay, not independent validation of the RNG
probability law. Inter-pass morphology scheduling and bridge licensing remain
unverified. The next legacy parity projection must remove only the new
`pronunciationPasses` field in addition to the enumerated Q02 fields.

## Morphology operation replay checkpoint

Attachment now captures its actual root input, RNG tape, initial/final regex
state, structural events and output before final letter cleanup. A replayer
restores the validated root phone ledger, selects exact configured affixes,
restores recorded regex state and executes attachment again. It checks every
draw, generated operation record, resolved form, root edit and assembled result.
It passes the 600-seed probe. A forced two-rule fixture rejects reordered edits,
unused draws and an altered input root.

This is production-operation replay under recorded input/random/regex state. It
does not independently validate plan sampling, historical RNG probability, or
final letter cleanup. Positive bridge-specific coverage, final cleanup binding,
Q04 composition and the formal measurement remain outstanding.

## Final cleanup and bridge checkpoint

The existing final morphology spelling cleanup is extracted into one shared
function used by generation and replay. Replay now compares emitted parts,
hyphenated/clean output and complete final cell/phone ledgers after cleanup.
The 600-seed probe passes. An explicit onsetless-root /ɑ/-prefix fixture generates
a licensed /h/ bridge and verifies it; removing that structural event is rejected.
The first fixture used zero onset weights alone, which top-down length planning
overrode. Explicit zero onset limits make this positive-coverage fixture valid.

Remaining: planned-bare/gap operation checks, legacy-config feature availability,
Q04 composition, final simplification/review, refreshed parent parity, and formal
corpus/performance measurements.

## Bare/legacy coverage and refreshed parity

An explicit writer-input/output snapshot supplies new feature evidence without
changing legacy base-trace fields. Bare cleanup and configured gap selection
now replay from that source, including exact draw consumption and final cell
lineage. The forced legacy gap test rejects an extra draw. A legacy affix cleanup
fixture verifies the actual `trans`→`tran` deletion and rejects a forged final
ledger. The 600-seed combined probe passes.

Refreshed parent parity v2 passes all 4,000 cases / 8,000 calls against `0d841bd`,
with 321,456 parent draws and 4,000 next-value probes. Both source trees are
unchanged during the run. The explicit projection excludes only the enumerated
new Q02 fields; old output and trace fields remain equal. The evidence is retained
under `.local-evidence/q02/parent-parity-v2*`. Full formal measurement and Q04
composition are still outstanding.
