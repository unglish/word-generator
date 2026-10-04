# Private auditory collection

This collector uses frozen Q22 comparisons, audio releases and balanced plans.
It binds audio deliveries, reported completion of playback and immutable responses
in one SHA256 receipt chain. It is local and loopback-only. Synthetic tests and
browser checks do not constitute speech, actual people or listener wordlikeness
evidence. Participant identity, independent production verification and attention
remain external facts; this code cannot prove truthful attestations.

Initialize from the existing owner artifacts:

```sh
node --import tsx evaluation/review/auditory/collection/cli.ts initialize --comparison comparison.json --release release.json --plan plan.json --materials materials.json --out collection
node --import tsx evaluation/review/auditory/collection/cli.ts serve --input collection --port 4180
node --import tsx evaluation/review/auditory/collection/cli.ts export --input collection --out exported
```

Human-study initialization additionally requires `--roster enrollment.json`.
The auditory enrollment record binds the exact comparison to one unique
owner-attested person and verification-record hash per planned slot. Its fields
are `version: auditory-enrollment-v1`, `comparison_digest`, `verification_method`,
`entries` (each with `participant_slot`, `person_key`,
`verification_record_sha256`) and canonical `digest` of the other fields. Person
keys are SHA256 identifiers and must not contain contact details. Four test
credentials do not prove four people. Recruitment and credential distribution
are owner work; initialization sends no invitations or messages.

The new directory is created exclusively with mode 0700. Manifest, credentials,
receipt journal, all audio files and all production/transcription records are
mode 0600. All frozen materials are copied and reauthenticated, including assets
not selected in a particular slot; there is no available-material subset fallback.
Incomplete initialization remains for inspection and cannot be overwritten.

Credentials are retained only in the private `credentials.json`. Give each
listener only their participant link, `http://127.0.0.1:4180/#TOKEN`, on the
computer running this collector. The page removes the fragment and uses
per-tab session storage. Do not expose the service publicly or give listeners
the owner token, roster, manifest, exports or audit journal. These tools do not
provide remote recruitment or authenticated remote hosting.

Only the current assigned audio can be fetched. The server reads and hash-checks
the complete WAV before recording a delivery receipt. The browser verifies the
complete received bytes before creating an audio blob. A delivery record proves
only that the server prepared those bytes for a request; it does not prove the
whole response arrived or was heard. The browser uses native audio controls at
normal playback rate. After an `ended` event, it submits recorded played ranges,
duration and verified audio hash, bound to that delivery. The server checks
duration and full range coverage with tolerance `min(20 ms, duration / 100)`.
These are browser claims, not measures of attention or protection against a
client fabricating events.

The server requires a saved playback receipt before accepting a rating. Skips
before listening remain allowed and explicit. The response's `played_complete`
flag is derived from prior journal receipts, not an answer-body field supplied
by a client. Replays and repeated deliveries remain in the audit. Same-answer
and same-playback retries confirm the original receipt without adding duplicates;
changed retries are refused. Answers advance in the registered order across all
sessions. A participant cannot submit another slot's item or a future position.

Pending playback/answer bodies remain in per-tab session storage across reloads.
During a failed save, the response remains locked; retry confirms the same body.
On reload, pending playback is confirmed before the pending answer, then the
server's saved progress is displayed. The exported playback flag is a recorded
claim. Population inference must account for missing responses and post-presentation
familiarity; a completed slot does not certify a completed human study.

Every receipt is appended and fsynced before acknowledgment. A serialized writer
queue prevents concurrent retry races. `writer.lock` is exclusive; read-only
exports reconstruct all receipts and reauthenticate all private materials.
Opening a writer reauthenticates the full inventory; each served WAV is checked
again. Validated private JSON manifests are deeply frozen and authenticated once
per in-memory object, so packet construction does not repeatedly rehash the
entire source corpus for every receipt. Exported packets are isolated copies;
mutable descendants of a pre-frozen ancestor are frozen as well. Changed/missing served audio poisons further writes rather than recording
new answers against inconsistent material. Exported `audit.json` retains the
manifest and every event; `export.json` contains only the derived responses and
frozen comparison/release/plan. A real listener analysis still requires a
prospectively registered, independently calibrated auditory method.

Graceful termination drains pending writes and releases the lease. SIGKILL or
another abrupt exit deliberately leaves a stale lease. An interrupted final
journal line blocks normal reopening. Recovery requires inspection:

```sh
shasum -a 256 collection/writer.lock collection/events.jsonl
node --import tsx evaluation/review/auditory/collection/cli.ts recover --input collection --lease-sha256 INSPECTED_LEASE_SHA256 --journal-sha256 INSPECTED_JOURNAL_SHA256
```

Recovery refuses mismatching hashes and any PID that is still live (including
PID reuse or permission errors that prevent proving it is gone). It creates an
exclusive recovery lease, validates the complete journal prefix and all frozen
materials, and fsyncs a new private backup containing the **entire** original
journal, original writer lease and recovery report before changing the journal.
Only an incomplete final line lacking a newline can be removed from the active
journal; every complete event is revalidated and retained. The removed tail
remains in the backup with its original hash. A changed complete event or invalid
prefix causes refusal. No automated fallback invents an answer or playback event.
If recovery itself is interrupted, preserve its backup and `recovery.lock` for
owner inspection; this command does not automatically clear that additional lock.

Verification currently includes strict typing, touched lint, the full 93-test
review suite and an actual native browser/CLI fixture. The browser exercised
blocked-before-playback rating, native one-second tone playback, one rated answer,
an offline pending skip, stopped-writer recovery and reload to exact completion.
An independent Python recount reconstructs all seven fixture draw targets,
checks all four audio hashes, all five receipt events, both responses and the
preserved pre-crash prefix. These fixtures contain synthetic tones and synthetic
source/verifier records. They are **not pronunciation or human quality evidence**.
