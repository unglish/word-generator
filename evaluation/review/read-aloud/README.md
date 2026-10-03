# Independent read-aloud agreement contracts (Q23)

This owner-only development module freezes generated spellings and their source
draws, assigns spellings without within-reader repetition, binds first-attempt
recording receipts, preserves independent transcription files, and distinguishes
agreement with the principal intended pronunciation from agreement with a
prospectively accepted alternative. The owner CLI additionally verifies the original audio/annotation/rationale
files and writes descriptive coverage-aware reports. It does not yet implement
a recording UI, population inference, a completed human experiment, or a
quality verdict.

## Source and dialect registration

`freezeReadAloud` authenticates both original source snapshots through Q21's
written comparison partition. Every draw must belong to exactly one registered
stratum. Spelling controls exposure and assignment; pronunciation controls the
owner's subsequent scoring. A spelling with different intended pronunciations
keeps every original draw and every intended target. It does not collapse to a
majority target or gain whichever target happens to match an elicited reading.

The dependency on Q22 is its structured normalization policy, target validation
and PCM byte inspection. Auditory stimulus production and auditory wordlikeness
ratings are not used as read-aloud evidence. Q14/Q16 pronunciation modeling and
Q21 source/assignment provenance remain the roadmap prerequisites.

Declare the reader dialect, normalized phone inventory and source mappings
before outcomes. `alternatives` binds an accepted target, rationale and evidence
file hash to one exact condition/source draw. Duplicate, undeclared, foreign
policy and unresolved-source alternatives are rejected. A rationale hash is a
binding, not proof that the rationale is linguistically appropriate; the owner
must retain and review the original evidence. Altering the policy or alternatives
changes the complete comparison digest.

Unresolved generator targets remain in the assigned spelling pool and in the
draw inventory. Their agreement scores are unavailable. The study can collect
their elicited readings for diagnosis, but cannot count them as mismatches,
silently remove them from coverage, or infer a target from the observed reading.

## Reader and coder separation

`allocateReadAloud` uses Q21's complete spelling matching, balanced condition and
stratum quotas, counterbalanced adjacent order, and deterministic usage/seed
ordering. All sessions for one reader share the no-repeat spelling constraint.
Sessions are rebound to the read-aloud comparison digest, including the dialect
policy and acceptable alternatives. Insufficient spelling pools fail instead of
changing the quota.

`readAloudPacket` contains only session ID, registered instructions, positions,
opaque item IDs and spellings. Intended phones, condition labels, strata, traces,
reader identities and acceptance rules remain owner-only. The owner must inspect
the registered instruction wording itself for accidental hints or condition
disclosure; arbitrary prose cannot be automatically certified blind.

`freezeReadAloudRoster` binds every registered slot to a distinct pseudonymous
person key and verification record hash. `freezeReading` binds the assigned
item, slot's person key, first-attempt attestation and complete canonical PCM16
mono WAV facts. Skips and recording failures require explicit reasons. Missing
readings are absence of receipts, not fabricated skips. `verifyReading` requires
the original bytes for recorded outcomes. An attestation and byte hash do not
prove the recording is a person's actual first attempt or that the cohort is
independent; verification, consent and collection procedures remain required.

`blindCoderPacket` reauthenticates the assigned reader and actual recording
bytes. It exposes only an opaque reading ID, audio hash, declared dialect and
normalized phone inventory. Deliver the authenticated audio separately, without
filenames or metadata that reveal the spelling, source, reader or condition.
Transcribers must be blind to the spelling as well as the generator target.

`freezeAdjudication` requires two distinct independent coder files and a third
independent blind adjudicator. All three people must be outside the registered
reader cohort. The decision binds both original coder file hashes in order,
the exact recording, and the roster. Conflicting coder transcriptions remain
available even after adjudication. Keep all three original UTF-8 files; byte
verification rejects even a whitespace-only rewrite. Hashes and attestations
cannot by themselves establish truthful blindness or independence.

Complete and seal coding/adjudication before joining to intended targets. Do
not select whichever coder output is closest to the generator target. An
uncertain decision preserves its alternatives and reason; an untranscribable
recording preserves its reason. Neither becomes a scored match or mismatch.

## Agreement definitions and limitations

`assessDrawAgreement` validates the declared policy, all targets and observed
symbols. It returns separate availability and agreement fields:

- Phones: exact ordered flattened normalized phone sequence; syllable boundary
  differences alone do not count as phone errors.
- Phones and stress: exact normalized syllable phone grouping and every primary,
  secondary and unmarked stress value. Boundary differences count against this
  combined measure. It is not an isolated stress accuracy measure.
- Principal intended versus accepted: both definitions are reported against the
  principal intended target and, separately, the union of that target and only
  its prospectively accepted alternatives.

An observed unknown stress value withholds only the combined measure. An
explicitly heard unmarked stress value is an observation and can be a mismatch;
the scorer inserts no primary stress. Multiple heard primary stresses are also
retained as observations. Missing, uncertain or untranscribable readings and
unresolved source targets produce unavailable (`null`) scores. Coverage and
status counts must accompany any later aggregate.

These are per-original-draw scoring contracts, not participant/item-aware
population estimates. A future aggregate must average across independent reader
observations per spelling, retain all original source-draw multiplicities and
conflicting targets, show participant/item coverage, and report condition/order
and transcription disagreement. A new, independently calibrated participant
and spelling analysis is required; Q21's ordinal rating calibration does not
validate read-aloud binary outcomes or transcription uncertainty.

## Development verification

`read-aloud.test.ts` uses tiny synthetic source-shaped fixtures built from the
existing public-API fixture helper, fake reader/coder attestations and synthetic
PCM ramps. These fixtures are explicitly not speech, real people, empirical
dialect alternatives, actual generator-capture provenance or quality evidence.

Run `npm run review:typecheck`, ESLint for this directory, and
`npm run test:review` against the exact archived source. The first contract-only draft passed strict types, touched lint and the full
112-test review suite after the reserved Q11b gate interval. Static review then
found a missing runtime check of the two-file coder tuple; the next draft adds
that check and resealed 0/1/3-file regressions, the owner report and CLI. The
expanded V3 revision passes strict types, touched lint and all 129 review cases.
The owner CLI completes sixteen actual command checks across four synthetic
cases; an independent Python implementation reconstructs 25 source draws, 32
planned trials, 18 WAVs, 17 adjudications and 64 group/metric cells. Seven
corrupted-evidence cases are rejected, including a dependent coder with all
associated file hashes consistently resealed, a pooled-cell weighting error and
an unavailable reading falsely scored as a mismatch. The independent operator
does not authenticate whole source-capture/canonical-manifest behavior, actual
speech/people/blinding, calibration or quality.

The V2 strict type inference failure and V1 operator assertion failure are
retained. The latter compared undefined optional in-memory trace fields with
absent fields after JSON serialization; corrected wire expectations preserve
module source and all semantic values. Actual recording-browser verification,
durable collection, calibrated analysis, real recruitment/readings and the
independent Q23 pull request remain to be completed.

## Owner report and CLI

`reportReadAloud` requires exactly one original material set for every recorded
reading and the exact two coder files and adjudicator file for every frozen
decision. Duplicate trials, receipts, materials and adjudications fail rather
than replacing data. Original evidence bytes for every accepted-alternative
rationale are required as well; one file may support several prospectively
registered source alternatives if its hash is shared. Verification establishes
byte bindings, not linguistic validity or truthful human independence.

The report emits every planned trial with explicit status, every original source
draw and its reader scores, all strata plus pooled condition groups, and
candidate-minus-baseline differences for all four metrics. It first averages
available readers for each source draw, then averages covered source draws. Raw
source-draw score cells are dependent; their pooled success ratio is not the
reported draw-weighted estimator when reader exposure differs. Coverage retains
all original draws, resolved targets and unique spellings. No-coverage metrics
and differences with an unavailable arm are `null`. Roster person keys are
counted; verified distinct people and calibrated intervals remain unavailable.

Pre-adjudication coding-outcome disagreement ignores differences in free-text
uncertainty reasons and the order of uncertain alternatives. Separate phone and
combined-phone/syllable/stress agreement between both definite coders have their
own available denominators. Recordings with identical byte hashes are shown as
duplicate-audio groups; the report does not silently exclude them or assert
independent recordings.

Run the owner CLI with `node --import tsx evaluation/review/read-aloud/cli.ts`:

- `inventory --registration FILE --baseline FILE --candidate FILE --out FILE`
- `allocate --comparison FILE --out FILE`
- `packet --comparison FILE --plan FILE --session ID --out FILE`
- `roster --comparison FILE --input FILE --out FILE`
- `recording --comparison FILE --plan FILE --roster FILE --input FILE --out FILE`
- `coder-packet --comparison FILE --plan FILE --roster FILE --reading FILE
  --input FILE --out DIRECTORY`
- `adjudicate --comparison FILE --plan FILE --roster FILE --reading FILE
  --input FILE --out FILE`
- `report --input EXPORT --materials FILE [--evidence FILE] --out FILE`
- `verify --input EXPORT --materials FILE [--evidence FILE]`

Roster input contains `verification_method` and complete `entries`. Recording
input contains `identity` and either `{status: recorded, wav: relative-path}` or
`{status: skipped|recording-failed, reason}`. Coder-packet input contains
`{wav: relative-path}`. Adjudication input contains `wav`, exactly two `coders`
paths in order and a `decision` path. Material inventory is an array of
`{reading_id, wav, coding?: {coders: [path, path], decision: path}}`. Alternative
evidence inventory is an array of `{sha256, file}`. All material paths resolve
inside their manifest directory; parent, absolute and physically escaping
symlink paths are rejected.

JSON outputs are exclusive and mode 0600. The coder bundle directory is
exclusive and mode 0700, with fsynced mode-0600 `packet.json`, an authenticated
WAV under its hash-only name and a final completion marker. The directory and
its parent are synced. A failed partial bundle remains for owner inspection
and cannot be overwritten by a retry. The packet omits original filenames and
paths. Deliver the complete bundle only to the independently verified blind
coder. The owner export assembled from frozen artifacts remains private.

## Prospective crossed stability analysis

An optional `registration.inference` freezes a read-aloud protocol before any
reading. Its version is `read-aloud-crossed-stability-v1`; it names one primary
metric, a seed, replicate count, nominal confidence, minimum scored readers and
spellings per arm, original-pool draw coverage, and reader/spelling/missingness/
coding assumptions. All four intended/accepted phone and combined scores remain
in the result. Changing a protocol invalidates the comparison and its recordings.

`infer` accepts the same authenticated export, original WAV/coding materials and
alternative rationale evidence as `report`. It reconstructs that report before
analysis; a separately edited score table cannot bypass authentication. Original
source draws retain their multiplicity, and an observed pronunciation scores all
matching intended targets together. Every registered reader and unique spelling
has one factor identity, shared across arms, strata and all four metrics.

The candidate estimator divides every observation mass by its draw's fixed
metric-available reader count, then applies positive reader/spelling factors and
forms an overall weighted ratio. It does not renormalize reader weights inside
each draw. Unit factors recover the descriptive mean. Each replicate uses
independent exponential factors from midpoint-transformed seeded 32-bit bins;
the retained bin hashes and exact counts support independent reconstruction.
Axis scaling preserves ratios. Endpoints use linear interpolated percentiles.

An interval is withheld if either arm lacks the frozen number of scored readers,
spellings or covered original draws, or if any replicate is unavailable. Missing
receipts, skips, failures, uncoded/uncertain/untranscribable decisions, unknown
stress and unresolved targets remain in the accompanying full report. Combined
scores with unknown stress stay unavailable while phone scores can remain usable.

```sh
node --import tsx evaluation/review/read-aloud/cli.ts infer \
  --input export.json --materials materials.json --out NEW_STABILITY_RESULT
```

This is an **uncalibrated engineering estimator**. The output explicitly records
`calibration: "not-established"` and `population_intervals: null`. Numerical
stability endpoints are not a population confidence guarantee or human-quality
result. The crossed-factor motivation in [Owen and Eckles (2012)](https://arxiv.org/abs/1106.2125)
concerns mean-variance estimation; it does not establish coverage for this weighted
ratio, percentile construction or categorical pronunciation study. Written-rating
calibration does not validate it. New categorical calibration must preserve
shared/conflicting targets, accepted sets, phones/boundaries/stress, coding
availability and both conditional and full-population missingness truths.

The exported `resampleReadAloud` numerical kernel accepts prepared synthetic
scores, a protocol and registered stratum IDs. It does not authenticate source,
people, material files or observations. It exists so independent categorical
simulation inputs use exactly the kernel called by authenticated `inferReadAloud`;
it is not an alternative way to establish human-study evidence. The authenticated
wrapper always reconstructs and verifies original materials before calling it.
Kernel extraction preserves every original estimate, factor, replicate and
endpoint; retained CLI fixtures must match their original outputs exactly.
