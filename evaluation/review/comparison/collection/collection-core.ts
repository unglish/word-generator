import { createHash, randomBytes } from "node:crypto";
import { validAnswer } from "../../protocol.js";
import { digest } from "../../snapshot.js";
import { reviewerPacket, validatePlan } from "../comparison-allocation.js";
import { validateEnrollment } from "../inference-protocol.js";
import type { ComparisonPlan, WrittenComparison } from "../comparison-model.js";
import type { EnrollmentRoster } from "../inference-model.js";
import type { CollectorCredentials, CollectorEvent, CollectorManifest, CollectorState, CollectorSubmission } from "./collection-model.js";

export class CollectorError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
function hex64(value: unknown): value is string { return typeof value === "string" && /^[a-f0-9]{64}$/.test(value); }
export function tokenHash(token: string): string { return createHash("sha256").update(token).digest("hex"); }
function timestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}
export function createCollector(comparison: WrittenComparison, plan: ComparisonPlan, roster: EnrollmentRoster | null,
  createdAt = new Date().toISOString()): { manifest: CollectorManifest; credentials: CollectorCredentials } {
  validatePlan(comparison, plan);
  if (comparison.registration.purpose === "human-study" && !roster) throw new Error("Human collection requires the owner-attested enrollment roster.");
  if (roster) validateEnrollment(comparison, roster);
  const owner = randomBytes(32).toString("hex");
  const participants = comparison.registration.participant_slots.map(participant_slot => ({ participant_slot, token: randomBytes(32).toString("hex") }));
  const content = { version: "written-collector-v1" as const, comparison: structuredClone(comparison), plan: structuredClone(plan),
    roster: structuredClone(roster), created_at: createdAt, owner_token_sha256: tokenHash(owner),
    participant_credentials: participants.map(entry => ({ participant_slot: entry.participant_slot, token_sha256: tokenHash(entry.token) })) };
  const manifest = { ...content, digest: digest(content) };
  validateCollector(manifest);
  return { manifest, credentials: { version: "written-collector-credentials-v1", manifest_digest: manifest.digest,
    owner_token: owner, participants } };
}
export function validateCollector(manifest: CollectorManifest): void {
  if (manifest.version !== "written-collector-v1" || !timestamp(manifest.created_at) || !hex64(manifest.owner_token_sha256)) throw new Error("Invalid collector manifest.");
  validatePlan(manifest.comparison, manifest.plan);
  if (manifest.comparison.registration.purpose === "human-study" && !manifest.roster) throw new Error("Missing enrollment roster.");
  if (manifest.roster) validateEnrollment(manifest.comparison, manifest.roster);
  const slots = new Set<string>(), hashes = new Set([manifest.owner_token_sha256]);
  for (const entry of manifest.participant_credentials) {
    if (!manifest.comparison.registration.participant_slots.includes(entry.participant_slot) || slots.has(entry.participant_slot) ||
      !hex64(entry.token_sha256) || hashes.has(entry.token_sha256)) throw new Error("Invalid or duplicate participant credential.");
    slots.add(entry.participant_slot); hashes.add(entry.token_sha256);
  }
  if (slots.size !== manifest.comparison.registration.participant_slots.length) throw new Error("Credentials must cover the entire planned roster.");
  const { digest: supplied, ...content } = manifest;
  if (digest(content) !== supplied) throw new Error("Collector manifest changed.");
}
export function authorizeParticipant(manifest: CollectorManifest, token: string): string {
  if (!hex64(token)) throw new CollectorError("A valid participant link is required.", 401);
  const match = manifest.participant_credentials.find(entry => entry.token_sha256 === tokenHash(token));
  if (!match) throw new CollectorError("A valid participant link is required.", 401);
  return match.participant_slot;
}
export function authorizeOwner(manifest: CollectorManifest, token: string): void {
  if (!hex64(token) || tokenHash(token) !== manifest.owner_token_sha256) throw new CollectorError("Owner authentication required.", 401);
}
function assignedSessions(state: CollectorState, participant: string) {
  if (!state.manifest.comparison.registration.participant_slots.includes(participant)) throw new CollectorError("Unknown participant slot.", 403);
  return state.manifest.plan.sessions.filter(session => session.participant_slot === participant).sort((a, b) => a.ordinal - b.ordinal);
}
export function nextAssignment(state: CollectorState, participant: string) {
  const responses = new Map(state.data.responses.map(response => [`${response.session_id}:${response.position}`, response]));
  for (const session of assignedSessions(state, participant)) {
    const position = session.item_ids.findIndex((_, index) => !responses.has(`${session.id}:${index}`));
    if (position >= 0) return { exhausted: false as const, packet: reviewerPacket(state.manifest.comparison, state.manifest.plan, session.id), position };
  }
  return { exhausted: true as const };
}
export function parseSubmission(value: unknown): CollectorSubmission {
  if (!value || typeof value !== "object") throw new CollectorError("Invalid answer submission.", 400);
  const submission = value as CollectorSubmission;
  const keys = Object.keys(value).sort();
  if (JSON.stringify(keys) !== JSON.stringify(["answer", "position", "session_id"]) || typeof submission.session_id !== "string" ||
    !Number.isSafeInteger(submission.position) || submission.position < 0 || !submission.answer || typeof submission.answer !== "object" ||
    Object.keys(submission.answer).some(key => !["status", "rating", "familiar", "comment"].includes(key)) || !validAnswer(submission.answer)) {
    throw new CollectorError("Invalid answer submission.", 400);
  }
  return structuredClone(submission);
}
export function responseForSubmission(state: CollectorState, participant: string, submission: CollectorSubmission) {
  const session = assignedSessions(state, participant).find(value => value.id === submission.session_id);
  if (!session || !session.item_ids[submission.position]) throw new CollectorError("This answer does not belong to your assignment.", 403);
  const existing = state.data.responses.find(response => response.session_id === submission.session_id && response.position === submission.position);
  if (existing) {
    if (digest(existing.answer) !== digest(submission.answer)) throw new CollectorError("An answer was already saved for this position.", 409);
    return { response: existing, duplicate: true };
  }
  const pending = nextAssignment(state, participant);
  if (pending.exhausted || pending.packet.session_id !== submission.session_id || pending.position !== submission.position) {
    throw new CollectorError("Please answer the current word before continuing.", 409);
  }
  return { response: { id: digest([state.manifest.plan.digest, session.id, submission.position]), session_id: session.id,
    position: submission.position, item_id: session.item_ids[submission.position], answer: structuredClone(submission.answer) }, duplicate: false };
}
export function eventForSubmission(state: CollectorState, participant: string, submission: CollectorSubmission, receivedAt: string): CollectorEvent | null {
  if (!timestamp(receivedAt)) throw new Error("Invalid receipt timestamp.");
  const result = responseForSubmission(state, participant, submission);
  if (result.duplicate) return null;
  const content = { version: "written-response-event-v1" as const, sequence: state.events.length,
    previous_sha256: state.events.at(-1)?.sha256 ?? state.manifest.digest,
    participant_slot: participant, received_at: receivedAt, response: result.response };
  return { ...content, sha256: digest(content) };
}
export function restoreCollector(manifest: CollectorManifest, events: CollectorEvent[]): CollectorState {
  validateCollector(manifest);
  const state: CollectorState = { manifest, events: [], data: { version: "written-comparison-export-v1", comparison: manifest.comparison, plan: manifest.plan, responses: [] } };
  for (const event of events) {
    const submission = parseSubmission({ session_id: event.response.session_id, position: event.response.position, answer: event.response.answer });
    const expected = eventForSubmission(state, event.participant_slot, submission, event.received_at);
    if (!expected || digest(event) !== digest(expected)) throw new Error("Collector journal changed, duplicated, or reordered.");
    state.events.push(structuredClone(event)); state.data.responses.push(structuredClone(event.response));
  }
  return state;
}
