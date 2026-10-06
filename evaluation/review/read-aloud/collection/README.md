# Durable first-presentation recording receipts

This collection unit supplies the read-aloud state machine, private filesystem
journal, loopback API, recording browser and owner CLI. The browser retains the
first encoded recording before upload and supports exact-byte retries. Synthetic
tests exercise capture, bytes and recovery; they do not establish human readings
or pronunciation agreement.

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

## Recording browser

After starting the loopback collector, open its URL with the reader's private token
as the fragment, for example `http://127.0.0.1:4190/#READER_TOKEN`. The browser
clears the fragment and keeps the token in that tab's session storage. Reader links
are credentials; distribute only the assigned link to each reader. Owner tokens
must not be used as reader links. Static HTML and worklet code contain no source
spellings or tokens. Reader API calls require the assigned Bearer token.

Start establishes the audio source at the registered context rate before asking
for a word. Microphone constraints request mono input without echo cancellation,
noise suppression or automatic gain; actual device settings are retained as
browser reports, and browser resampling/downmixing may occur. An AudioWorklet
captures all mono frames from the first armed attempt, stopping at the registered
frame bound or Finish. Encoding clamps and quantizes those original frames into
PCM16; it does not trim silence, normalize amplitude or remove frames. The browser
offers neither playback nor a second recording. Development fixtures use a
prominently labelled synthetic tone and never request a microphone.

The browser saves the presentation request in IndexedDB before transmission. It
waits for strict transaction completion before treating either that request or the
encoded WAV as locally retained. It checks the WAV hash and the server's bound
receipt before storing an acknowledgement and advancing. Original WAV bytes and
receipts remain in IndexedDB after completion. A Web Lock permits one active tab
per reader on that browser origin. Browsers without Web Locks or strict IndexedDB
transactions must fail before presentation. Tested capture uses Chrome; support
on other browsers requires their own verification.

Reloading during capture cannot restart the reading. Without retained encoded
bytes, the reader must explicitly mark the recording lost. A retained WAV may be
retried after an offline upload, lost acknowledgement or browser restart; the same
original bytes are sent. The recovery view also permits downloading those bytes.
If local persistence fails after encoding, keep the tab open: its in-memory first
WAV can be retried for storage, but closing the tab loses that copy. An interrupted
presentation acknowledgement is resolved with the original request, never a new
reading. An original skip or failure can likewise be retried without changing it.

Offline retry preserves an already recorded attempt. Starting another word still
requires the owner's collector. Browser storage can be evicted or cleared and is
bound to the exact origin, including port; it is not a backup. Keep the same origin
when resuming and preserve/download original recordings when needed. Close the
collector cleanly before copying its complete private store. Shutdown closes unused
TCP preconnections while allowing accepted requests and journal writes to drain.

Actual browser verification covers the labelled tone, audio worklet, IndexedDB,
exclusive tab, reload, profile restart, exact retries, explicit skip/loss and the
getUserMedia pipeline with a fake device. It supplies no human speech. Independent
reconstruction of retained receipts and PCM is separate from browser assertions.
Registered synthetic outcome calibration is published in the
[Q23 results](../../../experiments/independent-read-aloud-study/completed-evidence/RESULTS.md).
Authentic first-attempt reader speech, independent blind coding and adjudication,
and the actual human study remain required before a human-quality claim.
