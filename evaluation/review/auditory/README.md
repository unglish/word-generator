# Q22 auditory study contracts

These owner-side tools freeze source draws, pronunciation targets, audio bytes,
balanced sessions and descriptive auditory reports. A private loopback collector
serves hash-checked audio and saves delivery, reported playback and rating receipts.
No speech, independent human verification, recruitment, actual listener
responses or calibrated auditory population inference has been completed.

The implementation is deliberately modality-specific. A spelling is not an
auditory item: different spellings can share an intended pronunciation, and one
spelling can represent different pronunciations. Target identity includes the
registered policy, segmented syllable phones and primary/secondary stress.
Shared targets use one identical recording across both conditions. The allocator
prevents target repetition across all sessions belonging to a participant slot,
uses complete matching, balances condition quotas in each stratum and
counterbalances presentation order over an even roster.

## Before any human release

Register candidate selection, population, complete exhaustive strata, participant
quotas, pronunciation policy and one production contract before producing audio
or observing judgments. Record the registration digest prospectively. Later
amendments require a distinct registration and retained previous artifacts.
The original source snapshots contain the written rubric as provenance; the
auditory packet uses `auditory-wordlikeness-v1`. Its wording is a new study
instrument, not a validated scale. Pilot comprehension independently before
using it for confirmatory claims; retain the initial instrument and observations.

Declare every normalization using structured target-phone objects and explicit
source mappings with rationale. The source symbols are already segmented;
do not parse display IPA or use the coarse IPA-to-ARPABET observer. For example,
mapping an ambiguous source vowel to a rhotic vowel would require an explicit
dialect decision. Unknown or ambiguous phones, empty nuclei and missing or
multiple primary stress remain unresolved. The tools retain every draw and
its problem list and block allocation/release of an available subset. They
never insert a primary stress or choose an ambiguous alternative to make audio
production convenient. Onset/coda boundaries remain source evidence, while
target identity uses each syllable's ordered phone sequence and stress.

Use committed generator sources and authenticated public-API snapshots. The
snapshot integrity checks detect changes relative to recorded contents; they
cannot prove that someone did not fabricate a self-consistent source record.
Actual provenance requires the retained source/capture/replay evidence. Do not
substitute source-shaped fixtures for that evidence.

Produce exactly one PCM16 mono WAV per unique target using the registered
speaker/voice and settings, including a fixed sample rate and duration ceiling.
Only canonical `fmt ` and `data` chunks are accepted: filenames and embedded WAV
metadata must not disclose spelling or condition. Recordings retain duration,
frame counts, peaks and clipping counts; those statistics do not prove intelligible
speech. A fixed speaker confines conclusions to that production procedure;
it does not establish a result across speakers. Voice or prosody preferences can
still affect judgments even when settings are identical across conditions.

Each production record is UTF-8 JSON with:

```json
{
  "version": "auditory-production-record-v1",
  "target_digest": "SHA256",
  "audio_sha256": "SHA256",
  "contract_digest": "SHA256 of the registered production contract",
  "method_details": "Exact recording or synthesis procedure and retained source references"
}
```

Two distinct people, independent of production, must transcribe every human-study
asset while blind to its intended target, spelling and condition. Give them the
declared dialect/phone inventory and transcription instructions. Each verification
binds the audio hash, policy digest and complete transcription-file hash to an
owner-private person key and method. The UTF-8 transcription file contains the
normalized `TargetSyllable[]`. Both transcriptions must match intended phones,
syllable sequence and stress. Disagreements and failed/unavailable productions
are retained, never silently discarded or adjudicated into passing records by
these tools. A revision gets a new file hash and independent checks. Person keys,
blindness and independence are owner attestations; hashes cannot verify their
truth or that two keys represent two people. These pronunciation checks are
distinct from listener wordlikeness judgments.

Use `verifyReleaseFiles` immediately before serving assets: release digest
validation alone authenticates frozen metadata, not present on-disk bytes.
The auditory collector hash-checks served bytes, uses opaque asset identifiers,
binds responses to audio/session/position, and persists immutable receipts and
reported playback events. Startup reauthenticates all private audio, production
and transcription files. Collector verification is described in
[the collection guide](collection/README.md).
An exported complete-playback flag is a recorded claim, not proof of attention.

## Owner workflow

From the repository root, run the CLI through the existing TSX loader:

```sh
node --import tsx evaluation/review/auditory/cli.ts inventory --registration registration.json --baseline baseline.json --candidate candidate.json --out comparison.json
node --import tsx evaluation/review/auditory/cli.ts release --comparison comparison.json --input materials.json --out release.json
node --import tsx evaluation/review/auditory/cli.ts verify --comparison comparison.json --input materials.json --release release.json
node --import tsx evaluation/review/auditory/cli.ts allocate --comparison comparison.json --out plan.json
node --import tsx evaluation/review/auditory/cli.ts packet --comparison comparison.json --release release.json --plan plan.json --session SESSION_ID --out packet.json
node --import tsx evaluation/review/auditory/cli.ts report --input export.json --out report.json
```

`materials.json` contains all distinct targets, each with `target_digest`, relative
`wav` and `production_record` paths and a `verification` array of `{record,
transcription_file}`. Keep all original material files and rejected versions.
Outputs use exclusive creation with owner-only permissions. Input paths and
owner artifacts are never sent to a remote service. Inventory may be saved with
unresolved targets for diagnosis; release and allocation then fail explicitly.

Reviewer packets contain only session ID, auditory rubric, positions, opaque item
IDs, audio hashes and MIME type. Never supply comparison/release owner artifacts
or participant-slot mappings to reviewers. The shared audio hash intentionally
identifies the shared recording; it carries no condition label.

## Interpretation and remaining work

Reports retain condition/stratum assignment counts, missing responses, skips
before complete playback, familiarity, original draw multiplicity and item
coverage. Within-slot paired contrasts keep candidate-minus-baseline direction
when presentation order reverses. Scores aggregate each item's observed ratings,
then weight it by original source draws; uncovered draws remain explicit and
do not become negative ratings. Missingness can bias covered-item estimates.
The unfamiliar subset is defined after presentation and may differ by condition.
Slots are not verified people. Development PCM ramps and synthetic attestations
exercise contracts only and cannot support phonological quality claims.

The Q21 spelling-factor bootstrap is not automatically valid here: auditory
dependence belongs to shared pronunciation targets/audio and participants.
Preregister and independently calibrate an auditory analysis before adding
population confidence intervals or efficacy decisions. Confirmatory human work
still needs recruitment/identity evidence, actual speech
and blind verifications, an agreed stopping rule and real listener observations.
No current CLI command reports such a verdict.

Gradient phonotactic judgment and pronunciation repairs motivate keeping heard
wordlikeness separate from elicited readings; see
[Hayes and Wilson (2008)](https://www.brucehayes.org/papers/HayesAndWilsonPhonotactics2008.pdf).
Participant and item dependence motivate accounting for both sources of variation;
see [Baayen, Davidson and Bates (2008)](https://pages.stat.wisc.edu/~larget/Stat998/Fall2015/BaayenDavidsonBates-2008.pdf).
Neither paper validates this rubric, allocation or an uncalibrated bootstrap.
