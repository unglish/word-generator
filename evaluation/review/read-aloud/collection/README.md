# Durable first-presentation recording receipts

This collection unit supplies the read-aloud state machine, private filesystem
journal, loopback API and owner CLI. The browser microphone/encoding/offline
integration remains separate work. The collector is not yet a complete participant
application. Synthetic tests exercise bytes and recovery, not speakers or readings.

## Durable boundaries

The current assignment exposes registered instructions, recording bounds and an
opaque item ID. It supplies neither future spellings nor intended phones. A
participant's first presentation request is durably appended before its spelling
is returned. An exact request retry returns that same presentation; a new request
for the same position cannot create a retake. One reader completes each assigned
position in order, across all sessions.

The first valid WAV upload first appends a durable `recording-intent` with its
computed complete byte hash and PCM facts. It then writes and fsyncs a private
incoming file, installs a non-overwriting hash-named recording link and fsyncs its
directory. Only then can it append and fsync the final reading receipt and return
`saved`. A lost reply can be retried with exactly the same bytes. Changed bytes
remain a conflict, even after an interruption before the final receipt. Duplicate
saved uploads reauthenticate the original stored bytes before confirmation.

Incomplete incoming files and committed but unfinalized attempts are preserved.
An audio commitment is not a completed reading. An interrupted first presentation
is not an implicit skip. If its recording is lost, the collector requires an
explicit recording-failure reason. A committed recording cannot be relabelled a
skip. No automatic retake, fabricated response or available-subset source pool is
created. Adjudications remain empty until independent coding artifacts are sealed
through the existing owner workflow.

The journal uses an exclusive writer lease, a manifest-bound hash chain and
semantic replay. Acknowledgement follows file/journal fsync. Read-only loading
authenticates initialization, every complete receipt and all finalized WAV bytes.
It allows a pending audio commitment whose bytes have not yet been installed;
the reader can retry its exact upload or explicitly record a loss. A write failure
poisons the live writer until storage is inspected and reopened. Closing drains
already accepted operations before releasing the lease.

These promises assume a filesystem that honors fsync and exclusive creation. The
incoming link and final recording are two names for the same inode; they are not
independent backups. Source evidence, person attestations and event hashes do not
prove distinct people, honest capture, first vocalization, lack of prior practice,
accurate transcription or human benefit. Browser-reported device settings remain
claims. The server enforces its observed presentation/first-upload sequence.

## Owner operations

```sh
node --import tsx evaluation/review/read-aloud/collection/cli.ts initialize \
  --comparison comparison.json --plan plan.json --roster roster.json --out NEW_STORE
node --import tsx evaluation/review/read-aloud/collection/cli.ts serve \
  --input NEW_STORE --port 4190
node --import tsx evaluation/review/read-aloud/collection/cli.ts export \
  --input NEW_STORE --out NEW_ANALYSIS_EXPORT
```

Initialization refuses an existing directory and writes a final completion marker;
partial initialization cannot be served. Directories are 0700 and files 0600.
Participant and owner tokens are separate, random and stored privately; the
manifest holds their hashes. The roster binds every registered slot. Human-study
manifests require microphone mode. `--capture-source synthetic-fixture` is allowed
only for development fixtures; it is not speech.

The API requires a Bearer token. `/api/next` supplies the current context;
`/api/presentation` accepts the exact session/position/request-ID/capture declaration.
`/api/recording/ATTEMPT_ID` accepts a bounded `audio/wav` body at the registered PCM16
mono rate. `/api/failure` accepts an explicit immutable skip/failure. Owner-only
export/audit/material inventory routes retain complete private source and identity
information. No server endpoint supplies pronunciation hints to a reader.

The analysis export contains original recorded WAV bytes, the complete source
comparison/plan/roster, readings, receipt audit and an input manifest compatible
with the existing read-aloud report. It does not copy credentials or all incomplete
incoming files, so it is not a whole-store backup. Preserve the original private
store, including manifest, credentials, completion marker, journal, recordings and
incoming files, to resume collection on another installation after a clean stop.
No external service is needed for collection, export, analysis or recovery. The
CLI binds to loopback; direct peer exposure and synchronization are outside this
single-owner study workflow.

After an interrupted writer, inspect and hash its original lease and journal.
Recovery requires those exact hashes and confirms that the writer PID is stopped:

```sh
node --import tsx evaluation/review/read-aloud/collection/cli.ts recover \
  --input STORE --lease-sha256 INSPECTED_SHA --journal-sha256 INSPECTED_SHA
```

Recovery preserves the entire original lease and journal before truncating only
an incomplete final line. It semantically verifies every complete event and every
finalized recording first. Changed complete receipts or acknowledged bytes fail;
they are never silently discarded. The backup/report retain the exact discarded
tail, pending audio commitments and completed reading counts. A material inventory
also exposes all retained incoming files rather than filtering incomplete ones.

## Remaining participant integration

Before revealing a word, the browser must establish the microphone or explicitly
labelled fixture source at the registered context rate. It must save the request
ID and later the original encoded WAV locally before transmission. It may retry a
lost acknowledgement; it must not restart recording after presentation/reload.
An interrupted capture without retained encoded bytes must become an explicit
failure. Actual microphone capture, encoding, offline retry, interruption/reload,
independent receipt reconstruction, prospective outcome calibration and the human
study remain required before Q23 publication or a quality claim.
