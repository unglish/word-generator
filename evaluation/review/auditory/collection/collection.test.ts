import { describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { appendFile, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Server } from "node:http";
import { comparison, materials } from "../auditory.fixture.js";
import { allocateAuditory } from "../allocation.js";
import { auditoryPacket } from "../allocation.js";
import { bytesHash, freezeRelease } from "../audio.js";
import { buildAuditoryReport } from "../report.js";
import { digest } from "../../snapshot.js";
import { answerEvent, appendEvent, createAuditoryCollector, deliveryEvent, nextAuditory, parseAnswer, parsePlayback, participantFor,
  playbackEvent, requireOwner, restoreAuditoryCollector, validateAuditoryEnrollment } from "./core.js";
import { AuditoryJournal, initializeAuditoryCollector, parseAuditoryJournal, recoverAuditoryCollector } from "./journal.js";
import type { AuditoryCollectorState, AuditoryEnrollment, AuditoryEvent, PlaybackSubmission } from "./model.js";
import { createAuditoryServer } from "./server.js";

function fixture() {
  const frozen = comparison(), files = materials(frozen, 2), release = freezeRelease(frozen, files), plan = allocateAuditory(frozen);
  const collection = createAuditoryCollector(frozen, release, plan, null, "2026-10-03T00:00:00.000Z");
  return { ...collection, files, state: restoreAuditoryCollector(collection.manifest, []), participant: frozen.registration.participant_slots[0] };
}
function current(state: AuditoryCollectorState, participant: string) {
  const pending = nextAuditory(state, participant); if (pending.exhausted) throw new Error("Fixture slot exhausted."); return pending;
}
function servedEvent(state: AuditoryCollectorState, participant: string, id = digest(`delivery-${state.events.length}`)) {
  const pending = current(state, participant), item = pending.packet.items[pending.position];
  return deliveryEvent(state, participant, pending.packet.session_id, pending.position, item.audio_sha256, id, "2026-10-03T00:00:00.000Z");
}
function playback(state: AuditoryCollectorState, participant: string, event: AuditoryEvent): PlaybackSubmission {
  if (event.kind !== "audio-delivery") throw new Error("Expected fixture delivery.");
  const seconds = state.manifest.release.assets.find(asset => asset.audio.sha256 === event.delivery.audio_sha256)!.audio.seconds;
  expect(event.participant_slot).toBe(participant);
  return { session_id: event.delivery.session_id, position: event.delivery.position, delivery_id: event.delivery.id,
    evidence: { verified_audio_sha256: event.delivery.audio_sha256, duration_seconds: seconds, played_ranges: [[0, seconds]], ended: true } };
}
function savePlayback(state: AuditoryCollectorState, participant: string) {
  const delivery = servedEvent(state, participant); appendEvent(state, delivery);
  const submission = playback(state, participant, delivery), event = playbackEvent(state, participant, submission, "2026-10-03T00:00:01.000Z")!;
  appendEvent(state, event); return { delivery, submission, event };
}
function answer(state: AuditoryCollectorState, participant: string, skip = false) {
  const pending = current(state, participant);
  return { session_id: pending.packet.session_id, position: pending.position,
    answer: skip ? { status: "skipped" as const, rating: null, familiar: null } : { status: "rated" as const, rating: 4, familiar: false } };
}
async function initialized() {
  const data = fixture(), parent = await mkdtemp(join(tmpdir(), "q22-journal-fixture-")), directory = join(parent, "collection");
  await initializeAuditoryCollector(directory, data.manifest, data.credentials, data.files); return { ...data, directory };
}

describe("auditory delivery, playback and response protocol", () => {
  it("authenticates and freezes source/plan state once while returning isolated equivalent packets", () => {
    const { state, participant, manifest } = fixture(), pending = current(state, participant);
    expect(pending.packet).toEqual(auditoryPacket(state.manifest.comparison, state.manifest.release, state.manifest.plan, pending.packet.session_id));
    pending.packet.items[0].audio_sha256 = digest("changed public packet");
    expect(current(state, participant).packet.items[0].audio_sha256).not.toBe(pending.packet.items[0].audio_sha256);
    expect(() => { state.manifest.release.assets[0].audio.sha256 = digest("changed frozen metadata"); }).toThrow();
    manifest.comparison.registration.population = "Changed caller-owned copy";
    expect(state.manifest.comparison.registration.population).not.toBe(manifest.comparison.registration.population);
  });
  it("refuses an unvalidated changed snapshot before using cached packet construction", () => {
    const { state, participant } = fixture(), changed = structuredClone(state);
    changed.manifest.plan.sessions[0].item_ids.reverse();
    expect(() => current(changed, participant)).toThrow("allocation changed");
  });
  it("freezes mutable descendants even when a supplied snapshot's manifest root is already frozen", () => {
    const { state, participant } = fixture(), partial = structuredClone(state); Object.freeze(partial.manifest);
    current(partial, participant);
    expect(() => { partial.manifest.release.assets[0].audio.sha256 = digest("changed descendant"); }).toThrow();
  });
  it("requires a persisted complete-playback event before rating and permits explicit unplayed skips", () => {
    const { state, participant } = fixture();
    expect(() => answerEvent(state, participant, answer(state, participant), "2026-10-03T00:00:00.000Z")).toThrow("entire recording");
    const event = answerEvent(state, participant, answer(state, participant, true), "2026-10-03T00:00:00.000Z")!;
    expect(event.kind).toBe("answer"); if (event.kind === "answer") expect(event.response.played_complete).toBe(false);
    appendEvent(state, event); expect(state.data.responses).toHaveLength(1);
  });
  it("binds complete playback to the exact saved delivery and assigned item", () => {
    const { state, participant } = fixture(), delivery = servedEvent(state, participant); appendEvent(state, delivery);
    const value = playback(state, participant, delivery);
    const missing = structuredClone(value); missing.delivery_id = digest("nonexistent");
    expect(() => playbackEvent(state, participant, missing, "2026-10-03T00:00:01.000Z")).toThrow("saved audio");
    const wrongHash = structuredClone(value); wrongHash.evidence.verified_audio_sha256 = digest("wrong audio");
    expect(() => playbackEvent(state, participant, wrongHash, "2026-10-03T00:00:01.000Z")).toThrow("saved audio");
    expect(() => playbackEvent(state, "p2", value, "2026-10-03T00:00:01.000Z")).toThrow("assignment");
    const event = playbackEvent(state, participant, value, "2026-10-03T00:00:01.000Z")!; appendEvent(state, event);
    expect(current(state, participant).playback_complete).toBe(true);
    const rated = answerEvent(state, participant, answer(state, participant), "2026-10-03T00:00:02.000Z")!;
    if (rated.kind === "answer") expect(rated.response.played_complete).toBe(true);
  });
  it("rejects incomplete ranges, gaps, incorrect durations and fabricated played-complete fields", () => {
    const { state, participant } = fixture(), delivery = servedEvent(state, participant); appendEvent(state, delivery);
    const value = playback(state, participant, delivery), seconds = value.evidence.duration_seconds;
    for (const ranges of [[[0, seconds / 2]], [[seconds / 2, seconds]], [[0, seconds / 3], [2 * seconds / 3, seconds]]] as [number, number][][]) {
      const changed = structuredClone(value); changed.evidence.played_ranges = ranges;
      expect(() => playbackEvent(state, participant, parsePlayback(changed), "2026-10-03T00:00:01.000Z")).toThrow("entire recording");
    }
    const changed = structuredClone(value); changed.evidence.duration_seconds *= 2;
    expect(() => playbackEvent(state, participant, changed, "2026-10-03T00:00:01.000Z")).toThrow("entire recording");
    expect(() => parseAnswer({ ...answer(state, participant), played_complete: true })).toThrow("Invalid");
  });
  it("confirms immutable retries even after the participant has advanced", () => {
    const { state, participant } = fixture(), played = savePlayback(state, participant), submitted = answer(state, participant);
    appendEvent(state, answerEvent(state, participant, submitted, "2026-10-03T00:00:02.000Z")!);
    expect(playbackEvent(state, participant, played.submission, "2026-10-03T00:00:03.000Z")).toBeNull();
    expect(answerEvent(state, participant, submitted, "2026-10-03T00:00:03.000Z")).toBeNull();
    const changed = structuredClone(submitted); if (changed.answer.status === "rated") changed.answer.rating = 1;
    expect(() => answerEvent(state, participant, changed, "2026-10-03T00:00:03.000Z")).toThrow("already saved");
    const altered = structuredClone(played.submission); altered.evidence.played_ranges[0][0] = 0.00001;
    expect(() => playbackEvent(state, participant, altered, "2026-10-03T00:00:03.000Z")).toThrow("immutable");
  });
  it("retains repeated deliveries and playback attempts, restores the exact receipt chain and descriptive export", () => {
    const { state, participant } = fixture();
    appendEvent(state, servedEvent(state, participant)); savePlayback(state, participant);
    appendEvent(state, answerEvent(state, participant, answer(state, participant), "2026-10-03T00:00:02.000Z")!);
    appendEvent(state, answerEvent(state, participant, answer(state, participant, true), "2026-10-03T00:00:03.000Z")!);
    const restored = restoreAuditoryCollector(state.manifest, state.events);
    expect(restored).toEqual(state); expect(nextAuditory(restored, participant)).toEqual({ exhausted: true });
    expect(restored.events.map(event => event.kind)).toEqual(["audio-delivery", "audio-delivery", "playback-complete", "answer", "answer"]);
    expect(buildAuditoryReport(restored.data).groups.filter(row => row.stratum === null).reduce((sum, row) => sum + row.received_responses, 0)).toBe(2);
  });
  it("rejects altered, reordered and duplicated journals even when the event is resealed", () => {
    const { state, participant } = fixture(); savePlayback(state, participant);
    appendEvent(state, answerEvent(state, participant, answer(state, participant), "2026-10-03T00:00:02.000Z")!);
    for (const events of [[...state.events].reverse(), [...state.events, state.events.at(-1)!]]) expect(() => restoreAuditoryCollector(state.manifest, events)).toThrow();
    const events = structuredClone(state.events), event = events[2];
    if (event.kind !== "answer") throw new Error("Expected answer."); event.response.played_complete = false;
    const { sha256: previous, ...content } = event; expect(previous).not.toBe(digest(content)); event.sha256 = digest(content);
    expect(() => restoreAuditoryCollector(state.manifest, events)).toThrow("changed");
  });
  it("rejects future positions and another slot's credentials and keeps owner export credentials separate", () => {
    const { state, participant, credentials } = fixture(), pending = current(state, participant);
    expect(() => deliveryEvent(state, participant, pending.packet.session_id, 1, pending.packet.items[1].audio_sha256, digest("future"), "2026-10-03T00:00:00.000Z")).toThrow("current");
    expect(participantFor(state.manifest, credentials.participants[0].token)).toBe(participant);
    expect(() => participantFor(state.manifest, credentials.owner_token)).toThrow("participant");
    expect(() => requireOwner(state.manifest, credentials.participants[0].token)).toThrow("Owner");
  });
  it("validates enrollment as owner attestation rather than treating slots or keys as verified people", () => {
    const { manifest } = fixture(), content = { version: "auditory-enrollment-v1" as const, comparison_digest: manifest.comparison.digest,
      verification_method: "Synthetic roster fixture; not verified people.", entries: manifest.comparison.registration.participant_slots.map(slot => ({
        participant_slot: slot, person_key: digest(`synthetic-person-${slot}`), verification_record_sha256: digest(`synthetic-record-${slot}`) })) };
    const roster: AuditoryEnrollment = { ...content, digest: digest(content) }; validateAuditoryEnrollment(manifest.comparison, roster);
    roster.entries[1].person_key = roster.entries[0].person_key;
    expect(() => validateAuditoryEnrollment(manifest.comparison, roster)).toThrow("unique");
  });
});

describe("durable private auditory journal", () => {
  it("preserves an inspected stopped-writer lease and entire interrupted journal before exact prefix recovery", async () => {
    const data = await initialized(), journal = await AuditoryJournal.openWriter(data.directory);
    const participant = journal.participant(data.credentials.participants[0].token), pending = current(journal.snapshot(), participant);
    await journal.audio(participant, pending.packet.items[0].audio_sha256); const originalState = journal.snapshot(); await journal.close();
    const stopped = spawn(process.execPath, ["-e", "process.exit(0)"], { stdio: "ignore" });
    const [exitCode] = await once(stopped, "exit"); expect(exitCode).toBe(0);
    const lease = Buffer.from(JSON.stringify({ pid: stopped.pid, created_at: "2026-10-03T00:00:00.000Z" }) + "\n");
    await writeFile(join(data.directory, "writer.lock"), lease); await appendFile(join(data.directory, "events.jsonl"), "{\"interrupted\":");
    const raw = await readFile(join(data.directory, "events.jsonl"));
    await expect(recoverAuditoryCollector(data.directory, bytesHash(lease), digest("wrong journal"))).rejects.toThrow("hashes");
    const recovered = await recoverAuditoryCollector(data.directory, bytesHash(lease), bytesHash(raw));
    expect(await readFile(join(recovered.backup, "writer.lock"))).toEqual(lease);
    expect(await readFile(join(recovered.backup, "events.jsonl"))).toEqual(raw);
    expect(recovered.report.retained_events).toBe(1); expect(recovered.report.interrupted_tail_bytes).toBe(Buffer.byteLength("{\"interrupted\":"));
    const restored = await AuditoryJournal.openWriter(data.directory);
    try { expect(restored.snapshot()).toEqual(originalState); } finally { await restored.close(); }
  });
  it("refuses recovery while the inspected writer PID remains live", async () => {
    const { directory } = await initialized(), journal = await AuditoryJournal.openWriter(directory);
    try {
      const lease = await readFile(join(directory, "writer.lock")), raw = await readFile(join(directory, "events.jsonl"));
      await expect(recoverAuditoryCollector(directory, bytesHash(lease), bytesHash(raw))).rejects.toThrow("still live");
      expect(await readFile(join(directory, "writer.lock"))).toEqual(lease); expect(await readFile(join(directory, "events.jsonl"))).toEqual(raw);
    } finally { await journal.close(); }
  });
  it("fsyncs delivery/playback/answer events, survives restart and serializes duplicate submissions", async () => {
    const { directory, credentials } = await initialized(), journal = await AuditoryJournal.openWriter(directory);
    try {
      const participant = journal.participant(credentials.participants[0].token), pending = current(journal.snapshot(), participant);
      const served = await journal.audio(participant, pending.packet.items[0].audio_sha256);
      expect(bytesHash(served.bytes)).toBe(pending.packet.items[0].audio_sha256);
      const event = journal.snapshot().events[0], played = playback(journal.snapshot(), participant, event);
      const results = await Promise.all([journal.playback(participant, played), journal.playback(participant, played)]);
      expect(results.map(result => result.duplicate)).toEqual([false, true]);
      await journal.answer(participant, answer(journal.snapshot(), participant));
      const loaded = await AuditoryJournal.load(directory); expect(loaded.snapshot()).toEqual(journal.snapshot());
      expect(parseAuditoryJournal(await readFile(join(directory, "events.jsonl"), "utf8"))).toHaveLength(3);
      expect((await stat(join(directory, "events.jsonl"))).mode & 0o777).toBe(0o600);
      expect((await stat(join(directory, "assets"))).mode & 0o777).toBe(0o700);
      expect(() => journal.owner(credentials.participants[0].token)).toThrow();
    } finally { await journal.close(); }
    const reopened = await AuditoryJournal.openWriter(directory); await reopened.close();
  });
  it("refuses another writer, initialization overwrite, interrupted tail and changed material bytes", async () => {
    const data = await initialized(), journal = await AuditoryJournal.openWriter(data.directory);
    try {
      await expect(AuditoryJournal.openWriter(data.directory)).rejects.toThrow("EEXIST");
      await expect(initializeAuditoryCollector(data.directory, data.manifest, data.credentials, data.files)).rejects.toThrow("EEXIST");
    } finally { await journal.close(); }
    await appendFile(join(data.directory, "events.jsonl"), "{\"interrupted\":");
    await expect(AuditoryJournal.load(data.directory)).rejects.toThrow("Interrupted");
    expect(() => parseAuditoryJournal("{}\n\n")).toThrow();
    await writeFile(join(data.directory, "events.jsonl"), "");
    const asset = data.manifest.release.assets[0], file = join(data.directory, "assets", `${asset.audio.sha256}.wav`);
    const changed = await readFile(file); changed[50] ^= 1; await writeFile(file, changed);
    await expect(AuditoryJournal.load(data.directory)).rejects.toThrow("does not bind");
  });
  it("hash-checks every served asset and poisons writes after changed audio", async () => {
    const { directory, credentials } = await initialized(), journal = await AuditoryJournal.openWriter(directory);
    try {
      const participant = journal.participant(credentials.participants[0].token), pending = current(journal.snapshot(), participant), audioHash = pending.packet.items[0].audio_sha256;
      const file = join(directory, "assets", `${audioHash}.wav`), changed = await readFile(file); changed[50] ^= 1; await writeFile(file, changed);
      await expect(journal.audio(participant, audioHash)).rejects.toThrow("bytes changed");
      await expect(journal.answer(participant, answer(journal.snapshot(), participant, true))).rejects.toThrow("recovery");
      expect(journal.snapshot().events).toHaveLength(0);
    } finally { await journal.close(); }
  });
});

async function listen(server: Server): Promise<string> {
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); if (!address || typeof address === "string") throw new Error("No loopback address."); return `http://127.0.0.1:${address.port}`;
}
async function close(server: Server): Promise<void> { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
describe("actual authenticated auditory routes", () => {
  it("serves audio-only packets and exact current bytes, then durably saves playback and rating", async () => {
    const { directory, credentials } = await initialized(), journal = await AuditoryJournal.openWriter(directory), server = createAuditoryServer(journal), url = await listen(server);
    const participantHeaders = { Authorization: `Bearer ${credentials.participants[0].token}` };
    try {
      expect((await fetch(`${url}/api/next`)).status).toBe(401);
      const root = await fetch(url); expect(root.headers.get("content-security-policy")).toContain("media-src blob:");
      expect(await root.text()).toContain("Word sound review");
      const next = await (await fetch(`${url}/api/next`, { headers: participantHeaders })).json();
      expect(Object.keys(next.packet.items[0]).sort()).toEqual(["audio_sha256", "item_id", "mime_type", "position"]);
      const future = await fetch(`${url}/api/audio/${next.packet.items[1].audio_sha256}`, { headers: participantHeaders }); expect(future.status).toBe(403);
      const response = await fetch(`${url}/api/audio/${next.packet.items[0].audio_sha256}`, { headers: participantHeaders });
      expect(response.status).toBe(200); expect(response.headers.get("content-type")).toBe("audio/wav");
      const bytes = new Uint8Array(await response.arrayBuffer()); expect(bytesHash(bytes)).toBe(next.packet.items[0].audio_sha256);
      const submission = playback(journal.snapshot(), journal.participant(credentials.participants[0].token), journal.snapshot().events[0]);
      expect(submission.delivery_id).toBe(response.headers.get("x-auditory-delivery"));
      const post = (path: string, value: unknown) => fetch(`${url}${path}`, { method: "POST", headers: { ...participantHeaders, "Content-Type": "application/json" }, body: JSON.stringify(value) });
      expect((await post("/api/answer", answer(journal.snapshot(), journal.participant(credentials.participants[0].token)))).status).toBe(409);
      expect((await post("/api/playback", submission)).status).toBe(200);
      expect((await post("/api/answer", answer(journal.snapshot(), journal.participant(credentials.participants[0].token)))).status).toBe(200);
      expect((await fetch(`${url}/api/export`, { headers: participantHeaders })).status).toBe(401);
      const exported = await (await fetch(`${url}/api/export`, { headers: { Authorization: `Bearer ${credentials.owner_token}` } })).json();
      expect(exported.responses).toHaveLength(1); expect(exported.responses[0].played_complete).toBe(true);
      expect(journal.snapshot().events.map(event => event.kind)).toEqual(["audio-delivery", "playback-complete", "answer"]);
    } finally { await close(server); await journal.close(); }
  });
});
