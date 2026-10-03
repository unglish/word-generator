import { randomBytes } from "node:crypto";
import { constants } from "node:fs";
import { link, mkdir, open, readFile, readdir, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { bytesHash } from "../../auditory/audio.js";
import { digest } from "../../snapshot.js";
import { freezeReading, verifyReading } from "../readings.js";
import type { Reading } from "../model.js";
import { appendEvent, intentEvent, nextReadAloud, parseFailure, parsePresentation, participantFor, presentationEvent,
  presentationFor, readingEvent, readingFor, requireOwner, restoreReadAloudCollector } from "./core.js";
import type { ReadAloudCollectorManifest, ReadAloudCollectorState, ReadAloudCredentials, ReadAloudEvent } from "./model.js";

async function syncDirectory(directory: string): Promise<void> {
  const handle = await open(directory, "r"); try { await handle.sync(); } finally { await handle.close(); }
}
async function privateFile(file: string, content: string | Uint8Array): Promise<void> {
  const handle = await open(file, "wx", 0o600); try { await handle.writeFile(content); await handle.sync(); } finally { await handle.close(); }
}
function validateCredentials(manifest: ReadAloudCollectorManifest, credentials: ReadAloudCredentials): void {
  if (credentials.version !== "read-aloud-credentials-v1" || credentials.manifest_digest !== manifest.digest ||
      credentials.participants.length !== manifest.participant_credentials.length ||
      new Set(credentials.participants.map(entry => entry.participant_slot)).size !== credentials.participants.length) {
    throw new Error("Read-aloud credentials do not bind every registered reader.");
  }
  requireOwner(manifest, credentials.owner_token);
  for (const entry of credentials.participants) if (participantFor(manifest, entry.token) !== entry.participant_slot) throw new Error("Credential belongs to another reader.");
}
export async function initializeReadAloudCollector(directory: string, manifest: ReadAloudCollectorManifest, credentials: ReadAloudCredentials): Promise<void> {
  restoreReadAloudCollector(manifest, []); validateCredentials(manifest, credentials);
  await mkdir(directory, { mode: 0o700 });
  for (const name of ["recordings", "incoming"]) await mkdir(resolve(directory, name), { mode: 0o700 });
  const manifestBytes = Buffer.from(JSON.stringify(manifest) + "\n"), credentialBytes = Buffer.from(JSON.stringify(credentials) + "\n");
  await privateFile(resolve(directory, "manifest.json"), manifestBytes); await privateFile(resolve(directory, "credentials.json"), credentialBytes);
  await privateFile(resolve(directory, "events.jsonl"), "");
  for (const name of ["recordings", "incoming"]) await syncDirectory(resolve(directory, name));
  await syncDirectory(directory); await syncDirectory(dirname(resolve(directory)));
  await privateFile(resolve(directory, "complete.json"), JSON.stringify({ version: "read-aloud-store-v1", manifest_digest: manifest.digest,
    manifest_sha256: bytesHash(manifestBytes), credentials_sha256: bytesHash(credentialBytes) }) + "\n");
  await syncDirectory(directory);
}
export function parseReadAloudJournal(text: string): ReadAloudEvent[] {
  if (text && !text.endsWith("\n")) throw new Error("Interrupted read-aloud journal; inspect and preserve it before owner recovery.");
  return text ? text.slice(0, -1).split("\n").map(line => JSON.parse(line) as ReadAloudEvent) : [];
}
async function loadManifest(directory: string): Promise<ReadAloudCollectorManifest> {
  const marker = JSON.parse(await readFile(resolve(directory, "complete.json"), "utf8"));
  const manifestBytes = await readFile(resolve(directory, "manifest.json")), credentialBytes = await readFile(resolve(directory, "credentials.json"));
  const manifest = JSON.parse(manifestBytes.toString("utf8")) as ReadAloudCollectorManifest;
  if (marker.version !== "read-aloud-store-v1" || marker.manifest_digest !== manifest.digest ||
      marker.manifest_sha256 !== bytesHash(manifestBytes) || marker.credentials_sha256 !== bytesHash(credentialBytes)) throw new Error("Incomplete or changed read-aloud storage initialization.");
  validateCredentials(manifest, JSON.parse(credentialBytes.toString("utf8")) as ReadAloudCredentials);
  return manifest;
}
async function verifyRecordedMaterials(directory: string, state: ReadAloudCollectorState): Promise<void> {
  for (const reading of state.data.readings) {
    const wav = reading.outcome.status === "recorded" ? await readFile(resolve(directory, "recordings", reading.outcome.audio.sha256 + ".wav")) : undefined;
    verifyReading(state.manifest.comparison, state.manifest.plan, state.manifest.roster, reading, wav);
  }
  for (const event of state.events) {
    if (event.kind !== "recording-intent") continue;
    try {
      const wav = await readFile(resolve(directory, "recordings", event.audio.sha256 + ".wav"));
      if (bytesHash(wav) !== event.audio.sha256) throw new Error("Committed recording bytes changed.");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      if (readingFor(state, event.attempt_id)?.reading.outcome.status === "recorded") throw error;
    }
  }
}
export class ReadAloudJournal {
  private queue: Promise<void> = Promise.resolve();
  private writable = false;
  private poisoned = false;
  private closed = false;
  private constructor(readonly directory: string, private state: ReadAloudCollectorState) {}
  static async load(directory: string): Promise<ReadAloudJournal> {
    const manifest = await loadManifest(directory);
    const state = restoreReadAloudCollector(manifest, parseReadAloudJournal(await readFile(resolve(directory, "events.jsonl"), "utf8")));
    await verifyRecordedMaterials(directory, state); return new ReadAloudJournal(directory, state);
  }
  static async openWriter(directory: string): Promise<ReadAloudJournal> {
    const lease = await open(resolve(directory, "writer.lock"), "wx", 0o600);
    try {
      try { await readFile(resolve(directory, "recovery.lock")); throw new Error("Owner recovery is active."); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
      await lease.writeFile(JSON.stringify({ pid: process.pid, created_at: new Date().toISOString() }) + "\n"); await lease.sync(); await syncDirectory(directory);
      const journal = await ReadAloudJournal.load(directory); journal.writable = true; return journal;
    } catch (error) { await unlink(resolve(directory, "writer.lock")); await syncDirectory(directory); throw error; }
    finally { await lease.close(); }
  }
  snapshot(): ReadAloudCollectorState { return structuredClone(this.state); }
  participant(token: string): string { return participantFor(this.state.manifest, token); }
  owner(token: string): void { requireOwner(this.state.manifest, token); }
  next(participant: string) { return nextReadAloud(this.state, participant); }
  async present(participant: string, value: unknown) {
    const submission = parsePresentation(value);
    return this.serialize(async () => {
      const event = presentationEvent(this.state, participant, submission, new Date().toISOString());
      if (event) await this.persist(event);
      const saved = this.state.events.find(value => value.kind === "presentation" && value.presentation.request_id === submission.request_id)!;
      if (saved.kind !== "presentation") throw new Error("Presentation receipt missing.");
      const spelling = this.state.manifest.comparison.partition.items.find(item => item.id === saved.presentation.item_id)!.spelling;
      return { saved: true as const, duplicate: !event, attempt_id: saved.presentation.attempt_id,
        session_id: saved.presentation.session_id, position: saved.presentation.position, item_id: saved.presentation.item_id, spelling };
    });
  }
  private frozenReading(participant: string, attemptId: string, input: { status: "recorded"; wav: Uint8Array } | { status: "skipped" | "recording-failed"; reason: string }): Reading {
    const presentation = presentationFor(this.state, participant, attemptId);
    const person = this.state.manifest.roster.entries.find(value => value.participant_slot === participant)!;
    return freezeReading(this.state.manifest.comparison, this.state.manifest.plan, this.state.manifest.roster, {
      session_id: presentation.session_id, position: presentation.position, item_id: presentation.item_id, person_key: person.person_key, first_attempt: true,
    }, input);
  }
  async record(participant: string, attemptId: string, bytes: Uint8Array) {
    const wav = Buffer.from(bytes);
    return this.serialize(async () => {
      const reading = this.frozenReading(participant, attemptId, { status: "recorded", wav });
      if (reading.outcome.status !== "recorded") throw new Error("Recorded outcome missing.");
      const previous = readingFor(this.state, attemptId);
      if (previous) {
        readingEvent(this.state, participant, attemptId, reading, new Date().toISOString());
        try { await this.verifyWavFile(resolve(this.directory, "recordings", reading.outcome.audio.sha256 + ".wav"), wav); }
        catch (error) { this.poisoned = true; throw error; }
        return { saved: true as const, duplicate: true, reading: structuredClone(previous.reading) };
      }
      const intent = intentEvent(this.state, participant, attemptId, reading, new Date().toISOString());
      if (intent) await this.persist(intent);
      try { await this.saveWav(attemptId, reading.outcome.audio.sha256, wav); }
      catch (error) { this.poisoned = true; throw error; }
      const event = readingEvent(this.state, participant, attemptId, reading, new Date().toISOString());
      if (!event) throw new Error("New reading receipt missing.");
      await this.persist(event);
      return { saved: true as const, duplicate: false, reading: structuredClone(reading) };
    });
  }
  async fail(participant: string, value: unknown) {
    const submission = parseFailure(value);
    return this.serialize(async () => {
      const reading = this.frozenReading(participant, submission.attempt_id, submission);
      const event = readingEvent(this.state, participant, submission.attempt_id, reading, new Date().toISOString());
      if (event) await this.persist(event);
      return { saved: true as const, duplicate: !event, reading: structuredClone(reading) };
    });
  }
  async materialInventory() {
    const inventory: { directory: string; file: string; bytes: number; sha256: string }[] = [];
    for (const directory of ["recordings", "incoming"]) {
      for (const file of (await readdir(resolve(this.directory, directory))).sort()) {
        const bytes = await readFile(resolve(this.directory, directory, file));
        inventory.push({ directory, file, bytes: bytes.length, sha256: bytesHash(bytes) });
      }
    }
    return inventory;
  }
  private async saveWav(attemptId: string, audioHash: string, wav: Buffer): Promise<void> {
    const destination = resolve(this.directory, "recordings", audioHash + ".wav");
    try {
      await this.verifyWavFile(destination, wav);
      return;
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    const incoming = resolve(this.directory, "incoming", `${attemptId}-${audioHash}-${randomBytes(8).toString("hex")}.wav`);
    await privateFile(incoming, wav); await syncDirectory(resolve(this.directory, "incoming"));
    try { await link(incoming, destination); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST" || !(await readFile(destination)).equals(wav)) throw error;
    }
    await syncDirectory(resolve(this.directory, "recordings"));
  }
  private async verifyWavFile(file: string, wav: Buffer): Promise<void> {
    const handle = await open(file, "r");
    try {
      if (!(await handle.readFile()).equals(wav)) throw new Error("Stored recording bytes changed.");
      await handle.sync();
    } finally { await handle.close(); }
    await syncDirectory(dirname(file));
  }
  private serialize<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.writable || this.closed) return Promise.reject(new Error("An active exclusive read-aloud writer is required."));
    const task = this.queue.then(async () => {
      if (this.poisoned) throw new Error("Read-aloud storage needs inspection before more events can be saved.");
      return operation();
    });
    this.queue = task.then(() => undefined, () => undefined); return task;
  }
  private async persist(event: ReadAloudEvent): Promise<void> {
    try {
      const handle = await open(resolve(this.directory, "events.jsonl"), constants.O_APPEND | constants.O_WRONLY);
      try { await handle.writeFile(JSON.stringify(event) + "\n"); await handle.sync(); } finally { await handle.close(); }
    } catch (error) { this.poisoned = true; throw error; }
    appendEvent(this.state, event);
  }
  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true; await this.queue;
    if (this.writable) { await unlink(resolve(this.directory, "writer.lock")); await syncDirectory(this.directory); this.writable = false; }
  }
}

export async function recoverReadAloudCollector(directory: string, expectedLeaseHash: string, expectedJournalHash: string) {
  const leaseFile = resolve(directory, "writer.lock"), journalFile = resolve(directory, "events.jsonl"), recoveryFile = resolve(directory, "recovery.lock");
  const lease = await readFile(leaseFile), raw = await readFile(journalFile);
  if (bytesHash(lease) !== expectedLeaseHash || bytesHash(raw) !== expectedJournalHash) throw new Error("Recovery hashes do not match the inspected lease and journal.");
  const savedLease = JSON.parse(lease.toString("utf8"));
  if (!Number.isSafeInteger(savedLease.pid) || savedLease.pid < 1) throw new Error("Invalid writer PID; cannot establish that it is stopped.");
  try { process.kill(savedLease.pid, 0); throw new Error("Writer PID is still live; recovery refused."); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error; }
  const recovery = await open(recoveryFile, "wx", 0o600);
  try {
    await recovery.writeFile(JSON.stringify({ pid: process.pid, created_at: new Date().toISOString() }) + "\n"); await recovery.sync(); await syncDirectory(directory);
    if (bytesHash(await readFile(leaseFile)) !== expectedLeaseHash || bytesHash(await readFile(journalFile)) !== expectedJournalHash) throw new Error("Recovery inputs changed before preservation.");
    const prefixBytes = raw.length && raw.at(-1) !== 10 ? raw.lastIndexOf(10) + 1 : raw.length;
    const prefix = raw.subarray(0, prefixBytes), manifest = await loadManifest(directory);
    const state = restoreReadAloudCollector(manifest, parseReadAloudJournal(prefix.toString("utf8"))); await verifyRecordedMaterials(directory, state);
    const backup = resolve(directory, `recovery-${digest([expectedLeaseHash, expectedJournalHash])}-${randomBytes(8).toString("hex")}`);
    await mkdir(backup, { mode: 0o700 }); await privateFile(resolve(backup, "writer.lock"), lease); await privateFile(resolve(backup, "events.jsonl"), raw);
    const report = { version: "read-aloud-recovery-v1", manifest_digest: manifest.digest, lease_sha256: expectedLeaseHash,
      original_journal_sha256: expectedJournalHash, retained_journal_sha256: bytesHash(prefix), original_bytes: raw.length,
      retained_bytes: prefixBytes, interrupted_tail_bytes: raw.length - prefixBytes, retained_events: state.events.length,
      retained_readings: state.data.readings.length, pending_recording_intents: state.events.filter(event => event.kind === "recording-intent" && !readingFor(state, event.attempt_id)).length,
      stopped_writer_pid: savedLease.pid, recovered_at: new Date().toISOString() };
    await privateFile(resolve(backup, "report.json"), JSON.stringify(report) + "\n"); await syncDirectory(backup); await syncDirectory(directory);
    const handle = await open(journalFile, "r+");
    try {
      if (bytesHash(await handle.readFile()) !== expectedJournalHash) throw new Error("Journal changed after preservation.");
      await handle.truncate(prefixBytes); await handle.sync();
    } finally { await handle.close(); }
    if (bytesHash(await readFile(leaseFile)) !== expectedLeaseHash) throw new Error("Lease changed after preservation.");
    await unlink(leaseFile); await syncDirectory(directory); return { backup, report };
  } finally { await recovery.close(); await unlink(recoveryFile); await syncDirectory(directory); }
}
