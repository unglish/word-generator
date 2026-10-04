import { randomBytes } from "node:crypto";
import { CollectorError, tokenHash } from "../../comparison/collection/collection-core.js";
import { validAnswer } from "../../protocol.js";
import { digest } from "../../snapshot.js";
import { validateAuditoryPlan } from "../allocation.js";
import { validateRelease } from "../audio.js";
import { AUDITORY_RUBRIC } from "../protocol.js";
import { hash, nonempty } from "../targets.js";
import type { ComparisonPlan } from "../../comparison/comparison-model.js";
import type { AuditoryComparison, AuditoryRelease } from "../model.js";
import type { AudioDelivery, AuditoryAnswerSubmission, AuditoryCollectorManifest, AuditoryCollectorState, AuditoryCredentials,
  AuditoryEnrollment, AuditoryEvent, AuditoryEventContent, PlaybackSubmission } from "./model.js";

function timestamp(value: string): boolean { return nonempty(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value; }
const authenticatedManifests = new WeakSet<AuditoryCollectorManifest>();
function freezeTree(value: unknown, seen = new WeakSet<object>()): void {
  if (value && typeof value === "object" && !seen.has(value)) {
    seen.add(value); Object.values(value).forEach(child => freezeTree(child, seen)); Object.freeze(value);
  }
}
function authenticateManifest(manifest: AuditoryCollectorManifest): void {
  if (authenticatedManifests.has(manifest)) return;
  validateManifest(manifest); freezeTree(manifest); authenticatedManifests.add(manifest);
}
export function validateAuditoryEnrollment(comparison: AuditoryComparison, roster: AuditoryEnrollment): void {
  if (roster.version !== "auditory-enrollment-v1" || roster.comparison_digest !== comparison.digest || !nonempty(roster.verification_method) || !Array.isArray(roster.entries)) {
    throw new Error("Invalid auditory enrollment roster.");
  }
  const slots = new Set<string>(), people = new Set<string>(), records = new Set<string>();
  for (const entry of roster.entries) {
    if (!comparison.registration.participant_slots.includes(entry.participant_slot) || !hash(entry.person_key) || !hash(entry.verification_record_sha256) ||
        slots.has(entry.participant_slot) || people.has(entry.person_key) || records.has(entry.verification_record_sha256)) throw new Error("Auditory enrollment must bind unique slots, people and verification records.");
    slots.add(entry.participant_slot); people.add(entry.person_key); records.add(entry.verification_record_sha256);
  }
  const { digest: supplied, ...content } = roster;
  if (slots.size !== comparison.registration.participant_slots.length || supplied !== digest(content)) throw new Error("Incomplete or changed auditory enrollment roster.");
}
export function validateManifest(manifest: AuditoryCollectorManifest): void {
  if (manifest.version !== "auditory-collector-v1" || !timestamp(manifest.created_at) || !hash(manifest.owner_token_sha256)) throw new Error("Invalid auditory collector manifest.");
  validateRelease(manifest.comparison, manifest.release); validateAuditoryPlan(manifest.comparison, manifest.plan);
  if (manifest.comparison.registration.purpose === "human-study" && !manifest.roster) throw new Error("Human auditory collection requires owner-attested enrollment.");
  if (manifest.roster) validateAuditoryEnrollment(manifest.comparison, manifest.roster);
  const slots = new Set<string>(), tokens = new Set([manifest.owner_token_sha256]);
  for (const entry of manifest.participant_credentials) {
    if (!manifest.comparison.registration.participant_slots.includes(entry.participant_slot) || !hash(entry.token_sha256) || slots.has(entry.participant_slot) || tokens.has(entry.token_sha256)) {
      throw new Error("Invalid or duplicate auditory credential.");
    }
    slots.add(entry.participant_slot); tokens.add(entry.token_sha256);
  }
  const { digest: supplied, ...content } = manifest;
  if (slots.size !== manifest.comparison.registration.participant_slots.length || digest(content) !== supplied) throw new Error("Incomplete or changed auditory collector manifest.");
}
export function createAuditoryCollector(comparison: AuditoryComparison, release: AuditoryRelease, plan: ComparisonPlan, roster: AuditoryEnrollment | null,
  createdAt = new Date().toISOString()): { manifest: AuditoryCollectorManifest; credentials: AuditoryCredentials } {
  const owner = randomBytes(32).toString("hex");
  const participants = comparison.registration.participant_slots.map(participant_slot => ({ participant_slot, token: randomBytes(32).toString("hex") }));
  const content = { version: "auditory-collector-v1" as const, comparison: structuredClone(comparison), release: structuredClone(release), plan: structuredClone(plan),
    roster: structuredClone(roster), created_at: createdAt, owner_token_sha256: tokenHash(owner),
    participant_credentials: participants.map(entry => ({ participant_slot: entry.participant_slot, token_sha256: tokenHash(entry.token) })) };
  const manifest = { ...content, digest: digest(content) }; validateManifest(manifest);
  return { manifest, credentials: { version: "auditory-credentials-v1", manifest_digest: manifest.digest, owner_token: owner, participants } };
}
export function participantFor(manifest: AuditoryCollectorManifest, token: string): string {
  if (!hash(token)) throw new CollectorError("A valid participant link is required.", 401);
  const match = manifest.participant_credentials.find(entry => entry.token_sha256 === tokenHash(token));
  if (!match) throw new CollectorError("A valid participant link is required.", 401);
  return match.participant_slot;
}
export function requireOwner(manifest: AuditoryCollectorManifest, token: string): void {
  if (!hash(token) || tokenHash(token) !== manifest.owner_token_sha256) throw new CollectorError("Owner authentication required.", 401);
}
export function nextAuditory(state: AuditoryCollectorState, participant: string) {
  authenticateManifest(state.manifest);
  if (!state.manifest.comparison.registration.participant_slots.includes(participant)) throw new CollectorError("Unknown participant slot.", 403);
  const sessions = state.manifest.plan.sessions.filter(session => session.participant_slot === participant).sort((a, b) => a.ordinal - b.ordinal);
  const responses = new Set(state.data.responses.map(response => `${response.session_id}/${response.position}`));
  for (const session of sessions) {
    const position = session.item_ids.findIndex((_, index) => !responses.has(`${session.id}/${index}`));
    if (position >= 0) {
      const items = new Map(state.manifest.comparison.items.map(item => [item.id, item]));
      const assets = new Map(state.manifest.release.assets.map(asset => [asset.target_digest, asset]));
      const packet = { session_id: session.id, rubric: structuredClone(AUDITORY_RUBRIC), items: session.item_ids.map((id, position) => ({
        position, item_id: id, audio_sha256: assets.get(items.get(id)!.target.digest)!.audio.sha256, mime_type: "audio/wav" as const,
      })) };
      return { exhausted: false as const, packet, position, playback_complete: playbackComplete(state, session.id, position) };
    }
  }
  return { exhausted: true as const };
}
function playbackComplete(state: AuditoryCollectorState, sessionId: string, position: number): boolean {
  return state.events.some(event => event.kind === "playback-complete" && event.playback.session_id === sessionId && event.playback.position === position);
}
function assignedItem(state: AuditoryCollectorState, participant: string, sessionId: string, position: number) {
  const session = state.manifest.plan.sessions.find(value => value.id === sessionId && value.participant_slot === participant);
  if (!session || !Number.isSafeInteger(position) || position < 0 || !session.item_ids[position]) throw new CollectorError("This item does not belong to your assignment.", 403);
  return { id: session.item_ids[position], session };
}
function currentItem(state: AuditoryCollectorState, participant: string, sessionId: string, position: number) {
  const pending = nextAuditory(state, participant);
  if (pending.exhausted || pending.packet.session_id !== sessionId || pending.position !== position) throw new CollectorError("Please complete the current sound before continuing.", 409);
  return pending.packet.items[position];
}
export function eventEnvelope(state: AuditoryCollectorState, participant: string, receivedAt: string): Omit<AuditoryEventContent, "kind"> {
  if (!timestamp(receivedAt)) throw new Error("Invalid receipt timestamp.");
  return { version: "auditory-event-v1", sequence: state.events.length, previous_sha256: state.events.at(-1)?.sha256 ?? state.manifest.digest,
    participant_slot: participant, received_at: receivedAt };
}
function sealedEvent(content: AuditoryEventContent): AuditoryEvent { return { ...content, sha256: digest(content) }; }
export function deliveryEvent(state: AuditoryCollectorState, participant: string, sessionId: string, position: number, audioHash: string,
  deliveryId: string, receivedAt: string): AuditoryEvent {
  const item = currentItem(state, participant, sessionId, position);
  if (item.audio_sha256 !== audioHash || !hash(deliveryId) || state.events.some(event => event.kind === "audio-delivery" && event.delivery.id === deliveryId)) {
    throw new CollectorError("Invalid audio delivery binding.", 400);
  }
  const delivery: AudioDelivery = { id: deliveryId, session_id: sessionId, position, item_id: item.item_id, audio_sha256: audioHash };
  return sealedEvent({ ...eventEnvelope(state, participant, receivedAt), kind: "audio-delivery", delivery });
}
function exactKeys(value: object, expected: string[]): boolean { return Object.keys(value).sort().join(",") === [...expected].sort().join(","); }
export function parsePlayback(value: unknown): PlaybackSubmission {
  const submission = value as PlaybackSubmission | null;
  if (!submission || typeof submission !== "object" || !exactKeys(submission, ["session_id", "position", "delivery_id", "evidence"]) ||
      !hash(submission.session_id) || !Number.isSafeInteger(submission.position) || submission.position < 0 || !hash(submission.delivery_id) ||
      !submission.evidence || !exactKeys(submission.evidence, ["verified_audio_sha256", "duration_seconds", "played_ranges", "ended"]) ||
      !hash(submission.evidence.verified_audio_sha256) || !Number.isFinite(submission.evidence.duration_seconds) || submission.evidence.duration_seconds <= 0 ||
      submission.evidence.ended !== true || !Array.isArray(submission.evidence.played_ranges) || !submission.evidence.played_ranges.length ||
      submission.evidence.played_ranges.some(range => !Array.isArray(range) || range.length !== 2 || range.some(value => !Number.isFinite(value)) ||
        range[0] < 0 || range[1] < range[0] || range[1] > submission.evidence.duration_seconds + 0.02)) throw new CollectorError("Invalid complete-playback evidence.", 400);
  return structuredClone(submission);
}
export function playbackEvent(state: AuditoryCollectorState, participant: string, submission: PlaybackSubmission, receivedAt: string): AuditoryEvent | null {
  assignedItem(state, participant, submission.session_id, submission.position);
  const previous = state.events.find(event => event.kind === "playback-complete" && event.playback.delivery_id === submission.delivery_id);
  if (previous?.kind === "playback-complete") {
    const { item_id, audio_sha256, ...saved } = previous.playback;
    if (!hash(item_id) || !hash(audio_sha256) || digest(saved) !== digest(submission) || previous.participant_slot !== participant) throw new CollectorError("Playback receipt is immutable.", 409);
    return null;
  }
  const item = currentItem(state, participant, submission.session_id, submission.position);
  const delivery = state.events.find(event => event.kind === "audio-delivery" && event.delivery.id === submission.delivery_id);
  if (delivery?.kind !== "audio-delivery" || delivery.participant_slot !== participant || delivery.delivery.session_id !== submission.session_id ||
      delivery.delivery.position !== submission.position || item.audio_sha256 !== submission.evidence.verified_audio_sha256) throw new CollectorError("Playback must reference your saved audio delivery.", 403);
  const seconds = state.manifest.release.assets.find(asset => asset.audio.sha256 === item.audio_sha256)!.audio.seconds;
  const ranges = [...submission.evidence.played_ranges].sort((a, b) => a[0] - b[0]);
  let through = 0;
  const tolerance = Math.min(0.02, seconds / 100);
  for (const [start, end] of ranges) {
    if (start > through + tolerance) throw new CollectorError("Listen to the entire recording before rating.", 400);
    through = Math.max(through, end);
  }
  if (Math.abs(submission.evidence.duration_seconds - seconds) > tolerance || through < seconds - tolerance) throw new CollectorError("Listen to the entire recording before rating.", 400);
  return sealedEvent({ ...eventEnvelope(state, participant, receivedAt), kind: "playback-complete",
    playback: { ...structuredClone(submission), item_id: item.item_id, audio_sha256: item.audio_sha256 } });
}
export function parseAnswer(value: unknown): AuditoryAnswerSubmission {
  const submission = value as AuditoryAnswerSubmission | null;
  if (!submission || typeof submission !== "object" || !exactKeys(submission, ["session_id", "position", "answer"]) ||
      !hash(submission.session_id) || !Number.isSafeInteger(submission.position) || submission.position < 0 || !submission.answer || typeof submission.answer !== "object" ||
      Object.keys(submission.answer).some(key => !["status", "rating", "familiar", "comment"].includes(key)) || !validAnswer(submission.answer)) throw new CollectorError("Invalid auditory answer submission.", 400);
  return structuredClone(submission);
}
export function answerEvent(state: AuditoryCollectorState, participant: string, submission: AuditoryAnswerSubmission, receivedAt: string): AuditoryEvent | null {
  const assigned = assignedItem(state, participant, submission.session_id, submission.position);
  const previous = state.data.responses.find(response => response.session_id === submission.session_id && response.position === submission.position);
  if (previous) {
    if (digest(previous.answer) !== digest(submission.answer)) throw new CollectorError("An answer was already saved for this position.", 409);
    return null;
  }
  const item = currentItem(state, participant, submission.session_id, submission.position), played = playbackComplete(state, submission.session_id, submission.position);
  if (submission.answer.status === "rated" && !played) throw new CollectorError("Listen to the entire recording before rating.", 409);
  const response = { id: digest([state.manifest.plan.digest, assigned.session.id, submission.position]), session_id: assigned.session.id,
    position: submission.position, item_id: item.item_id, audio_sha256: item.audio_sha256, played_complete: played, answer: structuredClone(submission.answer) };
  return sealedEvent({ ...eventEnvelope(state, participant, receivedAt), kind: "answer", response });
}
export function appendEvent(state: AuditoryCollectorState, event: AuditoryEvent): void {
  state.events.push(structuredClone(event));
  if (event.kind === "answer") state.data.responses.push(structuredClone(event.response));
}
export function restoreAuditoryCollector(manifest: AuditoryCollectorManifest, events: AuditoryEvent[]): AuditoryCollectorState {
  const frozen = structuredClone(manifest); authenticateManifest(frozen);
  const state: AuditoryCollectorState = { manifest: frozen, events: [], data: { version: "auditory-export-v1", comparison: frozen.comparison,
    release: frozen.release, plan: frozen.plan, responses: [] } };
  for (const event of events) {
    let expected: AuditoryEvent | null;
    if (event.kind === "audio-delivery") expected = deliveryEvent(state, event.participant_slot, event.delivery.session_id, event.delivery.position,
      event.delivery.audio_sha256, event.delivery.id, event.received_at);
    else if (event.kind === "playback-complete") {
      const { item_id, audio_sha256, ...submission } = event.playback;
      if (!hash(item_id) || !hash(audio_sha256)) throw new Error("Invalid frozen playback identity.");
      expected = playbackEvent(state, event.participant_slot, parsePlayback(submission), event.received_at);
    } else if (event.kind === "answer") expected = answerEvent(state, event.participant_slot, parseAnswer({ session_id: event.response.session_id,
      position: event.response.position, answer: event.response.answer }), event.received_at);
    else throw new Error("Unsupported auditory event kind.");
    if (!expected || digest(event) !== digest(expected)) throw new Error("Auditory journal changed, duplicated or reordered.");
    appendEvent(state, event);
  }
  return state;
}
