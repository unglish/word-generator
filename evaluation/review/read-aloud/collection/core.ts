import { randomBytes } from "node:crypto";
import { CollectorError, tokenHash } from "../../comparison/collection/collection-core.js";
import { digest } from "../../snapshot.js";
import { hash, nonempty } from "../../auditory/targets.js";
import { validateReadAloudPlan } from "../allocation.js";
import { validateReadAloudRoster } from "../readings.js";
import type { Reading } from "../model.js";
import type { CaptureDeclaration, CaptureSource, FailureSubmission, Presentation, PresentationSubmission,
  ReadAloudCollectorManifest, ReadAloudCollectorState, ReadAloudCredentials, ReadAloudEvent, ReadAloudEventContent } from "./model.js";

const authenticated = new WeakSet<ReadAloudCollectorManifest>();
function timestamp(value: string): boolean {
  return nonempty(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}
function freezeTree(value: unknown, seen = new WeakSet<object>()): void {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype) throw new Error("Collector manifests require plain JSON objects and arrays.");
  seen.add(value); Object.values(value).forEach(child => freezeTree(child, seen)); Object.freeze(value);
}
function authenticate(manifest: ReadAloudCollectorManifest): void {
  if (authenticated.has(manifest)) return;
  validateManifest(manifest); freezeTree(manifest); authenticated.add(manifest);
}
export function validateManifest(manifest: ReadAloudCollectorManifest): void {
  if (manifest.version !== "read-aloud-collector-v1" || !timestamp(manifest.created_at) || !hash(manifest.owner_token_sha256) ||
      !["microphone", "synthetic-fixture"].includes(manifest.capture_source) ||
      (manifest.comparison.registration.purpose === "human-study" && manifest.capture_source !== "microphone")) {
    throw new Error("Invalid read-aloud collector or synthetic source in a human study.");
  }
  validateReadAloudPlan(manifest.comparison, manifest.plan); validateReadAloudRoster(manifest.comparison, manifest.roster);
  const slots = new Set<string>(), tokens = new Set([manifest.owner_token_sha256]);
  for (const entry of manifest.participant_credentials) {
    if (!manifest.comparison.registration.participant_slots.includes(entry.participant_slot) || !hash(entry.token_sha256) ||
        slots.has(entry.participant_slot) || tokens.has(entry.token_sha256)) throw new Error("Invalid or duplicate reader credential.");
    slots.add(entry.participant_slot); tokens.add(entry.token_sha256);
  }
  const { digest: supplied, ...content } = manifest;
  if (slots.size !== manifest.comparison.registration.participant_slots.length || digest(content) !== supplied) throw new Error("Incomplete or changed collector manifest.");
}
export function createReadAloudCollector(comparison: ReadAloudCollectorManifest["comparison"], plan: ReadAloudCollectorManifest["plan"],
  roster: ReadAloudCollectorManifest["roster"], captureSource: CaptureSource = "microphone", createdAt = new Date().toISOString()): {
    manifest: ReadAloudCollectorManifest; credentials: ReadAloudCredentials;
  } {
  const owner = randomBytes(32).toString("hex");
  const participants = comparison.registration.participant_slots.map(participant_slot => ({ participant_slot, token: randomBytes(32).toString("hex") }));
  const content = { version: "read-aloud-collector-v1" as const, comparison: structuredClone(comparison), plan: structuredClone(plan),
    roster: structuredClone(roster), capture_source: captureSource, created_at: createdAt, owner_token_sha256: tokenHash(owner),
    participant_credentials: participants.map(entry => ({ participant_slot: entry.participant_slot, token_sha256: tokenHash(entry.token) })) };
  const manifest = { ...content, digest: digest(content) }; validateManifest(manifest);
  return { manifest, credentials: { version: "read-aloud-credentials-v1", manifest_digest: manifest.digest, owner_token: owner, participants } };
}
export function participantFor(manifest: ReadAloudCollectorManifest, token: string): string {
  if (!hash(token)) throw new CollectorError("A valid reader link is required.", 401);
  const entry = manifest.participant_credentials.find(value => value.token_sha256 === tokenHash(token));
  if (!entry) throw new CollectorError("A valid reader link is required.", 401);
  return entry.participant_slot;
}
export function requireOwner(manifest: ReadAloudCollectorManifest, token: string): void {
  if (!hash(token) || tokenHash(token) !== manifest.owner_token_sha256) throw new CollectorError("Owner authentication required.", 401);
}
function exactKeys(value: object, expected: string[]): boolean {
  return Object.keys(value).sort().join(",") === [...expected].sort().join(",");
}
function validCapture(value: CaptureDeclaration): boolean {
  return !!value && typeof value === "object" && exactKeys(value, ["source", "context_sample_rate", "device_sample_rate", "device_channel_count",
    "echo_cancellation", "noise_suppression", "auto_gain_control"]) && ["microphone", "synthetic-fixture"].includes(value.source) &&
    Number.isSafeInteger(value.context_sample_rate) && value.context_sample_rate > 0 &&
    [value.device_sample_rate, value.device_channel_count].every(number => number === null || Number.isSafeInteger(number) && number > 0) &&
    [value.echo_cancellation, value.noise_suppression, value.auto_gain_control].every(flag => flag === null || typeof flag === "boolean");
}
export function parsePresentation(value: unknown): PresentationSubmission {
  const result = value as PresentationSubmission | null;
  if (!result || typeof result !== "object" || !exactKeys(result, ["session_id", "position", "request_id", "capture"]) ||
      !hash(result.session_id) || !Number.isSafeInteger(result.position) || result.position < 0 || !hash(result.request_id) || !validCapture(result.capture)) {
    throw new CollectorError("Invalid first-presentation request.", 400);
  }
  return structuredClone(result);
}
export function parseFailure(value: unknown): FailureSubmission {
  const result = value as FailureSubmission | null;
  if (!result || typeof result !== "object" || !exactKeys(result, ["attempt_id", "status", "reason"]) || !hash(result.attempt_id) ||
      !["skipped", "recording-failed"].includes(result.status) || !nonempty(result.reason)) throw new CollectorError("Invalid reading failure/skip.", 400);
  return structuredClone(result);
}
export function presentationFor(state: ReadAloudCollectorState, participant: string, attemptId: string): Presentation {
  const event = state.events.find(value => value.kind === "presentation" && value.presentation.attempt_id === attemptId);
  if (event?.kind !== "presentation" || event.participant_slot !== participant) throw new CollectorError("Attempt does not belong to your assignment.", 403);
  return event.presentation;
}
export function intentFor(state: ReadAloudCollectorState, attemptId: string) {
  return state.events.find((event): event is ReadAloudEvent & { kind: "recording-intent" } => event.kind === "recording-intent" && event.attempt_id === attemptId);
}
export function readingFor(state: ReadAloudCollectorState, attemptId: string) {
  return state.events.find((event): event is ReadAloudEvent & { kind: "reading" } => event.kind === "reading" && event.attempt_id === attemptId);
}
export function nextReadAloud(state: ReadAloudCollectorState, participant: string) {
  authenticate(state.manifest);
  const comparison = state.manifest.comparison;
  if (!comparison.registration.participant_slots.includes(participant)) throw new CollectorError("Unknown reader slot.", 403);
  const sessions = state.manifest.plan.sessions.filter(session => session.participant_slot === participant).sort((a, b) => a.ordinal - b.ordinal);
  for (const session of sessions) {
    const position = session.item_ids.findIndex((_, position) => !state.data.readings.some(reading => reading.session_id === session.id && reading.position === position));
    if (position < 0) continue;
    const itemId = session.item_ids[position];
    const event = state.events.find(value => value.kind === "presentation" && value.presentation.session_id === session.id && value.presentation.position === position);
    const context = { session_id: session.id, position, item_id: itemId, session_length: session.item_ids.length,
      instructions: comparison.registration.recording.instructions, recording: structuredClone(comparison.registration.recording), capture_source: state.manifest.capture_source };
    if (event?.kind === "presentation") {
      const spelling = comparison.partition.items.find(item => item.id === itemId)!.spelling;
      return { exhausted: false as const, phase: "presented" as const, ...context, attempt_id: event.presentation.attempt_id, spelling,
        committed_audio_sha256: intentFor(state, event.presentation.attempt_id)?.audio.sha256 ?? null };
    }
    return { exhausted: false as const, phase: "ready" as const, ...context };
  }
  return { exhausted: true as const };
}
function envelope(state: ReadAloudCollectorState, participant: string, receivedAt: string): Omit<ReadAloudEventContent, "kind"> {
  if (!timestamp(receivedAt)) throw new Error("Invalid reading receipt timestamp.");
  return { version: "read-aloud-event-v1", sequence: state.events.length, previous_sha256: state.events.at(-1)?.sha256 ?? state.manifest.digest,
    participant_slot: participant, received_at: receivedAt };
}
function seal(content: ReadAloudEventContent): ReadAloudEvent { return { ...content, sha256: digest(content) }; }
export function presentationEvent(state: ReadAloudCollectorState, participant: string, submission: PresentationSubmission, receivedAt: string): ReadAloudEvent | null {
  const previous = state.events.find(event => event.kind === "presentation" &&
    (event.presentation.request_id === submission.request_id || event.presentation.session_id === submission.session_id && event.presentation.position === submission.position));
  if (previous?.kind === "presentation") {
    const { item_id, attempt_id, ...saved } = previous.presentation;
    if (!hash(item_id) || !hash(attempt_id) || previous.participant_slot !== participant || digest(saved) !== digest(submission)) {
      throw new CollectorError("The first presentation is immutable; a second attempt is not allowed.", 409);
    }
    return null;
  }
  const pending = nextReadAloud(state, participant);
  if (pending.exhausted || pending.phase !== "ready" || pending.session_id !== submission.session_id || pending.position !== submission.position) {
    throw new CollectorError("Complete the current assigned reading first.", 409);
  }
  if (submission.capture.source !== state.manifest.capture_source || submission.capture.context_sample_rate !== pending.recording.sample_rate) {
    throw new CollectorError("Capture must use the registered source and PCM sample rate.", 400);
  }
  const presentation = { ...structuredClone(submission), item_id: pending.item_id,
    attempt_id: digest([state.manifest.digest, submission.session_id, submission.position, submission.request_id]) };
  return seal({ ...envelope(state, participant, receivedAt), kind: "presentation", presentation });
}
function currentAttempt(state: ReadAloudCollectorState, participant: string, attemptId: string): Presentation {
  const presentation = presentationFor(state, participant, attemptId), pending = nextReadAloud(state, participant);
  if (pending.exhausted || pending.phase !== "presented" || pending.attempt_id !== attemptId) throw new CollectorError("This reading is no longer pending.", 409);
  return presentation;
}
function validateStoredReading(state: ReadAloudCollectorState, reading: Reading): void {
  const outcome = reading.outcome;
  if (!outcome || typeof outcome !== "object") throw new Error("Invalid stored reading outcome.");
  if (outcome.status === "recorded") {
    const facts = outcome.audio, contract = state.manifest.comparison.registration.recording;
    if (!facts || !hash(facts.sha256) || facts.format !== "pcm16-mono-wav" || facts.sample_rate !== contract.sample_rate ||
        !Number.isSafeInteger(facts.frames) || facts.frames <= 0 || facts.bytes !== 44 + facts.frames * 2 ||
        facts.seconds !== facts.frames / facts.sample_rate || facts.seconds > contract.maximum_seconds ||
        !Number.isSafeInteger(facts.peak_absolute_sample) || facts.peak_absolute_sample < 0 || facts.peak_absolute_sample > 32768 ||
        !Number.isSafeInteger(facts.clipped_samples) || facts.clipped_samples < 0 || facts.clipped_samples > facts.frames ||
        !exactKeys(facts, ["sha256", "format", "sample_rate", "frames", "bytes", "seconds", "peak_absolute_sample", "clipped_samples"]) ||
        !exactKeys(outcome, ["status", "audio"])) throw new Error("Invalid stored PCM recording facts.");
  } else if (!["skipped", "recording-failed"].includes(outcome.status) || !nonempty(outcome.reason) || !exactKeys(outcome, ["status", "reason"])) {
    throw new Error("Invalid stored skip/failure.");
  }
  const content = { version: "read-aloud-recording-v1" as const, comparison_digest: state.manifest.comparison.digest,
    session_id: reading.session_id, position: reading.position, item_id: reading.item_id, person_key: reading.person_key,
    first_attempt: true as const, outcome };
  if (digest(reading) !== digest({ ...content, id: digest(content) })) throw new Error("Changed stored reading contract or identity.");
}
export function intentEvent(state: ReadAloudCollectorState, participant: string, attemptId: string, reading: Reading, receivedAt: string): ReadAloudEvent | null {
  validateStoredReading(state, reading);
  const presentation = presentationFor(state, participant, attemptId), existing = intentFor(state, attemptId);
  if (reading.outcome.status !== "recorded" || reading.session_id !== presentation.session_id || reading.position !== presentation.position ||
      reading.item_id !== presentation.item_id) throw new CollectorError("Recording does not bind the presented item.", 400);
  if (existing) {
    if (digest(existing.audio) !== digest(reading.outcome.audio)) throw new CollectorError("The first received recording is immutable.", 409);
    return null;
  }
  currentAttempt(state, participant, attemptId);
  return seal({ ...envelope(state, participant, receivedAt), kind: "recording-intent", attempt_id: attemptId, audio: structuredClone(reading.outcome.audio) });
}
export function readingEvent(state: ReadAloudCollectorState, participant: string, attemptId: string, reading: Reading, receivedAt: string): ReadAloudEvent | null {
  validateStoredReading(state, reading);
  const presentation = presentationFor(state, participant, attemptId), previous = readingFor(state, attemptId);
  const session = state.manifest.plan.sessions.find(value => value.id === presentation.session_id)!;
  const person = state.manifest.roster.entries.find(value => value.participant_slot === session.participant_slot)!;
  if (reading.session_id !== presentation.session_id || reading.position !== presentation.position || reading.item_id !== presentation.item_id ||
      reading.person_key !== person.person_key || reading.first_attempt !== true || reading.comparison_digest !== state.manifest.comparison.digest) {
    throw new CollectorError("Reading does not bind its assigned presentation and reader.", 400);
  }
  if (previous) {
    if (digest(previous.reading) !== digest(reading)) throw new CollectorError("Saved reading outcome is immutable.", 409);
    return null;
  }
  currentAttempt(state, participant, attemptId);
  const intent = intentFor(state, attemptId);
  if (reading.outcome.status === "recorded" && (!intent || digest(intent.audio) !== digest(reading.outcome.audio))) {
    throw new CollectorError("Recording requires its durable first-byte commitment.", 409);
  }
  if (intent && reading.outcome.status === "skipped") throw new CollectorError("A committed but lost recording must remain a recording failure, not a skip.", 409);
  return seal({ ...envelope(state, participant, receivedAt), kind: "reading", attempt_id: attemptId, reading: structuredClone(reading) });
}
export function appendEvent(state: ReadAloudCollectorState, event: ReadAloudEvent): void {
  state.events.push(structuredClone(event));
  if (event.kind === "reading") state.data.readings.push(structuredClone(event.reading));
}
export function restoreReadAloudCollector(manifest: ReadAloudCollectorManifest, events: ReadAloudEvent[]): ReadAloudCollectorState {
  const frozen = structuredClone(manifest); authenticate(frozen);
  const state: ReadAloudCollectorState = { manifest: frozen, events: [], data: { version: "read-aloud-export-v1", comparison: frozen.comparison,
    plan: frozen.plan, roster: frozen.roster, readings: [], adjudications: [] } };
  for (const event of events) {
    let expected: ReadAloudEvent | null;
    if (event.kind === "presentation") {
      const { item_id, attempt_id, ...submission } = event.presentation;
      if (!hash(item_id) || !hash(attempt_id)) throw new Error("Invalid frozen presentation identity.");
      expected = presentationEvent(state, event.participant_slot, parsePresentation(submission), event.received_at);
    } else if (event.kind === "recording-intent") {
      const presentation = presentationFor(state, event.participant_slot, event.attempt_id);
      const person = frozen.roster.entries.find(value => value.participant_slot === event.participant_slot)!;
      const content = { version: "read-aloud-recording-v1" as const, comparison_digest: frozen.comparison.digest,
        session_id: presentation.session_id, position: presentation.position, item_id: presentation.item_id, person_key: person.person_key,
        first_attempt: true as const, outcome: { status: "recorded" as const, audio: event.audio } };
      expected = intentEvent(state, event.participant_slot, event.attempt_id, { ...content, id: digest(content) }, event.received_at);
    } else if (event.kind === "reading") expected = readingEvent(state, event.participant_slot, event.attempt_id, event.reading, event.received_at);
    else throw new Error("Unknown read-aloud event kind.");
    if (!expected || digest(event) !== digest(expected)) throw new Error("Read-aloud journal changed, duplicated or reordered.");
    appendEvent(state, event);
  }
  return state;
}
