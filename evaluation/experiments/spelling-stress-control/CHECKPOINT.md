# Q14b + Q04 dependency control

Parents: Q14b `0d841bd` and Q04 `d1d5189`. This control excludes Q02
`01c6a50`, which remains on its own branch. The retained integration checks qualify this as a fixed comparison control,
with the failures below explicitly retained. It is not a release candidate.

Resolved source conflicts preserve lexical assembly before spelling, one final
pronunciation, resolved affix forms and parts, exact base spelling, shared/split
construction scheduling, following-letter constraints, and both orthography
source coordinates and inferred-alignment labels. The base spelling ledger is
forwarded from the temporary lexical root context.

Strict TypeScript passes. The first focused run has 119 passing and six failing
tests across six files. Four failures are exact old-output fixtures in
base-spelling.test.ts. A lexical bridge fixture no longer has its assumed /h/
in the second root syllable. The 10,000-word allomorph test observes exactly 30
selected im variants, failing its >30 coverage assertion; preceding per-word
assertions pass. The separate 10,000-word lexical stress test passes. None of
these assertions has been weakened or rewritten. The initial log is retained.

Next: establish trace-grounded current fixtures for the same linguistic
mechanisms; investigate the im coverage threshold without loosening it merely
to pass; audit planned-bare cleanup and contextual evidence across the two
parents; test active shared/split/following policies; review all automatic merge
results. Only then freeze the control and adapt Q02. These results are not a
formal quality/performance study.

The planned-bare audit found an actual composition omission: final cleanup and
budget diagnostics were skipped when prepareMorphology returned undefined. A
public-API regression failed before the fix and passes after restoring the bare
root part. Strict TypeScript also passes after the fix.

A deterministic public-API trace search now retains candidate fixtures in
current-fixtures.json.gz: partial th at stream draw 5328 (coibruhry), syllable
join at 205 (mechise), hard-g insertion plus post-join cap at 273 (ukayguilp),
adjacent deletion at 103 (bazzerm), and silent-e insertion at 9 (uckucose).
These are trace witnesses for fixture adaptation, not quality measurements.
Full ownership assertions still need inspection before replacing old fixtures.
The discovery script uses local absolute imports; it is retained as executed.

Fixture adaptation now passes 25 tests across base spelling, lexical composition
and the planned-bare regression, including the original 10,000-word lexical
stress sample. TypeScript passes. Five of the six initial focused failures were
updated using inspected trace witnesses; ownership and bridge-link assertions
remain. The erased unit witness is now /r/ after rhotic er; its phone remains
recorded and an additional assertion verifies that its own cells are absent.
Silent-e seed 190 yields base flone and affixed flonal, retaining the unresolved
insert after n. Bridge seed 111 preserves the unrelated root /h/ scenario.
The im distribution threshold is unchanged and remains to be investigated.

The 10,000-word parent/control audit identifies 358/360 planned in prefixes,
35/30 bilabial opportunities, and 35/30 selected im forms. Both arms have zero
missed opportunities, unexpected im choices, or lost im surfaces. Complete
planned-in witnesses are retained in im-audit.json.gz. The stream test now
asserts eligible versus selected forms and allomorph indices on every planned
in case, plus equality of eligible and selected counts. Coverage is supplied
by an additional 100 stratified /b p m/ public generations rather than the
old >30 stochastic count threshold. An initial fixture incorrectly included
/w/, which is configured labial-velar and correctly rejected im; its failed
log is retained, and the fixture was corrected to the bilabial inventory.

Full default validation completed: 1,034 passes, four failures, one skip.
The four writer assertion categories also fail in Q14b; counts change from
9/28/43/6 to 9/29/46/6. This retains two worsened counts, not a clean quality
result. The phonotactic suite completes in this run. Combined split-vowel and
following-letter validation separately passes 500 trace-on/off comparisons,
with exact full-word/RNG parity, a next-value probe, base-evidence replay and
one final pronunciation stage. This is integration evidence, not a formal
quality/performance evaluation. The original Q04 artifacts remain historical
parent evidence and do not describe this composition.
