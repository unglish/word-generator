# Q02 adaptation to lexical stress control

Exact control: `905ba3e`. Original Q02 checkpoint: `01c6a50`.
The current merge is incomplete and must not be treated as a measured candidate.

Q04 changes the source boundary fundamentally: affix selection and phonemic
alternations precede the writer, and surface pronunciation executes once after
final lexical stress. A two-pass validator cannot certify this pipeline.

Required adaptation:

1. Register root phone identities before prepareMorphology. Preserve exact
   configured allomorph selection, phone alternations, zero-syllable attachment,
   hiatus insertions, and resulting stress through a preparation packet.
2. Observe final stressed-nucleus repairs as phone changes, and bind the
   lexical-root writer view to its actual corrected inputs. Morphology-derived
   alternations and bridges must not be inferred from spelling coordinates.
3. Initialize final spelling only after writing the lexical root. Execute and
   record the deferred written morphophonemic rules and boundary transforms,
   using the same resolved attachment. Preserve original regex slots/indices
   and native replacement spans across the preparation/writing split.
4. Record the single final pronunciation after cloning the lexical syllables.
   The observer retains segment identity across that clone. This conflict has
   been resolved by cloning before taking the pass snapshot, preserving Q04
   order and Q02 mutation observation.
5. Replace legacy validators' root-pronunciation prerequisites with authenticated
   preparation, lexical-repair, writer, and final-pronunciation boundaries.
   Update bare and affixed replay together; do not relax final-source checking
   to make the legacy packet pass.
6. Verify control parity, trace-on/off RNG parity, deliberate record corruption,
   serialized replay, and full ownership before formal corpus measurement.

The source conflicts in generate.ts and morphology/attach.ts are now adapted and
strict TypeScript passes. Phone ledgers begin before preparation, observe final
nucleus repairs, and follow the single surface pronunciation. Deferred written
rules retain original indices and exact regex spans.

Preparation/writing operation packets and their authenticated replay are still
outstanding; the legacy morphologyPass wrapper is not applicable to the split
stages and has been removed from the compatibility attachment helper. Existing
Q02 test and evidence results describe the original checkpoint only.

Separate morphologyPreparation and morphologyWriting packets are now recorded.
They capture before/after words, exact RNG tapes, regex states, structural events,
phone snapshots, configured affix indices and deferred rule slots; writing also
captures spelling snapshots and pre-cleanup realization. Strict TypeScript
passes for the recorder implementation. A 100-word public stream passes full
trace-on/off output and RNG parity plus stage-boundary assertions, including
bare and affixed cases. Retained logs also cover the previous 57 stage tests.
Authenticated replay and corruption rejection remain outstanding.

Configured preparation replay is implemented in morphology/preparation-evidence.ts.
It reconstructs initial root phone IDs, validates affix presence and configured
indices, restores exact regex slots, consumes the recorded tape, and compares
the complete regenerated packet. Serialized replay passes across the 100-word
stream; five corruptions of identity, allomorph, affix index, surplus draw, and
assembled phone are rejected. This verifies execution from the recorded root,
not root-generation or plan-sampling provenance. Downstream binding remains
outstanding. TypeScript passed for the replay implementation before adding the
new test cases; the two stage-evidence tests then passed.

Final nucleus repair is now a recorded operation preserving the existing
reference-based replacement decisions. It retains assembled/root before and
after views, exact draw tape, repair events and phone identity snapshots.
Replay reconstructs the incoming ledger from preparation (or the bare root),
reexecutes the configured nucleus selection, and binds the resulting root to
writerInput and both lexical views. The 100-word serialized stream passes this
replay and trace/RNG parity. Forced nonempty-repair corruption coverage is
still needed; passing the stream is not asserted to establish that coverage.
Final spelling and pronunciation validators still need their lexical adaptation.

Lexical pronunciation verification now replays final nucleus repair, binds root
phone features and coordinates to the base writer, enforces one pronunciation
pass, replays its exact tape, and compares final phone lineage and output. The
100-word serialized public stream passes. A separate 100-seed configured
schwa-promotion sample requires actual repairs and verifies all repaired words.
Seven mutations (missing/surplus repair draws, root view, phone history, writer
input, extra pronunciation pass, final phone origin) are rejected. Both test
files pass and strict TypeScript passes. Full spelling-operation verification
and baseline parity are still outstanding.

Lexical post-writer replay is implemented in lexical-spelling-evidence.ts. It
reuses verified preparation and nucleus state, recreates initial cells from
base evidence, replays deferred written rules and cleanup, binds the completed
realization and budgets, and replays bare gap selection after verified surface
pronunciation. All 100 serialized stream words pass; six spelling corruptions
are rejected. Three stage-evidence tests pass. TypeScript passed before adding
the six mutation cases. This does not independently prove the base writer
selection law or original root generation. Legacy verifier entrypoints still
need routing/adaptation, broader forced fixtures and control parity remain.

Existing morphology and bare verifiers now route lexical words through full
post-writer replay. Source links use pre-repair lexical root origins; configured
allomorph verification retains independent condition/priority checks after
preparation replay. The first broader run: 47 pass, seven fail. Three failures
were fixed: the old >200 pronunciation count now asserts one pass per each of
200 words with bare/affixed coverage; preparation affix snapshots are detached
from later realization so forged choices/features are rejected at the intended
boundary. The targeted rerun passes all three. Remaining initial failures: three
legacy morphologyPass test references and a 10,000-word trace timeout at the
unchanged 30-second limit. No timeout increase or sample reduction applied.

Three remaining stage fixtures are adapted and pass: 600-seed output/RNG
parity with full replay, reordered written edits/extra draws/input corruption,
and omitted preparation bridge evidence. The isolated 10,000-word trace test
still exceeds its unchanged 30-second limit (31.84 seconds). This is a retained
performance failure requiring optimization, not an excuse to raise the limit.
Exact control 905ba3e has been restored under /private/tmp/q02-parent-905ba3e;
the 4,000-coordinate parity runner is /private/tmp/q02-lexical-parity.mjs and
its log is /private/tmp/q02-lexical-parity.log. Results are not yet asserted.

Exact-control parity completed before optimization: 4,000 comparisons, 8,000
public calls, 323,652 parent draws, 4,000 next probes, all legacy words/traces
unchanged. Evidence and source pins are under lexical-parity/. A 5,000-word CPU
profile reports 16.19 seconds with 1.52 seconds inclusive in final-spelling
snapshot copies. Fixed-schema explicit copies replace structuredClone only in
that snapshot method. Eight tests pass, including mutable snapshot detachment
and the 100-word end-to-end replay stream. The isolated 10,000-word gate is
being rerun; no performance improvement is yet claimed. Source changed after
the retained control parity, so final parity must be rerun after optimization.

Phone snapshots now copy scalar records explicitly and retain structuredClone
for custom structured phone metadata. Mutation-isolation and replay tests pass.
Both unchanged 10,000-word gates pass in the serial run: lexical 25.101s and
assembly 23.327s; all 46 tests across those two files pass. Final parity and
TypeScript must be repeated for this second optimization before source freeze.

Independent recount.py reconstructs UTF-16 cells and phone ordering directly
from JSON. A 100-word generated smoke archive reconstructs successfully and two
corruptions are rejected; astral segmentation is checked. Complete registered
counters, formal CLI and independent recount tests are still required.

Independent recount hardening: archive replay now rejects duplicate artifact/profile/seed entries, unexpected word files, unsafe profile names and boolean phone coordinates. The CLI requires the prospective registration and its hash-pinned protocol, compares the archived protocol, and enforces the registered total. All four test groups pass; retained in recount-tests.log.gz. Latest phone-snapshot parity/typecheck/large-test artifacts are indexed under lexical-parity-phone-optimized/. Formal capture remains outstanding.
